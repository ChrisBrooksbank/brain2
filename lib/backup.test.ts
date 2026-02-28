import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { createBackup, maybeRunDailyBackup } from './backup';

beforeEach(async () => {
    await db.notes.clear();
    await db.backups.clear();
});


describe('createBackup', () => {
    it('creates a snapshot of all notes', async () => {
        await db.notes.add({ text: 'Note 1', tags: [], createdAt: new Date(), archived: false });
        await db.notes.add({ text: 'Note 2', tags: ['work'], createdAt: new Date(), archived: true });

        await createBackup();

        const backups = await db.backups.toArray();
        expect(backups).toHaveLength(1);
        expect(backups[0].notes).toHaveLength(2);
        expect(backups[0].notes[0].text).toBe('Note 1');
        expect(backups[0].notes[1].text).toBe('Note 2');
    });

    it('creates an empty backup when there are no notes', async () => {
        await createBackup();

        const backups = await db.backups.toArray();
        expect(backups).toHaveLength(1);
        expect(backups[0].notes).toHaveLength(0);
    });

    it('sets createdAt to current time', async () => {
        const before = new Date();
        await createBackup();
        const after = new Date();

        const backups = await db.backups.toArray();
        expect(backups[0].createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(backups[0].createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('prunes backups older than 7 days', async () => {
        const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
        const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

        await db.backups.add({ createdAt: eightDaysAgo, notes: [] });
        await db.backups.add({ createdAt: sixDaysAgo, notes: [] });

        await createBackup();

        const backups = await db.backups.toArray();
        // The 8-day-old backup should be pruned; the 6-day-old and new one remain
        expect(backups).toHaveLength(2);
        expect(backups.every((b) => b.createdAt > eightDaysAgo)).toBe(true);
    });

    it('keeps multiple backups within 7 days', async () => {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

        await db.backups.add({ createdAt: twoDaysAgo, notes: [] });
        await db.backups.add({ createdAt: fourDaysAgo, notes: [] });

        await createBackup();

        const backups = await db.backups.toArray();
        expect(backups).toHaveLength(3);
    });
});

describe('maybeRunDailyBackup', () => {
    it('creates a backup if no backups exist', async () => {
        await maybeRunDailyBackup();

        const backups = await db.backups.toArray();
        expect(backups).toHaveLength(1);
    });

    it('creates a backup if last backup was more than 24h ago', async () => {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        await db.backups.add({ createdAt: twoDaysAgo, notes: [] });

        await maybeRunDailyBackup();

        const backups = await db.backups.toArray();
        expect(backups).toHaveLength(2);
    });

    it('skips backup if last backup was less than 24h ago', async () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        await db.backups.add({ createdAt: oneHourAgo, notes: [] });

        await maybeRunDailyBackup();

        const backups = await db.backups.toArray();
        expect(backups).toHaveLength(1);
    });

});
