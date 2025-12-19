/**
 * Branch Sync Service
 * Handles automatic data synchronization when switching branches
 * Ensures all stores are refreshed with latest data from the new branch
 */

import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

export interface SyncResult {
  success: boolean;
  errors: string[];
  refreshedStores: string[];
  duration: number;
}

export class BranchSyncService {
  private static instance: BranchSyncService;

  static getInstance(): BranchSyncService {
    if (!BranchSyncService.instance) {
      BranchSyncService.instance = new BranchSyncService();
    }
    return BranchSyncService.instance;
  }

  /**
   * Sync all data stores when switching branches
   * @param branchId The new branch ID
   * @param branchName The new branch name (for logging)
   */
  async syncOnBranchSwitch(branchId: string, branchName: string): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const refreshedStores: string[] = [];

    console.log(`🔄 [BranchSync] Starting automatic sync for branch: ${branchName} (${branchId})`);

    try {
      // Step 1: Clear all caches (already done in BranchContext, but ensure it's complete)
      await this.clearAllCaches();
      refreshedStores.push('caches');

      // Step 2: Refresh Inventory Store (products, categories, suppliers, etc.)
      try {
        await this.refreshInventoryStore();
        refreshedStores.push('inventory');
        console.log('✅ [BranchSync] Inventory store refreshed');
      } catch (error) {
        const errorMsg = `Failed to refresh inventory: ${error.message}`;
        console.error('❌ [BranchSync]', errorMsg);
        errors.push(errorMsg);
      }

      // Step 3: Refresh POS Store (sales, cart, payment methods)
      try {
        await this.refreshPOSStore();
        refreshedStores.push('pos');
        console.log('✅ [BranchSync] POS store refreshed');
      } catch (error) {
        const errorMsg = `Failed to refresh POS: ${error.message}`;
        console.error('❌ [BranchSync]', errorMsg);
        errors.push(errorMsg);
      }

      // Step 4: Refresh Purchase Order Store
      try {
        await this.refreshPurchaseOrderStore();
        refreshedStores.push('purchase-orders');
        console.log('✅ [BranchSync] Purchase order store refreshed');
      } catch (error) {
        const errorMsg = `Failed to refresh purchase orders: ${error.message}`;
        console.error('❌ [BranchSync]', errorMsg);
        errors.push(errorMsg);
      }

      // Step 5: Refresh Customer Data (if using global data store)
      try {
        await this.refreshCustomerData();
        refreshedStores.push('customers');
        console.log('✅ [BranchSync] Customer data refreshed');
      } catch (error) {
        const errorMsg = `Failed to refresh customers: ${error.message}`;
        console.error('❌ [BranchSync]', errorMsg);
        errors.push(errorMsg);
      }

      // Step 6: Refresh Admin Settings (branch-specific)
      try {
        await this.refreshAdminSettings();
        refreshedStores.push('admin-settings');
        console.log('✅ [BranchSync] Admin settings refreshed');
      } catch (error) {
        const errorMsg = `Failed to refresh admin settings: ${error.message}`;
        console.error('❌ [BranchSync]', errorMsg);
        errors.push(errorMsg);
      }

      // Step 7: Trigger any additional sync services
      try {
        await this.triggerAdditionalSync();
        refreshedStores.push('additional-sync');
        console.log('✅ [BranchSync] Additional sync services triggered');
      } catch (error) {
        const errorMsg = `Failed to trigger additional sync: ${error.message}`;
        console.error('❌ [BranchSync]', errorMsg);
        errors.push(errorMsg);
      }

    } catch (error) {
      const errorMsg = `Critical sync error: ${error.message}`;
      console.error('💥 [BranchSync]', errorMsg);
      errors.push(errorMsg);
    }

    const duration = Date.now() - startTime;
    const success = errors.length === 0;

    console.log(`🏆 [BranchSync] Sync completed in ${duration}ms - Success: ${success}, Errors: ${errors.length}`);

    if (!success) {
      toast.error(`Branch switch sync had ${errors.length} error(s). Some data may be stale.`);
    } else {
      toast.success(`Branch switched to ${branchName} - all data synced!`);
    }

    return {
      success,
      errors,
      refreshedStores,
      duration
    };
  }

  private async clearAllCaches(): Promise<void> {
    console.log('🧹 [BranchSync] Clearing all caches...');

    // Import and clear various cache services
    const cachePromises = [];

    // Product cache service - clear ALL branch caches to prevent cross-branch contamination
    cachePromises.push(
      import('../lib/productCacheService').then(({ productCacheService }) => {
        productCacheService.clearAllBranchCaches();
        console.log('✅ [BranchSync] All branch caches cleared');
      }).catch(err => console.warn('⚠️ [BranchSync] Failed to clear product cache:', err))
    );

    // Query cache
    cachePromises.push(
      import('../lib/queryCache').then(({ invalidateCachePattern }) => {
        invalidateCachePattern('.*'); // Clear all patterns
        console.log('✅ [BranchSync] Query cache cleared');
      }).catch(err => console.warn('⚠️ [BranchSync] Failed to clear query cache:', err))
    );

    // Enhanced cache manager
    cachePromises.push(
      import('../lib/enhancedCacheManager').then(({ smartCache }) => {
        return smartCache.clearAllCache();
      }).then(() => console.log('✅ [BranchSync] Enhanced cache cleared'))
      .catch(err => console.warn('⚠️ [BranchSync] Failed to clear enhanced cache:', err))
    );

    // Child variants cache
    cachePromises.push(
      import('../services/childVariantsCacheService').then(({ childVariantsCacheService }) => {
        if (childVariantsCacheService?.clear) {
          childVariantsCacheService.clear();
          console.log('✅ [BranchSync] Child variants cache cleared');
        }
      }).catch(err => console.warn('⚠️ [BranchSync] Failed to clear child variants cache:', err))
    );

    // Mobile offline cache
    cachePromises.push(
      import('../lib/mobileOfflineCache').then(({ mobileOfflineCache }) => {
        if (mobileOfflineCache?.clearProducts) {
          mobileOfflineCache.clearProducts();
          console.log('✅ [BranchSync] Mobile offline cache cleared');
        }
      }).catch(err => console.warn('⚠️ [BranchSync] Failed to clear mobile offline cache:', err))
    );

    // Data preload service
    cachePromises.push(
      import('../services/dataPreloadService').then(({ dataPreloadService }) => {
        if (dataPreloadService?.clearAll) {
          dataPreloadService.clearAll();
          console.log('✅ [BranchSync] Data preload cache cleared');
        }
      }).catch(err => console.warn('⚠️ [BranchSync] Failed to clear data preload cache:', err))
    );

    await Promise.allSettled(cachePromises);
  }

  private async refreshInventoryStore(): Promise<void> {
    // Import the inventory store and trigger refresh
    const { useInventoryStore } = await import('../features/lats/stores/useInventoryStore');

    // Get the store instance and force refresh
    const store = useInventoryStore.getState();
    if (store.forceRefreshProducts) {
      await store.forceRefreshProducts();
    }

    // Also refresh categories and suppliers if available
    if (store.loadCategories) {
      await store.loadCategories();
    }

    if (store.loadSuppliers) {
      await store.loadSuppliers();
    }
  }

  private async refreshPOSStore(): Promise<void> {
    // Import the POS store and refresh sales/recent data
    const { usePOSStore } = await import('../features/lats/stores/usePOSStore');

    const store = usePOSStore.getState();

    // Refresh sales data
    if (store.loadRecentSales) {
      await store.loadRecentSales();
    }

    // Clear cart (branch-specific)
    if (store.clearCart) {
      await store.clearCart();
    }

    // Load POS settings (branch-specific)
    if (store.loadPOSSettings) {
      await store.loadPOSSettings();
    }
  }

  private async refreshPurchaseOrderStore(): Promise<void> {
    // Import purchase order store
    const { usePurchaseOrderStore } = await import('../features/lats/stores/usePurchaseOrderStore');

    const store = usePurchaseOrderStore.getState();

    // Refresh purchase orders
    if (store.loadPurchaseOrders) {
      await store.loadPurchaseOrders();
    }
  }

  private async refreshCustomerData(): Promise<void> {
    // Import global data store if it has customer refresh methods
    const { useDataStore } = await import('../stores/useDataStore');

    const store = useDataStore.getState();

    // Refresh customers if the method exists
    if (store.loadCustomers) {
      await store.loadCustomers();
    }
  }

  private async refreshAdminSettings(): Promise<void> {
    // Refresh admin settings (branch-specific settings)
    try {
      const { adminSettingsApi } = await import('../lib/adminSettingsApi');

      // Force refresh settings for the new branch
      if (adminSettingsApi.loadSettings) {
        await adminSettingsApi.loadSettings(true); // true = force refresh
      }
    } catch (error) {
      console.warn('⚠️ [BranchSync] Admin settings refresh not available:', error);
    }
  }

  private async triggerAdditionalSync(): Promise<void> {
    // Trigger any additional sync services that might be running
    try {
      const { autoSyncService } = await import('./autoSyncService');

      if (autoSyncService?.triggerManualSync) {
        await autoSyncService.triggerManualSync();
      }
    } catch (error) {
      console.warn('⚠️ [BranchSync] Auto sync service not available:', error);
    }

    // Live inventory service not implemented yet
    // TODO: Add live inventory service when available
  }

  /**
   * Check if a branch switch sync is currently in progress
   */
  isSyncInProgress(): boolean {
    // Could implement a flag here if needed
    return false;
  }

  /**
   * Get the last sync result for debugging
   */
  getLastSyncResult(): SyncResult | null {
    // Could store last result in memory for debugging
    return null;
  }
}

// Export singleton instance
export const branchSyncService = BranchSyncService.getInstance();