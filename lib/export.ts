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

/** Trigger a browser download of the given Blob */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
