/**
 * Customer Cache Service
 * Implements localStorage caching for faster customer selection
 */

interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
}

const CACHE_VERSION = '1.2'; // Updated to force cache refresh for branch labels with proper JOIN
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

class CustomerCacheService {
  private static readonly CUSTOMERS_KEY = 'pos_customers_cache';
  
  /**
   * Save customers to localStorage
   */
  saveCustomers(customers: any[]): void {
    try {
      const cached: CachedData<any[]> = {
        data: customers,
        timestamp: Date.now(),
        version: CACHE_VERSION
      };
      localStorage.setItem(CustomerCacheService.CUSTOMERS_KEY, JSON.stringify(cached));
      console.log(`✅ [CustomerCache] Saved ${customers.length} customers to localStorage`);
    } catch (error) {
      console.warn('⚠️ [CustomerCache] Failed to save customers:', error);
    }
  }
  
  /**
   * Get customers from localStorage
   */
  getCustomers(): any[] | null {
    try {
      const cached = localStorage.getItem(CustomerCacheService.CUSTOMERS_KEY);
      if (!cached) {
        console.log('📭 [CustomerCache] No cached customers found');
        return null;
      }
      
      const data: CachedData<any[]> = JSON.parse(cached);
      
      // Check version
      if (data.version !== CACHE_VERSION) {
        console.log('🔄 [CustomerCache] Cache version mismatch, invalidating');
        this.clearCustomers();
        return null;
      }
      
      // Check expiry
      const age = Date.now() - data.timestamp;
      if (age > CACHE_DURATION) {
        console.log(`⏰ [CustomerCache] Cache expired (${Math.round(age / 1000)}s old)`);
        this.clearCustomers();
        return null;
      }
      
      console.log(`⚡ [CustomerCache] Using cached customers (${Math.round(age / 1000)}s old, ${data.data.length} customers)`);
      return data.data;
    } catch (error) {
      console.warn('⚠️ [CustomerCache] Failed to read customers cache:', error);
      return null;
    }
  }
  
  /**
   * Clear customers cache
   */
  clearCustomers(): void {
    localStorage.removeItem(CustomerCacheService.CUSTOMERS_KEY);
    console.log('🗑️ [CustomerCache] Cleared customers cache');
  }
  
  /**
   * Get cache age in milliseconds
   */
  getCacheAge(): number {
    try {
      const cached = localStorage.getItem(CustomerCacheService.CUSTOMERS_KEY);
      if (!cached) return Infinity; // Return Infinity if no cache exists (always stale)
      
      const data: CachedData<any[]> = JSON.parse(cached);
      return Date.now() - data.timestamp; // Return age in milliseconds
    } catch {
      return Infinity; // Return Infinity on error (always stale)
    }
  }
}

export const customerCacheService = new CustomerCacheService();

