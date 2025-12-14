/**
 * Query Performance Monitoring and Alerts
 * Tracks database query performance and alerts on slow queries
 */

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceThresholds {
  warning: number; // milliseconds
  critical: number; // milliseconds
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000; // Keep last 1000 metrics
  private readonly DEFAULT_THRESHOLDS: PerformanceThresholds = {
    warning: 1000, // 1 second
    critical: 3000, // 3 seconds
  };

  /**
   * Track a database operation
   */
  async track<T>(
    operation: string,
    fn: () => Promise<T>,
    options?: {
      thresholds?: Partial<PerformanceThresholds>;
      metadata?: Record<string, any>;
    }
  ): Promise<T> {
    const startTime = performance.now();
    const timestamp = Date.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      // Record metric
      this.recordMetric({
        operation,
        duration,
        timestamp,
        metadata: options?.metadata,
      });

      // Check thresholds
      const thresholds = {
        ...this.DEFAULT_THRESHOLDS,
        ...options?.thresholds,
      };

      if (duration >= thresholds.critical) {
        console.error(
          `🚨 [Performance] CRITICAL: ${operation} took ${Math.round(duration)}ms`,
          options?.metadata
        );
      } else if (duration >= thresholds.warning) {
        console.warn(
          `⚠️ [Performance] SLOW: ${operation} took ${Math.round(duration)}ms`,
          options?.metadata
        );
      } else {
        console.log(
          `⚡ [Performance] ${operation} completed in ${Math.round(duration)}ms`
        );
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(
        `❌ [Performance] FAILED: ${operation} failed after ${Math.round(duration)}ms`,
        error
      );
      throw error;
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only the last MAX_METRICS entries
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(operation?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    let metrics = this.metrics;

    if (operation) {
      metrics = metrics.filter((m) => m.operation === operation);
    }

    if (metrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((acc, d) => acc + d, 0);

    return {
      count: metrics.length,
      avgDuration: sum / metrics.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Get slow operations (above threshold)
   */
  getSlowOperations(threshold: number = 1000): PerformanceMetric[] {
    return this.metrics.filter((m) => m.duration >= threshold);
  }

  /**
   * Get recent operations
   */
  getRecentOperations(count: number = 10): PerformanceMetric[] {
    return this.metrics.slice(-count);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    console.log('🧹 [Performance] Cleared all metrics');
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const operations = [...new Set(this.metrics.map((m) => m.operation))];
    let report = '📊 Performance Report\n';
    report += '='.repeat(50) + '\n\n';

    for (const operation of operations) {
      const stats = this.getStats(operation);
      report += `Operation: ${operation}\n`;
      report += `  Count: ${stats.count}\n`;
      report += `  Avg: ${Math.round(stats.avgDuration)}ms\n`;
      report += `  Min: ${Math.round(stats.minDuration)}ms\n`;
      report += `  Max: ${Math.round(stats.maxDuration)}ms\n`;
      report += `  P50: ${Math.round(stats.p50)}ms\n`;
      report += `  P95: ${Math.round(stats.p95)}ms\n`;
      report += `  P99: ${Math.round(stats.p99)}ms\n`;
      report += '\n';
    }

    const slowOps = this.getSlowOperations();
    if (slowOps.length > 0) {
      report += `⚠️ Slow Operations (>1000ms): ${slowOps.length}\n`;
      report += '='.repeat(50) + '\n';
      slowOps.slice(-10).forEach((op) => {
        report += `  ${op.operation}: ${Math.round(op.duration)}ms at ${new Date(op.timestamp).toLocaleTimeString()}\n`;
      });
    }

    return report;
  }

  /**
   * Log performance report to console
   */
  logReport(): void {
    console.log(this.generateReport());
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export helper function for easy use
export async function trackPerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  options?: {
    thresholds?: Partial<PerformanceThresholds>;
    metadata?: Record<string, any>;
  }
): Promise<T> {
  return performanceMonitor.track(operation, fn, options);
}

// Make performance monitor available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).performanceMonitor = performanceMonitor;
  (window as any).logPerformanceReport = () => performanceMonitor.logReport();
}

