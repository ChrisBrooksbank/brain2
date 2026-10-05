import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SearchView from './SearchView';

vi.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams('q=sleep'),
}));

vi.mock('@/hooks/useConfigValue', () => ({
    useConfigValue: () => 'true', // semantic search enabled
}));

const notes = [
    {
        id: 1,
        text: 'Rest well for deep work',
        tags: [],
        createdAt: new Date('2024-01-02'),
        archived: false,
    },
];
let embeddingCount = 0;

// Tag each live query so the mock can tell the notes query from the embeddings count
vi.mock('@/lib/db', () => ({
    db: {
        notes: { orderBy: () => ({ reverse: () => ({ toArray: () => 'notes' }) }) },
        embeddings: { count: () => 'embeddingCount' },
    },
}));

vi.mock('dexie-react-hooks', () => ({
    useLiveQuery: (query: () => unknown) => (query() === 'notes' ? notes : embeddingCount),
}));

const semanticSearch = vi.fn();
vi.mock('@/lib/embeddings', () => ({
    generateEmbedding: vi.fn().mockResolvedValue([1]),
    embedAllUnembedded: vi.fn().mockResolvedValue(undefined),
    semanticSearch: (...args: unknown[]) => semanticSearch(...args),
}));

describe('SearchView semantic mode', () => {
    it('re-runs the search once background embeddings are stored', async () => {
        // Nothing is embedded yet when the model first becomes ready
        semanticSearch.mockResolvedValue([]);
        const { rerender } = render(<SearchView />);
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Semantic' }));
        });
        // Generous timeouts: the model warm-up path goes through a dynamic import,
        // which can exceed findBy*'s 1s default on a loaded machine.
        expect(
            await screen.findByText(/no semantically similar notes/i, {}, { timeout: 5000 })
        ).toBeInTheDocument();

        // Background embedding finishes; the embeddings live query changes
        semanticSearch.mockResolvedValue([{ noteId: 1, score: 0.8 }]);
        embeddingCount = 1;
        await act(async () => {
            rerender(<SearchView />);
        });
        expect(
            await screen.findByText('Rest well for deep work', {}, { timeout: 5000 })
        ).toBeInTheDocument();
        expect(screen.getByText('80%')).toBeInTheDocument();
    });
});
