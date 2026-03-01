import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import Dexie, { type EntityTable } from 'dexie';
import { db, type Note, type Config, addNote, updateNote, archiveNote, deleteNote, getConfig, setConfig, putEmbedding, getEmbedding } from './db';

// Create a fresh DB instance per test file to avoid shared state issues
class TestDB extends Dexie {
    notes!: EntityTable<Note, 'id'>;
    config!: EntityTable<Config, 'key'>;

    constructor() {
        super('brain2-test');
        this.version(1).stores({
            notes: '++id, text, *tags, createdAt, archived',
            config: 'key',
        });
    }
}

const testDb = new TestDB();

beforeEach(async () => {
    await testDb.notes.clear();
    await testDb.config.clear();
});

describe('db.notes', () => {
    it('adds a note and retrieves it by id', async () => {
        const id = await testDb.notes.add({
            text: 'Hello world',
            tags: [],
            createdAt: new Date(),
            archived: false,
        });
        const note = await testDb.notes.get(id);
        expect(note).toBeDefined();
        expect(note!.text).toBe('Hello world');
        expect(note!.tags).toEqual([]);
        expect(note!.archived).toBe(false);
    });

    it('auto-increments note ids', async () => {
        const id1 = await testDb.notes.add({
            text: 'Note 1',
            tags: [],
            createdAt: new Date(),
            archived: false,
        });
        const id2 = await testDb.notes.add({
            text: 'Note 2',
            tags: [],
            createdAt: new Date(),
            archived: false,
        });
        expect(id2).toBeGreaterThan(id1);
    });

    it('stores and retrieves tags array', async () => {
        const id = await testDb.notes.add({
            text: 'Tagged note',
            tags: ['work', 'urgent'],
            createdAt: new Date(),
            archived: false,
        });
        const note = await testDb.notes.get(id);
        expect(note!.tags).toEqual(['work', 'urgent']);
    });

    it('updates a note', async () => {
        const id = await testDb.notes.add({
            text: 'Original',
            tags: [],
            createdAt: new Date(),
            archived: false,
        });
        await testDb.notes.update(id, { text: 'Updated', tags: ['edited'] });
        const note = await testDb.notes.get(id);
        expect(note!.text).toBe('Updated');
        expect(note!.tags).toEqual(['edited']);
    });

    it('archives a note', async () => {
        const id = await testDb.notes.add({
            text: 'To archive',
            tags: [],
            createdAt: new Date(),
            archived: false,
        });
        await testDb.notes.update(id, { archived: true });
        const note = await testDb.notes.get(id);
        expect(note!.archived).toBe(true);
    });

    it('deletes a note', async () => {
        const id = await testDb.notes.add({
            text: 'To delete',
            tags: [],
            createdAt: new Date(),
            archived: false,
        });
        await testDb.notes.delete(id);
        const note = await testDb.notes.get(id);
        expect(note).toBeUndefined();
    });
});

describe('db.config', () => {
    it('stores and retrieves a config value', async () => {
        await testDb.config.put({ key: 'apiKey', value: 'sk-test-123' });
        const entry = await testDb.config.get('apiKey');
        expect(entry).toBeDefined();
        expect(entry!.value).toBe('sk-test-123');
    });

    it('overwrites existing config value on put', async () => {
        await testDb.config.put({ key: 'theme', value: 'dark' });
        await testDb.config.put({ key: 'theme', value: 'light' });
        const entry = await testDb.config.get('theme');
        expect(entry!.value).toBe('light');
    });

    it('deletes a config entry', async () => {
        await testDb.config.put({ key: 'toRemove', value: 'bye' });
        await testDb.config.delete('toRemove');
        const entry = await testDb.config.get('toRemove');
        expect(entry).toBeUndefined();
    });
});

describe('mutation helpers', () => {
    beforeEach(async () => {
        await db.notes.clear();
        await db.config.clear();
        await db.embeddings.clear();
    });

    it('addNote creates a note with default fields', async () => {
        const id = await addNote('test note');
        const note = await db.notes.get(id);
        expect(note).toBeDefined();
        expect(note!.text).toBe('test note');
        expect(note!.tags).toEqual([]);
        expect(note!.archived).toBe(false);
        expect(note!.createdAt).toBeInstanceOf(Date);
    });

    it('updateNote updates text and tags', async () => {
        const id = await addNote('original');
        await updateNote(id, { text: 'updated', tags: ['foo'] });
        const note = await db.notes.get(id);
        expect(note!.text).toBe('updated');
        expect(note!.tags).toEqual(['foo']);
    });

    it('archiveNote sets archived to true', async () => {
        const id = await addNote('to archive');
        await archiveNote(id);
        const note = await db.notes.get(id);
        expect(note!.archived).toBe(true);
    });

    it('deleteNote removes the note and its embedding', async () => {
        const id = await addNote('to delete');
        await putEmbedding(id, [1, 2, 3]);
        expect(await getEmbedding(id)).toBeDefined();
        await deleteNote(id);
        const note = await db.notes.get(id);
        expect(note).toBeUndefined();
        expect(await getEmbedding(id)).toBeUndefined();
    });

    it('setConfig stores a value and getConfig retrieves it', async () => {
        await setConfig('apiKey', 'sk-123');
        expect(await getConfig('apiKey')).toBe('sk-123');
    });

    it('setConfig overwrites existing value', async () => {
        await setConfig('theme', 'dark');
        await setConfig('theme', 'light');
        expect(await getConfig('theme')).toBe('light');
    });

    it('getConfig returns undefined for missing key', async () => {
        expect(await getConfig('missing')).toBeUndefined();
    });
});
