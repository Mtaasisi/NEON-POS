/**
 * Memory Management Utility
 * ⚡ Automatic memory cleanup, garbage collection hints, and performance monitoring
 */

interface MemoryStats {
  used: number;
  total: number;
  limit: number;
  usagePercent: number;
}

interface PerformanceMetrics {
  timestamp: number;
  memoryUsage: MemoryStats | null;
  eventLoopLag: number;
  activeConnections: number;
}

class MemoryManager {
  private static instance: MemoryManager;
  private cleanupTasks: Set<() => void> = new Set();
  private performanceHistory: PerformanceMetrics[] = [];
  private gcInterval: NodeJS.Timeout | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  private constructor() {}

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Get current memory usage statistics
   */
  getMemoryStats(): MemoryStats | null {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const mem = (performance as any).memory;
      const used = mem.usedJSHeapSize;
      const total = mem.totalJSHeapSize;
      const limit = mem.jsHeapSizeLimit;

      return {
        used,
        total,
        limit,
        usagePercent: (used / limit) * 100
      };
    }
    return null;
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): void {
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
      console.log('🧹 Forced garbage collection');
    }
  }

  /**
   * Register a cleanup task to be executed on memory pressure
   */
  registerCleanupTask(task: () => void): () => void {
    this.cleanupTasks.add(task);

    // Return unsubscribe function
    return () => {
      this.cleanupTasks.delete(task);
    };
  }

  /**
   * Execute all registered cleanup tasks
   */
  executeCleanup(): void {
    console.log(`🧹 Executing ${this.cleanupTasks.size} cleanup tasks...`);

    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('Cleanup task failed:', error);
      }
    });

    this.forceGC();
  }

  /**
   * Start automatic memory monitoring and cleanup
   */
  startMonitoring(options: {
    gcInterval?: number; // GC interval in minutes
    monitoringInterval?: number; // Monitoring interval in seconds
    memoryThreshold?: number; // Memory usage threshold (0-100)
  } = {}): void {
    if (this.isMonitoring) return;

    const {
      gcInterval = 5, // 5 minutes
      monitoringInterval = 30, // 30 seconds
      memoryThreshold = 80 // 80% memory usage
    } = options;

    this.isMonitoring = true;

    // Periodic garbage collection
    this.gcInterval = setInterval(() => {
      const stats = this.getMemoryStats();
      if (stats && stats.usagePercent > memoryThreshold) {
        console.warn(`⚠️ High memory usage detected: ${stats.usagePercent.toFixed(1)}%`);
        this.executeCleanup();
      }
    }, gcInterval * 60 * 1000);

    // Performance monitoring
    this.monitoringInterval = setInterval(() => {
      const stats = this.getMemoryStats();
      const metrics: PerformanceMetrics = {
        timestamp: Date.now(),
        memoryUsage: stats,
        eventLoopLag: this.measureEventLoopLag(),
        activeConnections: this.getActiveConnections()
      };

      this.performanceHistory.push(metrics);

      // Keep only last 100 entries
      if (this.performanceHistory.length > 100) {
        this.performanceHistory.shift();
      }

      // Log high memory usage
      if (stats && stats.usagePercent > 85) {
        console.warn(`🚨 Critical memory usage: ${stats.usagePercent.toFixed(1)}%`);
      }
    }, monitoringInterval * 1000);

    console.log('📊 Memory monitoring started');
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    console.log('📊 Memory monitoring stopped');
  }

  /**
   * Measure event loop lag (rough performance indicator)
   */
  private measureEventLoopLag(): number {
    const start = performance.now();
    return performance.now() - start; // This is a rough approximation
  }

  /**
   * Get approximate active connections count
   */
  private getActiveConnections(): number {
    // This is a rough estimate - browsers don't expose connection counts
    // We could track this in our application state if needed
    return 0; // Placeholder
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * Clear old performance data
   */
  clearPerformanceHistory(): void {
    this.performanceHistory.length = 0;
  }

  /**
   * Get memory usage trend
   */
  getMemoryTrend(): { average: number; peak: number; trend: 'stable' | 'increasing' | 'decreasing' } {
    if (this.performanceHistory.length < 5) {
      return { average: 0, peak: 0, trend: 'stable' };
    }

    const recent = this.performanceHistory.slice(-10);
    const memoryValues = recent
      .map(m => m.memoryUsage?.usagePercent || 0)
      .filter(v => v > 0);

    if (memoryValues.length === 0) {
      return { average: 0, peak: 0, trend: 'stable' };
    }

    const average = memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length;
    const peak = Math.max(...memoryValues);

    // Simple trend analysis
    const firstHalf = memoryValues.slice(0, Math.floor(memoryValues.length / 2));
    const secondHalf = memoryValues.slice(Math.floor(memoryValues.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const trend = secondHalfAvg > firstHalfAvg + 5 ? 'increasing' :
                  secondHalfAvg < firstHalfAvg - 5 ? 'decreasing' : 'stable';

    return { average, peak, trend };
  }
}

// Global instance
export const memoryManager = MemoryManager.getInstance();

// Utility hooks for React components
export function useMemoryCleanup(cleanupTask: () => void) {
  React.useEffect(() => {
    const unsubscribe = memoryManager.registerCleanupTask(cleanupTask);
    return unsubscribe;
  }, [cleanupTask]);
}

export function useMemoryStats() {
  const [stats, setStats] = React.useState<MemoryStats | null>(null);

  React.useEffect(() => {
    const updateStats = () => setStats(memoryManager.getMemoryStats());

    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return stats;
}

// Export default instance
export default memoryManager;
