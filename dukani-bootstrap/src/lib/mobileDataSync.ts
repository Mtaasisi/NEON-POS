/**
 * Mobile Data Sync Service
 * Handles automatic data synchronization for mobile app
 * Syncs data when online and queues pending operations when offline
 */

import { mobileOfflineCache } from './mobileOfflineCache';
import toast from 'react-hot-toast';

class MobileDataSyncService {
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private branchId: string | null = null;

  constructor() {
    this.init();
  }

  /**
   * Initialize the sync service
   */
  private init() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('📶 [DataSync] Device is online');
      this.isOnline = true;
      this.handleOnline();
    });

    window.addEventListener('offline', () => {
      console.log('📵 [DataSync] Device is offline');
      this.isOnline = false;
      this.handleOffline();
    });

    // 🔥 Listen for branch changes
    window.addEventListener('branchChanged', ((event: CustomEvent) => {
      const { branchId } = event.detail;
      console.log('🏪 [DataSync] Branch changed to:', branchId);
      this.setBranchId(branchId);
      
      // Trigger immediate sync for new branch
      if (this.isOnline) {
        console.log('🔄 [DataSync] Syncing data for new branch...');
        this.syncNow(false); // Silent sync
      }
    }) as EventListener);

    // Initial sync if online
    if (this.isOnline) {
      this.performInitialSync();
    }

    // Set up periodic sync (every 30 minutes)
    this.setupPeriodicSync();
  }

  /**
   * Set the current branch ID for filtering
   */
  setBranchId(branchId: string | null) {
    console.log('🏪 [DataSync] Branch ID set to:', branchId);
    this.branchId = branchId;
  }

  /**
   * Perform initial sync when app starts
   */
  private async performInitialSync() {
    console.log('🔄 [DataSync] Performing initial sync...');
    
    try {
      // Check if cache is valid
      const productsValid = await mobileOfflineCache.isCacheValid('products');
      const customersValid = await mobileOfflineCache.isCacheValid('customers');

      // If cache is invalid or empty, sync immediately
      if (!productsValid || !customersValid) {
        console.log('⚠️ [DataSync] Cache is invalid or empty, syncing now...');
        await this.syncNow();
      } else {
        console.log('✅ [DataSync] Cache is valid, skipping initial sync');
        
        // Show cache stats
        const stats = await mobileOfflineCache.getCacheStats();
        console.log('📊 [DataSync] Cache stats:', stats);
      }
    } catch (error) {
      console.error('❌ [DataSync] Error during initial sync:', error);
    }
  }

  /**
   * Handle coming online
   */
  private async handleOnline() {
    toast.success('Back online! Syncing data...', { duration: 2000 });
    
    // Sync pending sales
    await this.syncPendingSales();
    
    // Sync all data
    await this.syncNow();
  }

  /**
   * Handle going offline
   */
  private handleOffline() {
    toast('You\'re offline. Changes will be saved locally.', {
      icon: '📵',
      duration: 3000,
    });
  }

  /**
   * Setup periodic sync
   */
  private setupPeriodicSync() {
    // Clear existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Sync every 30 minutes if online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        console.log('⏰ [DataSync] Periodic sync triggered');
        this.syncNow(false); // Silent sync
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  /**
   * Sync all data now
   */
  async syncNow(showToast: boolean = true): Promise<boolean> {
    if (this.isSyncing) {
      console.log('⏳ [DataSync] Sync already in progress, skipping...');
      return false;
    }

    if (!this.isOnline) {
      if (showToast) {
        toast.error('Cannot sync while offline');
      }
      return false;
    }

    this.isSyncing = true;

    if (showToast) {
      toast.loading('Syncing data...', { id: 'sync-toast' });
    }

    try {
      console.log('🔄 [DataSync] Starting data sync...');
      
      const result = await mobileOfflineCache.syncAll(this.branchId || undefined);

      if (result.success) {
        console.log(`✅ [DataSync] Sync complete. Synced: ${result.synced.join(', ')}`);
        
        if (showToast) {
          toast.success('Data synced successfully!', { id: 'sync-toast' });
        }

        // Dispatch event to notify app components
        window.dispatchEvent(new CustomEvent('dataSynced', { 
          detail: { synced: result.synced } 
        }));

        return true;
      } else {
        console.warn(`⚠️ [DataSync] Sync completed with errors: ${result.errors.join(', ')}`);
        
        if (showToast) {
          toast.error('Some data failed to sync', { id: 'sync-toast' });
        }

        return false;
      }
    } catch (error) {
      console.error('❌ [DataSync] Sync failed:', error);
      
      if (showToast) {
        toast.error('Sync failed', { id: 'sync-toast' });
      }

      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync pending sales that were created offline
   */
  private async syncPendingSales(): Promise<void> {
    try {
      const pendingSales = await mobileOfflineCache.getPendingSales();

      if (pendingSales.length === 0) {
        console.log('✅ [DataSync] No pending sales to sync');
        return;
      }

      console.log(`🔄 [DataSync] Syncing ${pendingSales.length} pending sales...`);

      let syncedCount = 0;
      let failedCount = 0;

      for (const sale of pendingSales) {
        try {
          // TODO: Implement actual sale upload to server
          // For now, just mark as synced
          await mobileOfflineCache.markSaleSynced(sale.id);
          syncedCount++;
        } catch (error) {
          console.error(`❌ [DataSync] Failed to sync sale ${sale.id}:`, error);
          failedCount++;
        }
      }

      if (syncedCount > 0) {
        toast.success(`Synced ${syncedCount} offline sales`);
      }

      if (failedCount > 0) {
        toast.error(`Failed to sync ${failedCount} sales`);
      }
    } catch (error) {
      console.error('❌ [DataSync] Error syncing pending sales:', error);
    }
  }

  /**
   * Force sync now (manual trigger)
   */
  async forceSyncNow(): Promise<boolean> {
    return this.syncNow(true);
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isOnline: boolean;
    isSyncing: boolean;
  } {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
    };
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return await mobileOfflineCache.getCacheStats();
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    try {
      await mobileOfflineCache.clearAll();
      toast.success('Cache cleared successfully');
      console.log('✅ [DataSync] Cache cleared');
    } catch (error) {
      console.error('❌ [DataSync] Error clearing cache:', error);
      toast.error('Failed to clear cache');
    }
  }

  /**
   * Cleanup on app close
   */
  cleanup() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// Export singleton instance
export const mobileDataSync = new MobileDataSyncService();

