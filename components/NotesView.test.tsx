import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotesView from './NotesView';

vi.mock('dexie-react-hooks', () => ({
    useLiveQuery: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
    db: {},
    archiveNote: vi.fn().mockResolvedValue(undefined),
    deleteNote: vi.fn().mockResolvedValue(undefined),
}));

// Mock utils so relativeTime is deterministic in tests
vi.mock('@/lib/utils', () => ({
    relativeTime: vi.fn().mockReturnValue('just now'),
    truncate: (text: string, max: number) => (text.length <= max ? text : text.slice(0, max) + '…'),
}));

import { useLiveQuery } from 'dexie-react-hooks';
import { archiveNote, deleteNote } from '@/lib/db';

const mockUseLiveQuery = vi.mocked(useLiveQuery);
const mockArchiveNote = vi.mocked(archiveNote);
const mockDeleteNote = vi.mocked(deleteNote);

const sampleNotes = [
    {
        id: 1,
        text: 'First note',
        tags: ['tag1', 'tag2'],
        createdAt: new Date('2024-01-02'),
        archived: false,
    },
    {
        id: 2,
        text: 'Second note',
        tags: [],
        createdAt: new Date('2024-01-01'),
        archived: false,
    },
];

beforeEach(() => {
    vi.clearAllMocks();
});

describe('NotesView', () => {
    it('shows loading state when notes is undefined', () => {
        mockUseLiveQuery.mockReturnValue(undefined);
        render(<NotesView />);
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('shows empty state when no notes', () => {
        mockUseLiveQuery.mockReturnValue([]);
        render(<NotesView />);
        expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
    });

    it('renders note cards with text', () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<NotesView />);
        expect(screen.getByText('First note')).toBeInTheDocument();
        expect(screen.getByText('Second note')).toBeInTheDocument();
    });

    it('renders tag pills for notes with tags', () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<NotesView />);
        expect(screen.getByText('tag1')).toBeInTheDocument();
        expect(screen.getByText('tag2')).toBeInTheDocument();
    });

    it('renders relative time for each note', () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<NotesView />);
        expect(screen.getAllByText('just now')).toHaveLength(2);
    });

    it('toggles expand/collapse on button click', async () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<NotesView />);
        const expandBtns = screen.getAllByRole('button', { name: /expand note/i });
        expect(expandBtns[0]).toHaveAttribute('aria-expanded', 'false');

        await act(async () => {
            fireEvent.click(expandBtns[0]);
        });
        expect(screen.getAllByRole('button', { name: /collapse note/i })[0]).toHaveAttribute(
            'aria-expanded',
            'true',
        );

        await act(async () => {
            fireEvent.click(screen.getAllByRole('button', { name: /collapse note/i })[0]);
        });
        expect(screen.getAllByRole('button', { name: /expand note/i })[0]).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    });

    it('calls archiveNote with note id when Archive is clicked', async () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<NotesView />);
        const archiveBtns = screen.getAllByRole('button', { name: /archive/i });
        await act(async () => {
            fireEvent.click(archiveBtns[0]);
        });
        expect(mockArchiveNote).toHaveBeenCalledOnce();
        expect(mockArchiveNote).toHaveBeenCalledWith(1);
    });

    it('shows Confirm Delete and Cancel buttons after clicking Delete', async () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<NotesView />);
        const deleteBtns = screen.getAllByRole('button', { name: /^delete$/i });
        await act(async () => {
            fireEvent.click(deleteBtns[0]);
        });
        expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('calls deleteNote with note id on Confirm Delete', async () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<NotesView />);
        const deleteBtns = screen.getAllByRole('button', { name: /^delete$/i });
        await act(async () => {
            fireEvent.click(deleteBtns[0]);
        });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));
        });
        expect(mockDeleteNote).toHaveBeenCalledOnce();
        expect(mockDeleteNote).toHaveBeenCalledWith(1);
    });

    it('hides confirmation and does not delete on Cancel', async () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<NotesView />);
        const deleteBtns = screen.getAllByRole('button', { name: /^delete$/i });
        await act(async () => {
            fireEvent.click(deleteBtns[0]);
        });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        });
        expect(mockDeleteNote).not.toHaveBeenCalled();
        expect(screen.queryByRole('button', { name: /confirm delete/i })).not.toBeInTheDocument();
    });

    it('renders Archive and Delete buttons for each note', () => {
        mockUseLiveQuery.mockReturnValue(sampleNotes);
        render(<NotesView />);
        expect(screen.getAllByRole('button', { name: /archive/i })).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: /^delete$/i })).toHaveLength(2);
    });
});
