'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { db, type Note } from '@/lib/db';
import { relativeTime } from '@/lib/utils';
import NoteText from './NoteText';

type SearchMode = 'keyword' | 'semantic';

export default function SearchView() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('q') ?? '';
    const [input, setInput] = useState(initialQuery);
    const [query, setQuery] = useState(initialQuery);
    const [mode, setMode] = useState<SearchMode>('keyword');

    // Semantic search state
    const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [embedProgress, setEmbedProgress] = useState<string | null>(null);
    const [semanticResults, setSemanticResults] = useState<{ note: Note; score: number }[]>([]);

    useEffect(() => {
        const q = searchParams.get('q') ?? '';
        setInput(q);
        setQuery(q);
    }, [searchParams]);

    useEffect(() => {
        const timer = setTimeout(() => setQuery(input.trim()), 200);
        return () => clearTimeout(timer);
    }, [input]);

    const allNotes = useLiveQuery(() => db.notes.orderBy('createdAt').reverse().toArray(), []);

    const handleWikiLinkClick = (target: string) => {
        setInput(target);
        setQuery(target);
    };

    const initRunning = useRef(false);
    const initSemanticMode = useCallback(async () => {
        if (initRunning.current) return;
        initRunning.current = true;
        setModelStatus('loading');
        try {
            const { generateEmbedding, embedAllUnembedded } = await import('@/lib/embeddings');
            // Warm up the model by generating a test embedding
            await generateEmbedding('test');
            setModelStatus('ready');
            // Embed any unembedded notes
            setEmbedProgress('Embedding existing notes...');
            await embedAllUnembedded((done, total) => {
                setEmbedProgress(`Embedding notes: ${done}/${total}`);
            });
            setEmbedProgress(null);
        } catch {
            setModelStatus('error');
            setMode('keyword');
            initRunning.current = false;
        }
    }, []);

    // Run semantic search when query changes in semantic mode
    useEffect(() => {
        if (mode !== 'semantic' || modelStatus !== 'ready' || !query || !allNotes) return;

        let cancelled = false;
        (async () => {
            const { semanticSearch } = await import('@/lib/embeddings');
            const results = await semanticSearch(query);
            if (cancelled) return;
            const noteMap = new Map(allNotes.map((n) => [n.id, n]));
            setSemanticResults(
                results
                    .map((r) => ({ note: noteMap.get(r.noteId)!, score: r.score }))
                    .filter((r) => r.note),
            );
        })();
        return () => {
            cancelled = true;
        };
    }, [mode, modelStatus, query, allNotes]);

    const handleModeSwitch = (newMode: SearchMode) => {
        setMode(newMode);
        if (newMode === 'semantic' && modelStatus === 'idle') {
            void initSemanticMode();
        }
    };

    const keywordResults = useMemo(
        () =>
            allNotes && query
                ? allNotes.filter((n) => n.text.toLowerCase().includes(query.toLowerCase()))
                : [],
        [allNotes, query],
    );

    const renderNote = (note: Note, score?: number) => (
        <li key={note.id} className="rounded-xl bg-neutral-900 p-4">
            {note.archived && (
                <span className="mb-2 inline-block rounded bg-neutral-700 px-2 py-0.5 text-xs text-neutral-400">
                    Archived
                </span>
            )}
            {score !== undefined && (
                <span className="mb-2 ml-1 inline-block rounded bg-blue-900 px-2 py-0.5 text-xs text-blue-300">
                    {Math.round(score * 100)}%
                </span>
            )}
            <p className="whitespace-pre-wrap break-words">
                <NoteText
                    text={note.text}
                    highlight={mode === 'keyword' ? query : undefined}
                    onWikiLinkClick={handleWikiLinkClick}
                />
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
    );

    return (
        <div className="animate-page-enter">
            <div className="p-4">
                <input
                    type="search"
                    placeholder="Search notes…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    autoFocus
                    aria-label="Search notes"
                    className="w-full min-h-[44px] rounded-xl bg-neutral-900 px-4 py-3 text-white placeholder-neutral-500 outline-none focus:ring-2 focus:ring-blue-600"
                />
                <div className="mt-2 flex rounded-lg bg-neutral-900 p-1">
                    <button
                        onClick={() => handleModeSwitch('keyword')}
                        className={`flex-1 rounded-md px-3 py-1.5 text-sm transition-colors ${
                            mode === 'keyword'
                                ? 'bg-neutral-700 text-white'
                                : 'text-neutral-400 hover:text-neutral-300'
                        }`}
                    >
                        Keyword
                    </button>
                    <button
                        onClick={() => handleModeSwitch('semantic')}
                        className={`flex-1 rounded-md px-3 py-1.5 text-sm transition-colors ${
                            mode === 'semantic'
                                ? 'bg-neutral-700 text-white'
                                : 'text-neutral-400 hover:text-neutral-300'
                        }`}
                    >
                        Semantic
                    </button>
                </div>
            </div>
            {allNotes === undefined && (
                <p className="px-4 text-neutral-500">Loading…</p>
            )}
            {mode === 'semantic' && modelStatus === 'loading' && (
                <p className="px-4 text-neutral-500">
                    Loading AI model (one-time download)…
                </p>
            )}
            {mode === 'semantic' && embedProgress && (
                <p className="px-4 text-neutral-500">{embedProgress}</p>
            )}
            {mode === 'semantic' && modelStatus === 'error' && (
                <p className="px-4 text-red-400">
                    Failed to load AI model. Falling back to keyword search.
                </p>
            )}
            {mode === 'keyword' && allNotes !== undefined && query && (() => {
                if (keywordResults.length === 0) {
                    return <p className="px-4 text-neutral-500">No notes match your search.</p>;
                }
                return (
                    <ul className="flex flex-col gap-2 px-4 pb-4">
                        {keywordResults.map((note) => renderNote(note))}
                    </ul>
                );
            })()}
            {mode === 'semantic' && modelStatus === 'ready' && query && (() => {
                if (semanticResults.length === 0) {
                    return <p className="px-4 text-neutral-500">No semantically similar notes found.</p>;
                }
                return (
                    <ul className="flex flex-col gap-2 px-4 pb-4">
                        {semanticResults.map((r) => renderNote(r.note, r.score))}
                    </ul>
                );
            })()}
        </div>
    );
}
