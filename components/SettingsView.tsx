'use client';

import { useState, useEffect, useCallback } from 'react';
import { getConfig, setConfig, db } from '@/lib/db';

const API_KEY_CONFIG = 'anthropic_api_key';

export default function SettingsView() {
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        getConfig(API_KEY_CONFIG).then((val) => {
            if (val) setApiKey(val);
        });
    }, []);

    const handleSave = useCallback(async () => {
        const trimmed = apiKey.trim();
        if (!trimmed) return;
        await setConfig(API_KEY_CONFIG, trimmed);
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
    }, [apiKey]);

    const handleClear = useCallback(async () => {
        await db.config.delete(API_KEY_CONFIG);
        setApiKey('');
    }, []);

    return (
        <div className="p-4 flex flex-col gap-6">
            <h1 className="text-xl font-semibold">Settings</h1>
            <section className="flex flex-col gap-3">
                <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">
                    AI Configuration
                </h2>
                <label className="text-sm text-neutral-300" htmlFor="api-key-input">
                    Claude API Key
                </label>
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
                        className="min-h-[44px] min-w-[44px] rounded-xl bg-neutral-800 text-neutral-300"
                    >
                        {showKey ? '🙈' : '👁'}
                    </button>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={!apiKey.trim()}
                        className="flex-1 min-h-[44px] rounded-xl bg-white text-black text-base font-semibold transition-opacity disabled:opacity-30"
                    >
                        Save
                    </button>
                    <button
                        onClick={handleClear}
                        disabled={!apiKey}
                        aria-label="Clear API key"
                        className="min-h-[44px] rounded-xl bg-neutral-800 text-neutral-300 text-sm px-4 transition-opacity disabled:opacity-30"
                    >
                        Clear
                    </button>
                </div>
                {saved && (
                    <span className="text-sm text-neutral-400 animate-pulse" role="status">
                        Saved
                    </span>
                )}
            </section>
        </div>
    );
}
