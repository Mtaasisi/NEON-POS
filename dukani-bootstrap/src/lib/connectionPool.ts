/**
 * Connection Pool Manager
 * Reduces concurrent database connections to prevent "too many connections" errors
 */

interface QueuedQuery {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority: number;
}

class ConnectionPoolManager {
  private queue: QueuedQuery[] = [];
  private activeConnections = 0;
  private readonly maxConcurrentConnections: number;
  private processing = false;

  constructor(maxConcurrent: number = 5) {
    // Limit concurrent connections to prevent pool exhaustion
    // Neon free tier typically allows 10-20 concurrent connections
    this.maxConcurrentConnections = maxConcurrent;
    console.log(`🔌 Connection pool initialized (max ${maxConcurrent} concurrent)`);
  }

  /**
   * Execute a database query through the connection pool
   * @param fn - The async function that performs the database operation
   * @param priority - Higher priority queries execute first (default: 0)
   */
  async execute<T>(fn: () => Promise<T>, priority: number = 0): Promise<T> {
    // If we're under the limit, execute immediately
    if (this.activeConnections < this.maxConcurrentConnections) {
      return this.executeQuery(fn);
    }

    // Otherwise, queue it
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject, priority });
      this.processQueue();
    });
  }

  private async executeQuery<T>(fn: () => Promise<T>): Promise<T> {
    this.activeConnections++;
    
    try {
      const result = await fn();
      return result;
    } finally {
      this.activeConnections--;
      this.processQueue();
    }
  }

  private processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    if (this.activeConnections >= this.maxConcurrentConnections) {
      return;
    }

    this.processing = true;

    // Sort queue by priority (higher first)
    this.queue.sort((a, b) => b.priority - a.priority);

    while (
      this.queue.length > 0 &&
      this.activeConnections < this.maxConcurrentConnections
    ) {
      const queued = this.queue.shift();
      if (queued) {
        this.executeQuery(queued.fn)
          .then(queued.resolve)
          .catch(queued.reject);
      }
    }

    this.processing = false;
  }

  /**
   * Get current pool status
   */
  getStatus() {
    return {
      activeConnections: this.activeConnections,
      queuedQueries: this.queue.length,
      maxConnections: this.maxConcurrentConnections,
      utilizationPercent: (this.activeConnections / this.maxConcurrentConnections) * 100,
    };
  }

  /**
   * Clear the queue (use with caution)
   */
  clearQueue() {
    const cleared = this.queue.length;
    this.queue.forEach(q => q.reject(new Error('Query cancelled - queue cleared')));
    this.queue = [];
    console.log(`🧹 Cleared ${cleared} queued queries`);
  }
}

// Export singleton instance
export const connectionPool = new ConnectionPoolManager(5);

// Export class for custom instances
export { ConnectionPoolManager };

/**
 * Debounce utility for reducing rapid-fire queries
 */
export function debounceQuery<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number = 300
): T {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingResolve: ((value: any) => void) | null = null;
  let pendingReject: ((error: any) => void) | null = null;

  return ((...args: any[]) => {
    return new Promise((resolve, reject) => {
      // Cancel previous pending query
      if (timeoutId) {
        clearTimeout(timeoutId);
        if (pendingReject) {
          pendingReject(new Error('Query cancelled by newer request'));
        }
      }

      pendingResolve = resolve;
      pendingReject = reject;

      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          if (pendingResolve) {
            pendingResolve(result);
          }
        } catch (error) {
          if (pendingReject) {
            pendingReject(error);
          }
        } finally {
          timeoutId = null;
          pendingResolve = null;
          pendingReject = null;
        }
      }, delay);
    });
  }) as T;
}

/**
 * Deduplication cache for identical concurrent queries
 */
class QueryDeduplicator {
  private pendingQueries = new Map<string, Promise<any>>();

  async deduplicate<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // If query is already in flight, return the existing promise
    if (this.pendingQueries.has(key)) {
      console.log(`🔄 [Dedup] Reusing existing query: ${key}`);
      return this.pendingQueries.get(key)!;
    }

    // Execute new query and cache the promise
    console.log(`🆕 [Dedup] Starting new request: ${key}`);
    const promise = fn().finally(() => {
      // Remove from cache when complete
      this.pendingQueries.delete(key);
    });

    this.pendingQueries.set(key, promise);
    return promise;
  }

  clear() {
    this.pendingQueries.clear();
  }

  getStatus() {
    return {
      pendingQueries: this.pendingQueries.size,
      keys: Array.from(this.pendingQueries.keys()),
    };
  }
}

export const queryDeduplicator = new QueryDeduplicator();

