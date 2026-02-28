'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db, archiveNote, deleteNote } from '@/lib/db';
import { relativeTime, truncate } from '@/lib/utils';

export default function NotesView() {
    const notes = useLiveQuery(
        () => db.notes.orderBy('createdAt').reverse().filter((n) => !n.archived).toArray(),
        [],
    );
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    if (notes === undefined) {
        return <p className="p-4 text-neutral-500">Loading…</p>;
    }

    if (notes.length === 0) {
        return <p className="p-4 text-neutral-500">No notes yet.</p>;
    }

    return (
        <ul className="flex flex-col gap-2 p-4">
            {notes.map((note) => {
                const isExpanded = expandedId === note.id;
                const isConfirming = confirmDeleteId === note.id;
                return (
                    <li key={note.id} className="rounded-xl bg-neutral-900 p-4">
                        <button
                            onClick={() => setExpandedId(isExpanded ? null : note.id)}
                            className="w-full text-left"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? 'Collapse note' : 'Expand note'}
                        >
                            <p className={isExpanded ? 'whitespace-pre-wrap break-words' : 'line-clamp-3'}>
                                {isExpanded ? note.text : truncate(note.text, 120)}
                            </p>
                            <span className="mt-1 block text-xs text-neutral-500">
                                {relativeTime(note.createdAt)}
                            </span>
                        </button>
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
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={() => archiveNote(note.id)}
                                className="min-h-[44px] flex-1 rounded-lg bg-neutral-800 text-sm text-neutral-300 transition-colors hover:bg-neutral-700"
                            >
                                Archive
                            </button>
                            {isConfirming ? (
                                <>
                                    <button
                                        onClick={() => deleteNote(note.id)}
                                        className="min-h-[44px] flex-1 rounded-lg bg-red-600 text-sm text-white transition-colors hover:bg-red-500"
                                    >
                                        Confirm Delete
                                    </button>
                                    <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="min-h-[44px] flex-1 rounded-lg bg-neutral-800 text-sm text-neutral-300 transition-colors hover:bg-neutral-700"
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setConfirmDeleteId(note.id)}
                                    className="min-h-[44px] flex-1 rounded-lg bg-neutral-800 text-sm text-neutral-300 transition-colors hover:bg-neutral-700"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
