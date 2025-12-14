/**
 * Error Exporter Utility
 * Caches errors to localStorage for debugging (auto-download disabled)
 * 
 * Features:
 * - Cache errors to localStorage for analysis
 * - Manual export functionality when needed
 * - Organized file naming with timestamps
 * - Includes full error context and stack traces
 * - Browser compatibility handling
 */

interface ErrorExportData {
  timestamp: string;
  errorType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  module?: string;
  function?: string;
  operation?: string;
  context?: Record<string, any>;
  userAgent: string;
  url: string;
  viewport: {
    width: number;
    height: number;
  };
  online: boolean;
  localStorage?: {
    available: boolean;
    quotaExceeded?: boolean;
  };
  memoryInfo?: {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
}

class ErrorExporter {
  private autoDownloadEnabled: boolean = false; // Auto-download disabled by default
  private downloadPath: string = 'error-logs';
  private minSeverityForAutoDownload: 'medium' | 'high' | 'critical' = 'high';

  /**
   * Configure auto-download settings
   */
  configure(options: {
    autoDownload?: boolean;
    minSeverity?: 'medium' | 'high' | 'critical';
  }) {
    if (options.autoDownload !== undefined) {
      this.autoDownloadEnabled = options.autoDownload;
    }
    if (options.minSeverity !== undefined) {
      this.minSeverityForAutoDownload = options.minSeverity;
    }
  }

  /**
   * Export error to JSON file
   */
  async exportError(
    error: Error | unknown,
    options: {
      severity?: 'low' | 'medium' | 'high' | 'critical';
      module?: string;
      function?: string;
      operation?: string;
      context?: Record<string, any>;
      autoDownload?: boolean;
    } = {}
  ): Promise<void> {
    try {
      const severity = options.severity || 'medium';
      // Auto-download is COMPLETELY DISABLED - only download if explicitly requested with autoDownload: true
      // This prevents any automatic file downloads - errors are cached only
      const shouldAutoDownload = options.autoDownload === true;

      // Build comprehensive error data
      const errorData = this.buildErrorData(error, {
        severity,
        module: options.module,
        function: options.function,
        operation: options.operation,
        context: options.context,
      });

      // NO automatic downloads - only cache to localStorage
      // Downloads only happen if explicitly requested (e.g., manual download button)
      if (shouldAutoDownload) {
        console.warn('⚠️ [ErrorExporter] Manual download requested - downloading error file');
        this.downloadJSON(errorData);
      } else {
        // Just cache - no download
        console.log(`💾 [ErrorExporter] Error cached (no download): ${errorData.timestamp}`);
      }

      // Also save to localStorage as backup
      this.saveToLocalStorage(errorData);

      console.log(`💾 Error cached: ${errorData.timestamp}`, errorData);
    } catch (exportError) {
      console.error('Failed to export error:', exportError);
      // Fallback: at least try to save basic info
      this.fallbackExport(error);
    }
  }

  /**
   * Build comprehensive error data object
   */
  private buildErrorData(
    error: Error | unknown,
    options: {
      severity: 'low' | 'medium' | 'high' | 'critical';
      module?: string;
      function?: string;
      operation?: string;
      context?: Record<string, any>;
    }
  ): ErrorExportData {
    const timestamp = new Date().toISOString();
    let message = 'Unknown error';
    let stack: string | undefined;
    let errorType = 'UnknownError';

    // Extract error details
    if (error instanceof Error) {
      message = error.message;
      stack = error.stack;
      errorType = error.name;
    } else if (typeof error === 'string') {
      message = error;
      errorType = 'StringError';
    } else if (error && typeof error === 'object') {
      try {
        message = JSON.stringify(error);
        errorType = 'ObjectError';
      } catch {
        message = String(error);
      }
    }

    // Gather system information
    const errorData: ErrorExportData = {
      timestamp,
      errorType,
      severity: options.severity,
      message,
      stack,
      module: options.module,
      function: options.function,
      operation: options.operation,
      context: options.context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      online: navigator.onLine,
      localStorage: this.checkLocalStorage(),
    };

    // Add memory info if available (Chrome/Edge)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      errorData.memoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }

    return errorData;
  }

  /**
   * Check localStorage availability and quota
   */
  private checkLocalStorage(): { available: boolean; quotaExceeded?: boolean } {
    try {
      const testKey = '__ls_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return { available: true, quotaExceeded: false };
    } catch (e) {
      const isQuotaError = e instanceof DOMException && (
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      );
      return { 
        available: false, 
        quotaExceeded: isQuotaError 
      };
    }
  }

  /**
   * Download JSON file to browser downloads folder
   */
  private downloadJSON(data: ErrorExportData): void {
    try {
      // Create filename with timestamp and error type
      const date = new Date(data.timestamp);
      const filename = `error-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}-${data.errorType}-${data.severity}.json`;

      // Create blob and download
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      console.log(`✅ Error downloaded: ${filename}`);
    } catch (error) {
      console.error('Failed to download error JSON:', error);
    }
  }

  /**
   * Save error to localStorage as backup
   */
  private saveToLocalStorage(errorData: ErrorExportData): void {
    try {
      const key = `error_log_${errorData.timestamp}`;
      localStorage.setItem(key, JSON.stringify(errorData));
      
      // Keep only last 10 errors to avoid quota issues
      this.cleanupOldErrors();
    } catch (error) {
      console.warn('Failed to save error to localStorage:', error);
    }
  }

  /**
   * Cleanup old errors from localStorage
   */
  private cleanupOldErrors(): void {
    try {
      const errorKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('error_log_'))
        .sort()
        .reverse();

      // Keep only last 50 errors (increased for better caching)
      if (errorKeys.length > 50) {
        errorKeys.slice(50).forEach(key => {
          localStorage.removeItem(key);
        });
      }
    } catch (error) {
      console.warn('Failed to cleanup old errors:', error);
    }
  }

  /**
   * Fallback export when main export fails
   */
  private fallbackExport(error: Error | unknown): void {
    try {
      const fallbackData = {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };
      console.error('FALLBACK ERROR EXPORT:', fallbackData);
    } catch {
      // Last resort
      console.error('CRITICAL: Failed to export error at all');
    }
  }

  /**
   * Check if error should be auto-downloaded
   */
  private shouldAutoDownload(severity: 'low' | 'medium' | 'high' | 'critical'): boolean {
    if (!this.autoDownloadEnabled) return false;

    const severityLevel = {
      low: 0,
      medium: 1,
      high: 2,
      critical: 3,
    };

    return severityLevel[severity] >= severityLevel[this.minSeverityForAutoDownload];
  }

  /**
   * Export all saved errors from localStorage
   */
  exportAllSavedErrors(): void {
    try {
      const errorKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('error_log_'))
        .sort();

      if (errorKeys.length === 0) {
        console.log('No saved errors found');
        return;
      }

      const allErrors = errorKeys.map(key => {
        try {
          return JSON.parse(localStorage.getItem(key) || '{}');
        } catch {
          return null;
        }
      }).filter(e => e !== null);

      // Download as single file
      const filename = `all-errors-${new Date().toISOString().split('T')[0]}.json`;
      const json = JSON.stringify(allErrors, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      console.log(`✅ Exported ${allErrors.length} errors to ${filename}`);
    } catch (error) {
      console.error('Failed to export all errors:', error);
    }
  }

  /**
   * Clear all saved errors from localStorage
   */
  clearSavedErrors(): void {
    try {
      const errorKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('error_log_'));

      errorKeys.forEach(key => {
        localStorage.removeItem(key);
      });

      console.log(`🗑️ Cleared ${errorKeys.length} saved errors`);
    } catch (error) {
      console.error('Failed to clear saved errors:', error);
    }
  }

  /**
   * Get count of saved errors
   */
  getSavedErrorCount(): number {
    try {
      return Object.keys(localStorage)
        .filter(key => key.startsWith('error_log_'))
        .length;
    } catch {
      return 0;
    }
  }
}

// Export singleton instance
export const errorExporter = new ErrorExporter();

// Export helper function
export async function exportError(
  error: Error | unknown,
  options?: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    module?: string;
    function?: string;
    operation?: string;
    context?: Record<string, any>;
    autoDownload?: boolean;
  }
): Promise<void> {
  await errorExporter.exportError(error, options);
}

// Export for window access (debugging)
if (typeof window !== 'undefined') {
  (window as any).errorExporter = errorExporter;
}


