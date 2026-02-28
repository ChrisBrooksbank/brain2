'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getConfig, setConfig, db } from '@/lib/db';
import { exportNotesAsZip, downloadBlob, parseMarkdownNote } from '@/lib/export';

const API_KEY_CONFIG = 'anthropic_api_key';

type TestStatus = 'no-key' | 'testing' | 'connected' | 'invalid';

async function validateApiKey(key: string): Promise<boolean> {
    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'Hi' }],
            }),
        });
        return res.ok;
    } catch {
        return false;
    }
}

export default function SettingsView() {
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [saved, setSaved] = useState(false);
    const [testStatus, setTestStatus] = useState<TestStatus>('no-key');
    const [exporting, setExporting] = useState(false);
    const [downloadingBackup, setDownloadingBackup] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getConfig(API_KEY_CONFIG).then((val) => {
            if (val) {
                setApiKey(val);
                setTestStatus('no-key');
            }
        });
    }, []);

    const handleSave = useCallback(async () => {
        const trimmed = apiKey.trim();
        if (!trimmed) return;
        await setConfig(API_KEY_CONFIG, trimmed);
        setSaved(true);
        setTestStatus('no-key');
        setTimeout(() => setSaved(false), 1200);
    }, [apiKey]);

    const handleClear = useCallback(async () => {
        await db.config.delete(API_KEY_CONFIG);
        setApiKey('');
        setTestStatus('no-key');
    }, []);

    const handleExport = useCallback(async () => {
        setExporting(true);
        try {
            const notes = await db.notes.toArray();
            const blob = await exportNotesAsZip(notes);
            const date = new Date().toISOString().slice(0, 10);
            downloadBlob(blob, `brain2-export-${date}.zip`);
        } finally {
            setExporting(false);
        }
    }, []);

    const handleDownloadBackup = useCallback(async () => {
        setDownloadingBackup(true);
        try {
            const notes = await db.notes.toArray();
            const json = JSON.stringify(notes, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const date = new Date().toISOString().slice(0, 10);
            downloadBlob(blob, `brain2-backup-${date}.json`);
        } finally {
            setDownloadingBackup(false);
        }
    }, []);

    const handleImport = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setImporting(true);
        setImportResult(null);
        try {
            const existing = await db.notes.toArray();
            const existingTexts = new Set(existing.map((n) => n.text));
            let imported = 0;
            for (const file of Array.from(files)) {
                const content = await file.text();
                const parsed = parseMarkdownNote(content);
                if (!existingTexts.has(parsed.text)) {
                    await db.notes.add({
                        text: parsed.text,
                        tags: parsed.tags,
                        createdAt: parsed.createdAt,
                        archived: false,
                    });
                    existingTexts.add(parsed.text);
                    imported++;
                }
            }
            setImportResult(`Imported ${imported} note${imported !== 1 ? 's' : ''}`);
            setTimeout(() => setImportResult(null), 3000);
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, []);

    const handleTest = useCallback(async () => {
        const trimmed = apiKey.trim();
        if (!trimmed) return;
        setTestStatus('testing');
        const ok = await validateApiKey(trimmed);
        setTestStatus(ok ? 'connected' : 'invalid');
    }, [apiKey]);

    const statusLabel =
        testStatus === 'connected'
            ? 'Connected'
            : testStatus === 'invalid'
              ? 'Invalid key'
              : testStatus === 'testing'
                ? 'Testing…'
                : 'No key set';

    const statusColor =
        testStatus === 'connected'
            ? 'text-green-400'
            : testStatus === 'invalid'
              ? 'text-red-400'
              : 'text-neutral-500';

    return (
        <div className="p-4 flex flex-col gap-6 animate-page-enter">
            <h1 className="text-xl font-semibold">Settings</h1>
            <section className="flex flex-col gap-3">
                <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">
                    AI Configuration
                </h2>
                <div className="flex items-center justify-between">
                    <label className="text-sm text-neutral-300" htmlFor="api-key-input">
                        Claude API Key
                    </label>
                    <span
                        className={`text-xs font-medium ${statusColor}`}
                        role="status"
                        aria-label={`API key status: ${statusLabel}`}
                    >
                        {statusLabel}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        id="api-key-input"
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-ant-…"
                        className="flex-1 min-h-[44px] rounded-xl bg-neutral-900 px-4 text-white placeholder-neutral-500 outline-none focus:ring-2 focus:ring-neutral-600"
                        aria-label="Claude API key"
                    />
                    <button
                        onClick={() => setShowKey((s) => !s)}
                        aria-label={showKey ? 'Hide API key' : 'Show API key'}
                        aria-pressed={showKey}
                        className="min-h-[44px] min-w-[44px] rounded-xl bg-neutral-800 text-neutral-300 active:opacity-75"
                    >
                        {showKey ? '🙈' : '👁'}
                    </button>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={!apiKey.trim()}
                        className="flex-1 min-h-[44px] rounded-xl bg-white text-black text-base font-semibold transition-opacity disabled:opacity-30 active:opacity-75"
                    >
                        Save
                    </button>
                    <button
                        onClick={handleTest}
                        disabled={!apiKey.trim() || testStatus === 'testing'}
                        aria-label="Test API key"
                        className="min-h-[44px] rounded-xl bg-neutral-800 text-neutral-300 text-sm px-4 transition-opacity disabled:opacity-30 active:opacity-75"
                    >
                        Test
                    </button>
                    <button
                        onClick={handleClear}
                        disabled={!apiKey}
                        aria-label="Clear API key"
                        className="min-h-[44px] rounded-xl bg-neutral-800 text-neutral-300 text-sm px-4 transition-opacity disabled:opacity-30 active:opacity-75"
                    >
                        Clear
                    </button>
                </div>
                {saved && (
                    <span className="text-sm text-neutral-400 animate-pulse" role="alert">
                        Saved
                    </span>
                )}
            </section>
            <section className="flex flex-col gap-3">
                <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">
                    Data
                </h2>
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    aria-label="Export all notes as ZIP"
                    className="min-h-[44px] rounded-xl bg-neutral-800 text-neutral-300 text-sm px-4 transition-opacity disabled:opacity-30 text-left"
                >
                    {exporting ? 'Exporting…' : 'Export all notes (.zip)'}
                </button>
                <button
                    onClick={handleDownloadBackup}
                    disabled={downloadingBackup}
                    aria-label="Download backup as JSON"
                    className="min-h-[44px] rounded-xl bg-neutral-800 text-neutral-300 text-sm px-4 transition-opacity disabled:opacity-30 text-left"
                >
                    {downloadingBackup ? 'Downloading…' : 'Download backup (.json)'}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md"
                    multiple
                    className="hidden"
                    aria-label="Select markdown files to import"
                    onChange={(e) => handleImport(e.target.files)}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    aria-label="Import notes from markdown files"
                    className="min-h-[44px] rounded-xl bg-neutral-800 text-neutral-300 text-sm px-4 transition-opacity disabled:opacity-30 text-left"
                >
                    {importing ? 'Importing…' : 'Import notes (.md)'}
                </button>
                {importResult && (
                    <span className="text-sm text-neutral-400" role="status" aria-live="polite">
                        {importResult}
                    </span>
                )}
            </section>
        </div>
    );
}
