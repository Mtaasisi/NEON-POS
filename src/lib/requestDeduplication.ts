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
  private readonly REQUEST_TIMEOUT = 90000; // 90 seconds (increased for Neon cold starts)

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

    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      // Add timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          // Clear the request from pending map before rejecting
          this.pendingRequests.delete(key);
          reject(new Error(`Request timeout: ${key}`));
        }, timeout);
      });

      const result = await Promise.race([
        promise,
        timeoutPromise,
      ]);

      // Clear timeout if request completed successfully
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      return result;
    } catch (error) {
      // On error (including timeout), make sure to clean up
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Request is already deleted in timeout case, but ensure cleanup for other errors
      this.pendingRequests.delete(key);
      throw error;
    } finally {
      // Final cleanup - ensure request is removed
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
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

