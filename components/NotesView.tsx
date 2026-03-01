'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db, archiveNote, deleteNote } from '@/lib/db';
import { relativeTime, truncate } from '@/lib/utils';
import NoteText from './NoteText';
import BacklinksSection from './BacklinksSection';

export default function NotesView() {
    const router = useRouter();
    const notes = useLiveQuery(
        () => db.notes.orderBy('createdAt').reverse().filter((n) => !n.archived).toArray(),
        [],
    );
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const allTags = useMemo(
        () => Array.from(new Set((notes ?? []).flatMap((n) => n.tags))).sort(),
        [notes],
    );

    if (notes === undefined) {
        return <p className="p-4 text-neutral-500">Loading…</p>;
    }

    if (notes.length === 0) {
        return <p className="p-4 text-neutral-500">No notes yet.</p>;
    }

    const filteredNotes = selectedTag ? notes.filter((n) => n.tags.includes(selectedTag)) : notes;

    return (
        <div className="animate-page-enter">
            {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pt-4">
                    {allTags.map((tag) => (
                        <button
                            key={tag}
                            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                            aria-pressed={selectedTag === tag}
                            className={`min-h-[44px] rounded-full px-3 py-1 text-sm transition-colors active:opacity-75 ${
                                selectedTag === tag
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                            }`}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            )}
            <ul className="flex flex-col gap-2 p-4">
            {filteredNotes.map((note) => {
                const isExpanded = expandedId === note.id;
                const isConfirming = confirmDeleteId === note.id;
                return (
                    <li key={note.id} className="rounded-xl bg-neutral-900 p-4">
                        <button
                            onClick={() => setExpandedId(isExpanded ? null : note.id)}
                            className="w-full text-left min-h-[44px] active:opacity-75 transition-opacity"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? 'Collapse note' : 'Expand note'}
                        >
                            <p className={isExpanded ? 'whitespace-pre-wrap break-words text-note' : 'line-clamp-3 text-note'}>
                                {isExpanded ? (
                                    <NoteText
                                        text={note.text}
                                        onWikiLinkClick={(target) => router.push(`/search?q=${encodeURIComponent(target)}`)}
                                    />
                                ) : (
                                    truncate(note.text, 120)
                                )}
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
                        {isExpanded && (
                            <BacklinksSection
                                noteId={note.id}
                                noteText={note.text}
                                onNavigate={(target) => router.push(`/search?q=${encodeURIComponent(target)}`)}
                            />
                        )}
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={() => { navigator.vibrate?.(10); archiveNote(note.id); }}
                                className="min-h-[44px] flex-1 rounded-lg bg-neutral-800 text-sm text-neutral-300 transition-colors hover:bg-neutral-700 active:opacity-75"
                            >
                                Archive
                            </button>
                            {isConfirming ? (
                                <>
                                    <button
                                        onClick={() => deleteNote(note.id)}
                                        className="min-h-[44px] flex-1 rounded-lg bg-red-600 text-sm text-white transition-colors hover:bg-red-500 active:opacity-75"
                                    >
                                        Confirm Delete
                                    </button>
                                    <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="min-h-[44px] flex-1 rounded-lg bg-neutral-800 text-sm text-neutral-300 transition-colors hover:bg-neutral-700 active:opacity-75"
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setConfirmDeleteId(note.id)}
                                    className="min-h-[44px] flex-1 rounded-lg bg-neutral-800 text-sm text-neutral-300 transition-colors hover:bg-neutral-700 active:opacity-75"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    </li>
                );
            })}
        </ul>
        </div>
    );
}
