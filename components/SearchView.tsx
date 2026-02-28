'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { relativeTime } from '@/lib/utils';

function highlight(text: string, query: string) {
    if (!query) return <>{text}</>;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                i % 2 === 1 ? (
                    <mark key={i} className="rounded-sm bg-yellow-400 text-black">
                        {part}
                    </mark>
                ) : (
                    part
                ),
            )}
        </>
    );
}

export default function SearchView() {
    const [input, setInput] = useState('');
    const [query, setQuery] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setQuery(input.trim()), 200);
        return () => clearTimeout(timer);
    }, [input]);

    const allNotes = useLiveQuery(() => db.notes.orderBy('createdAt').reverse().toArray(), []);

    return (
        <div>
            <div className="p-4">
                <input
                    type="search"
                    placeholder="Search notes…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    autoFocus
                    aria-label="Search notes"
                    className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-white placeholder-neutral-500 outline-none focus:ring-2 focus:ring-blue-600"
                />
            </div>
            {allNotes === undefined && (
                <p className="px-4 text-neutral-500">Loading…</p>
            )}
            {allNotes !== undefined && query && (() => {
                const results = allNotes.filter((n) =>
                    n.text.toLowerCase().includes(query.toLowerCase()),
                );
                if (results.length === 0) {
                    return <p className="px-4 text-neutral-500">No notes match your search.</p>;
                }
                return (
                    <ul className="flex flex-col gap-2 px-4 pb-4">
                        {results.map((note) => (
                            <li key={note.id} className="rounded-xl bg-neutral-900 p-4">
                                {note.archived && (
                                    <span className="mb-2 inline-block rounded bg-neutral-700 px-2 py-0.5 text-xs text-neutral-400">
                                        Archived
                                    </span>
                                )}
                                <p className="whitespace-pre-wrap break-words">
                                    {highlight(note.text, query)}
                                </p>
                                <span className="mt-1 block text-xs text-neutral-500">
                                    {relativeTime(note.createdAt)}
                                </span>
                                {note.tags.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {note.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                );
            })()}
        </div>
    );
}
