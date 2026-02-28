import { describe, it, expect } from 'vitest';
import { noteToMarkdown, noteToSlug, noteToFilename } from './export';
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
