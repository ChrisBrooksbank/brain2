'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getConfig, setConfig, db } from '@/lib/db';
import { exportNotesAsZip, downloadBlob, parseMarkdownNote } from '@/lib/export';
import { useConfigValue } from '@/hooks/useConfigValue';
import GoogleDriveSection from './GoogleDriveSection';

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
              : 'text-muted';

    return (
        <div className="p-4 flex flex-col gap-6 animate-page-enter">
            <h1 className="text-xl font-semibold">Settings</h1>
            <section className="flex flex-col gap-3">
                <h2 className="text-sm font-medium text-faint uppercase tracking-wide">
                    AI Configuration
                </h2>
                <div className="flex items-center justify-between">
                    <label className="text-sm text-secondary" htmlFor="api-key-input">
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
                        className="flex-1 min-h-[44px] rounded-xl bg-card px-4 text-primary placeholder-muted outline-none focus:ring-2 focus:ring-ring"
                        aria-label="Claude API key"
                    />
                    <button
                        onClick={() => setShowKey((s) => !s)}
                        aria-label={showKey ? 'Hide API key' : 'Show API key'}
                        aria-pressed={showKey}
                        className="min-h-[44px] min-w-[44px] rounded-xl bg-elevated text-secondary active:opacity-75"
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
                        className="min-h-[44px] rounded-xl bg-elevated text-secondary text-sm px-4 transition-opacity disabled:opacity-30 active:opacity-75"
                    >
                        Test
                    </button>
                    <button
                        onClick={handleClear}
                        disabled={!apiKey}
                        aria-label="Clear API key"
                        className="min-h-[44px] rounded-xl bg-elevated text-secondary text-sm px-4 transition-opacity disabled:opacity-30 active:opacity-75"
                    >
                        Clear
                    </button>
                </div>
                {saved && (
                    <span className="text-sm text-faint animate-pulse" role="alert">
                        Saved
                    </span>
                )}
            </section>
            <section className="flex flex-col gap-3">
                <h2 className="text-sm font-medium text-faint uppercase tracking-wide">
                    Data
                </h2>
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    aria-label="Export all notes as ZIP"
                    className="min-h-[44px] rounded-xl bg-elevated text-secondary text-sm px-4 transition-opacity disabled:opacity-30 text-left"
                >
                    {exporting ? 'Exporting…' : 'Export all notes (.zip)'}
                </button>
                <button
                    onClick={handleDownloadBackup}
                    disabled={downloadingBackup}
                    aria-label="Download backup as JSON"
                    className="min-h-[44px] rounded-xl bg-elevated text-secondary text-sm px-4 transition-opacity disabled:opacity-30 text-left"
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
                    className="min-h-[44px] rounded-xl bg-elevated text-secondary text-sm px-4 transition-opacity disabled:opacity-30 text-left"
                >
                    {importing ? 'Importing…' : 'Import notes (.md)'}
                </button>
                {importResult && (
                    <span className="text-sm text-faint" role="status" aria-live="polite">
                        {importResult}
                    </span>
                )}
            </section>
            <GoogleDriveSection />
            <SearchSettingsSection />
            <AppearanceSection />
            <ReviewSizeSection />
        </div>
    );
}

function SegmentedControl({
    options,
    value,
    onChange,
    ariaLabel,
}: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (value: string) => void;
    ariaLabel: string;
}) {
    return (
        <div className="flex rounded-lg bg-card p-1" role="radiogroup" aria-label={ariaLabel}>
            {options.map((opt) => (
                <button
                    key={opt.value}
                    role="radio"
                    aria-checked={value === opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`flex-1 rounded-md px-3 py-2 text-sm transition-colors ${
                        value === opt.value
                            ? 'bg-hover text-primary'
                            : 'text-faint hover:text-secondary'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

function SearchSettingsSection() {
    const semanticEnabled = useConfigValue('semantic_search_enabled', 'false');
    const [clearing, setClearing] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [regenProgress, setRegenProgress] = useState<string | null>(null);

    const handleToggle = useCallback(async () => {
        if (semanticEnabled === 'true') {
            await setConfig('semantic_search_enabled', 'false');
        } else {
            const confirmed = window.confirm(
                'Enabling semantic search will download an AI model (~33 MB). Continue?',
            );
            if (confirmed) {
                await setConfig('semantic_search_enabled', 'true');
            }
        }
    }, [semanticEnabled]);

    const handleClearCache = useCallback(async () => {
        setClearing(true);
        try {
            await db.embeddings.clear();
            const keys = await caches.keys();
            for (const key of keys) {
                if (key.includes('transformers')) {
                    await caches.delete(key);
                }
            }
        } finally {
            setClearing(false);
        }
    }, []);

    const handleRegenerate = useCallback(async () => {
        const confirmed = window.confirm(
            'This will re-embed all notes. This may take a while. Continue?',
        );
        if (!confirmed) return;
        setRegenerating(true);
        setRegenProgress('Starting…');
        try {
            const { regenerateAllEmbeddings } = await import(
                '@/lib/embeddings'
            );
            await regenerateAllEmbeddings((done, total) => {
                setRegenProgress(`Re-indexing: ${done}/${total} notes`);
            });
            setRegenProgress('Done!');
            setTimeout(() => setRegenProgress(null), 2000);
        } catch {
            setRegenProgress('Failed to regenerate index');
            setTimeout(() => setRegenProgress(null), 3000);
        } finally {
            setRegenerating(false);
        }
    }, []);

    return (
        <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-faint uppercase tracking-wide">
                Search
            </h2>
            <div className="flex items-center justify-between">
                <span className="text-sm text-secondary">Semantic search</span>
                <button
                    role="switch"
                    aria-checked={semanticEnabled === 'true'}
                    aria-label="Toggle semantic search"
                    onClick={handleToggle}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        semanticEnabled === 'true' ? 'bg-blue-600' : 'bg-hover'
                    }`}
                >
                    <span
                        className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                            semanticEnabled === 'true' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>
            </div>
            <p className="text-xs text-muted">
                Downloads a ~33 MB AI model for meaning-based search.
            </p>
            <button
                onClick={handleClearCache}
                disabled={clearing}
                className="min-h-[44px] rounded-xl bg-elevated text-secondary text-sm px-4 transition-opacity disabled:opacity-30 text-left active:opacity-75"
            >
                {clearing ? 'Clearing…' : 'Clear model cache'}
            </button>
            {semanticEnabled === 'true' && (
                <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="min-h-[44px] rounded-xl bg-elevated text-secondary text-sm px-4 transition-opacity disabled:opacity-30 text-left active:opacity-75"
                >
                    {regenerating
                        ? (regenProgress ?? 'Regenerating…')
                        : 'Regenerate search index'}
                </button>
            )}
            {regenProgress && !regenerating && (
                <span
                    className="text-sm text-faint"
                    role="status"
                    aria-live="polite"
                >
                    {regenProgress}
                </span>
            )}
        </section>
    );
}

function AppearanceSection() {
    const fontSize = useConfigValue('font_size', 'medium');
    const theme = useConfigValue('theme', 'dark');

    return (
        <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-faint uppercase tracking-wide">
                Appearance
            </h2>
            <label className="text-sm text-secondary">Theme</label>
            <SegmentedControl
                ariaLabel="Theme"
                options={[
                    { label: 'Dark', value: 'dark' },
                    { label: 'Light', value: 'light' },
                    { label: 'System', value: 'system' },
                ]}
                value={theme}
                onChange={(v) => setConfig('theme', v)}
            />
            <label className="text-sm text-secondary">Note font size</label>
            <SegmentedControl
                ariaLabel="Font size"
                options={[
                    { label: 'Small', value: 'small' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'Large', value: 'large' },
                ]}
                value={fontSize}
                onChange={(v) => setConfig('font_size', v)}
            />
        </section>
    );
}

function ReviewSizeSection() {
    const sessionSize = useConfigValue('review_session_size', '5');

    return (
        <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-faint uppercase tracking-wide">
                Review
            </h2>
            <label className="text-sm text-secondary">Notes per session</label>
            <SegmentedControl
                ariaLabel="Review session size"
                options={[
                    { label: '3', value: '3' },
                    { label: '5', value: '5' },
                    { label: '10', value: '10' },
                    { label: '15', value: '15' },
                ]}
                value={sessionSize}
                onChange={(v) => setConfig('review_session_size', v)}
            />
        </section>
    );
}
