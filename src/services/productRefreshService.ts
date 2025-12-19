/**
 * Product Refresh Service
 * Handles automatic data refresh after product operations (create, update, delete)
 * Ensures changes are immediately visible in the UI
 */

import { useInventoryStore } from '../features/lats/stores/useInventoryStore';

export class ProductRefreshService {
  private static instance: ProductRefreshService;

  static getInstance(): ProductRefreshService {
    if (!ProductRefreshService.instance) {
      ProductRefreshService.instance = new ProductRefreshService();
    }
    return ProductRefreshService.instance;
  }

  /**
   * Refresh inventory data after product operations
   * This ensures changes are immediately visible in the UI
   */
  async refreshAfterProductOperation(operation: 'create' | 'update' | 'delete' = 'update'): Promise<void> {
    try {
      console.log(`🔄 [ProductRefresh] Starting refresh after product ${operation}...`);

      const inventoryStore = useInventoryStore.getState();

      if (inventoryStore.forceRefreshProducts) {
        console.log('🔄 [ProductRefresh] Refreshing inventory store...');
        await inventoryStore.forceRefreshProducts();

        console.log(`✅ [ProductRefresh] Inventory refreshed successfully after product ${operation}`);
      } else {
        console.warn('⚠️ [ProductRefresh] forceRefreshProducts method not available');
      }

    } catch (error) {
      console.error(`❌ [ProductRefresh] Failed to refresh after product ${operation}:`, error);
      // Don't throw - refresh failures shouldn't break the operation
    }
  }

  /**
   * Refresh after product creation
   */
  async refreshAfterCreate(): Promise<void> {
    return this.refreshAfterProductOperation('create');
  }

  /**
   * Refresh after product update
   */
  async refreshAfterUpdate(): Promise<void> {
    return this.refreshAfterProductOperation('update');
  }

  /**
   * Refresh after product deletion
   */
  async refreshAfterDelete(): Promise<void> {
    return this.refreshAfterProductOperation('delete');
  }
}

// Export singleton instance and convenience functions
export const productRefreshService = ProductRefreshService.getInstance();

export const refreshAfterProductCreate = () => productRefreshService.refreshAfterCreate();
export const refreshAfterProductUpdate = () => productRefreshService.refreshAfterUpdate();
export const refreshAfterProductDelete = () => productRefreshService.refreshAfterDelete();