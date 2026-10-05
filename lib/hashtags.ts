// The lookbehind skips '#' that follows a word character, slash or '&', so URL
// fragments (example.com/page#section), heading links ([[Note#Heading]]) and
// HTML entities (&#39;) are not mistaken for tags.
const HASHTAG_RE = /(?<![\w/&])#[a-zA-Z][a-zA-Z0-9_-]*/g;

export function extractHashtags(text: string): string[] {
    const matches = text.match(HASHTAG_RE) ?? [];
    const tags = matches.map(t => t.slice(1).toLowerCase());
    return Array.from(new Set(tags));
}
