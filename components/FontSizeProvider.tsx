'use client';

import { useEffect } from 'react';
import { useConfigValue } from '@/hooks/useConfigValue';

export default function FontSizeProvider() {
    const fontSize = useConfigValue('font_size', 'medium');

    useEffect(() => {
        document.documentElement.setAttribute('data-font-size', fontSize);
    }, [fontSize]);

    return null;
}
