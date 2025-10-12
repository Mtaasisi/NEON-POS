import { supabase } from '../../../lib/supabaseClient';

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
  private readonly CACHE_DURATION = 30000; // 30 seconds

  private constructor() {}

  static getInstance(): RealTimeStockService {
    if (!RealTimeStockService.instance) {
      RealTimeStockService.instance = new RealTimeStockService();
    }
    return RealTimeStockService.instance;
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
          console.log('📦 [RealTimeStockService] Using cached stock levels');
        }
        return cachedResults;
      }

      if (import.meta.env.MODE === 'development') {
        console.log('🔍 [RealTimeStockService] Fetching stock levels for:', uncachedIds);
      }

      // Fetch variants for the uncached products
      const { data: variants, error } = await supabase
        .from('lats_product_variants')
        .select('id, product_id, sku, name, quantity')
        .in('product_id', uncachedIds);

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
          name: variant.name || ''
        });
      });

      // Ensure all requested product IDs have an entry (even if empty)
      uncachedIds.forEach(id => {
        if (!stockLevels[id]) {
          stockLevels[id] = [];
        }
      });

      // Update cache
      Object.assign(this.stockCache, stockLevels);
      this.cacheTimestamp = now;

      if (import.meta.env.MODE === 'development') {
        console.log('📦 [RealTimeStockService] Stock levels fetched:', stockLevels);
      }

      // Merge cached and fresh results
      return { ...cachedResults, ...stockLevels };
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
        console.log('🔍 [RealTimeStockService] Fetching stock for SKU:', sku);
      }

      const { data: variant, error } = await supabase
        .from('lats_product_variants')
        .select('id, product_id, sku, name, quantity')
        .eq('sku', sku)
        .single();

      if (error || !variant) {
        return null;
      }

      return {
        productId: variant.product_id,
        variantId: variant.id,
        quantity: variant.quantity || 0,
        sku: variant.sku || '',
        name: variant.name || ''
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
      console.log('🗑️ [RealTimeStockService] Cache cleared');
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

