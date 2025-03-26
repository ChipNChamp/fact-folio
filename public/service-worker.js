
// Service Worker for FactFolio PWA
const CACHE_NAME = 'factfolio-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// Install the service worker and cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercept network requests and serve from cache when possible
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached response if available, otherwise fetch from network
        return cachedResponse || fetch(event.request)
          .then((response) => {
            // Cache the fetched response if it's a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          });
      })
  );
});

// Remove old caches when a new service worker is activated
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle the sync event for background syncing
self.addEventListener('sync', (event) => {
  if (event.tag === 'knowledge-entries-sync') {
    event.waitUntil(syncData());
  }
});

// Placeholder for sync data function - the actual sync logic is in syncStorage.ts
async function syncData() {
  console.log('Service Worker: Attempting background sync');
  // The actual sync operation is handled by the frontend code
  // We're posting a message to any clients (browser tabs/windows) to trigger sync
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'TRIGGER_SYNC'
    });
  });
}
