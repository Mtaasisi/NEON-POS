/**
 * Workflow Optimization Service
 * Optimizes common workflows for maximum performance
 */

import { supabase } from '../lib/supabaseClient';
import { productCacheService } from '../lib/productCacheService';
import { customerCacheService } from '../lib/customerCacheService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class WorkflowOptimizationService {
  private productCache: Map<string, CacheEntry<any>> = new Map();
  private variantCache: Map<string, CacheEntry<any>> = new Map();
  private customerCache: Map<string, CacheEntry<any>> = new Map();
  private stockCache: Map<string, CacheEntry<number>> = new Map();
  
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly STOCK_CACHE_DURATION = 30 * 1000; // 30 seconds for stock (changes frequently)
  
  // Request batching
  private pendingStockChecks: Map<string, Promise<any>> = new Map();
  private pendingProductFetches: Map<string, Promise<any>> = new Map();
  
  /**
   * Fast stock check with aggressive caching
   */
  async checkStockFast(variantId: string): Promise<number> {
    // Check cache first
    const cached = this.stockCache.get(variantId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    // Check if request is already in flight
    if (this.pendingStockChecks.has(variantId)) {
      const result = await this.pendingStockChecks.get(variantId);
      return result?.quantity || 0;
    }

    // Create new request
    const stockPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('lats_product_variants')
          .select('quantity')
          .eq('id', variantId)
          .single();

        if (error || !data) return 0;

        const quantity = data.quantity || 0;
        
        // Cache result
        this.stockCache.set(variantId, {
          data: quantity,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.STOCK_CACHE_DURATION,
        });

        return quantity;
      } catch (error) {
        console.error('Stock check error:', error);
        return 0;
      } finally {
        this.pendingStockChecks.delete(variantId);
      }
    })();

    this.pendingStockChecks.set(variantId, stockPromise);
    return await stockPromise;
  }

  /**
   * Fast product fetch with caching
   */
  async getProductFast(productId: string): Promise<any | null> {
    // Check cache first
    const cached = this.productCache.get(productId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    // Check if request is already in flight
    if (this.pendingProductFetches.has(productId)) {
      return await this.pendingProductFetches.get(productId);
    }

    // Create new request
    const productPromise = (async () => {
      try {
        // Try local cache first
        const localProducts = productCacheService.getProducts();
        const localProduct = localProducts.find(p => p.id === productId);
        if (localProduct) {
          this.productCache.set(productId, {
            data: localProduct,
            timestamp: Date.now(),
            expiresAt: Date.now() + this.CACHE_DURATION,
          });
          return localProduct;
        }

        // Fetch from database
        const { data, error } = await supabase
          .from('lats_products')
          .select('*')
          .eq('id', productId)
          .single();

        if (error || !data) return null;

        // Cache result
        this.productCache.set(productId, {
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.CACHE_DURATION,
        });

        return data;
      } catch (error) {
        console.error('Product fetch error:', error);
        return null;
      } finally {
        this.pendingProductFetches.delete(productId);
      }
    })();

    this.pendingProductFetches.set(productId, productPromise);
    return await productPromise;
  }

  /**
   * Fast variant fetch with caching
   */
  async getVariantFast(variantId: string): Promise<any | null> {
    // Check cache first
    const cached = this.variantCache.get(variantId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    try {
      // Note: childVariantsCacheService only caches child variants, not parent variants
      // So we skip that check and go straight to database query

      // Fetch from database
      const { data, error } = await supabase
        .from('lats_product_variants')
        .select('*')
        .eq('id', variantId)
        .single();

      if (error || !data) return null;

      // Cache result
      this.variantCache.set(variantId, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.CACHE_DURATION,
      });

      return data;
    } catch (error) {
      console.error('Variant fetch error:', error);
      return null;
    }
  }

  /**
   * Fast customer fetch with caching
   */
  async getCustomerFast(customerId: string): Promise<any | null> {
    // Check cache first
    const cached = this.customerCache.get(customerId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    try {
      // Try local cache first
      const localCustomers = customerCacheService.getCustomers();
      const localCustomer = localCustomers.find(c => c.id === customerId);
      if (localCustomer) {
        this.customerCache.set(customerId, {
          data: localCustomer,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.CACHE_DURATION,
        });
        return localCustomer;
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error || !data) return null;

      // Cache result
      this.customerCache.set(customerId, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.CACHE_DURATION,
      });

      return data;
    } catch (error) {
      console.error('Customer fetch error:', error);
      return null;
    }
  }

  /**
   * Batch stock checks for multiple variants
   */
  async batchCheckStock(variantIds: string[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    const uncachedIds: string[] = [];

    // Check cache first
    for (const id of variantIds) {
      const cached = this.stockCache.get(id);
      if (cached && Date.now() < cached.expiresAt) {
        results.set(id, cached.data);
      } else {
        uncachedIds.push(id);
      }
    }

    // Batch fetch uncached items
    if (uncachedIds.length > 0) {
      try {
        const { data, error } = await supabase
          .from('lats_product_variants')
          .select('id, quantity')
          .in('id', uncachedIds);

        if (!error && data) {
          for (const variant of data) {
            const quantity = variant.quantity || 0;
            results.set(variant.id, quantity);
            
            // Cache result
            this.stockCache.set(variant.id, {
              data: quantity,
              timestamp: Date.now(),
              expiresAt: Date.now() + this.STOCK_CACHE_DURATION,
            });
          }
        }
      } catch (error) {
        console.error('Batch stock check error:', error);
      }
    }

    return results;
  }

  /**
   * Invalidate cache for a specific variant (after stock update)
   */
  invalidateVariantCache(variantId: string): void {
    this.variantCache.delete(variantId);
    this.stockCache.delete(variantId);
  }

  /**
   * Invalidate stock cache for multiple variants (after batch stock update)
   */
  invalidateStockCache(variantIds: string[]): void {
    for (const variantId of variantIds) {
      this.stockCache.delete(variantId);
      // Also invalidate variant cache to ensure fresh data on next fetch
      this.variantCache.delete(variantId);
    }
  }

  /**
   * Invalidate cache for a specific product
   */
  invalidateProductCache(productId: string): void {
    this.productCache.delete(productId);
  }

  /**
   * Invalidate cache for a specific customer
   */
  invalidateCustomerCache(customerId: string): void {
    this.customerCache.delete(customerId);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.productCache.clear();
    this.variantCache.clear();
    this.customerCache.clear();
    this.stockCache.clear();
    this.pendingStockChecks.clear();
    this.pendingProductFetches.clear();
  }

  /**
   * Preload common data for faster workflows
   */
  async preloadWorkflowData(productIds?: string[], variantIds?: string[]): Promise<void> {
    const promises: Promise<any>[] = [];

    if (productIds && productIds.length > 0) {
      // Batch fetch products
      promises.push(
        supabase
          .from('lats_products')
          .select('*')
          .in('id', productIds)
          .then(({ data, error }) => {
            if (!error && data) {
              data.forEach(product => {
                this.productCache.set(product.id, {
                  data: product,
                  timestamp: Date.now(),
                  expiresAt: Date.now() + this.CACHE_DURATION,
                });
              });
            }
          })
      );
    }

    if (variantIds && variantIds.length > 0) {
      // Batch fetch variants and stock
      promises.push(
        supabase
          .from('lats_product_variants')
          .select('*')
          .in('id', variantIds)
          .then(({ data, error }) => {
            if (!error && data) {
              data.forEach(variant => {
                this.variantCache.set(variant.id, {
                  data: variant,
                  timestamp: Date.now(),
                  expiresAt: Date.now() + this.CACHE_DURATION,
                });
                
                this.stockCache.set(variant.id, {
                  data: variant.quantity || 0,
                  timestamp: Date.now(),
                  expiresAt: Date.now() + this.STOCK_CACHE_DURATION,
                });
              });
            }
          })
      );
    }

    await Promise.allSettled(promises);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      products: this.productCache.size,
      variants: this.variantCache.size,
      customers: this.customerCache.size,
      stock: this.stockCache.size,
      pendingRequests: this.pendingStockChecks.size + this.pendingProductFetches.size,
    };
  }
}

export const workflowOptimizationService = new WorkflowOptimizationService();

