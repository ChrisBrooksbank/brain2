import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
    noteToMarkdown,
    noteToSlug,
    noteToFilename,
    parseMarkdownNote,
    exportNotesAsZip,
} from './export';
import { type Note } from './db';

function makeNote(overrides: Partial<Note> = {}): Note {
    return {
        id: 1,
        text: 'Hello world this is a test note',
        tags: ['tag1', 'tag2'],
        createdAt: new Date('2024-06-15T12:00:00Z'),
        archived: false,
        ...overrides,
    };
}

describe('noteToSlug', () => {
    it('converts text to lowercase kebab-case', () => {
        expect(noteToSlug('Hello World')).toBe('hello-world');
    });

    it('strips non-alphanumeric characters', () => {
        expect(noteToSlug('Hello, World! & Things')).toBe('hello-world-things');
    });

    it('truncates to 40 characters', () => {
        const long = 'a'.repeat(60);
        expect(noteToSlug(long).length).toBeLessThanOrEqual(40);
    });

    it('removes trailing hyphens after truncation', () => {
        // 38 a's then a space then 'b' — slug truncates mid-word
        const text = 'a'.repeat(38) + ' b';
        const slug = noteToSlug(text);
        expect(slug).not.toMatch(/-$/);
    });

    it('returns empty string for non-alphanumeric input', () => {
        expect(noteToSlug('!!!')).toBe('');
    });
});

describe('noteToMarkdown', () => {
    it('produces YAML frontmatter with date and tags', () => {
        const note = makeNote();
        const md = noteToMarkdown(note);
        expect(md).toContain('---');
        expect(md).toContain('date: 2024-06-15');
        expect(md).toContain('tags: ["tag1", "tag2"]');
    });

    it('omits tags line when note has no tags', () => {
        const note = makeNote({ tags: [] });
        const md = noteToMarkdown(note);
        expect(md).not.toContain('tags:');
    });

    it('includes note text after frontmatter', () => {
        const note = makeNote({ text: 'My note content' });
        const md = noteToMarkdown(note);
        expect(md).toContain('My note content');
    });

    it('separates frontmatter from body with blank line', () => {
        const note = makeNote();
        const md = noteToMarkdown(note);
        expect(md).toContain('---\n\n');
    });
});

describe('noteToFilename', () => {
    it('formats as YYYY-MM-DD-slug.md', () => {
        const note = makeNote({ text: 'My first note' });
        expect(noteToFilename(note)).toBe('2024-06-15-my-first-note.md');
    });

    it('falls back to "note" when text slugifies to empty', () => {
        const note = makeNote({ text: '!!!' });
        expect(noteToFilename(note)).toBe('2024-06-15-note.md');
    });
});

describe('parseMarkdownNote', () => {
    it('parses date and tags from YAML frontmatter', () => {
        const md = '---\ndate: 2024-06-15\ntags: ["tag1", "tag2"]\n---\n\nHello world';
        const result = parseMarkdownNote(md);
        expect(result.text).toBe('Hello world');
        expect(result.tags).toEqual(['tag1', 'tag2']);
        expect(result.createdAt.toISOString().slice(0, 10)).toBe('2024-06-15');
    });

    it('falls back to current date when no frontmatter', () => {
        const before = new Date();
        const result = parseMarkdownNote('Just a plain note');
        const after = new Date();
        expect(result.text).toBe('Just a plain note');
        expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(result.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('returns empty tags when no tags in frontmatter', () => {
        const md = '---\ndate: 2024-01-01\n---\n\nNo tags here';
        const result = parseMarkdownNote(md);
        expect(result.tags).toEqual([]);
    });

    it('extracts #hashtags from body and merges with frontmatter tags', () => {
        const md = '---\ndate: 2024-01-01\ntags: ["existing"]\n---\n\nNote with #newtag';
        const result = parseMarkdownNote(md);
        expect(result.tags).toContain('existing');
        expect(result.tags).toContain('newtag');
    });

    it('deduplicates #hashtags already present in frontmatter', () => {
        const md = '---\ndate: 2024-01-01\ntags: ["mytag"]\n---\n\nNote with #mytag';
        const result = parseMarkdownNote(md);
        expect(result.tags.filter(t => t === 'mytag')).toHaveLength(1);
    });

    it('handles missing frontmatter gracefully', () => {
        const result = parseMarkdownNote('Plain text with #inlinetag');
        expect(result.text).toBe('Plain text with #inlinetag');
        expect(result.tags).toContain('inlinetag');
    });

    it('trims leading/trailing whitespace from body', () => {
        const md = '---\ndate: 2024-01-01\n---\n\n\n  Padded note  ';
        const result = parseMarkdownNote(md);
        expect(result.text).toBe('Padded note');
    });

    it('round-trips with noteToMarkdown', () => {
        const note = makeNote({ text: 'Round trip test', tags: ['alpha', 'beta'] });
        const md = noteToMarkdown(note);
        const parsed = parseMarkdownNote(md);
        expect(parsed.text).toBe('Round trip test');
        expect(parsed.tags).toEqual(['alpha', 'beta']);
        expect(parsed.createdAt.toISOString().slice(0, 10)).toBe('2024-06-15');
    });

    it('parses Obsidian block-list tags and normalises case and #', () => {
        const md = '---\ndate: 2024-01-01\ntags:\n  - Project\n  - "#ideas"\n---\n\nBody';
        const result = parseMarkdownNote(md);
        expect(result.tags).toEqual(['project', 'ideas']);
        expect(result.text).toBe('Body');
    });

    it('parses comma-separated scalar tags', () => {
        const result = parseMarkdownNote('---\ntags: work, home\n---\nBody');
        expect(result.tags).toEqual(['work', 'home']);
    });

    it('handles Windows line endings and a byte-order mark', () => {
        const md = '\uFEFF---\r\ndate: 2024-06-15\r\ntags: [a]\r\n---\r\n\r\nHello';
        const result = parseMarkdownNote(md);
        expect(result.text).toBe('Hello');
        expect(result.tags).toEqual(['a']);
        expect(result.createdAt.toISOString().slice(0, 10)).toBe('2024-06-15');
    });

    it('round-trips tags containing quotes', () => {
        const note = makeNote({ text: 'Quotes', tags: ['say "hi"'] });
        expect(parseMarkdownNote(noteToMarkdown(note)).tags).toEqual(['say "hi"']);
    });
});

describe('exportNotesAsZip filenames', () => {
    it('never overwrites a note whose natural name matches a numbered fallback', async () => {
        const notes = [
            makeNote({ id: 1, text: 'foo' }),
            makeNote({ id: 2, text: 'foo' }),
            makeNote({ id: 3, text: 'foo 1' }),
        ];
        const blob = await exportNotesAsZip(notes);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        expect(Object.keys(zip.files)).toHaveLength(3);
    });
});
