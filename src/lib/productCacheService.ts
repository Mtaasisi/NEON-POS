/**
 * Product Cache Service
 * Implements localStorage caching for faster POS loading
 */

interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
}

const CACHE_VERSION = '1.0';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

class ProductCacheService {
  private static readonly PRODUCTS_KEY_PREFIX = 'pos_products_cache';
  private static readonly CATEGORIES_KEY_PREFIX = 'pos_categories_cache';

  /**
   * Get branch-specific cache key
   */
  private getBranchSpecificKey(baseKey: string): string {
    const currentBranchId = localStorage.getItem('current_branch_id') || 'global';
    return `${baseKey}_${currentBranchId}`;
  }
  
  /**
   * Save products to localStorage (branch-specific)
   */
  saveProducts(products: any[]): void {
    try {
      const cacheKey = this.getBranchSpecificKey(ProductCacheService.PRODUCTS_KEY_PREFIX);
      const currentBranchId = localStorage.getItem('current_branch_id') || 'global';

      // 🔍 DIAGNOSTIC: Check variant data before saving
      if (import.meta.env.DEV && products && products.length > 0) {
        const productsWithVariants = products.filter(p => p.variants && p.variants.length > 0).length;
        const totalVariants = products.reduce((sum, p) => sum + (p.variants?.length || 0), 0);
        console.log(`💾 [Cache:${currentBranchId}] Saving ${products.length} products to branch-specific cache:`, {
          withVariants: productsWithVariants,
          withoutVariants: products.length - productsWithVariants,
          totalVariants: totalVariants,
          cacheKey: cacheKey
        });
      }

      const cached: CachedData<any[]> = {
        data: products,
        timestamp: Date.now(),
        version: CACHE_VERSION
      };
      localStorage.setItem(cacheKey, JSON.stringify(cached));
    } catch (error) {
      console.warn('⚠️ [Cache] Failed to save products:', error);
    }
  }
  
  /**
   * Get products from localStorage (branch-specific)
   */
  getProducts(): any[] | null {
    try {
      const cacheKey = this.getBranchSpecificKey(ProductCacheService.PRODUCTS_KEY_PREFIX);
      const currentBranchId = localStorage.getItem('current_branch_id') || 'global';

      const cached = localStorage.getItem(cacheKey);
      if (!cached) {
        if (import.meta.env.DEV) {
          console.log(`ℹ️ [Cache:${currentBranchId}] No products cache found for branch (${cacheKey})`);
        }
        return null;
      }

      const data: CachedData<any[]> = JSON.parse(cached);

      // Check version
      if (data.version !== CACHE_VERSION) {
        console.log(`ℹ️ [Cache:${currentBranchId}] Cache version mismatch, clearing old cache`);
        this.clearProducts();
        return null;
      }

      // Check expiry
      const age = Date.now() - data.timestamp;
      if (age > CACHE_DURATION) {
        if (import.meta.env.DEV) {
          console.log(`ℹ️ [Cache:${currentBranchId}] Cache expired (${Math.round(age / 1000 / 60)} minutes old, max ${CACHE_DURATION / 1000 / 60} minutes)`);
        }
        this.clearProducts();
        return null;
      }

      if (import.meta.env.DEV) {
        const products = data.data || [];
        const productsWithVariants = products.filter((p: any) => p.variants && p.variants.length > 0).length;
        const totalVariants = products.reduce((sum: number, p: any) => sum + (p.variants?.length || 0), 0);
        console.log(`✅ [Cache:${currentBranchId}] Found ${products.length} cached products (${Math.round(age / 1000)} seconds old):`, {
          withVariants: productsWithVariants,
          withoutVariants: products.length - productsWithVariants,
          totalVariants: totalVariants,
          cacheKey: cacheKey
        });
      }
      return data.data;
    } catch (error) {
      console.warn('⚠️ [Cache] Failed to read products cache:', error);
      return null;
    }
  }
  
  /**
   * Save categories to localStorage (branch-specific)
   */
  saveCategories(categories: any[]): void {
    try {
      const cacheKey = this.getBranchSpecificKey(ProductCacheService.CATEGORIES_KEY_PREFIX);
      const cached: CachedData<any[]> = {
        data: categories,
        timestamp: Date.now(),
        version: CACHE_VERSION
      };
      localStorage.setItem(cacheKey, JSON.stringify(cached));
    } catch (error) {
      console.warn('⚠️ [Cache] Failed to save categories:', error);
    }
  }
  
  /**
   * Get categories from localStorage (branch-specific)
   */
  getCategories(): any[] | null {
    try {
      const cacheKey = this.getBranchSpecificKey(ProductCacheService.CATEGORIES_KEY_PREFIX);
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const data: CachedData<any[]> = JSON.parse(cached);

      if (data.version !== CACHE_VERSION) {
        this.clearCategories();
        return null;
      }

      const age = Date.now() - data.timestamp;
      if (age > CACHE_DURATION) {
        this.clearCategories();
        return null;
      }
      return data.data;
    } catch (error) {
      console.warn('⚠️ [Cache] Failed to read categories cache:', error);
      return null;
    }
  }
  
  /**
   * Clear products cache (branch-specific)
   */
  clearProducts(): void {
    const cacheKey = this.getBranchSpecificKey(ProductCacheService.PRODUCTS_KEY_PREFIX);
    localStorage.removeItem(cacheKey);

    if (import.meta.env.DEV) {
      const currentBranchId = localStorage.getItem('current_branch_id') || 'global';
      console.log(`🗑️ [Cache:${currentBranchId}] Products cache cleared for branch (${cacheKey})`);
    }
  }
  
  /**
   * Clear categories cache (branch-specific)
   */
  clearCategories(): void {
    const cacheKey = this.getBranchSpecificKey(ProductCacheService.CATEGORIES_KEY_PREFIX);
    localStorage.removeItem(cacheKey);
  }
  
  /**
   * Clear all caches (branch-specific)
   */
  clearAll(): void {
    this.clearProducts();
    this.clearCategories();

    if (import.meta.env.DEV) {
      const currentBranchId = localStorage.getItem('current_branch_id') || 'global';
      console.log(`🗑️ [Cache:${currentBranchId}] All caches cleared for branch`);
    }
  }

  /**
   * Clear cache (alias for clearAll for consistency with other services)
   */
  clearCache(): void {
    this.clearAll();
  }

  /**
   * Clear caches for all branches (useful when switching branches)
   */
  clearAllBranchCaches(): void {
    try {
      const keysToRemove: string[] = [];

      // Find all cache keys that match our patterns
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(`${ProductCacheService.PRODUCTS_KEY_PREFIX}_`) ||
                    key.startsWith(`${ProductCacheService.CATEGORIES_KEY_PREFIX}_`))) {
          keysToRemove.push(key);
        }
      }

      // Remove all branch-specific caches
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      if (import.meta.env.DEV) {
        console.log(`🗑️ [Cache] Cleared ${keysToRemove.length} branch-specific cache entries`);
      }
    } catch (error) {
      console.warn('⚠️ [Cache] Failed to clear all branch caches:', error);
    }
  }
}

export const productCacheService = new ProductCacheService();

