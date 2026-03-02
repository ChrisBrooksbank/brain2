const HASHTAG_RE = /#([a-zA-Z][a-zA-Z0-9_-]*)/g;

export function extractHashtags(text: string): string[] {
    const matches = text.match(HASHTAG_RE) ?? [];
    const tags = matches.map((t) => t.slice(1).toLowerCase());
    return Array.from(new Set(tags));
}
