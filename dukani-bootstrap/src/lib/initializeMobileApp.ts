/**
 * Initialize Mobile App
 * Setup offline caching and sync for mobile APK with enhanced smart caching
 */

import { isNativeApp } from '../utils/platformDetection';
import { mobileDataSync } from './mobileDataSync';
import { mobileOfflineCache } from './mobileOfflineCache';
import { smartCache } from './enhancedCacheManager';
import { clearOldLocalStorageCache, checkLocalStorageUsage } from '../utils/clearOldCache';
import { initializePreloadedData, preloadedDataLoader } from './preloadedDataLoader';
import toast from 'react-hot-toast';

let initialized = false;

/**
 * Initialize mobile app functionality
 * Call this once when app starts
 * 
 * Features:
 * 1. Checks if local data exists
 * 2. If not, fetches from API and saves locally
 * 3. If exists, loads from cache immediately
 * 4. Refreshes data in background without blocking UI
 */
export async function initializeMobileApp(): Promise<void> {
  // Only initialize for native apps
  if (!isNativeApp()) {
    console.log('⏭️ [MobileApp] Not a native app, skipping mobile initialization');
    return;
  }

  if (initialized) {
    console.log('⏭️ [MobileApp] Already initialized');
    return;
  }

  console.log('🚀 [MobileApp] Initializing mobile app with smart caching...');

  try {
    // Clear old localStorage cache to prevent quota errors
    clearOldLocalStorageCache();
    
    // Check localStorage usage
    const usage = checkLocalStorageUsage();
    if (usage && usage.totalSizeKB > 3000) {
      console.warn('⚠️ [MobileApp] localStorage usage is high:', usage.totalSizeKB.toFixed(2), 'KB');
    }
    
    // Initialize enhanced cache manager (new smart cache)
    await smartCache.init();
    console.log('✅ [MobileApp] Enhanced cache initialized');

    // Also initialize legacy cache for backward compatibility
    await mobileOfflineCache.init();
    console.log('✅ [MobileApp] Legacy cache initialized');

    // 🔥 NEW: Check for preloaded data and load it first
    console.log('📦 [MobileApp] Checking for preloaded data...');
    const hasPreloadedData = await preloadedDataLoader.hasPreloadedData();
    
    if (hasPreloadedData) {
      console.log('🎉 [MobileApp] Preloaded data found! Loading...');
      toast.loading('Loading preloaded data...', { id: 'preload', duration: 2000 });
      
      const preloadSuccess = await initializePreloadedData();
      
      if (preloadSuccess) {
        console.log('✅ [MobileApp] Preloaded data installed successfully!');
        console.log('⚡ [MobileApp] App will be super fast now!');
        toast.success('All data preloaded! App ready!', { id: 'preload', duration: 3000 });
      } else {
        console.warn('⚠️ [MobileApp] Preload had some issues, will fetch from API');
        toast.dismiss('preload');
      }
    } else {
      console.log('ℹ️ [MobileApp] No preloaded data - will fetch from API on first load');
    }

    // Get cache stats from smart cache
    const stats = await smartCache.getCacheStats();
    console.log('📊 [MobileApp] Smart cache stats:', stats);

    // Check if we have cached data
    const hasCachedData = Object.values(stats).some((stat: any) => stat.itemCount > 0);

    if (hasCachedData) {
      console.log('💾 [MobileApp] Found cached data - app will load instantly!');
      
      // Check if any cache is stale or expired
      const hasStaleData = Object.values(stats).some((stat: any) => stat.isStale || stat.isExpired);
      
      if (hasStaleData) {
        console.log('🔄 [MobileApp] Some data is stale - will refresh in background');
        toast('Loading from cache...', { 
          icon: '💾',
          duration: 2000 
        });
      } else {
        console.log('✅ [MobileApp] All cache is fresh!');
      }
    } else {
      console.log('📥 [MobileApp] No cached data - will fetch from server on first load');
    }

    // Log platform info
    const platformInfo = {
      isNative: true,
      userAgent: navigator.userAgent,
      onLine: navigator.onLine,
      hasCachedData,
      cacheItemCount: Object.values(stats).reduce((sum: number, stat: any) => sum + (stat.itemCount || 0), 0),
    };
    console.log('📱 [MobileApp] Platform:', platformInfo);

    // Mark as initialized
    initialized = true;
    console.log('✅ [MobileApp] Mobile app initialized successfully');
    
    // Show user-friendly message
    if (navigator.onLine) {
      if (hasCachedData) {
        toast.success('App ready! Using cached data.', { duration: 2000 });
      }
    } else {
      toast('Offline mode - using cached data', { 
        icon: '📵',
        duration: 3000 
      });
    }
  } catch (error) {
    console.error('❌ [MobileApp] Initialization failed:', error);
    
    // Don't throw - try to continue with limited functionality
    toast.error('Cache initialization failed. Some features may be limited.');
    initialized = true; // Mark as initialized anyway to prevent retry loops
  }
}

/**
 * Check if mobile app is initialized
 */
export function isMobileAppInitialized(): boolean {
  return initialized;
}

/**
 * Get cache statistics
 */
export async function getMobileCacheStats() {
  return await mobileOfflineCache.getCacheStats();
}

/**
 * Sync mobile data
 */
export async function syncMobileData(): Promise<boolean> {
  return await mobileDataSync.forceSyncNow();
}

/**
 * Clear mobile cache
 */
export async function clearMobileCache(): Promise<void> {
  await mobileDataSync.clearCache();
}

