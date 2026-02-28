import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SearchView from './SearchView';

vi.mock('dexie-react-hooks', () => ({
    useLiveQuery: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
    db: {},
}));

vi.mock('@/lib/utils', () => ({
    relativeTime: vi.fn().mockReturnValue('just now'),
}));

import { useLiveQuery } from 'dexie-react-hooks';

const mockUseLiveQuery = vi.mocked(useLiveQuery);

const sampleNotes = [
    {
        id: 1,
        text: 'Hello world note',
        tags: ['greet'],
        createdAt: new Date('2024-01-02'),
        archived: false,
    },
    {
        id: 2,
        text: 'Another entry here',
        tags: [],
        createdAt: new Date('2024-01-01'),
        archived: false,
    },
    {
        id: 3,
        text: 'Archived world note',
        tags: [],
        createdAt: new Date('2024-01-03'),
        archived: true,
    },
];

beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('SearchView', () => {
    it('renders a search input', () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<SearchView />);
        expect(screen.getByRole('searchbox', { name: /search notes/i })).toBeInTheDocument();
    });

    it('shows loading state when notes is undefined', () => {
        mockUseLiveQuery.mockReturnValue(undefined);
        render(<SearchView />);
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('shows no results message when query matches nothing', async () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<SearchView />);
        const input = screen.getByRole('searchbox');
        fireEvent.change(input, { target: { value: 'zzznomatch' } });
        await act(async () => {
            vi.advanceTimersByTime(200);
        });
        expect(screen.getByText(/no notes match your search/i)).toBeInTheDocument();
    });

    it('filters notes case-insensitively after debounce', async () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<SearchView />);
        const input = screen.getByRole('searchbox');
        fireEvent.change(input, { target: { value: 'WORLD' } });
        await act(async () => {
            vi.advanceTimersByTime(200);
        });
        // Text is split by highlight marks, use container text content
        expect(document.body.textContent).toContain('Hello world note');
        expect(document.body.textContent).not.toContain('Another entry here');
    });

    it('includes archived notes in results with archived badge', async () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<SearchView />);
        const input = screen.getByRole('searchbox');
        fireEvent.change(input, { target: { value: 'world' } });
        await act(async () => {
            vi.advanceTimersByTime(200);
        });
        // Both "Hello world note" and "Archived world note" should match
        // Text is split by highlight marks, use container text content
        expect(document.body.textContent).toContain('Hello world note');
        expect(document.body.textContent).toContain('Archived world note');
        expect(screen.getByText('Archived')).toBeInTheDocument();
    });

    it('does not show results before debounce fires', async () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<SearchView />);
        const input = screen.getByRole('searchbox');
        fireEvent.change(input, { target: { value: 'hello' } });
        // Do NOT advance timers — debounce hasn't fired yet
        expect(screen.queryByText('Hello world note')).not.toBeInTheDocument();
    });

    it('shows no results initially (empty query)', () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<SearchView />);
        expect(screen.queryByText('Hello world note')).not.toBeInTheDocument();
        expect(screen.queryByText(/no notes match/i)).not.toBeInTheDocument();
    });

    it('renders tag pills on matched notes', async () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<SearchView />);
        const input = screen.getByRole('searchbox');
        fireEvent.change(input, { target: { value: 'hello' } });
        await act(async () => {
            vi.advanceTimersByTime(200);
        });
        expect(screen.getByText('greet')).toBeInTheDocument();
    });

    it('highlights matched terms in results', async () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<SearchView />);
        const input = screen.getByRole('searchbox');
        fireEvent.change(input, { target: { value: 'world' } });
        await act(async () => {
            vi.advanceTimersByTime(200);
        });
        // "world" should be wrapped in a <mark> element
        const marks = document.querySelectorAll('mark');
        expect(marks.length).toBeGreaterThan(0);
        const markTexts = Array.from(marks).map((m) => m.textContent?.toLowerCase());
        expect(markTexts.some((t) => t === 'world')).toBe(true);
    });
});
