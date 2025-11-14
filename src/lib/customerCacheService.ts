/**
 * Customer Cache Service
 * Implements localStorage caching for faster customer selection with compression
 */

interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
  compressed?: boolean;
}

const CACHE_VERSION = '1.3'; // Updated to include compression and size limiting
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_SIZE = 4 * 1024 * 1024; // 4MB limit (safe for most browsers)
const MAX_CUSTOMERS = 1000; // Limit to prevent excessive storage usage

class CustomerCacheService {
  private static readonly CUSTOMERS_KEY = 'pos_customers_cache';
  
  /**
   * Save customers to localStorage with compression and size limiting
   */
  saveCustomers(customers: any[]): void {
    try {
      // Limit the number of customers to prevent excessive storage usage
      const limitedCustomers = customers.slice(0, MAX_CUSTOMERS);

      // Create optimized customer objects (remove unnecessary fields)
      const optimizedCustomers = limitedCustomers.map(customer => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        branch_id: customer.branch_id,
        // Only keep essential fields to reduce size
        created_at: customer.created_at
      }));

      const dataToCache = JSON.stringify(optimizedCustomers);
      const dataSize = new Blob([dataToCache]).size;

      let cached: CachedData<any[]>;

      // Check if compression is needed
      if (dataSize > MAX_CACHE_SIZE) {
        console.log(`📦 [CustomerCache] Compressing ${dataSize} bytes to fit within ${MAX_CACHE_SIZE} limit`);

        // Simple compression: remove more fields and limit further
        const compressedCustomers = optimizedCustomers.slice(0, Math.floor(MAX_CUSTOMERS * 0.7)).map(customer => ({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          // Remove email and other non-essential fields
        }));

        cached = {
          data: compressedCustomers,
          timestamp: Date.now(),
          version: CACHE_VERSION,
          compressed: true
        };
      } else {
        cached = {
          data: optimizedCustomers,
          timestamp: Date.now(),
          version: CACHE_VERSION,
          compressed: false
        };
      }

      // Final size check
      const finalData = JSON.stringify(cached);
      const finalSize = new Blob([finalData]).size;

      if (finalSize > MAX_CACHE_SIZE) {
        console.warn(`⚠️ [CustomerCache] Data still too large (${finalSize} bytes), clearing cache`);
        this.clearCustomers();
        return;
      }

      localStorage.setItem(CustomerCacheService.CUSTOMERS_KEY, finalData);
      console.log(`✅ [CustomerCache] Saved ${cached.data.length} customers (${finalSize} bytes, compressed: ${cached.compressed})`);
    } catch (error) {
      console.warn('⚠️ [CustomerCache] Failed to save customers:', error);
      // If quota exceeded, try clearing and saving minimal data
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        try {
          this.clearCustomers();
          // Save minimal essential data
          const minimalCustomers = customers.slice(0, 100).map(customer => ({
            id: customer.id,
            name: customer.name,
            phone: customer.phone
          }));

          const cached: CachedData<any[]> = {
            data: minimalCustomers,
            timestamp: Date.now(),
            version: CACHE_VERSION,
            compressed: true
          };

          localStorage.setItem(CustomerCacheService.CUSTOMERS_KEY, JSON.stringify(cached));
          console.log(`✅ [CustomerCache] Saved minimal ${minimalCustomers.length} customers after quota error`);
        } catch (retryError) {
          console.warn('⚠️ [CustomerCache] Failed to save even minimal data:', retryError);
        }
      }
    }
  }
  
  /**
   * Get customers from localStorage
   */
  getCustomers(): any[] | null {
    try {
      const cached = localStorage.getItem(CustomerCacheService.CUSTOMERS_KEY);
      if (!cached) {
        return null;
      }

      const data: CachedData<any[]> = JSON.parse(cached);

      // Check version
      if (data.version !== CACHE_VERSION) {
        console.log('🔄 [CustomerCache] Cache version mismatch, clearing old cache');
        this.clearCustomers();
        return null;
      }

      // Check expiry
      const age = Date.now() - data.timestamp;
      if (age > CACHE_DURATION) {
        console.log(`✅ [CustomerCache] Cache expired (${Math.round(age / 1000)}s old)`);
        this.clearCustomers();
        return null;
      }

      console.log(`✅ [CustomerCache] Using cached customers (${Math.round(age / 1000)}s old, ${data.data.length} customers, compressed: ${data.compressed || false})`);
      return data.data;
    } catch (error) {
      console.warn('⚠️ [CustomerCache] Failed to read customers cache:', error);
      // Clear corrupted cache
      this.clearCustomers();
      return null;
    }
  }
  
  /**
   * Clear customers cache
   */
  clearCustomers(): void {
    localStorage.removeItem(CustomerCacheService.CUSTOMERS_KEY);
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

