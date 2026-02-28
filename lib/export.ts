import JSZip from 'jszip';
import { type Note } from '@/lib/db';

/** Generate YAML frontmatter + body markdown for a note */
export function noteToMarkdown(note: Note): string {
    const dateStr = note.createdAt.toISOString().slice(0, 10);
    const tagsYaml =
        note.tags.length > 0
            ? `\ntags: [${note.tags.map((t) => `"${t}"`).join(', ')}]`
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
    const nonArchived = notes.filter((n) => !n.archived);

    // Track used filenames to avoid collisions
    const usedNames = new Map<string, number>();
    for (const note of nonArchived) {
        let filename = noteToFilename(note);
        const count = usedNames.get(filename) ?? 0;
        if (count > 0) {
            const base = filename.replace(/\.md$/, '');
            filename = `${base}-${count}.md`;
        }
        usedNames.set(noteToFilename(note), count + 1);
        zip.file(filename, noteToMarkdown(note));
    }

    return zip.generateAsync({ type: 'blob' });
}

export interface ParsedNote {
    text: string;
    tags: string[];
    createdAt: Date;
}

/** Parse a .md file's content into note fields.
 *  Reads YAML frontmatter (date, tags) and extracts #tags from the body. */
export function parseMarkdownNote(content: string): ParsedNote {
    let text = content;
    let tags: string[] = [];
    let createdAt = new Date();

    if (content.startsWith('---')) {
        const end = content.indexOf('\n---', 3);
        if (end !== -1) {
            const frontmatter = content.slice(3, end).trim();
            text = content.slice(end + 4).replace(/^\n+/, '');

            const dateMatch = frontmatter.match(/^date:\s*(.+)$/m);
            if (dateMatch) {
                const parsed = new Date(dateMatch[1].trim());
                if (!isNaN(parsed.getTime())) {
                    createdAt = parsed;
                }
            }

            const tagsMatch = frontmatter.match(/^tags:\s*\[(.+)\]$/m);
            if (tagsMatch) {
                tags = tagsMatch[1]
                    .split(',')
                    .map((t) => t.trim().replace(/^["']|["']$/g, ''))
                    .filter(Boolean);
            }
        }
    }

    // Merge in any #hashtags found in the body
    const bodyTags = (text.match(/#([a-zA-Z][a-zA-Z0-9_-]*)/g) ?? []).map((t) =>
        t.slice(1).toLowerCase(),
    );
    for (const tag of bodyTags) {
        if (!tags.includes(tag)) {
            tags.push(tag);
        }
    }

    return { text: text.trim(), tags, createdAt };
}

/** Trigger a browser download of the given Blob */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
