import { db } from './db';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function createBackup(): Promise<void> {
    const notes = await db.notes.toArray();
    await db.backups.add({ createdAt: new Date(), notes });

    const cutoff = new Date(Date.now() - SEVEN_DAYS_MS);
    await db.backups.where('createdAt').below(cutoff).delete();
}

export async function maybeRunDailyBackup(): Promise<void> {
    const lastBackup = await db.backups.orderBy('createdAt').last();
    const cutoff = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);

    if (!lastBackup || lastBackup.createdAt < cutoff) {
        await createBackup();
    }
}
