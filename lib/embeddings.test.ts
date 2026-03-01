import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from './embeddings';

describe('cosineSimilarity', () => {
    it('returns 1 for identical normalized vectors', () => {
        const v = [0.6, 0.8];
        expect(cosineSimilarity(v, v)).toBeCloseTo(1);
    });

    it('returns 0 for orthogonal vectors', () => {
        expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    });

    it('returns -1 for opposite vectors', () => {
        expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
    });

    it('computes correctly for arbitrary vectors', () => {
        const a = [1, 2, 3];
        const b = [4, 5, 6];
        // dot product = 4 + 10 + 18 = 32
        expect(cosineSimilarity(a, b)).toBeCloseTo(32);
    });
});
