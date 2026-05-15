const CACHE_NAME = 'chaincacao-v4';
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './manifest.json',
    './images/icons/icon-192x192.svg',
    './images/icons/icon-512x512.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        ))
    );
});

// Stale-while-revalidate for scripts and CDN resources, cache-first for navigation
self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // For navigation requests, prefer cache then network
    if (req.mode === 'navigate') {
        event.respondWith(
            caches.match('./index.html').then(resp => resp || fetch(req))
        );
        return;
    }

    // For same-origin static assets: stale-while-revalidate
    if (url.origin === self.location.origin && req.destination !== 'image') {
        event.respondWith(
            caches.open(CACHE_NAME).then(async cache => {
                const cached = await cache.match(req);
                const networkPromise = fetch(req).then(networkResp => {
                    if (networkResp && networkResp.ok) cache.put(req, networkResp.clone());
                    return networkResp;
                }).catch(() => null);
                return cached || networkPromise;
            })
        );
        return;
    }

    // For cross-origin CDNs, try network first then fallback to cache
    event.respondWith(
        fetch(req).then(networkResp => {
            return networkResp;
        }).catch(() => caches.match(req))
    );
});
