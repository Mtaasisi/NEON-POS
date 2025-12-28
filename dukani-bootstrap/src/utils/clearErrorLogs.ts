/**
 * Utility to clear error logs from localStorage
 * Use this when localStorage is filled with error logs causing QuotaExceeded errors
 */

export function clearErrorLogsFromStorage(): {
  cleared: number;
  freedSpace: number;
} {
  let cleared = 0;
  let freedSpace = 0;

  try {
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      // Clear error log entries
      if (key.startsWith('error_log_') || 
          key.startsWith('error-') || 
          key.includes('ErrorLog') ||
          key.includes('error_export')) {
        try {
          const size = localStorage.getItem(key)?.length || 0;
          localStorage.removeItem(key);
          cleared++;
          freedSpace += size;
        } catch (err) {
          console.warn(`Failed to remove ${key}:`, err);
        }
      }
    }

    console.log(`✅ Cleared ${cleared} error log entries, freed ~${(freedSpace / 1024).toFixed(2)} KB`);
    
    return { cleared, freedSpace };
  } catch (err) {
    console.error('Failed to clear error logs:', err);
    return { cleared, freedSpace };
  }
}

/**
 * Clear ALL localStorage (use with caution)
 */
export function clearAllStorage(): void {
  const confirmed = confirm(
    'This will clear ALL localStorage data. Are you sure? This cannot be undone.'
  );
  
  if (confirmed) {
    localStorage.clear();
    console.log('✅ All localStorage cleared');
    alert('localStorage cleared. Please refresh the page.');
  }
}

/**
 * Get storage usage information
 */
export function getStorageInfo(): {
  used: number;
  usedKB: string;
  usedMB: string;
  itemCount: number;
  errorLogCount: number;
  largestItems: Array<{ key: string; size: number; sizeKB: string }>;
} {
  let totalSize = 0;
  let errorLogCount = 0;
  const items: Array<{ key: string; size: number; sizeKB: string }> = [];

  const keys = Object.keys(localStorage);
  
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) {
      const size = value.length;
      totalSize += size;
      items.push({
        key,
        size,
        sizeKB: (size / 1024).toFixed(2)
      });
      
      if (key.startsWith('error_log_') || key.startsWith('error-')) {
        errorLogCount++;
      }
    }
  }

  // Sort by size descending
  items.sort((a, b) => b.size - a.size);

  return {
    used: totalSize,
    usedKB: (totalSize / 1024).toFixed(2),
    usedMB: (totalSize / 1024 / 1024).toFixed(2),
    itemCount: keys.length,
    errorLogCount,
    largestItems: items.slice(0, 10) // Top 10 largest items
  };
}

// Add to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).clearErrorLogs = clearErrorLogsFromStorage;
  (window as any).clearAllStorage = clearAllStorage;
  (window as any).getStorageInfo = getStorageInfo;
  
  console.log(`
🧹 Storage Cleanup Utilities Available:
  - clearErrorLogs() - Clear error logs from localStorage
  - getStorageInfo() - View storage usage
  - clearAllStorage() - Clear ALL localStorage (use with caution)
  `);
}

