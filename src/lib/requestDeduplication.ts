/**
 * Request Deduplication Utility
 * Prevents duplicate API calls from executing simultaneously
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  /**
   * Deduplicate a request by key
   * If the same request is already in progress, return the existing promise
   */
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    options?: {
      timeout?: number;
      forceRefresh?: boolean;
    }
  ): Promise<T> {
    const timeout = options?.timeout || this.REQUEST_TIMEOUT;
    const forceRefresh = options?.forceRefresh || false;

    // Clean up expired requests
    this.cleanupExpiredRequests();

    // Check if request is already in progress
    const existing = this.pendingRequests.get(key);
    if (existing && !forceRefresh) {
      console.log(`🔄 [Dedup] Reusing in-progress request: ${key}`);
      return existing.promise as Promise<T>;
    }

    // Create new request
    console.log(`🆕 [Dedup] Starting new request: ${key}`);
    const promise = requestFn();
    
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    try {
      // Add timeout
      const result = await Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Request timeout: ${key}`)), timeout)
        ),
      ]);

      return result;
    } finally {
      // Clean up after request completes
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Clear a specific pending request
   */
  clear(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all pending requests
   */
  clearAll(): void {
    this.pendingRequests.clear();
  }

  /**
   * Clean up requests that have been pending for too long
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.REQUEST_TIMEOUT) {
        console.warn(`⚠️ [Dedup] Removing expired request: ${key}`);
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Get statistics about pending requests
   */
  getStats(): { pendingCount: number; keys: string[] } {
    return {
      pendingCount: this.pendingRequests.size,
      keys: Array.from(this.pendingRequests.keys()),
    };
  }
}

// Export singleton instance
export const requestDeduplicator = new RequestDeduplicator();

// Export helper function for easy use
export async function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  options?: {
    timeout?: number;
    forceRefresh?: boolean;
  }
): Promise<T> {
  return requestDeduplicator.deduplicate(key, requestFn, options);
}

