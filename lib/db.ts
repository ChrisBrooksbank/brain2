import Dexie, { type EntityTable } from 'dexie';

export interface Note {
    id: number;
    text: string;
    tags: string[];
    createdAt: Date;
    archived: boolean;
}

export interface Config {
    key: string;
    value: string;
}

export interface Backup {
    id: number;
    createdAt: Date;
    notes: Note[];
}

export interface Embedding {
    id: number;
    noteId: number;
    vector: number[];
}

class Brain2DB extends Dexie {
    notes!: EntityTable<Note, 'id'>;
    config!: EntityTable<Config, 'key'>;
    backups!: EntityTable<Backup, 'id'>;
    embeddings!: EntityTable<Embedding, 'id'>;

    constructor() {
        super('brain2');
        this.version(1).stores({
            notes: '++id, text, *tags, createdAt, archived',
            config: 'key',
        });
        this.version(2).stores({
            backups: '++id, createdAt',
        });
        this.version(3).stores({
            embeddings: '++id, noteId',
        });
    }
}

export const db = new Brain2DB();

// Note mutation helpers

export async function addNote(text: string): Promise<number> {
    return db.notes.add({ text, tags: [], createdAt: new Date(), archived: false });
}

export async function updateNote(id: number, changes: Partial<Pick<Note, 'text' | 'tags'>>): Promise<void> {
    await db.notes.update(id, changes);
}

export async function archiveNote(id: number): Promise<void> {
    await db.notes.update(id, { archived: true });
}

export async function deleteNote(id: number): Promise<void> {
    await db.notes.delete(id);
}

// Embedding helpers

export async function putEmbedding(noteId: number, vector: number[]): Promise<void> {
    await db.transaction('rw', db.embeddings, async () => {
        const existing = await db.embeddings.where('noteId').equals(noteId).first();
        if (existing) {
            await db.embeddings.update(existing.id, { vector });
        } else {
            await db.embeddings.add({ noteId, vector } as Embedding);
        }
    });
}

export async function getEmbedding(noteId: number): Promise<Embedding | undefined> {
    return db.embeddings.where('noteId').equals(noteId).first();
}

export async function deleteEmbedding(noteId: number): Promise<void> {
    await db.embeddings.where('noteId').equals(noteId).delete();
}

export async function getAllEmbeddings(): Promise<Embedding[]> {
    return db.embeddings.toArray();
}

// Config helpers

export async function getConfig(key: string): Promise<string | undefined> {
    const entry = await db.config.get(key);
    return entry?.value;
}

export async function setConfig(key: string, value: string): Promise<void> {
    await db.config.put({ key, value });
}
