import { describe, it, expect } from 'vitest';
import { extractHashtags } from './hashtags';

describe('extractHashtags', () => {
    it('extracts basic hashtags', () => {
        expect(extractHashtags('hello #world')).toEqual(['world']);
    });

    it('extracts multiple hashtags', () => {
        expect(extractHashtags('#foo bar #baz')).toEqual(['foo', 'baz']);
    });

    it('lowercases tags', () => {
        expect(extractHashtags('#Project #TODO')).toEqual(['project', 'todo']);
    });

    it('handles hyphens and underscores', () => {
        expect(extractHashtags('#my-tag #my_tag')).toEqual(['my-tag', 'my_tag']);
    });

    it('returns empty array when no hashtags found', () => {
        expect(extractHashtags('no tags here')).toEqual([]);
    });

    it('ignores bare # with no letters', () => {
        expect(extractHashtags('# not a tag')).toEqual([]);
    });

    it('ignores tags starting with a number', () => {
        expect(extractHashtags('#123 #4ever')).toEqual([]);
    });

    it('deduplicates tags', () => {
        expect(extractHashtags('#foo #Foo #FOO')).toEqual(['foo']);
    });

    it('extracts tag from middle of text', () => {
        expect(extractHashtags('working on #project today')).toEqual(['project']);
    });

    it('handles tag at end of text', () => {
        expect(extractHashtags('note about #ideas')).toEqual(['ideas']);
    });

    it('handles tag with alphanumeric chars after first letter', () => {
        expect(extractHashtags('#v2release')).toEqual(['v2release']);
    });
});
