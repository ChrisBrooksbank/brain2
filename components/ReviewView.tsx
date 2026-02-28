'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db, archiveNote } from '@/lib/db';

export default function ReviewView() {
    const [keptIds, setKeptIds] = useState<number[]>([]);

    // Shuffle and slice happen inside useLiveQuery (outside React render purity constraints)
    const reviewNotes = useLiveQuery(async () => {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const notes = await db.notes
            .filter((n) => !n.archived && n.createdAt <= yesterday)
            .toArray();
        // Fisher-Yates shuffle
        for (let i = notes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [notes[i], notes[j]] = [notes[j], notes[i]];
        }
        return notes.slice(0, 5);
    }, []);

    if (reviewNotes === undefined) {
        return <p className="p-4 text-neutral-500">Loading…</p>;
    }

    const visibleNotes = reviewNotes.filter((n) => !keptIds.includes(n.id));

    if (visibleNotes.length === 0) {
        return (
            <p className="p-4 text-neutral-500">
                All caught up — no notes older than 24 hours to review.
            </p>
        );
    }

    return (
        <ul className="flex flex-col gap-2 p-4">
            {visibleNotes.map((note) => (
                <li key={note.id} className="rounded-xl bg-neutral-900 p-4">
                    <p className="whitespace-pre-wrap break-words">{note.text}</p>
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
                            onClick={() => setKeptIds((prev) => [...prev, note.id])}
                            className="min-h-[44px] flex-1 rounded-lg bg-neutral-800 text-sm text-neutral-300 transition-colors hover:bg-neutral-700"
                        >
                            Keep
                        </button>
                        <button
                            onClick={() => archiveNote(note.id)}
                            className="min-h-[44px] flex-1 rounded-lg bg-neutral-800 text-sm text-neutral-300 transition-colors hover:bg-neutral-700"
                        >
                            Archive
                        </button>
                    </div>
                </li>
            ))}
        </ul>
    );
}
