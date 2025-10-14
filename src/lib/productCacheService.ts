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
  private static readonly PRODUCTS_KEY = 'pos_products_cache';
  private static readonly CATEGORIES_KEY = 'pos_categories_cache';
  
  /**
   * Save products to localStorage
   */
  saveProducts(products: any[]): void {
    try {
      const cached: CachedData<any[]> = {
        data: products,
        timestamp: Date.now(),
        version: CACHE_VERSION
      };
      localStorage.setItem(ProductCacheService.PRODUCTS_KEY, JSON.stringify(cached));
      console.log(`✅ [Cache] Saved ${products.length} products to localStorage`);
    } catch (error) {
      console.warn('⚠️ [Cache] Failed to save products:', error);
    }
  }
  
  /**
   * Get products from localStorage
   */
  getProducts(): any[] | null {
    try {
      const cached = localStorage.getItem(ProductCacheService.PRODUCTS_KEY);
      if (!cached) {
        console.log('📭 [Cache] No cached products found');
        return null;
      }
      
      const data: CachedData<any[]> = JSON.parse(cached);
      
      // Check version
      if (data.version !== CACHE_VERSION) {
        console.log('🔄 [Cache] Cache version mismatch, invalidating');
        this.clearProducts();
        return null;
      }
      
      // Check expiry
      const age = Date.now() - data.timestamp;
      if (age > CACHE_DURATION) {
        console.log(`⏰ [Cache] Cache expired (${Math.round(age / 1000)}s old)`);
        this.clearProducts();
        return null;
      }
      
      console.log(`⚡ [Cache] Using cached products (${Math.round(age / 1000)}s old)`);
      return data.data;
    } catch (error) {
      console.warn('⚠️ [Cache] Failed to read products cache:', error);
      return null;
    }
  }
  
  /**
   * Save categories to localStorage
   */
  saveCategories(categories: any[]): void {
    try {
      const cached: CachedData<any[]> = {
        data: categories,
        timestamp: Date.now(),
        version: CACHE_VERSION
      };
      localStorage.setItem(ProductCacheService.CATEGORIES_KEY, JSON.stringify(cached));
      console.log(`✅ [Cache] Saved ${categories.length} categories to localStorage`);
    } catch (error) {
      console.warn('⚠️ [Cache] Failed to save categories:', error);
    }
  }
  
  /**
   * Get categories from localStorage
   */
  getCategories(): any[] | null {
    try {
      const cached = localStorage.getItem(ProductCacheService.CATEGORIES_KEY);
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
      
      console.log(`⚡ [Cache] Using cached categories (${Math.round(age / 1000)}s old)`);
      return data.data;
    } catch (error) {
      console.warn('⚠️ [Cache] Failed to read categories cache:', error);
      return null;
    }
  }
  
  /**
   * Clear products cache
   */
  clearProducts(): void {
    localStorage.removeItem(ProductCacheService.PRODUCTS_KEY);
    console.log('🗑️ [Cache] Cleared products cache');
  }
  
  /**
   * Clear categories cache
   */
  clearCategories(): void {
    localStorage.removeItem(ProductCacheService.CATEGORIES_KEY);
    console.log('🗑️ [Cache] Cleared categories cache');
  }
  
  /**
   * Clear all caches
   */
  clearAll(): void {
    this.clearProducts();
    this.clearCategories();
    console.log('🗑️ [Cache] Cleared all caches');
  }
}

export const productCacheService = new ProductCacheService();

