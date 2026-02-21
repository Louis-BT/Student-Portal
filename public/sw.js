const CACHE_NAME = 'nts-portal-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/login.html',
    '/signup.html',
    '/dashboard.html',
    '/style.css',
    '/theme.js',
    // Add any other core static assets (like your logo images) here
];

// 1. INSTALLATION: Cache the core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
    self.skipWaiting();
});

// 2. ACTIVATION: Clean up old caches if we update the version
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. FETCH: Network-first, fallback to cache for offline support
self.addEventListener('fetch', (event) => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // If network fetch is successful, clone it and update the cache
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            })
            .catch(() => {
                // If network fails (offline), return from cache
                return caches.match(event.request);
            })
    );
});