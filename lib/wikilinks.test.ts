import { describe, it, expect } from 'vitest';
import { parseWikiLinks, extractWikiLinks } from './wikilinks';

describe('parseWikiLinks', () => {
    it('returns plain text when no links', () => {
        expect(parseWikiLinks('hello world')).toEqual([
            { type: 'text', content: 'hello world' },
        ]);
    });

    it('parses a single wiki-link', () => {
        expect(parseWikiLinks('see [[my note]] here')).toEqual([
            { type: 'text', content: 'see ' },
            { type: 'wikilink', content: 'my note' },
            { type: 'text', content: ' here' },
        ]);
    });

    it('parses multiple wiki-links', () => {
        expect(parseWikiLinks('[[a]] and [[b]]')).toEqual([
            { type: 'wikilink', content: 'a' },
            { type: 'text', content: ' and ' },
            { type: 'wikilink', content: 'b' },
        ]);
    });

    it('parses wiki-link at start of text', () => {
        expect(parseWikiLinks('[[start]] rest')).toEqual([
            { type: 'wikilink', content: 'start' },
            { type: 'text', content: ' rest' },
        ]);
    });

    it('parses wiki-link at end of text', () => {
        expect(parseWikiLinks('rest [[end]]')).toEqual([
            { type: 'text', content: 'rest ' },
            { type: 'wikilink', content: 'end' },
        ]);
    });

    it('ignores empty brackets [[]]', () => {
        expect(parseWikiLinks('before [[]] after')).toEqual([
            { type: 'text', content: 'before [[]] after' },
        ]);
    });

    it('returns empty array for empty string', () => {
        expect(parseWikiLinks('')).toEqual([]);
    });

    it('handles adjacent wiki-links', () => {
        expect(parseWikiLinks('[[a]][[b]]')).toEqual([
            { type: 'wikilink', content: 'a' },
            { type: 'wikilink', content: 'b' },
        ]);
    });
});

describe('extractWikiLinks', () => {
    it('returns empty array for no links', () => {
        expect(extractWikiLinks('plain text')).toEqual([]);
    });

    it('extracts link targets', () => {
        expect(extractWikiLinks('see [[foo]] and [[bar]]')).toEqual(['foo', 'bar']);
    });

    it('ignores empty brackets', () => {
        expect(extractWikiLinks('[[]] text')).toEqual([]);
    });
});
