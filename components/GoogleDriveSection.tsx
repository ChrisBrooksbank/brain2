'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useConfigValue } from '@/hooks/useConfigValue';
import { setConfig, db } from '@/lib/db';
import {
    isTokenValid,
    loadGisScript,
    requestAccessToken,
    performBackup,
    performRestore,
    disconnect,
    clearToken,
} from '@/lib/gdrive';

const CLIENT_ID_KEY = 'gdrive_client_id';
const LAST_BACKUP_KEY = 'gdrive_last_backup';

type Status = 'idle' | 'connecting' | 'connected' | 'backing-up' | 'restoring';

export default function GoogleDriveSection() {
    const savedClientId = useConfigValue(CLIENT_ID_KEY, '');
    const lastBackup = useConfigValue(LAST_BACKUP_KEY, '');
    const [inputId, setInputId] = useState('');
    const [status, setStatus] = useState<Status>('idle');
    const [message, setMessage] = useState<string | null>(null);
    const messageTimer = useRef<ReturnType<typeof setTimeout>>(null);

    // Derive connected status: when we have a client ID and valid token,
    // treat idle as connected (#9). Avoids setState-in-effect.
    const effectiveStatus: Status =
        status === 'idle' && savedClientId && isTokenValid()
            ? 'connected'
            : status;

    // Clean up message timer on unmount (#5)
    useEffect(() => {
        return () => {
            if (messageTimer.current) clearTimeout(messageTimer.current);
        };
    }, []);

    const showMessage = (msg: string) => {
        if (messageTimer.current) clearTimeout(messageTimer.current);
        setMessage(msg);
        messageTimer.current = setTimeout(() => setMessage(null), 5000);
    };

    const handleSaveClientId = useCallback(async () => {
        const trimmed = inputId.trim();
        if (!trimmed) return;
        await setConfig(CLIENT_ID_KEY, trimmed);
        setInputId('');
    }, [inputId]);

    const handleClearClientId = useCallback(async () => {
        await db.config.delete(CLIENT_ID_KEY);
        await db.config.delete(LAST_BACKUP_KEY);
        clearToken();
        setStatus('idle');
    }, []);

    const handleConnect = useCallback(async () => {
        if (!savedClientId) return;
        setStatus('connecting');
        try {
            await loadGisScript();
            await requestAccessToken(savedClientId);
            setStatus('connected');
        } catch (err) {
            setStatus('idle');
            showMessage(
                err instanceof Error ? err.message : 'Connection failed',
            );
        }
    }, [savedClientId]);

    const handleDisconnect = useCallback(async () => {
        await disconnect();
        setStatus('idle');
    }, []);

    const handleBackup = useCallback(async () => {
        if (!savedClientId) return;
        setStatus('backing-up');
        const result = await performBackup(savedClientId);
        if (result.success) {
            const now = new Date().toISOString();
            await setConfig(LAST_BACKUP_KEY, now);
            setStatus('connected');
            showMessage('Backup complete');
        } else {
            setStatus(result.error?.includes('expired') ? 'idle' : 'connected');
            showMessage(result.error ?? 'Backup failed');
        }
    }, [savedClientId]);

    const handleRestore = useCallback(async () => {
        if (!savedClientId) return;
        const confirmed = window.confirm(
            'This will merge notes from your Google Drive backup. Existing notes won\u2019t be duplicated. Continue?',
        );
        if (!confirmed) return;
        setStatus('restoring');
        const result = await performRestore(savedClientId);
        if (result.success) {
            setStatus('connected');
            showMessage(
                `Restored ${result.added} new note${result.added !== 1 ? 's' : ''}, ${result.skipped} already existed`,
            );
        } else {
            setStatus(result.error?.includes('expired') ? 'idle' : 'connected');
            showMessage(result.error ?? 'Restore failed');
        }
    }, [savedClientId]);

    const isConnected = effectiveStatus === 'connected';
    const isBusy =
        effectiveStatus === 'connecting' ||
        effectiveStatus === 'backing-up' ||
        effectiveStatus === 'restoring';

    return (
        <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-faint uppercase tracking-wide">
                Google Drive Backup
            </h2>

            {!savedClientId ? (
                <>
                    <label
                        className="text-sm text-secondary"
                        htmlFor="gdrive-client-id"
                    >
                        OAuth Client ID
                    </label>
                    <input
                        id="gdrive-client-id"
                        type="text"
                        value={inputId}
                        onChange={(e) => setInputId(e.target.value)}
                        placeholder="123456789.apps.googleusercontent.com"
                        className="min-h-[44px] rounded-xl bg-card px-4 text-primary placeholder-muted outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                        onClick={handleSaveClientId}
                        disabled={!inputId.trim()}
                        className="min-h-[44px] rounded-xl bg-white text-black text-base font-semibold transition-opacity disabled:opacity-30 active:opacity-75"
                    >
                        Save
                    </button>
                    <p className="text-xs text-muted">
                        Create an OAuth Client ID at{' '}
                        <a
                            href="https://console.cloud.google.com/apis/credentials"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-faint"
                        >
                            Google Cloud Console
                        </a>
                        . Enable the Google Drive API, create a Web Application
                        credential, and add your origins (e.g.
                        https://brain2-app.netlify.app).
                    </p>
                </>
            ) : !isConnected && !isBusy ? (
                <>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-secondary">
                            Client ID saved
                        </span>
                        <span className="text-xs text-muted">
                            Not connected
                        </span>
                    </div>
                    <button
                        onClick={handleConnect}
                        className="min-h-[44px] rounded-xl bg-elevated text-secondary text-sm px-4 transition-opacity active:opacity-75 text-left"
                    >
                        Connect to Google Drive
                    </button>
                    <button
                        onClick={handleClearClientId}
                        className="min-h-[44px] rounded-xl bg-elevated text-secondary text-sm px-4 transition-opacity active:opacity-75 text-left"
                    >
                        Clear Client ID
                    </button>
                </>
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-secondary">
                            Google Drive
                        </span>
                        <span className="text-xs font-medium text-green-400">
                            {effectiveStatus === 'connecting'
                                ? 'Connecting...'
                                : effectiveStatus === 'backing-up'
                                  ? 'Backing up...'
                                  : effectiveStatus === 'restoring'
                                    ? 'Restoring...'
                                    : 'Connected'}
                        </span>
                    </div>
                    <button
                        onClick={handleBackup}
                        disabled={isBusy}
                        className="min-h-[44px] rounded-xl bg-elevated text-secondary text-sm px-4 transition-opacity disabled:opacity-30 active:opacity-75 text-left"
                    >
                        {effectiveStatus === 'backing-up' ? 'Backing up...' : 'Backup Now'}
                    </button>
                    <button
                        onClick={handleRestore}
                        disabled={isBusy}
                        className="min-h-[44px] rounded-xl bg-elevated text-secondary text-sm px-4 transition-opacity disabled:opacity-30 active:opacity-75 text-left"
                    >
                        {effectiveStatus === 'restoring' ? 'Restoring...' : 'Restore from Backup'}
                    </button>
                    {lastBackup && (
                        <p className="text-xs text-muted">
                            Last backup:{' '}
                            {new Date(lastBackup).toLocaleString()}
                        </p>
                    )}
                    <button
                        onClick={handleDisconnect}
                        disabled={isBusy}
                        className="min-h-[44px] rounded-xl bg-elevated text-secondary text-sm px-4 transition-opacity disabled:opacity-30 active:opacity-75 text-left"
                    >
                        Disconnect
                    </button>
                    <button
                        onClick={handleClearClientId}
                        disabled={isBusy}
                        className="min-h-[44px] rounded-xl bg-elevated text-secondary text-sm px-4 transition-opacity disabled:opacity-30 active:opacity-75 text-left"
                    >
                        Clear Client ID
                    </button>
                </>
            )}

            {message && (
                <span
                    className="text-sm text-faint"
                    role="status"
                    aria-live="polite"
                >
                    {message}
                </span>
            )}
        </section>
    );
}
