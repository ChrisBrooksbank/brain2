import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BottomNav from './BottomNav';

vi.mock('next/navigation', () => ({
    usePathname: vi.fn(),
}));

vi.mock('next/link', () => ({
    default: ({
        href,
        children,
        ...props
    }: {
        href: string;
        children: React.ReactNode;
        [key: string]: unknown;
    }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

import { usePathname } from 'next/navigation';

const mockUsePathname = vi.mocked(usePathname);

describe('BottomNav', () => {
    it('renders all 4 tabs', () => {
        mockUsePathname.mockReturnValue('/');
        render(<BottomNav />);
        expect(screen.getByText('Capture')).toBeInTheDocument();
        expect(screen.getByText('Notes')).toBeInTheDocument();
        expect(screen.getByText('Review')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('marks Capture as active on "/"', () => {
        mockUsePathname.mockReturnValue('/');
        render(<BottomNav />);
        const captureLink = screen.getByText('Capture').closest('a');
        expect(captureLink).toHaveAttribute('aria-current', 'page');
    });

    it('marks Notes as active on "/notes"', () => {
        mockUsePathname.mockReturnValue('/notes');
        render(<BottomNav />);
        const notesLink = screen.getByText('Notes').closest('a');
        expect(notesLink).toHaveAttribute('aria-current', 'page');
    });

    it('marks Review as active on "/review"', () => {
        mockUsePathname.mockReturnValue('/review');
        render(<BottomNav />);
        const reviewLink = screen.getByText('Review').closest('a');
        expect(reviewLink).toHaveAttribute('aria-current', 'page');
    });

    it('marks Settings as active on "/settings"', () => {
        mockUsePathname.mockReturnValue('/settings');
        render(<BottomNav />);
        const settingsLink = screen.getByText('Settings').closest('a');
        expect(settingsLink).toHaveAttribute('aria-current', 'page');
    });

    it('does not mark Capture as active on "/notes"', () => {
        mockUsePathname.mockReturnValue('/notes');
        render(<BottomNav />);
        const captureLink = screen.getByText('Capture').closest('a');
        expect(captureLink).not.toHaveAttribute('aria-current');
    });

    it('links have correct hrefs', () => {
        mockUsePathname.mockReturnValue('/');
        render(<BottomNav />);
        expect(screen.getByText('Capture').closest('a')).toHaveAttribute('href', '/');
        expect(screen.getByText('Notes').closest('a')).toHaveAttribute('href', '/notes');
        expect(screen.getByText('Review').closest('a')).toHaveAttribute('href', '/review');
        expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/settings');
    });
});
