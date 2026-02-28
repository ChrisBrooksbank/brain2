import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CaptureView from './CaptureView';

vi.mock('@/lib/db', () => ({
    addNote: vi.fn().mockResolvedValue(1),
}));

import { addNote } from '@/lib/db';
const mockAddNote = vi.mocked(addNote);

beforeEach(() => {
    mockAddNote.mockClear();
});

describe('CaptureView', () => {
    it('renders a textarea and Save button', () => {
        render(<CaptureView />);
        expect(screen.getByRole('textbox', { name: /note text/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('Save button is disabled when textarea is empty', () => {
        render(<CaptureView />);
        expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('Save button is enabled when text is entered', () => {
        render(<CaptureView />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
        expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
    });

    it('Save button is disabled when text is only whitespace', () => {
        render(<CaptureView />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
        expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('calls addNote with trimmed text on Save click', async () => {
        render(<CaptureView />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '  my note  ' } });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /save/i }));
        });
        expect(mockAddNote).toHaveBeenCalledOnce();
        expect(mockAddNote).toHaveBeenCalledWith('my note');
    });

    it('clears textarea after save', async () => {
        render(<CaptureView />);
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'my note' } });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /save/i }));
        });
        expect(textarea).toHaveValue('');
    });

    it('shows saved confirmation after save', async () => {
        render(<CaptureView />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'my note' } });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /save/i }));
        });
        await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    });

    it('saves on Ctrl+Enter', async () => {
        render(<CaptureView />);
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'keyboard save' } });
        await act(async () => {
            fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
        });
        expect(mockAddNote).toHaveBeenCalledOnce();
        expect(mockAddNote).toHaveBeenCalledWith('keyboard save');
    });

    it('does not save on Ctrl+Enter when empty', async () => {
        render(<CaptureView />);
        const textarea = screen.getByRole('textbox');
        await act(async () => {
            fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
        });
        expect(mockAddNote).not.toHaveBeenCalled();
    });
});
