/**
 * Comprehensive Cache Refresh Utility
 * Clears all caches and storage to ensure a fresh app state
 */

import { smartCache } from '../lib/enhancedCacheManager';
import { queryCache } from '../lib/queryCache';
import { queryDeduplication } from '../lib/queryDeduplication';
import { clearAllCache as clearOfflineCache, resetCacheDatabase } from '../lib/offlineCache';
import { useInventoryStore } from '../features/lats/stores/useInventoryStore';

/**
 * Clear all application caches
 */
export async function clearAllCaches(): Promise<void> {
  console.log('🧹 Starting comprehensive cache clearing...');
  
  try {
    // 1. Clear Enhanced Cache Manager (IndexedDB - pos-smart-cache)
    try {
      await smartCache.clearAllCache();
      console.log('✅ Enhanced Cache Manager cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear Enhanced Cache Manager:', error);
    }

    // 2. Clear Query Cache (in-memory)
    try {
      queryCache.clear();
      console.log('✅ Query Cache cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear Query Cache:', error);
    }

    // 3. Clear Query Deduplication Cache (in-memory)
    try {
      queryDeduplication.clearCache();
      console.log('✅ Query Deduplication Cache cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear Query Deduplication Cache:', error);
    }

    // 4. Clear Offline Cache (IndexedDB - clean-app-cache)
    try {
      await clearOfflineCache();
      console.log('✅ Offline Cache cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear Offline Cache:', error);
    }

    // 5. Clear Inventory Store Cache
    try {
      const inventoryStore = useInventoryStore.getState();
      if (inventoryStore && typeof inventoryStore.clearCache === 'function') {
        inventoryStore.clearCache(); // Clear all cache (no parameter = clear all)
        console.log('✅ Inventory Store Cache cleared');
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear Inventory Store Cache:', error);
    }

    // 6. Clear localStorage (preserve auth tokens)
    try {
      const keysToPreserve = [
        'supabase.auth.token', // Preserve auth token
        'sb-auth-token', // Alternative auth token key
      ];
      
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToPreserve.some(preserve => key.includes(preserve))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed localStorage key: ${key}`);
        } catch (error) {
          console.warn(`⚠️ Could not remove localStorage key: ${key}`, error);
        }
      });
      console.log('✅ localStorage cleared (auth tokens preserved)');
    } catch (error) {
      console.warn('⚠️ Failed to clear localStorage:', error);
    }

    // 7. Clear sessionStorage
    try {
      sessionStorage.clear();
      console.log('✅ sessionStorage cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear sessionStorage:', error);
    }

    // 8. Clear Service Worker Cache (if exists)
    try {
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log(`🗑️ Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
        console.log('✅ Service Worker caches cleared');
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear Service Worker caches:', error);
    }

    // 9. Clear additional IndexedDB databases
    try {
      const databasesToDelete = [
        'offline-cache',
        'pending-actions',
        'user-goals',
        'app-cache',
        'product-cache',
        'customer-cache',
        'device-cache',
        'pos-smart-cache', // Enhanced cache manager DB
        'clean-app-cache', // Offline cache DB
      ];

      for (const dbName of databasesToDelete) {
        try {
          const request = indexedDB.deleteDatabase(dbName);
          await new Promise<void>((resolve, reject) => {
            request.onsuccess = () => {
              console.log(`🗑️ Deleted IndexedDB: ${dbName}`);
              resolve();
            };
            request.onerror = () => {
              console.warn(`⚠️ Could not delete IndexedDB: ${dbName}`);
              resolve(); // Continue even if one fails
            };
            request.onblocked = () => {
              console.warn(`⚠️ IndexedDB deletion blocked: ${dbName}`);
              resolve(); // Continue even if blocked
            };
          });
        } catch (error) {
          console.warn(`⚠️ Error deleting IndexedDB ${dbName}:`, error);
        }
      }
      console.log('✅ Additional IndexedDB databases cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear additional IndexedDB databases:', error);
    }

    // 10. Reset data loaded flags
    try {
      if ((window as any).__AUTH_DATA_LOADED_FLAG__) {
        (window as any).__AUTH_DATA_LOADED_FLAG__ = false;
        console.log('🔄 Reset auth data loaded flag');
      }
    } catch (error) {
      console.warn('⚠️ Failed to reset data loaded flags:', error);
    }

    console.log('✅ All caches cleared successfully!');
  } catch (error) {
    console.error('❌ Error during cache clearing:', error);
    throw error;
  }
}

/**
 * Hard refresh the page (bypasses cache)
 */
export function hardRefresh(): void {
  // Use location.reload(true) for hard refresh (deprecated but still works)
  // Or use location.replace with current URL + timestamp
  if ('serviceWorker' in navigator) {
    // Unregister service workers if any
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister();
        console.log('🗑️ Unregistered service worker');
      });
    });
  }
  
  // Force hard reload
  window.location.reload();
}

/**
 * Full refresh: Clear all caches and reload the page
 */
export async function fullRefresh(): Promise<void> {
  try {
    await clearAllCaches();
    
    // Small delay to ensure all async operations complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Hard refresh
    hardRefresh();
  } catch (error) {
    console.error('❌ Error during full refresh:', error);
    // Still reload even if some caches failed to clear
    hardRefresh();
  }
}

