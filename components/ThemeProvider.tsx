'use client';

import { useEffect } from 'react';
import { useConfigValue } from '@/hooks/useConfigValue';

export default function ThemeProvider() {
    const theme = useConfigValue('theme', 'dark');

    useEffect(() => {
        const applyTheme = (resolved: 'dark' | 'light') => {
            document.documentElement.setAttribute('data-theme', resolved);
        };

        if (theme === 'system') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            applyTheme(mq.matches ? 'dark' : 'light');
            const handler = (e: MediaQueryListEvent) =>
                applyTheme(e.matches ? 'dark' : 'light');
            mq.addEventListener('change', handler);
            return () => mq.removeEventListener('change', handler);
        }

        applyTheme(theme === 'light' ? 'light' : 'dark');
    }, [theme]);

    return null;
}
