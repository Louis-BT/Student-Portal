/**
 * ============================================================================
 * NATIONAL TERTIARY STUDENT PORTAL
 * Enterprise Service Worker & PWA Engine
 * Version: 2.0.0 (Cloud-Synced)
 * ============================================================================
 */

const CACHE_NAME = 'nts-portal-enterprise-v2';

// The Master List of all UI Assets to store on the user's physical device
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/login.html',
    '/signup.html',
    '/dashboard.html',
    '/profile.html',
    '/admin.html',
    '/courses.html',
    '/gpa.html',
    '/library.html',
    '/connect.html',
    '/opportunities.html',
    '/style.css',
    '/theme.js',
    '/db.js',
    '/manifest.json'
];

/**
 * ----------------------------------------------------------------------------
 * 1. INSTALLATION PHASE (The Initial Download)
 * Forces the browser to pre-download the entire application UI in the background.
 * ----------------------------------------------------------------------------
 */
self.addEventListener('install', (event) => {
    console.log('[PWA Engine] Installing Enterprise Service Worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[PWA Engine] Pre-caching core ecosystem assets.');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch(err => console.error('[PWA Engine] Cache installation failed:', err))
    );
    
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

/**
 * ----------------------------------------------------------------------------
 * 2. ACTIVATION PHASE (The Cleanup)
 * Purges old versions of the app from the user's phone to free up space 
 * and ensure they see the newest code updates.
 * ----------------------------------------------------------------------------
 */
self.addEventListener('activate', (event) => {
    console.log('[PWA Engine] Activating new Service Worker...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log(`[PWA Engine] Purging obsolete cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // Take immediate control of all open pages
    self.clients.claim();
});

/**
 * ----------------------------------------------------------------------------
 * 3. HYBRID INTERCEPT ROUTING (The Brain)
 * Protects Firebase cloud connections while supercharging UI load speeds.
 * ----------------------------------------------------------------------------
 */
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // ⛔ RULE A: BYPASS CLOUD DATABASES & APIs
    // We absolutely MUST NOT cache live Google Firebase or external API connections.
    // Doing so will break real-time chat, AI engines, and the Admin Command Center.
    if (
        event.request.method !== 'GET' ||
        url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('ui-avatars.com') ||
        url.hostname.includes('barcode.tec-it.com')
    ) {
        return; // Pass directly to the internet without interference
    }

    // ⚡ RULE B: STATIC ASSETS (CACHE-FIRST STRATEGY)
    // For CSS, JS, and Images, serve instantly from the phone's memory to make 
    // the app feel incredibly fast. If missing, fetch from the web and cache it.
    if (
        event.request.destination === 'style' ||
        event.request.destination === 'script' ||
        event.request.destination === 'image'
    ) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse; // Instant load
                }
                return fetch(event.request).then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                }).catch(() => {
                    console.log('[PWA Engine] Offline: Failed to fetch static asset.');
                });
            })
        );
        return;
    }

    // 🌐 RULE C: HTML PAGES (NETWORK-FIRST STRATEGY)
    // For the actual web pages, always try the internet first so the user gets 
    // the newest structural updates. If they are in airplane mode or have no signal, 
    // fall back to the saved offline version.
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // If the internet fetch is successful, secretly update the cache
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            })
            .catch(() => {
                // If the internet drops, serve the offline page instantly
                console.log(`[PWA Engine] Offline mode engaged for: ${url.pathname}`);
                return caches.match(event.request);
            })
    );
});