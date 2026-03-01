import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import BacklinksSection from './BacklinksSection';

vi.mock('dexie-react-hooks', () => ({
    useLiveQuery: vi.fn().mockReturnValue([]),
}));

vi.mock('@/lib/db', () => ({
    db: {},
}));

vi.mock('@/lib/utils', () => ({
    truncate: (text: string, max: number) =>
        text.length <= max ? text : text.slice(0, max) + '…',
}));

describe('BacklinksSection', () => {
    it('renders nothing when no backlinks exist', () => {
        const { container } = render(
            <BacklinksSection
                noteId={1}
                noteText="My Title\nSome content"
                onNavigate={vi.fn()}
            />,
        );
        expect(container.innerHTML).toBe('');
    });
});
