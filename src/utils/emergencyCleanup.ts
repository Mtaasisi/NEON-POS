/**
 * Emergency Cleanup Utility
 * 
 * Provides immediate cleanup functions for critical storage issues.
 * Auto-executes on catastrophic storage failures.
 */

import { clearErrorLogsFromStorage, getStorageInfo } from './clearErrorLogs';

/**
 * Emergency cleanup for quota exceeded errors
 */
export function emergencyCleanup(): void {
  console.log('🚨 EMERGENCY CLEANUP INITIATED...');
  
  try {
    const info = getStorageInfo();
    console.log(`📊 Before cleanup: ${info.usedMB} MB used, ${info.errorLogCount} error logs`);
    
    const result = clearErrorLogsFromStorage();
    console.log(`✅ Cleanup complete: Cleared ${result.cleared} items, freed ${(result.freedSpace / 1024).toFixed(2)} KB`);
    
    const infoAfter = getStorageInfo();
    console.log(`📊 After cleanup: ${infoAfter.usedMB} MB used, ${infoAfter.errorLogCount} error logs`);
    
    console.log('✅ Emergency cleanup successful! Please refresh the page.');
  } catch (error) {
    console.error('❌ Emergency cleanup failed:', error);
    console.log('💡 Try manual cleanup: Open DevTools → Application → Local Storage → Clear');
  }
}

/**
 * Detect and auto-fix quota exceeded errors
 */
function setupEmergencyHandler(): void {
  // Listen for quota exceeded errors
  const originalSetItem = Storage.prototype.setItem;
  
  Storage.prototype.setItem = function(key: string, value: string) {
    try {
      originalSetItem.call(this, key, value);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('🚨 QUOTA EXCEEDED! Running emergency cleanup...');
        emergencyCleanup();
        
        // Try again after cleanup
        try {
          originalSetItem.call(this, key, value);
          console.log('✅ Storage operation succeeded after cleanup');
        } catch (retryError) {
          console.error('❌ Storage still full after cleanup. Manual intervention required.');
          throw retryError;
        }
      } else {
        throw error;
      }
    }
  };
  
  console.log('✅ Emergency storage handler installed');
}

// Auto-install on import
if (typeof window !== 'undefined') {
  setupEmergencyHandler();
  
  // Make available in console
  (window as any).emergencyCleanup = emergencyCleanup;
  
  console.log('🛡️ Emergency cleanup utility loaded. Call emergencyCleanup() if needed.');
}

export default emergencyCleanup;

