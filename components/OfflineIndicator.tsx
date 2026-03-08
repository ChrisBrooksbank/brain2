'use client';

import { useState, useEffect } from 'react';

export default function OfflineIndicator() {
    const [offline, setOffline] = useState(false);

    useEffect(() => {
        setOffline(!navigator.onLine);
        const handleOffline = () => setOffline(true);
        const handleOnline = () => setOffline(false);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    if (!offline) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-1.5 bg-elevated px-3 py-1 text-xs text-muted border-b border-default"
        >
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" aria-hidden="true" />
            Offline — notes save locally
        </div>
    );
}
