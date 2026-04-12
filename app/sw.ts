import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import {
    Serwist,
    CacheFirst,
    StaleWhileRevalidate,
    ExpirationPlugin,
} from 'serwist';

declare global {
    interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    // navigationPreload disabled: it sends navigation requests to the network
    // before the SW activates, which breaks offline fallback to cache
    navigationPreload: false,
    runtimeCaching: [
        // All same-origin requests (HTML pages, RSC data, JS/CSS, API):
        // StaleWhileRevalidate returns the cached version immediately when offline
        // and refreshes the cache in the background when online.
        {
            matcher: ({ sameOrigin }) => sameOrigin,
            handler: new StaleWhileRevalidate({
                cacheName: 'app-shell',
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 128,
                        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year since last use
                        maxAgeFrom: 'last-used',
                    }),
                ],
            }),
        },
        // Google Fonts: CacheFirst, long TTL
        {
            matcher: /^https:\/\/fonts\.(gstatic|googleapis)\.com\/.*/i,
            handler: new CacheFirst({
                cacheName: 'google-fonts',
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 8,
                        maxAgeSeconds: 365 * 24 * 60 * 60,
                        maxAgeFrom: 'last-used',
                    }),
                ],
            }),
        },
    ],
});

serwist.addEventListeners();
