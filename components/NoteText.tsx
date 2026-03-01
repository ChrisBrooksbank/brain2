import { parseWikiLinks } from '@/lib/wikilinks';
import { type ReactNode } from 'react';

interface NoteTextProps {
    text: string;
    onWikiLinkClick?: (target: string) => void;
    highlight?: string;
}

function highlightText(text: string, query: string): ReactNode[] {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
        i % 2 === 1 ? (
            <mark key={i} className="rounded-sm bg-yellow-400 text-black">
                {part}
            </mark>
        ) : (
            part
        ),
    );
}

export default function NoteText({ text, onWikiLinkClick, highlight }: NoteTextProps) {
    const segments = parseWikiLinks(text);

    return (
        <>
            {segments.map((seg, i) => {
                if (seg.type === 'wikilink') {
                    return (
                        <button
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation();
                                onWikiLinkClick?.(seg.content);
                            }}
                            className="text-blue-400 underline"
                        >
                            {seg.content}
                        </button>
                    );
                }
                if (highlight) {
                    return <span key={i}>{highlightText(seg.content, highlight)}</span>;
                }
                return <span key={i}>{seg.content}</span>;
            })}
        </>
    );
}
