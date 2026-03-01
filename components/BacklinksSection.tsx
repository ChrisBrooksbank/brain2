'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '@/lib/db';
import { truncate } from '@/lib/utils';

interface BacklinksSectionProps {
    noteId: number;
    noteText: string;
    onNavigate: (target: string) => void;
}

export default function BacklinksSection({ noteId, noteText, onNavigate }: BacklinksSectionProps) {
    const [open, setOpen] = useState(false);

    // Use first line as implicit title
    const title = noteText.split('\n')[0].trim();

    const backlinks = useLiveQuery(async () => {
        if (!title) return [];
        const target = `[[${title}]]`.toLowerCase();
        return db.notes
            .filter((n) => n.id !== noteId && n.text.toLowerCase().includes(target))
            .toArray();
    }, [noteId, title]);

    if (!backlinks || backlinks.length === 0) return null;

    return (
        <div className="mt-3 border-t border-neutral-800 pt-2">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(!open);
                }}
                className="text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
                aria-expanded={open}
            >
                {open ? '▾' : '▸'} Linked from ({backlinks.length})
            </button>
            {open && (
                <ul className="mt-2 flex flex-col gap-1">
                    {backlinks.map((note) => (
                        <li key={note.id}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigate(note.text.split('\n')[0].trim());
                                }}
                                className="w-full text-left rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 transition-colors"
                            >
                                {truncate(note.text, 80)}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
