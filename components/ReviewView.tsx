'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, archiveNote } from '@/lib/db';
import NoteText from './NoteText';
import { useConfigValue } from '@/hooks/useConfigValue';

export default function ReviewView() {
    const router = useRouter();
    const [keptIds, setKeptIds] = useState<number[]>([]);
    const sessionSizeStr = useConfigValue('review_session_size', '5');
    const sessionSize = parseInt(sessionSizeStr, 10) || 5;

    // The session (which notes, in what order) is picked once and kept in a ref.
    // useLiveQuery re-runs on every DB change, so reshuffling inside it would swap
    // the remaining cards for a new random set each time a note is archived.
    const sessionRef = useRef<{ size: number; ids: number[] } | null>(null);

    // Shuffle and slice happen inside useLiveQuery (outside React render purity constraints)
    const reviewNotes = useLiveQuery(async () => {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const notes = await db.notes.filter(n => !n.archived && n.createdAt <= yesterday).toArray();
        if (sessionRef.current?.size !== sessionSize) {
            // Fisher-Yates shuffle
            for (let i = notes.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [notes[i], notes[j]] = [notes[j], notes[i]];
            }
            sessionRef.current = {
                size: sessionSize,
                ids: notes.slice(0, sessionSize).map(n => n.id),
            };
        }
        const byId = new Map(notes.map(n => [n.id, n]));
        return sessionRef.current.ids.flatMap(id => byId.get(id) ?? []);
    }, [sessionSize]);

    if (reviewNotes === undefined) {
        return <p className="p-4 text-muted">Loading…</p>;
    }

    const visibleNotes = reviewNotes.filter(n => !keptIds.includes(n.id));

    if (visibleNotes.length === 0) {
        return (
            <p className="p-4 text-muted">
                All caught up — no notes older than 24 hours to review.
            </p>
        );
    }

    return (
        <ul className="flex flex-col gap-2 p-4 animate-page-enter">
            {visibleNotes.map(note => (
                <li key={note.id} className="rounded-xl bg-card p-4">
                    <p className="whitespace-pre-wrap break-words text-note">
                        <NoteText
                            text={note.text}
                            onWikiLinkClick={target =>
                                router.push(`/search?q=${encodeURIComponent(target)}`)
                            }
                        />
                    </p>
                    {note.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {note.tags.map(tag => (
                                <span
                                    key={tag}
                                    className="rounded-full bg-elevated px-2 py-0.5 text-xs text-secondary"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                    <div className="mt-3 flex gap-2">
                        <button
                            onClick={() => setKeptIds(prev => [...prev, note.id])}
                            className="min-h-[44px] flex-1 rounded-lg bg-elevated text-sm text-secondary transition-colors hover:bg-hover active:opacity-75"
                        >
                            Keep
                        </button>
                        <button
                            onClick={() => {
                                navigator.vibrate?.(10);
                                archiveNote(note.id);
                            }}
                            className="min-h-[44px] flex-1 rounded-lg bg-elevated text-sm text-secondary transition-colors hover:bg-hover active:opacity-75"
                        >
                            Archive
                        </button>
                    </div>
                </li>
            ))}
        </ul>
    );
}
