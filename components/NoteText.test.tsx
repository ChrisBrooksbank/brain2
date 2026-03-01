import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NoteText from './NoteText';

describe('NoteText', () => {
    it('renders plain text', () => {
        render(<NoteText text="hello world" />);
        expect(screen.getByText('hello world')).toBeInTheDocument();
    });

    it('renders wiki-links as buttons', () => {
        render(<NoteText text="see [[my note]] here" />);
        expect(screen.getByRole('button', { name: 'my note' })).toBeInTheDocument();
        expect(screen.getByText('see')).toBeInTheDocument();
    });

    it('calls onWikiLinkClick when clicked', async () => {
        const user = userEvent.setup();
        const handler = vi.fn();
        render(<NoteText text="see [[target]]" onWikiLinkClick={handler} />);
        await user.click(screen.getByRole('button', { name: 'target' }));
        expect(handler).toHaveBeenCalledWith('target');
    });

    it('highlights matching text', () => {
        render(<NoteText text="find the word here" highlight="word" />);
        const mark = screen.getByText('word');
        expect(mark.tagName).toBe('MARK');
    });

    it('does not highlight inside wiki-link labels', () => {
        render(<NoteText text="see [[word link]]" highlight="word" />);
        const button = screen.getByRole('button', { name: 'word link' });
        expect(button.querySelector('mark')).toBeNull();
    });
});
