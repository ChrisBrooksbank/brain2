import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import {
    storeToken,
    getStoredToken,
    getStoredExpiry,
    clearToken,
    isTokenValid,
    buildBackupPayload,
    deduplicateNotes,
    validateBackup,
    DriveApiError,
} from './gdrive';
import type { Note } from './db';

beforeEach(async () => {
    await db.notes.clear();
    await db.embeddings.clear();
    sessionStorage.clear();
});

describe('token management', () => {
    it('stores and retrieves a token', () => {
        storeToken('abc123', 3600);
        expect(getStoredToken()).toBe('abc123');
        expect(getStoredExpiry()).toBeGreaterThan(Date.now());
    });

    it('clears token from sessionStorage', () => {
        storeToken('abc123', 3600);
        clearToken();
        expect(getStoredToken()).toBeNull();
        expect(getStoredExpiry()).toBe(0);
    });

    it('isTokenValid returns true for non-expired token', () => {
        storeToken('abc123', 3600);
        expect(isTokenValid()).toBe(true);
    });

    it('isTokenValid returns false when no token stored', () => {
        expect(isTokenValid()).toBe(false);
    });

    it('isTokenValid returns false for expired token', () => {
        storeToken('abc123', -1);
        expect(isTokenValid()).toBe(false);
    });
});

describe('buildBackupPayload', () => {
    it('serializes notes and embeddings', async () => {
        const noteId = await db.notes.add({
            text: 'Hello',
            tags: ['test'],
            createdAt: new Date('2025-01-01'),
            archived: false,
        });
        await db.embeddings.add({ noteId, vector: [0.1, 0.2, 0.3] } as import('./db').Embedding);

        const payload = await buildBackupPayload();

        expect(payload.version).toBe(1);
        expect(payload.createdAt).toBeTruthy();
        expect(payload.notes).toHaveLength(1);
        expect(payload.notes[0].text).toBe('Hello');
        expect(payload.embeddings).toHaveLength(1);
        expect(payload.embeddings[0].vector).toEqual([0.1, 0.2, 0.3]);
    });

    it('returns empty arrays when no data exists', async () => {
        const payload = await buildBackupPayload();

        expect(payload.notes).toHaveLength(0);
        expect(payload.embeddings).toHaveLength(0);
    });
});

describe('deduplicateNotes', () => {
    const makeNote = (text: string, date: string): Note => ({
        id: 1,
        text,
        tags: [],
        createdAt: new Date(date),
        archived: false,
    });

    it('identifies new notes to add', () => {
        const existing = [makeNote('Note A', '2025-01-01')];
        const incoming = [makeNote('Note B', '2025-01-02')];

        const { toAdd, skipped } = deduplicateNotes(existing, incoming);
        expect(toAdd).toHaveLength(1);
        expect(toAdd[0].text).toBe('Note B');
        expect(skipped).toBe(0);
    });

    it('skips notes with matching createdAt and text', () => {
        const existing = [makeNote('Same note', '2025-01-01')];
        const incoming = [makeNote('Same note', '2025-01-01')];

        const { toAdd, skipped } = deduplicateNotes(existing, incoming);
        expect(toAdd).toHaveLength(0);
        expect(skipped).toBe(1);
    });

    it('treats same text with different dates as different', () => {
        const existing = [makeNote('Same text', '2025-01-01')];
        const incoming = [makeNote('Same text', '2025-06-15')];

        const { toAdd, skipped } = deduplicateNotes(existing, incoming);
        expect(toAdd).toHaveLength(1);
        expect(skipped).toBe(0);
    });

    it('handles string dates from JSON (not Date objects)', () => {
        const existing = [makeNote('Note', '2025-01-01')];
        // Simulate JSON-parsed note where createdAt is a string
        const incoming = [
            {
                ...makeNote('Note', '2025-01-01'),
                createdAt: '2025-01-01T00:00:00.000Z' as unknown as Date,
            },
        ];

        const { skipped } = deduplicateNotes(existing, incoming);
        expect(skipped).toBe(1);
    });

    it('handles mix of new and existing notes', () => {
        const existing = [
            makeNote('A', '2025-01-01'),
            makeNote('B', '2025-01-02'),
        ];
        const incoming = [
            makeNote('A', '2025-01-01'),
            makeNote('C', '2025-01-03'),
            makeNote('D', '2025-01-04'),
        ];

        const { toAdd, skipped } = deduplicateNotes(existing, incoming);
        expect(toAdd).toHaveLength(2);
        expect(skipped).toBe(1);
    });
});

describe('validateBackup', () => {
    const validBackup = {
        version: 1,
        createdAt: '2025-01-01T00:00:00.000Z',
        notes: [
            {
                id: 1,
                text: 'Hello',
                tags: ['test'],
                createdAt: '2025-01-01T00:00:00.000Z',
                archived: false,
            },
        ],
        embeddings: [{ id: 1, noteId: 1, vector: [0.1, 0.2] }],
    };

    it('accepts a valid backup', () => {
        const result = validateBackup(validBackup);
        expect(result.version).toBe(1);
        expect(result.notes).toHaveLength(1);
    });

    it('accepts a backup with no embeddings field', () => {
        const { embeddings: _, ...noEmb } = validBackup;
        void _;
        const result = validateBackup(noEmb);
        expect(result.notes).toHaveLength(1);
    });

    it('rejects null', () => {
        expect(() => validateBackup(null)).toThrow('not an object');
    });

    it('rejects wrong version', () => {
        expect(() => validateBackup({ ...validBackup, version: 2 })).toThrow(
            'Unsupported backup version',
        );
    });

    it('rejects non-array notes', () => {
        expect(() =>
            validateBackup({ ...validBackup, notes: 'not array' }),
        ).toThrow('notes is not an array');
    });

    it('rejects note with missing text', () => {
        expect(() =>
            validateBackup({
                ...validBackup,
                notes: [{ id: 1, tags: [], createdAt: '2025-01-01', archived: false }],
            }),
        ).toThrow('invalid text');
    });

    it('rejects note with non-array tags', () => {
        expect(() =>
            validateBackup({
                ...validBackup,
                notes: [
                    {
                        id: 1,
                        text: 'Hi',
                        tags: 'not-array',
                        createdAt: '2025-01-01',
                        archived: false,
                    },
                ],
            }),
        ).toThrow('invalid tags');
    });

    it('rejects note with missing archived', () => {
        expect(() =>
            validateBackup({
                ...validBackup,
                notes: [
                    {
                        id: 1,
                        text: 'Hi',
                        tags: [],
                        createdAt: '2025-01-01',
                    },
                ],
            }),
        ).toThrow('invalid archived');
    });

    it('rejects non-array embeddings', () => {
        expect(() =>
            validateBackup({ ...validBackup, embeddings: 'bad' }),
        ).toThrow('embeddings is not an array');
    });
});

describe('DriveApiError', () => {
    it('carries status code', () => {
        const err = new DriveApiError('Not found', 404);
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(DriveApiError);
        expect(err.status).toBe(404);
        expect(err.message).toBe('Not found');
    });
});
