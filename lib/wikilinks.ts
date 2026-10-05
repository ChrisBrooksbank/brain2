interface WikiLinkSegment {
    type: 'text' | 'wikilink';
    /** Plain text, or the link target for a wiki-link. */
    content: string;
    /** Display text for a wiki-link when it differs from the target. */
    label?: string;
}

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

/**
 * Split the inside of a wiki-link into its target and display label, following
 * Obsidian syntax: `[[Target|Alias]]` and `[[Target#Heading]]` both link to "Target".
 */
function parseLinkBody(body: string): { target: string; label?: string } {
    const pipe = body.indexOf('|');
    const linkPart = (pipe === -1 ? body : body.slice(0, pipe)).trim();
    const alias = pipe === -1 ? '' : body.slice(pipe + 1).trim();
    // `[[#Heading]]` links within the same note; keep it as written
    const target = linkPart.split('#')[0].trim() || linkPart;
    const label = alias || (linkPart !== target ? linkPart : undefined);
    return label ? { target, label } : { target };
}

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
        const { target, label } = parseLinkBody(match[1]);
        segments.push(
            label
                ? { type: 'wikilink', content: target, label }
                : { type: 'wikilink', content: target }
        );
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
    return Array.from(text.matchAll(WIKILINK_RE), m => parseLinkBody(m[1]).target);
}
