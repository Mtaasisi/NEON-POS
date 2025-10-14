
// Run this in browser console to clear cache and force refresh
console.log('🧹 Clearing cache...');

// Clear all storage
localStorage.clear();
sessionStorage.clear();

// Clear service worker cache
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

// Clear browser cache (if possible)
if ('caches' in window) {
  caches.keys().then(function(names) {
    for (let name of names) {
      caches.delete(name);
    }
  });
}

console.log('✅ Cache cleared, reloading page...');
setTimeout(() => {
  window.location.reload(true);
}, 1000);
