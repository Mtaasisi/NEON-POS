/**
 * Database Query Result Caching
 * Reduces redundant database queries by caching frequently accessed data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh data
}

class QueryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of entries

  /**
   * Get cached data or fetch fresh data
   */
  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const ttl = options?.ttl || this.DEFAULT_TTL;
    const staleWhileRevalidate = options?.staleWhileRevalidate || false;

    // Clean up expired entries
    this.cleanupExpired();

    // Check cache
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached) {
      // Fresh data
      if (cached.expiresAt > now) {
        console.log(`✅ [Cache] HIT (fresh): ${key}`);
        return cached.data as T;
      }

      // Stale data - return if staleWhileRevalidate is enabled
      if (staleWhileRevalidate) {
        console.log(`⚠️ [Cache] HIT (stale): ${key} - revalidating in background`);
        // Revalidate in background
        this.revalidateInBackground(key, fetchFn, ttl);
        return cached.data as T;
      }
    }

    // Cache miss or expired - fetch fresh data
    console.log(`❌ [Cache] MISS: ${key}`);
    return this.fetchAndCache(key, fetchFn, ttl);
  }

  /**
   * Fetch data and store in cache
   */
  private async fetchAndCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    const data = await fetchFn();
    const now = Date.now();

    this.set(key, data, ttl);

    return data;
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const cacheTtl = ttl || this.DEFAULT_TTL;

    // Enforce max cache size
    if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(key)) {
      // Remove oldest entry
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + cacheTtl,
    });

    console.log(`💾 [Cache] SET: ${key} (TTL: ${cacheTtl}ms)`);
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`🗑️ [Cache] INVALIDATE: ${key}`);
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    console.log(`🗑️ [Cache] INVALIDATE PATTERN: ${pattern} (${count} entries)`);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ [Cache] CLEAR ALL (${size} entries)`);
  }

  /**
   * Revalidate cache entry in background
   */
  private async revalidateInBackground<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number
  ): Promise<void> {
    try {
      const data = await fetchFn();
      this.set(key, data, ttl);
      console.log(`♻️ [Cache] REVALIDATED: ${key}`);
    } catch (error) {
      console.error(`❌ [Cache] REVALIDATION FAILED: ${key}`, error);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      console.log(`🧹 [Cache] CLEANUP: Removed ${count} expired entries`);
    }
  }

  /**
   * Get oldest cache entry key
   */
  private getOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.expiresAt - now,
    }));

    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0, // TODO: Track hit rate
      entries,
    };
  }
}

// Export singleton instance
export const queryCache = new QueryCache();

// Export helper function for easy use
export async function getCachedQuery<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  return queryCache.get(key, fetchFn, options);
}

// Cache invalidation helpers
export function invalidateCache(key: string): void {
  queryCache.invalidate(key);
}

export function invalidateCachePattern(pattern: string | RegExp): void {
  queryCache.invalidatePattern(pattern);
}

export function clearCache(): void {
  queryCache.clear();
}

