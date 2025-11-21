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
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Unregister this service worker
      return self.registration.unregister();
    })
  );
});

// No fetch handler needed - browser warning is expected and harmless
// Removing it eliminates the "no-op fetch handler" warning
