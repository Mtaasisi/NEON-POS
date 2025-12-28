import { supabase } from '../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../lib/branchAwareApi';

export interface StockLevel {
  productId: string;
  variantId: string;
  quantity: number;
  sku?: string;
  name?: string;
}

export interface ProductStockLevels {
  [productId: string]: StockLevel[];
}

/**
 * Real-time stock service for fetching current inventory levels
 */
export class RealTimeStockService {
  private static instance: RealTimeStockService;
  private stockCache: ProductStockLevels = {};
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 60000; // 60 seconds (increased for POS performance)

  private constructor() {}

  static getInstance(): RealTimeStockService {
    if (!RealTimeStockService.instance) {
      RealTimeStockService.instance = new RealTimeStockService();
    }
    return RealTimeStockService.instance;
  }

  /**
   * Validate if a string is a valid UUID
   */
  private isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Get stock levels for multiple products
   * @param productIds Array of product IDs to fetch stock for
   * @returns Object mapping product IDs to their stock levels
   */
  async getStockLevels(productIds: string[]): Promise<ProductStockLevels> {
    try {
      // Check cache first
      const now = Date.now();
      const cachedResults: ProductStockLevels = {};
      const uncachedIds: string[] = [];

      productIds.forEach(id => {
        if (this.stockCache[id] && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
          cachedResults[id] = this.stockCache[id];
        } else {
          uncachedIds.push(id);
        }
      });

      // If all results are cached, return them
      if (uncachedIds.length === 0) {
        if (import.meta.env.MODE === 'development') {

        }
        return cachedResults;
      }

      if (import.meta.env.MODE === 'development') {

      }

      // Filter out invalid UUIDs (e.g., sample products)
      const validUncachedIds = uncachedIds.filter(id => this.isValidUUID(id));
      const invalidIds = uncachedIds.filter(id => !this.isValidUUID(id));

      // For invalid IDs (sample products), return empty stock arrays immediately
      const invalidResults: ProductStockLevels = {};
      invalidIds.forEach(id => {
        invalidResults[id] = [];
      });

      // If no valid IDs to query, return cached + invalid results
      if (validUncachedIds.length === 0) {
        return { ...cachedResults, ...invalidResults };
      }

      // Get current branch ID for filtering
      const currentBranchId = getCurrentBranchId();
      
      // Get branch settings to check share_inventory flag
      let branchSettings: any = null;
      if (currentBranchId) {
        try {
          const { data } = await supabase
            .from('store_locations')
            .select('data_isolation_mode, share_inventory')
            .eq('id', currentBranchId)
            .single();
          branchSettings = data;
        } catch (err) {
          console.warn('⚠️ [RealTimeStockService] Could not fetch branch settings');
        }
      }
      
      // Fetch variants for the uncached products, filtered by current branch + shared
      // 🔧 FIX: Exclude IMEI children (only fetch parent variants)
      let query = supabase
        .from('lats_product_variants')
        .select('id, product_id, sku, name, variant_name, quantity, branch_id, is_shared')  // 🔧 FIX: Select both name columns
        .in('product_id', validUncachedIds)
        .is('parent_variant_id', null)  // ✅ FIX: Exclude IMEI children
        .eq('is_active', true);  // Only active variants

      // Apply branch filter based on share_inventory setting
      if (currentBranchId && branchSettings) {
        if (branchSettings.data_isolation_mode === 'isolated') {
          // ISOLATED MODE: Only show variants from this branch (ignore is_shared flag)
          query = query.eq('branch_id', currentBranchId);
          console.log(`🔒 [RealTimeStockService] ISOLATED MODE - Variants: Only showing from branch ${currentBranchId}`);
        } else if (branchSettings.data_isolation_mode === 'shared') {
          // SHARED MODE: Show all variants (no filter)
          console.log(`📊 [RealTimeStockService] SHARED MODE - Variants: Showing all variants`);
        } else if (branchSettings.data_isolation_mode === 'hybrid') {
          // HYBRID MODE: Check share_inventory flag
          if (branchSettings.share_inventory) {
            // Inventory is shared - show this branch's variants + shared variants
            query = query.or(`branch_id.eq.${currentBranchId},is_shared.eq.true,branch_id.is.null`);
            console.log(`⚖️ [RealTimeStockService] HYBRID MODE - Variants are SHARED - Showing branch ${currentBranchId} + shared variants`);
          } else {
            // Inventory is NOT shared - only show this branch's variants
            query = query.eq('branch_id', currentBranchId);
            console.log(`⚖️ [RealTimeStockService] HYBRID MODE - Variants are NOT SHARED - Only showing branch ${currentBranchId}`);
          }
        }
      } else if (currentBranchId) {
        // Default: show this branch's variants + unassigned variants
        query = query.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
      }

      const { data: variants, error } = await query;

      if (error) {
        console.error('❌ [RealTimeStockService] Error fetching stock levels:', error);
        throw error;
      }

      // Group variants by product ID
      const stockLevels: ProductStockLevels = {};
      
      variants?.forEach((variant: any) => {
        const productId = variant.product_id;
        if (!stockLevels[productId]) {
          stockLevels[productId] = [];
        }
        
        stockLevels[productId].push({
          productId,
          variantId: variant.id,
          quantity: variant.quantity || 0,
          sku: variant.sku || '',
          name: variant.variant_name || variant.name || ''  // ✅ FIX: Prioritize variant_name (DB column) first
        });
      });

      // Ensure all requested product IDs have an entry (even if empty)
      validUncachedIds.forEach(id => {
        if (!stockLevels[id]) {
          stockLevels[id] = [];
        }
      });

      // Update cache (only for valid IDs)
      Object.assign(this.stockCache, stockLevels);
      this.cacheTimestamp = now;

      // Log stock summary per product

      Object.entries(stockLevels).forEach(([productId, levels]) => {
        const totalStock = levels.reduce((sum, level) => sum + level.quantity, 0);
        // console.log removed}...: ${totalStock} units (${levels.length} variants)`);
      });

      // Merge cached, fresh, and invalid results
      return { ...cachedResults, ...stockLevels, ...invalidResults };
    } catch (error) {
      console.error('💥 [RealTimeStockService] Exception fetching stock levels:', error);
      // Return empty arrays for all requested products on error
      const emptyResult: ProductStockLevels = {};
      productIds.forEach(id => {
        emptyResult[id] = [];
      });
      return emptyResult;
    }
  }

  /**
   * Get stock level for a single product
   * @param productId Product ID to fetch stock for
   * @returns Array of stock levels for the product's variants
   */
  async getProductStock(productId: string): Promise<StockLevel[]> {
    const result = await this.getStockLevels([productId]);
    return result[productId] || [];
  }

  /**
   * Get stock level for a specific variant by SKU
   * @param sku SKU to fetch stock for
   * @returns Stock level for the variant or null if not found
   */
  async getStockBySKU(sku: string): Promise<StockLevel | null> {
    try {
      if (import.meta.env.MODE === 'development') {

      }

      // Get current branch ID for filtering
      const currentBranchId = getCurrentBranchId();
      


      let query = supabase
        .from('lats_product_variants')
        .select('id, product_id, sku, name, variant_name, quantity, branch_id, is_shared')  // 🔧 FIX: Select both name columns
        .eq('sku', sku);

      // Apply branch filter if branch ID exists (include shared variants)
      if (currentBranchId) {

        query = query.or(`branch_id.eq.${currentBranchId},is_shared.eq.true`);
      } else {

      }

      const { data: variant, error } = await query.single();

      if (error || !variant) {
        return null;
      }

      return {
        productId: variant.product_id,
        variantId: variant.id,
        quantity: variant.quantity || 0,
        sku: variant.sku || '',
        name: variant.variant_name || variant.name || ''  // ✅ FIX: Prioritize variant_name (DB column) first
      };
    } catch (error) {
      console.error('💥 [RealTimeStockService] Exception fetching stock by SKU:', error);
      return null;
    }
  }

  /**
   * Clear the cache to force fresh data on next fetch
   */
  clearCache(): void {
    this.stockCache = {};
    this.cacheTimestamp = 0;
    if (import.meta.env.MODE === 'development') {

    }
  }

  /**
   * Get total stock quantity for a product (sum of all variants)
   * @param productId Product ID
   * @returns Total stock quantity
   */
  async getTotalStock(productId: string): Promise<number> {
    const stockLevels = await this.getProductStock(productId);
    return stockLevels.reduce((total, level) => total + level.quantity, 0);
  }
}

