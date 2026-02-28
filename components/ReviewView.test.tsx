import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReviewView from './ReviewView';

vi.mock('dexie-react-hooks', () => ({
    useLiveQuery: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
    db: {},
    archiveNote: vi.fn().mockResolvedValue(undefined),
}));

import { useLiveQuery } from 'dexie-react-hooks';
import { archiveNote } from '@/lib/db';

const mockUseLiveQuery = vi.mocked(useLiveQuery);
const mockArchiveNote = vi.mocked(archiveNote);

const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);

const sampleNotes = [
    { id: 1, text: 'Old note one', tags: ['tag1'], createdAt: yesterday, archived: false },
    { id: 2, text: 'Old note two', tags: [], createdAt: yesterday, archived: false },
    { id: 3, text: 'Old note three', tags: ['tag2'], createdAt: yesterday, archived: false },
];

beforeEach(() => {
    vi.clearAllMocks();
});

describe('ReviewView', () => {
    it('shows loading state when notes is undefined', () => {
        mockUseLiveQuery.mockReturnValue(undefined);
        render(<ReviewView />);
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('shows empty state when no eligible notes', () => {
        mockUseLiveQuery.mockReturnValue([]);
        render(<ReviewView />);
        expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    });

    it('renders note cards with Keep and Archive buttons', () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<ReviewView />);
        expect(screen.getAllByRole('button', { name: /keep/i }).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByRole('button', { name: /archive/i }).length).toBeGreaterThanOrEqual(1);
    });

    it('renders note text', () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<ReviewView />);
        expect(screen.getByText('Old note one')).toBeInTheDocument();
    });

    it('renders tag pills for notes with tags', () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<ReviewView />);
        expect(screen.getByText('tag1')).toBeInTheDocument();
        expect(screen.getByText('tag2')).toBeInTheDocument();
    });

    it('removes card when Keep is clicked', async () => {
        mockUseLiveQuery.mockReturnValue([sampleNotes[0]]);
        render(<ReviewView />);

        expect(screen.getByText('Old note one')).toBeInTheDocument();
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /keep/i }));
        });
        expect(screen.queryByText('Old note one')).not.toBeInTheDocument();
        expect(mockArchiveNote).not.toHaveBeenCalled();
    });

    it('calls archiveNote with note id when Archive is clicked', async () => {
        mockUseLiveQuery.mockReturnValue([sampleNotes[0]]);
        render(<ReviewView />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /archive/i }));
        });
        expect(mockArchiveNote).toHaveBeenCalledOnce();
        expect(mockArchiveNote).toHaveBeenCalledWith(1);
    });

    it('shows empty state after all notes are kept', async () => {
        mockUseLiveQuery.mockReturnValue([sampleNotes[0]]);
        render(<ReviewView />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /keep/i }));
        });
        expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    });

    it('renders all notes returned by the query (query handles the 5-note limit)', () => {
        // useLiveQuery callback slices to 5 before returning; mock simulates that result
        const fiveNotes = Array.from({ length: 5 }, (_, i) => ({
            id: i + 1,
            text: `Note ${i + 1}`,
            tags: [],
            createdAt: yesterday,
            archived: false,
        }));
        mockUseLiveQuery.mockReturnValue(fiveNotes);
        render(<ReviewView />);

        const keepButtons = screen.getAllByRole('button', { name: /keep/i });
        expect(keepButtons).toHaveLength(5);
    });
});
