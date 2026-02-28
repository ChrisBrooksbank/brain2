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

class Brain2DB extends Dexie {
    notes!: EntityTable<Note, 'id'>;
    config!: EntityTable<Config, 'key'>;

    constructor() {
        super('brain2');
        this.version(1).stores({
            notes: '++id, text, *tags, createdAt, archived',
            config: 'key',
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

// Config helpers

export async function getConfig(key: string): Promise<string | undefined> {
    const entry = await db.config.get(key);
    return entry?.value;
}

export async function setConfig(key: string, value: string): Promise<void> {
    await db.config.put({ key, value });
}
