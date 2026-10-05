import JSZip from 'jszip';
import { type Note } from '@/lib/db';
import { extractHashtags } from '@/lib/hashtags';

/** Generate YAML frontmatter + body markdown for a note */
export function noteToMarkdown(note: Note): string {
    const dateStr = note.createdAt.toISOString().slice(0, 10);
    const tagsYaml =
        note.tags.length > 0
            ? // JSON strings are valid YAML flow scalars, so quotes/backslashes are escaped
              `\ntags: [${note.tags.map(t => JSON.stringify(t)).join(', ')}]`
            : '';
    return `---\ndate: ${dateStr}${tagsYaml}\n---\n\n${note.text}`;
}

/** Convert note text into a slug for the filename (max 40 chars) */
export function noteToSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 40)
        .replace(/-+$/, '');
}

/** Generate the filename for a note: YYYY-MM-DD-slug.md */
export function noteToFilename(note: Note): string {
    const dateStr = note.createdAt.toISOString().slice(0, 10);
    const slug = noteToSlug(note.text) || 'note';
    return `${dateStr}-${slug}.md`;
}

/** Build a ZIP Blob containing all non-archived notes as .md files */
export async function exportNotesAsZip(notes: Note[]): Promise<Blob> {
    const zip = new JSZip();
    const nonArchived = notes.filter(n => !n.archived);

    // Track used filenames to avoid collisions. A numbered fallback can itself
    // clash with another note's natural name (e.g. a note titled "foo 1"), so
    // keep counting until the name is genuinely unused.
    const usedNames = new Set<string>();
    for (const note of nonArchived) {
        const base = noteToFilename(note).replace(/\.md$/, '');
        let filename = `${base}.md`;
        for (let n = 1; usedNames.has(filename); n++) {
            filename = `${base}-${n}.md`;
        }
        usedNames.add(filename);
        zip.file(filename, noteToMarkdown(note));
    }

    return zip.generateAsync({ type: 'blob' });
}

interface ParsedNote {
    text: string;
    tags: string[];
    createdAt: Date;
}

/** Parse a .md file's content into note fields.
 *  Reads YAML frontmatter (date, tags) and extracts #tags from the body. */
export function parseMarkdownNote(content: string): ParsedNote {
    // Normalise BOM and Windows line endings so frontmatter detection works
    const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    let text = normalized;
    let tags: string[] = [];
    let createdAt = new Date();

    if (normalized.startsWith('---\n')) {
        const end = normalized.indexOf('\n---', 3);
        if (end !== -1) {
            const frontmatter = normalized.slice(4, end);
            text = normalized.slice(end + 4).replace(/^[^\n]*\n?/, '');

            const dateMatch = frontmatter.match(/^date:\s*(.+)$/m);
            if (dateMatch) {
                const parsed = new Date(unquote(dateMatch[1].trim()));
                if (!isNaN(parsed.getTime())) {
                    createdAt = parsed;
                }
            }

            tags = parseFrontmatterTags(frontmatter);
        }
    }

    // Merge in any #hashtags found in the body
    for (const tag of extractHashtags(text)) {
        if (!tags.includes(tag)) {
            tags.push(tag);
        }
    }

    return { text: text.trim(), tags, createdAt };
}

function unquote(value: string): string {
    if (value.startsWith('"') && value.endsWith('"')) {
        try {
            return JSON.parse(value) as string;
        } catch {
            // fall through to plain quote stripping
        }
    }
    return value.replace(/^["']|["']$/g, '');
}

/** Read `tags` in any of Obsidian's forms: `[a, b]`, `a, b` or a `- a` block list. */
function parseFrontmatterTags(frontmatter: string): string[] {
    const lines = frontmatter.split('\n');
    const index = lines.findIndex(line => /^tags:/.test(line));
    if (index === -1) return [];

    const inline = lines[index].slice('tags:'.length).trim();
    let raw: string[];
    if (inline.startsWith('[')) {
        raw = inline.replace(/^\[|\]$/g, '').split(',');
    } else if (inline) {
        raw = inline.split(/[,\s]+/);
    } else {
        raw = [];
        for (const line of lines.slice(index + 1)) {
            const item = line.match(/^\s*-\s*(.*)$/);
            if (!item) break;
            raw.push(item[1]);
        }
    }

    const tags = raw.map(t => unquote(t.trim()).replace(/^#/, '').toLowerCase()).filter(Boolean);
    return Array.from(new Set(tags));
}

/** Trigger a browser download of the given Blob */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
