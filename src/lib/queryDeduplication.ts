/**
 * Query Deduplication Service
 * Prevents duplicate queries from running simultaneously
 * and caches results for a short period to reduce database load
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

class QueryDeduplicationService {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private readonly DEFAULT_CACHE_TIME = 5000; // 5 seconds default cache

  /**
   * Execute a query with deduplication and caching
   * @param key Unique key for the query
   * @param queryFn Function that executes the query
   * @param cacheDuration Cache duration in milliseconds (default: 5000ms)
   */
  async query<T>(
    key: string,
    queryFn: () => Promise<T>,
    cacheDuration: number = this.DEFAULT_CACHE_TIME
  ): Promise<T> {
    // Check if we have a valid cached result
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      // console.log(`📦 Query cache HIT for: ${key}`);
      return cached.data;
    }

    // Check if there's already a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      // console.log(`⏳ Query deduplication: waiting for pending request: ${key}`);
      return pending;
    }

    // Execute the query
    // console.log(`🔍 Query cache MISS, executing: ${key}`);
    const promise = queryFn()
      .then((data) => {
        // Cache the result
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
        });
        // Clean up pending request
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        // Clean up pending request on error
        this.pendingRequests.delete(key);
        // Don't cache errors
        throw error;
      });

    // Store the pending promise
    this.pendingRequests.set(key, promise);

    return promise;
  }

  /**
   * Clear cache for a specific key or all keys
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      // console.log(`🗑️ Cleared cache for: ${key}`);
    } else {
      this.cache.clear();
      // console.log('🗑️ Cleared all query cache');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheKeys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache(maxAge: number = 60000): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      // console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
    }
  }
}

// Export singleton instance
export const queryDeduplication = new QueryDeduplicationService();

// Export helper function for common query patterns
export async function deduplicatedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  cacheDuration?: number
): Promise<T> {
  return queryDeduplication.query(key, queryFn, cacheDuration);
}

// Set up automatic cache cleanup every minute
if (typeof window !== 'undefined') {
  setInterval(() => {
    queryDeduplication.cleanupExpiredCache();
  }, 60000);
}

