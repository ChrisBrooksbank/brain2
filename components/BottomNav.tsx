'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
    { href: '/', label: 'Capture', icon: '+' },
    { href: '/notes', label: 'Notes', icon: '☰' },
    { href: '/review', label: 'Review', icon: '↻' },
    { href: '/search', label: 'Search', icon: '⌕' },
    { href: '/settings', label: 'Settings', icon: '⚙' },
] as const;

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav
            className="flex border-t border-neutral-800 bg-neutral-950 pb-[env(safe-area-inset-bottom)]"
            aria-label="Main navigation"
        >
            {tabs.map(({ href, label, icon }) => {
                const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                    <Link
                        key={href}
                        href={href}
                        className={`flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px] text-xs transition-colors ${
                            isActive
                                ? 'text-white'
                                : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <span className="text-lg leading-none" aria-hidden="true">
                            {icon}
                        </span>
                        <span>{label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
