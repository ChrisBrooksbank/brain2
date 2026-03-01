import { db, type Note, type Embedding } from './db';

// --- Types ---

export interface Brain2Backup {
    version: 1;
    createdAt: string;
    notes: Note[];
    embeddings: Embedding[];
}

export interface BackupResult {
    success: boolean;
    error?: string;
}

export interface RestoreResult {
    success: boolean;
    added: number;
    skipped: number;
    error?: string;
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

export function loadGisScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
    });
}

const SCOPE = 'https://www.googleapis.com/auth/drive.file';

export function requestAccessToken(clientId: string): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!window.google?.accounts?.oauth2) {
            reject(new Error('Google Identity Services not loaded'));
            return;
        }
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPE,
            callback: (response) => {
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

async function driveGet(token: string, path: string): Promise<Response> {
    return fetch(`${DRIVE_API}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

/** Find or create the Brain2 folder, return its ID. */
export async function ensureFolder(token: string): Promise<string> {
    // Search for existing folder
    const q = `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const res = await driveGet(
        token,
        `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
    );
    if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
    const data = (await res.json()) as { files: { id: string }[] };
    if (data.files.length > 0) return data.files[0].id;

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
    if (!createRes.ok) throw new Error(`Drive create folder failed: ${createRes.status}`);
    const folder = (await createRes.json()) as { id: string };
    return folder.id;
}

/** Find the backup file inside the Brain2 folder. Returns fileId or null. */
export async function findBackupFile(
    token: string,
    folderId: string,
): Promise<string | null> {
    const q = `name='${BACKUP_FILENAME}' and '${folderId}' in parents and trashed=false`;
    const res = await driveGet(
        token,
        `/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`,
    );
    if (!res.ok) throw new Error(`Drive search failed: ${res.status}`);
    const data = (await res.json()) as { files: { id: string }[] };
    return data.files.length > 0 ? data.files[0].id : null;
}

/** Upload (create or update) the backup file. */
export async function uploadBackup(
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
    if (!res.ok) throw new Error(`Drive upload failed: ${res.status}`);
}

/** Download and parse the backup file. */
export async function downloadBackup(
    token: string,
): Promise<Brain2Backup | null> {
    const folderId = await ensureFolder(token);
    const fileId = await findBackupFile(token, folderId);
    if (!fileId) return null;

    const res = await driveGet(token, `/files/${fileId}?alt=media`);
    if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);
    return (await res.json()) as Brain2Backup;
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
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('401')) {
            clearToken();
            return { success: false, error: 'Session expired — please reconnect.' };
        }
        return { success: false, error: message };
    }
}

export async function performRestore(clientId: string): Promise<RestoreResult> {
    try {
        const token = await getValidToken(clientId);
        const backup = await downloadBackup(token);
        if (!backup) {
            return { success: false, added: 0, skipped: 0, error: 'No backup found on Google Drive.' };
        }

        const existingNotes = await db.notes.toArray();
        const { toAdd, skipped } = deduplicateNotes(existingNotes, backup.notes);

        // Map old note IDs to new IDs for embedding restoration
        const oldIdToNew = new Map<number, number>();
        for (const note of toAdd) {
            const { id: oldId, ...rest } = note;
            // Ensure createdAt is a Date object
            const createdAt =
                typeof rest.createdAt === 'string'
                    ? new Date(rest.createdAt)
                    : rest.createdAt;
            const newId = await db.notes.add({ ...rest, createdAt });
            oldIdToNew.set(oldId, newId);
        }

        // Restore embeddings for added notes
        if (backup.embeddings) {
            for (const emb of backup.embeddings) {
                const newNoteId = oldIdToNew.get(emb.noteId);
                if (newNoteId !== undefined) {
                    await db.embeddings.add({
                        noteId: newNoteId,
                        vector: emb.vector,
                    } as import('./db').Embedding);
                }
            }
        }

        return { success: true, added: toAdd.length, skipped };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('401')) {
            clearToken();
            return { success: false, added: 0, skipped: 0, error: 'Session expired — please reconnect.' };
        }
        return { success: false, added: 0, skipped: 0, error: message };
    }
}

export function disconnect(): Promise<void> {
    return new Promise((resolve) => {
        const token = getStoredToken();
        if (token && window.google?.accounts?.oauth2) {
            window.google.accounts.oauth2.revoke(token, () => {
                clearToken();
                resolve();
            });
        } else {
            clearToken();
            resolve();
        }
    });
}
