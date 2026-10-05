'use client';

import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
    window.addEventListener('offline', onChange);
    window.addEventListener('online', onChange);
    return () => {
        window.removeEventListener('offline', onChange);
        window.removeEventListener('online', onChange);
    };
}

const getSnapshot = () => !navigator.onLine;
// Assume online during server render; the client snapshot takes over on hydration.
const getServerSnapshot = () => false;

export default function OfflineIndicator() {
    const offline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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
