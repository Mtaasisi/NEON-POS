// Service Worker DISABLED for debugging
// Unregister itself immediately

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Delete ALL caches
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('🗑️ Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('✅ All caches deleted, unregistering service worker');
      // Unregister this service worker
      return self.registration.unregister();
    })
  );
});

// Don't handle any fetch requests
self.addEventListener('fetch', (event) => {
  // Just pass through, don't cache anything
  return;
});

console.log('🚨 Service Worker is in DISABLED mode - all caches cleared');
