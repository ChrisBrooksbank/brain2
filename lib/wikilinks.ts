export interface WikiLinkSegment {
    type: 'text' | 'wikilink';
    content: string;
}

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

/**
 * Parse text into segments of plain text and wiki-links.
 */
export function parseWikiLinks(text: string): WikiLinkSegment[] {
    const segments: WikiLinkSegment[] = [];
    let lastIndex = 0;

    for (const match of text.matchAll(WIKILINK_RE)) {
        const matchStart = match.index;
        if (matchStart > lastIndex) {
            segments.push({ type: 'text', content: text.slice(lastIndex, matchStart) });
        }
        segments.push({ type: 'wikilink', content: match[1] });
        lastIndex = matchStart + match[0].length;
    }

    if (lastIndex < text.length) {
        segments.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return segments;
}

/**
 * Extract all wiki-link target strings from text.
 */
export function extractWikiLinks(text: string): string[] {
    return Array.from(text.matchAll(WIKILINK_RE), (m) => m[1]);
}
