import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SearchView from './SearchView';

// Next.js returns the same object until the URL changes, so the mock must be stable too
let searchParams = new URLSearchParams('q=sleep');
vi.mock('next/navigation', () => ({
    useSearchParams: () => searchParams,
}));

let semanticEnabled = 'true';
vi.mock('@/hooks/useConfigValue', () => ({
    useConfigValue: () => semanticEnabled,
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

beforeEach(() => {
    searchParams = new URLSearchParams('q=sleep');
    semanticEnabled = 'true';
    embeddingCount = 0;
});

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

    it('falls back to keyword mode when semantic search is disabled', async () => {
        semanticSearch.mockResolvedValue([]);
        const { rerender } = render(<SearchView />);
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Semantic' }));
        });
        expect(
            await screen.findByText(/no semantically similar notes/i, {}, { timeout: 5000 })
        ).toBeInTheDocument();

        semanticEnabled = 'false';
        await act(async () => {
            rerender(<SearchView />);
        });
        expect(screen.queryByRole('button', { name: 'Semantic' })).not.toBeInTheDocument();
        expect(screen.queryByText(/no semantically similar notes/i)).not.toBeInTheDocument();
        // keyword search for "sleep" runs instead
        expect(screen.getByText(/no notes match your search/i)).toBeInTheDocument();
    });
});

describe('SearchView URL sync', () => {
    it('updates the search input when the URL query changes', async () => {
        const { rerender } = render(<SearchView />);
        expect(screen.getByLabelText('Search notes')).toHaveValue('sleep');

        searchParams = new URLSearchParams('q=Deep work');
        await act(async () => {
            rerender(<SearchView />);
        });
        expect(screen.getByLabelText('Search notes')).toHaveValue('Deep work');
    });
});
