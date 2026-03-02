'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db, archiveNote, deleteNote, updateNote } from '@/lib/db';
import { autoTagNote } from '@/lib/ai';
import { embedNote } from '@/lib/embeddings';
import { extractHashtags } from '@/lib/hashtags';
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
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');

    const handleEdit = useCallback((id: number, text: string) => {
        setEditingId(id);
        setEditText(text);
    }, []);

    const handleSaveEdit = useCallback(async () => {
        if (editingId === null) return;
        const trimmed = editText.trim();
        if (!trimmed) return;
        const hashtags = extractHashtags(trimmed);
        await updateNote(editingId, { text: trimmed, tags: hashtags });
        void autoTagNote(editingId, trimmed);
        void embedNote(editingId, trimmed);
        setEditingId(null);
        setEditText('');
    }, [editingId, editText]);

    const handleCancelEdit = useCallback(() => {
        setEditingId(null);
        setEditText('');
    }, []);

    const allTags = useMemo(
        () => Array.from(new Set((notes ?? []).flatMap((n) => n.tags))).sort(),
        [notes],
    );

    if (notes === undefined) {
        return <p className="p-4 text-muted">Loading…</p>;
    }

    if (notes.length === 0) {
        return <p className="p-4 text-muted">No notes yet.</p>;
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
                                    : 'bg-elevated text-secondary hover:bg-hover'
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
                const isEditing = editingId === note.id;
                return (
                    <li key={note.id} className="rounded-xl bg-card p-4">
                        {isEditing ? (
                            <>
                                <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSaveEdit();
                                        }
                                    }}
                                    className="w-full resize-none rounded-lg bg-elevated p-3 text-note text-primary placeholder-muted outline-none focus:ring-2 focus:ring-ring"
                                    rows={6}
                                    autoFocus
                                    aria-label="Edit note text"
                                />
                                <div className="mt-3 flex gap-2">
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={!editText.trim()}
                                        className="min-h-[44px] flex-1 rounded-lg bg-blue-600 text-sm text-white transition-colors hover:bg-blue-500 active:opacity-75 disabled:opacity-30"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="min-h-[44px] flex-1 rounded-lg bg-elevated text-sm text-secondary transition-colors hover:bg-hover active:opacity-75"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
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
                                    <span className="mt-1 block text-xs text-muted">
                                        {relativeTime(note.createdAt)}
                                    </span>
                                </button>
                                {note.tags.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {note.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="rounded-full bg-elevated px-2 py-0.5 text-xs text-secondary"
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
                                    {isExpanded && (
                                        <button
                                            onClick={() => handleEdit(note.id, note.text)}
                                            className="min-h-[44px] flex-1 rounded-lg bg-elevated text-sm text-secondary transition-colors hover:bg-hover active:opacity-75"
                                        >
                                            Edit
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { navigator.vibrate?.(10); archiveNote(note.id); }}
                                        className="min-h-[44px] flex-1 rounded-lg bg-elevated text-sm text-secondary transition-colors hover:bg-hover active:opacity-75"
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
                                                className="min-h-[44px] flex-1 rounded-lg bg-elevated text-sm text-secondary transition-colors hover:bg-hover active:opacity-75"
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDeleteId(note.id)}
                                            className="min-h-[44px] flex-1 rounded-lg bg-elevated text-sm text-secondary transition-colors hover:bg-hover active:opacity-75"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </li>
                );
            })}
        </ul>
        </div>
    );
}
