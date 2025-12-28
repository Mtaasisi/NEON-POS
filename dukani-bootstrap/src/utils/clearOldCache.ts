/**
 * Clear Old Cache Utility
 * 
 * Clears old localStorage cache that was causing quota exceeded errors
 * This should be run once after the update to clean up old data
 */

export function clearOldLocalStorageCache() {
  try {
    const key = 'app-data-cache';
    const oldData = localStorage.getItem(key);
    
    if (oldData) {
      console.log('🗑️ [ClearCache] Found old localStorage cache, clearing...');
      
      // Parse to see what's stored
      try {
        const parsed = JSON.parse(oldData);
        console.log('📊 [ClearCache] Old cache size:', JSON.stringify(oldData).length, 'bytes');
        console.log('📦 [ClearCache] Old cache contained:', Object.keys(parsed.state || {}));
      } catch (e) {
        // Ignore parse errors
      }
      
      // Clear the old cache
      localStorage.removeItem(key);
      console.log('✅ [ClearCache] Old cache cleared successfully');
      
      return true;
    } else {
      console.log('ℹ️ [ClearCache] No old cache found');
      return false;
    }
  } catch (error) {
    console.error('❌ [ClearCache] Error clearing old cache:', error);
    return false;
  }
}

/**
 * Check localStorage usage
 */
export function checkLocalStorageUsage() {
  try {
    let totalSize = 0;
    const items: { key: string; size: number }[] = [];
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const itemSize = (localStorage.getItem(key) || '').length;
        totalSize += itemSize;
        items.push({ key, size: itemSize });
      }
    }
    
    // Sort by size
    items.sort((a, b) => b.size - a.size);
    
    console.log('📊 [LocalStorage] Total size:', (totalSize / 1024).toFixed(2), 'KB');
    console.log('📊 [LocalStorage] Top items:');
    items.slice(0, 5).forEach(item => {
      console.log(`   ${item.key}: ${(item.size / 1024).toFixed(2)} KB`);
    });
    
    return {
      totalSize,
      totalSizeKB: totalSize / 1024,
      items,
    };
  } catch (error) {
    console.error('❌ [LocalStorage] Error checking usage:', error);
    return null;
  }
}

/**
 * Clear all app-related localStorage except auth
 */
export function clearAppCache() {
  try {
    console.log('🗑️ [ClearCache] Clearing app cache...');
    
    const keysToKeep = [
      'supabase.auth.token',
      'sb-auth-token',
      // Add other auth-related keys here
    ];
    
    const keysToRemove: string[] = [];
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        if (!keysToKeep.some(k => key.includes(k))) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`   Removed: ${key}`);
    });
    
    console.log(`✅ [ClearCache] Cleared ${keysToRemove.length} items`);
    return true;
  } catch (error) {
    console.error('❌ [ClearCache] Error clearing app cache:', error);
    return false;
  }
}

// Auto-run on import to clear old cache
if (typeof window !== 'undefined') {
  const wasCleared = clearOldLocalStorageCache();
  
  if (wasCleared) {
    console.log('🎉 [ClearCache] Old localStorage cache has been cleared!');
    console.log('ℹ️ [ClearCache] Data is now stored in IndexedDB for better performance');
  }
}

