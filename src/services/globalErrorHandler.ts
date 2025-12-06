/**
 * Global Error Handler
 * 
 * Captures ALL errors in the application:
 * - Unhandled promise rejections
 * - Window errors (runtime errors)
 * - React error boundary errors
 * - Console errors
 * - Network errors
 * 
 * Automatically logs them to the cache error logger
 */

import { cacheErrorLogger } from './cacheErrorLogger';
import { errorExporter } from '../utils/errorExporter';

class GlobalErrorHandler {
  private isInitialized = false;
  private originalConsoleError: typeof console.error;
  private errorCount = 0;
  private maxErrorsPerMinute = 50; // Prevent error loops
  private errorTimestamps: number[] = [];
  private isLogging = false; // Prevent recursive logging

  constructor() {
    this.originalConsoleError = console.error.bind(console);
  }

  /**
   * Initialize global error handlers
   */
  init(): void {
    if (this.isInitialized) {
      console.warn('⚠️ [GlobalErrorHandler] Already initialized');
      return;
    }

    console.log('🛡️ [GlobalErrorHandler] Initializing global error handlers...');

    // Handle unhandled promise rejections
    this.setupPromiseRejectionHandler();

    // Handle window errors (uncaught exceptions)
    this.setupWindowErrorHandler();

    // Intercept console.error calls
    this.setupConsoleErrorInterceptor();

    // Handle network errors
    this.setupNetworkErrorHandler();

    this.isInitialized = true;
    console.log('✅ [GlobalErrorHandler] Global error handlers initialized');
  }

  /**
   * Setup handler for unhandled promise rejections
   */
  private setupPromiseRejectionHandler(): void {
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault(); // Prevent default browser handling

      const error = event.reason;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a cache-related error
      const isCacheError = errorMessage.toLowerCase().includes('cache') ||
                          errorMessage.toLowerCase().includes('indexed') ||
                          errorMessage.toLowerCase().includes('storage') ||
                          errorMessage.toLowerCase().includes('quota');

      if (this.shouldLogError()) {
        cacheErrorLogger.logCacheError(
          'globalErrorHandler',
          'unhandledPromiseRejection',
          error,
          'promise_rejection',
          {
            type: 'unhandled_promise_rejection',
            isCacheError,
            promise: event.promise?.toString(),
          }
        ).catch(err => {
          this.originalConsoleError('Failed to log unhandled rejection:', err);
        });
        
        // Cache error logs (auto-download disabled)
        errorExporter.exportError(error, {
          severity: 'high',
          module: 'globalErrorHandler',
          function: 'unhandledPromiseRejection',
          operation: 'promise_rejection',
          context: {
            isCacheError,
            promise: event.promise?.toString(),
          },
        }).catch(err => {
          this.originalConsoleError('Failed to cache error:', err);
        });
      }

      // Still log to console for developers
      this.originalConsoleError('🚨 Unhandled Promise Rejection:', error);
    });
  }

  /**
   * Setup handler for window errors (uncaught exceptions)
   */
  private setupWindowErrorHandler(): void {
    window.addEventListener('error', (event) => {
      const error = event.error || new Error(event.message);
      const errorMessage = event.message || error.message;

      // Skip errors from browser extensions or external scripts
      if (this.isExternalError(event)) {
        return;
      }

      // Check if it's a cache-related error
      const isCacheError = errorMessage.toLowerCase().includes('cache') ||
                          errorMessage.toLowerCase().includes('indexed') ||
                          errorMessage.toLowerCase().includes('storage') ||
                          errorMessage.toLowerCase().includes('quota') ||
                          errorMessage.toLowerCase().includes('sync');

      if (this.shouldLogError() && isCacheError) {
        cacheErrorLogger.logCacheError(
          'globalErrorHandler',
          'windowError',
          error,
          'runtime_error',
          {
            type: 'window_error',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            isCacheError,
          }
        ).catch(err => {
          this.originalConsoleError('Failed to log window error:', err);
        });
        
        // Cache error logs (auto-download disabled)
        errorExporter.exportError(error, {
          severity: 'high',
          module: 'globalErrorHandler',
          function: 'windowError',
          operation: 'runtime_error',
          context: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            isCacheError,
          },
        }).catch(err => {
          this.originalConsoleError('Failed to cache error:', err);
        });
      }

      // Don't prevent default - let React error boundary handle it
    });
  }

  /**
   * Intercept console.error to log errors
   */
  private setupConsoleErrorInterceptor(): void {
    console.error = (...args: any[]) => {
      // Call original console.error first
      this.originalConsoleError(...args);

      // Prevent recursive logging - if we're already in the middle of logging an error, don't log again
      if (this.isLogging) {
        return;
      }

      // Skip error logger's own console.error calls to prevent cascades
      const firstArg = args[0];
      if (typeof firstArg === 'string' && firstArg.includes('[ErrorLogger]')) {
        return;
      }

      // Extract error information
      let errorMessage = '';
      let errorObj: Error | null = null;

      if (firstArg instanceof Error) {
        errorObj = firstArg;
        errorMessage = firstArg.message;
      } else if (typeof firstArg === 'string') {
        errorMessage = firstArg;
        errorObj = new Error(errorMessage);
      } else {
        errorMessage = JSON.stringify(firstArg);
        errorObj = new Error(errorMessage);
      }

      // Check all arguments for actual error content
      // React error boundaries often pass the error as a later argument
      const allArgsString = args.map(arg => {
        if (arg instanceof Error) return arg.message;
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      // Only log cache-related errors from console.error
      // But skip generic React error boundary messages that don't contain actual errors
      const isReactErrorBoundaryMessage = errorMessage.includes('The above error occurred') &&
                                         errorMessage.includes('component tree from scratch');
      
      // Check for cache-related keywords, but exclude false positives from component names
      // Component names like "StorageLocationPickerProvider" should not trigger cache detection
      const cacheKeywords = ['cache', 'indexed', 'quota'];
      const storageKeywords = ['localstorage', 'sessionstorage', 'indexeddb', 'storage api', 'storage quota'];
      const syncKeywords = ['sync', 'offline'];
      
      const lowerArgsString = allArgsString.toLowerCase();
      const isCacheRelated = (
        cacheKeywords.some(kw => lowerArgsString.includes(kw)) ||
        storageKeywords.some(kw => lowerArgsString.includes(kw)) ||
        syncKeywords.some(kw => lowerArgsString.includes(kw))
      ) && 
      // Exclude if it's just a component name containing "storage"
      !(lowerArgsString.includes('storageprovider') || 
        lowerArgsString.includes('storagecontext') || 
        lowerArgsString.includes('storagelocation'));

      // Don't log generic React error boundary messages unless they contain actual cache-related content
      if (isReactErrorBoundaryMessage && !isCacheRelated) {
        return;
      }

      if (this.shouldLogError() && isCacheRelated && errorObj) {
        // Set flag to prevent recursive calls
        this.isLogging = true;
        
        cacheErrorLogger.logCacheError(
          'globalErrorHandler',
          'consoleError',
          errorObj,
          'console_error',
          {
            type: 'console_error',
            arguments: args.slice(1).map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ),
            isCacheRelated,
            fullMessage: allArgsString.substring(0, 500), // Include more context
          }
        ).catch(err => {
          this.originalConsoleError('Failed to log console error:', err);
        }).finally(() => {
          this.isLogging = false;
        });
        
        // Cache error logs (auto-download disabled)
        errorExporter.exportError(errorObj, {
          severity: 'medium',
          module: 'globalErrorHandler',
          function: 'consoleError',
          operation: 'console_error',
          context: {
            arguments: args.slice(1).map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ),
            isCacheRelated,
            fullMessage: allArgsString.substring(0, 500),
          },
        }).catch(err => {
          this.originalConsoleError('Failed to cache error:', err);
        });
      }
    };
  }

  /**
   * Setup handler for network errors
   */
  private setupNetworkErrorHandler(): void {
    // Intercept fetch to log network errors
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      try {
        const response = await originalFetch(...args);
        
        // Log failed requests
        if (!response.ok && this.shouldLogError()) {
          const url = typeof args[0] === 'string' ? args[0] : args[0].url;
          const isCacheRelated = url.includes('cache') || 
                                url.includes('sync') ||
                                url.includes('offline');

          if (isCacheRelated) {
            cacheErrorLogger.logCacheError(
              'globalErrorHandler',
              'fetchError',
              new Error(`HTTP ${response.status}: ${response.statusText}`),
              'network_error',
              {
                type: 'fetch_error',
                url,
                status: response.status,
                statusText: response.statusText,
                isCacheRelated,
              }
            ).catch(err => {
              this.originalConsoleError('Failed to log fetch error:', err);
            });
          }
        }

        return response;
      } catch (error) {
        // Log network errors
        if (this.shouldLogError()) {
          const url = typeof args[0] === 'string' ? args[0] : args[0].url;
          const isCacheRelated = url.includes('cache') || 
                                url.includes('sync') ||
                                url.includes('offline');

          if (isCacheRelated) {
            cacheErrorLogger.logCacheError(
              'globalErrorHandler',
              'fetchException',
              error,
              'network_error',
              {
                type: 'fetch_exception',
                url,
                isCacheRelated,
              }
            ).catch(err => {
              this.originalConsoleError('Failed to log fetch exception:', err);
            });
          }
        }

        throw error;
      }
    };
  }

  /**
   * Check if error should be logged (rate limiting)
   */
  private shouldLogError(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old timestamps
    this.errorTimestamps = this.errorTimestamps.filter(t => t > oneMinuteAgo);

    // Check if we've exceeded the rate limit
    if (this.errorTimestamps.length >= this.maxErrorsPerMinute) {
      if (this.errorCount % 10 === 0) {
        this.originalConsoleError(
          `⚠️ [GlobalErrorHandler] Rate limit exceeded (${this.maxErrorsPerMinute}/min). Some errors not logged.`
        );
      }
      this.errorCount++;
      return false;
    }

    this.errorTimestamps.push(now);
    this.errorCount++;
    return true;
  }

  /**
   * Check if error is from external source (browser extension, etc.)
   */
  private isExternalError(event: ErrorEvent): boolean {
    // Skip errors without filename (usually from extensions)
    if (!event.filename) {
      return true;
    }

    // Skip errors from chrome-extension:// or moz-extension://
    if (event.filename.includes('extension://')) {
      return true;
    }

    // Skip errors from external domains
    const currentOrigin = window.location.origin;
    try {
      const errorUrl = new URL(event.filename);
      if (errorUrl.origin !== currentOrigin) {
        return true;
      }
    } catch {
      // If URL parsing fails, assume it's internal
      return false;
    }

    return false;
  }

  /**
   * Manually log an error
   */
  async logError(
    module: string,
    functionName: string,
    error: Error | unknown,
    operation: string,
    context?: Record<string, any>
  ): Promise<void> {
    if (!this.shouldLogError()) {
      return;
    }

    await cacheErrorLogger.logCacheError(
      module,
      functionName,
      error,
      operation,
      context
    );
  }

  /**
   * Get error statistics
   */
  getStats(): {
    totalErrors: number;
    errorsLastMinute: number;
    isRateLimited: boolean;
  } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const errorsLastMinute = this.errorTimestamps.filter(t => t > oneMinuteAgo).length;

    return {
      totalErrors: this.errorCount,
      errorsLastMinute,
      isRateLimited: errorsLastMinute >= this.maxErrorsPerMinute,
    };
  }

  /**
   * Reset error counter
   */
  reset(): void {
    this.errorCount = 0;
    this.errorTimestamps = [];
    console.log('🔄 [GlobalErrorHandler] Error counter reset');
  }

  /**
   * Cleanup (restore original handlers)
   */
  cleanup(): void {
    if (!this.isInitialized) {
      return;
    }

    // Restore original console.error
    console.error = this.originalConsoleError;

    // Note: We cannot easily remove window event listeners or restore fetch
    // without keeping references. This is acceptable as the app rarely needs cleanup.

    this.isInitialized = false;
    console.log('🧹 [GlobalErrorHandler] Cleaned up global error handlers');
  }
}

// Export singleton instance
export const globalErrorHandler = new GlobalErrorHandler();

// Helper function to manually log errors
export async function logGlobalError(
  module: string,
  functionName: string,
  error: Error | unknown,
  operation: string,
  context?: Record<string, any>
): Promise<void> {
  await globalErrorHandler.logError(module, functionName, error, operation, context);
}

// Export for use in error boundaries
export const handleReactError = async (
  error: Error,
  errorInfo: { componentStack: string }
): Promise<void> => {
  await cacheErrorLogger.logCacheError(
    'reactErrorBoundary',
    'componentError',
    error,
    'react_error',
    {
      componentStack: errorInfo.componentStack,
      type: 'react_component_error',
    }
  );
};

