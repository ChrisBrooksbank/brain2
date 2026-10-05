'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '@/lib/db';
import { truncate } from '@/lib/utils';
import { extractWikiLinks, noteTitle } from '@/lib/wikilinks';

interface BacklinksSectionProps {
    noteId: number;
    noteText: string;
    onNavigate: (target: string) => void;
}

export default function BacklinksSection({ noteId, noteText, onNavigate }: BacklinksSectionProps) {
    const [open, setOpen] = useState(false);

    const title = noteTitle(noteText);

    const backlinks = useLiveQuery(async () => {
        if (!title) return [];
        // Compare parsed link targets so aliased (`[[Title|alias]]`) and heading
        // (`[[Title#Section]]`) links count as backlinks too.
        const target = title.toLowerCase();
        return db.notes
            .filter(
                n =>
                    n.id !== noteId &&
                    extractWikiLinks(n.text).some(link => link.toLowerCase() === target)
            )
            .toArray();
    }, [noteId, title]);

    if (!backlinks || backlinks.length === 0) return null;

    return (
        <div className="mt-3 border-t border-default pt-2">
            <button
                onClick={e => {
                    e.stopPropagation();
                    setOpen(!open);
                }}
                className="text-xs text-faint hover:text-secondary transition-colors"
                aria-expanded={open}
            >
                {open ? '▾' : '▸'} Linked from ({backlinks.length})
            </button>
            {open && (
                <ul className="mt-2 flex flex-col gap-1">
                    {backlinks.map(note => (
                        <li key={note.id}>
                            <button
                                onClick={e => {
                                    e.stopPropagation();
                                    onNavigate(noteTitle(note.text));
                                }}
                                className="w-full text-left rounded-lg bg-elevated px-3 py-2 text-sm text-secondary hover:bg-hover transition-colors"
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
