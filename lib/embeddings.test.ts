import { describe, it, expect, vi } from 'vitest';
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

describe('generateEmbedding model loading', () => {
    it('retries loading the model after a failed attempt', async () => {
        vi.resetModules();
        const pipeline = vi
            .fn()
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce(async () => ({ tolist: () => [[0.6, 0.8]] }));
        vi.doMock('@huggingface/transformers', () => ({ pipeline }));
        const { generateEmbedding } = await import('./embeddings');

        await expect(generateEmbedding('hi')).rejects.toThrow('offline');
        await expect(generateEmbedding('hi')).resolves.toEqual([0.6, 0.8]);
        expect(pipeline).toHaveBeenCalledTimes(2);
        vi.doUnmock('@huggingface/transformers');
    });
});

describe('embedNote', () => {
    it('does not load the model when semantic search is disabled', async () => {
        vi.resetModules();
        const pipeline = vi.fn();
        vi.doMock('@huggingface/transformers', () => ({ pipeline }));
        vi.doMock('./db', () => ({
            db: { notes: { get: vi.fn() } },
            putEmbedding: vi.fn(),
            getAllEmbeddings: vi.fn(),
            getConfig: vi.fn().mockResolvedValue(undefined),
        }));
        const { embedNote } = await import('./embeddings');

        await embedNote(1, 'a note');

        expect(pipeline).not.toHaveBeenCalled();
        vi.doUnmock('@huggingface/transformers');
        vi.doUnmock('./db');
    });

    it('stores an embedding when semantic search is enabled', async () => {
        vi.resetModules();
        const putEmbedding = vi.fn();
        vi.doMock('@huggingface/transformers', () => ({
            pipeline: vi.fn().mockResolvedValue(async () => ({ tolist: () => [[1, 0]] })),
        }));
        vi.doMock('./db', () => ({
            db: { notes: { get: vi.fn().mockResolvedValue({ id: 1 }) } },
            putEmbedding,
            getAllEmbeddings: vi.fn(),
            getConfig: vi.fn().mockResolvedValue('true'),
        }));
        const { embedNote } = await import('./embeddings');

        await embedNote(1, 'a note');

        expect(putEmbedding).toHaveBeenCalledWith(1, [1, 0]);
        vi.doUnmock('@huggingface/transformers');
        vi.doUnmock('./db');
    });
});
