'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { addNote } from '@/lib/db';

export default function CaptureView() {
    const [text, setText] = useState('');
    const [saved, setSaved] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    const handleSave = useCallback(async () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        await addNote(trimmed);
        setText('');
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
        textareaRef.current?.focus();
    }, [text]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSave();
            }
        },
        [handleSave],
    );

    const isEmpty = text.trim().length === 0;

    return (
        <div className="flex h-full flex-col p-4 gap-3">
            <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's on your mind?"
                className="flex-1 resize-none rounded-xl bg-neutral-900 p-4 text-base text-white placeholder-neutral-500 outline-none focus:ring-2 focus:ring-neutral-600"
                aria-label="Note text"
            />
            <div className="flex items-center gap-3">
                <button
                    onClick={handleSave}
                    disabled={isEmpty}
                    className="flex-1 min-h-[44px] rounded-xl bg-white text-black text-base font-semibold transition-opacity disabled:opacity-30"
                >
                    Save
                </button>
                {saved && (
                    <span className="text-sm text-neutral-400 animate-pulse" role="status">
                        Saved
                    </span>
                )}
            </div>
        </div>
    );
}
