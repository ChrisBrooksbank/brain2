import { db, type Note, type Embedding } from './db';

// --- Types ---

interface Brain2Backup {
    version: 1;
    createdAt: string;
    notes: Note[];
    embeddings: Embedding[];
}

interface BackupResult {
    success: boolean;
    error?: string;
}

interface RestoreResult {
    success: boolean;
    added: number;
    skipped: number;
    error?: string;
}

/** Error thrown by Drive API helpers, carrying the HTTP status code. */
export class DriveApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'DriveApiError';
        this.status = status;
    }
}

// --- Token management (sessionStorage) ---

const TOKEN_KEY = 'gdrive_access_token';
const EXPIRY_KEY = 'gdrive_token_expiry';

export function getStoredToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredExpiry(): number {
    const raw = sessionStorage.getItem(EXPIRY_KEY);
    return raw ? Number(raw) : 0;
}

export function storeToken(token: string, expiresInSeconds: number): void {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(
        EXPIRY_KEY,
        String(Date.now() + expiresInSeconds * 1000),
    );
}

export function clearToken(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EXPIRY_KEY);
}

export function isTokenValid(): boolean {
    const token = getStoredToken();
    const expiry = getStoredExpiry();
    return !!token && Date.now() < expiry;
}

// --- GIS script loading ---

declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient(config: {
                        client_id: string;
                        scope: string;
                        callback: (response: {
                            access_token?: string;
                            expires_in?: number;
                            error?: string;
                        }) => void;
                    }): { requestAccessToken(): void };
                    revoke(
                        token: string,
                        callback: () => void,
                    ): void;
                };
            };
        };
    }
}

/** Module-level promise cache to prevent duplicate script loads (#2). */
let gisPromise: Promise<void> | null = null;

export function loadGisScript(): Promise<void> {
    if (gisPromise) return gisPromise;

    gisPromise = new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            gisPromise = null; // allow retry on failure
            reject(new Error('Failed to load Google Identity Services'));
        };
        document.head.appendChild(script);
    });

    return gisPromise;
}

const SCOPE = 'https://www.googleapis.com/auth/drive.file';

/** 60-second timeout for OAuth popup (#4). */
export function requestAccessToken(clientId: string): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!window.google?.accounts?.oauth2) {
            reject(new Error('Google Identity Services not loaded'));
            return;
        }

        let settled = false;
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                reject(new Error('OAuth popup timed out after 60 seconds'));
            }
        }, 60_000);

        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPE,
            callback: (response) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);

                if (response.error) {
                    reject(new Error(response.error));
                    return;
                }
                if (response.access_token && response.expires_in) {
                    storeToken(response.access_token, response.expires_in);
                    resolve(response.access_token);
                } else {
                    reject(new Error('No access token received'));
                }
            },
        });
        client.requestAccessToken();
    });
}

// --- Drive API helpers ---

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_NAME = 'Brain2';
const BACKUP_FILENAME = 'brain2-backup.json';

/** Cached folder and file IDs to reduce sequential API calls (#3, #13). */
let cachedFolderId: string | null = null;
let cachedFileId: string | null | undefined = undefined; // undefined = not yet looked up

async function driveGet(token: string, path: string): Promise<Response> {
    const res = await fetch(`${DRIVE_API}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        throw new DriveApiError(`Drive request failed: ${res.status}`, res.status);
    }
    return res;
}

/** Find or create the Brain2 folder, return its ID. */
async function ensureFolder(token: string): Promise<string> {
    if (cachedFolderId) return cachedFolderId;

    // Search for existing folder
    const q = `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const res = await driveGet(
        token,
        `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
    );
    const data = (await res.json()) as { files: { id: string }[] };
    if (data.files.length > 0) {
        cachedFolderId = data.files[0].id;
        return cachedFolderId;
    }

    // Create folder
    const createRes = await fetch(`${DRIVE_API}/files`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
        }),
    });
    if (!createRes.ok) {
        throw new DriveApiError(
            `Drive create folder failed: ${createRes.status}`,
            createRes.status,
        );
    }
    const folder = (await createRes.json()) as { id: string };
    cachedFolderId = folder.id;
    return cachedFolderId;
}

/** Find the backup file inside the Brain2 folder. Returns fileId or null. */
async function findBackupFile(
    token: string,
    folderId: string,
): Promise<string | null> {
    if (cachedFileId !== undefined) return cachedFileId;

    const q = `name='${BACKUP_FILENAME}' and '${folderId}' in parents and trashed=false`;
    const res = await driveGet(
        token,
        `/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`,
    );
    const data = (await res.json()) as { files: { id: string }[] };
    cachedFileId = data.files.length > 0 ? data.files[0].id : null;
    return cachedFileId;
}

/**
 * Upload (create or update) the backup file.
 *
 * NOTE: This performs a full overwrite of the backup file (#7). A true
 * three-way merge would require a sync protocol with per-note timestamps
 * and conflict resolution, which is out of scope for the current design.
 *
 * NOTE: The backup payload must stay within Google Drive's 5 MB simple-upload
 * limit (#11). Typical usage (thousands of notes with embeddings) fits
 * comfortably, but very large datasets may need resumable uploads.
 */
async function uploadBackup(
    token: string,
    payload: Brain2Backup,
    folderId: string,
    fileId?: string | null,
): Promise<void> {
    const body = JSON.stringify(payload);
    const boundary = '---brain2boundary';
    const metadata = fileId
        ? { name: BACKUP_FILENAME }
        : { name: BACKUP_FILENAME, parents: [folderId] };

    const multipart =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${body}\r\n` +
        `--${boundary}--`;

    const url = fileId
        ? `${UPLOAD_API}/files/${fileId}?uploadType=multipart`
        : `${UPLOAD_API}/files?uploadType=multipart`;

    const res = await fetch(url, {
        method: fileId ? 'PATCH' : 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipart,
    });
    if (!res.ok) {
        throw new DriveApiError(`Drive upload failed: ${res.status}`, res.status);
    }

    // Cache the file ID after a successful create
    if (!fileId) {
        const created = (await res.json()) as { id: string };
        cachedFileId = created.id;
    }
}

// --- Backup validation (#10) ---

/** Validate that parsed JSON is a well-formed Brain2Backup. Throws on invalid data. */
export function validateBackup(data: unknown): Brain2Backup {
    if (typeof data !== 'object' || data === null) {
        throw new Error('Backup is not an object');
    }

    const obj = data as Record<string, unknown>;

    if (obj.version !== 1) {
        throw new Error(`Unsupported backup version: ${String(obj.version)}`);
    }

    if (!Array.isArray(obj.notes)) {
        throw new Error('Backup notes is not an array');
    }

    for (let i = 0; i < obj.notes.length; i++) {
        const note = obj.notes[i] as Record<string, unknown>;
        if (typeof note.text !== 'string') {
            throw new Error(`Note at index ${i} has invalid text`);
        }
        if (note.createdAt === undefined || note.createdAt === null) {
            throw new Error(`Note at index ${i} has no createdAt`);
        }
        if (!Array.isArray(note.tags)) {
            throw new Error(`Note at index ${i} has invalid tags`);
        }
        if (typeof note.archived !== 'boolean') {
            throw new Error(`Note at index ${i} has invalid archived flag`);
        }
    }

    if (obj.embeddings !== undefined && !Array.isArray(obj.embeddings)) {
        throw new Error('Backup embeddings is not an array');
    }

    return data as Brain2Backup;
}

/** Download and parse the backup file. */
async function downloadBackup(
    token: string,
): Promise<Brain2Backup | null> {
    const folderId = await ensureFolder(token);
    const fileId = await findBackupFile(token, folderId);
    if (!fileId) return null;

    const res = await driveGet(token, `/files/${fileId}?alt=media`);
    const raw: unknown = await res.json();
    return validateBackup(raw);
}

// --- Backup payload ---

export async function buildBackupPayload(): Promise<Brain2Backup> {
    const notes = await db.notes.toArray();
    const embeddings = await db.embeddings.toArray();
    return {
        version: 1,
        createdAt: new Date().toISOString(),
        notes,
        embeddings,
    };
}

// --- Deduplication ---

function noteKey(note: { createdAt: Date | string; text: string }): string {
    const dateStr =
        note.createdAt instanceof Date
            ? note.createdAt.toISOString()
            : note.createdAt;
    return `${dateStr}||${note.text}`;
}

export function deduplicateNotes(
    existing: Note[],
    incoming: Note[],
): { toAdd: Note[]; skipped: number } {
    const existingKeys = new Set(existing.map(noteKey));
    const toAdd: Note[] = [];
    let skipped = 0;
    for (const note of incoming) {
        if (existingKeys.has(noteKey(note))) {
            skipped++;
        } else {
            toAdd.push(note);
        }
    }
    return { toAdd, skipped };
}

// --- High-level operations ---

async function getValidToken(clientId: string): Promise<string> {
    if (isTokenValid()) return getStoredToken()!;
    await loadGisScript();
    return requestAccessToken(clientId);
}

export async function performBackup(clientId: string): Promise<BackupResult> {
    try {
        const token = await getValidToken(clientId);
        const payload = await buildBackupPayload();
        const folderId = await ensureFolder(token);
        const fileId = await findBackupFile(token, folderId);
        await uploadBackup(token, payload, folderId, fileId);
        return { success: true };
    } catch (err) {
        if (err instanceof DriveApiError && err.status === 401) {
            clearToken();
            return { success: false, error: 'Session expired — please reconnect.' };
        }
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
    }
}

/**
 * Restore notes and embeddings from a Google Drive backup.
 * The entire insert is wrapped in a Dexie transaction for atomicity (#1).
 * Uses bulkAdd for performance (#12).
 */
export async function performRestore(clientId: string): Promise<RestoreResult> {
    try {
        const token = await getValidToken(clientId);
        const backup = await downloadBackup(token);
        if (!backup) {
            return { success: false, added: 0, skipped: 0, error: 'No backup found on Google Drive.' };
        }

        const existingNotes = await db.notes.toArray();
        const { toAdd, skipped } = deduplicateNotes(existingNotes, backup.notes);

        if (toAdd.length > 0) {
            await db.transaction('rw', [db.notes, db.embeddings], async () => {
                // Prepare notes without old IDs, fixing createdAt types
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const notesToAdd = toAdd.map(({ id: _oldId, ...rest }) => ({
                    ...rest,
                    createdAt:
                        typeof rest.createdAt === 'string'
                            ? new Date(rest.createdAt)
                            : rest.createdAt,
                }));

                // bulkAdd returns all new auto-incremented keys
                const newIds = await db.notes.bulkAdd(notesToAdd, {
                    allKeys: true,
                });

                // Build old→new ID map for embedding restoration
                const oldIdToNew = new Map<number, number>();
                for (let i = 0; i < toAdd.length; i++) {
                    oldIdToNew.set(toAdd[i].id, newIds[i]);
                }

                // Restore embeddings for added notes
                if (backup.embeddings?.length) {
                    const embeddingsToAdd: Omit<Embedding, 'id'>[] = [];
                    for (const emb of backup.embeddings) {
                        const newNoteId = oldIdToNew.get(emb.noteId);
                        if (newNoteId !== undefined) {
                            embeddingsToAdd.push({
                                noteId: newNoteId,
                                vector: emb.vector,
                            });
                        }
                    }
                    if (embeddingsToAdd.length > 0) {
                        await db.embeddings.bulkAdd(
                            embeddingsToAdd as Embedding[],
                        );
                    }
                }
            });
        }

        return { success: true, added: toAdd.length, skipped };
    } catch (err) {
        if (err instanceof DriveApiError && err.status === 401) {
            clearToken();
            return { success: false, added: 0, skipped: 0, error: 'Session expired — please reconnect.' };
        }
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, added: 0, skipped: 0, error: message };
    }
}

export function disconnect(): Promise<void> {
    return new Promise((resolve) => {
        const token = getStoredToken();
        if (token && window.google?.accounts?.oauth2) {
            window.google.accounts.oauth2.revoke(token, () => {
                clearToken();
                cachedFolderId = null;
                cachedFileId = undefined;
                resolve();
            });
        } else {
            clearToken();
            cachedFolderId = null;
            cachedFileId = undefined;
            resolve();
        }
    });
}
