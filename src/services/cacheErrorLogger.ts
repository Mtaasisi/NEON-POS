/**
 * Cache Error Logger Service
 * 
 * Captures and logs logical errors during cache management in offline operations.
 * Stores logs with detailed context including:
 * - Error location (module, function)
 * - User information
 * - Timestamp
 * - Error details and stack trace
 * - Operation context
 * 
 * Logs are stored in IndexedDB for persistence and can be exported for analysis.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Error log entry interface
export interface CacheErrorLog {
  id?: number;
  timestamp: string;
  module: string; // e.g., 'enhancedCacheManager', 'offlineSaleSyncService'
  function: string; // e.g., 'smartFetch', 'syncSale'
  errorType: 'logical' | 'network' | 'storage' | 'sync' | 'validation' | 'unknown';
  errorMessage: string;
  errorStack?: string;
  operation: string; // e.g., 'fetch', 'save', 'sync', 'delete'
  operationContext?: Record<string, any>; // Additional context data
  userId?: string;
  userName?: string;
  userRole?: string;
  branchId?: string;
  branchName?: string;
  isOnline: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
}

// Database schema for error logs
interface ErrorLogDB extends DBSchema {
  error_logs: {
    key: number;
    value: CacheErrorLog;
    indexes: {
      'timestamp': string;
      'module': string;
      'errorType': string;
      'severity': string;
      'resolved': boolean;
      'userId': string;
    };
  };
}

const DB_NAME = 'pos-error-logs';
const DB_VERSION = 1;
const STORE_NAME = 'error_logs';
const MAX_LOGS = 10000; // Maximum number of logs to store
const LOG_RETENTION_DAYS = 90; // Keep logs for 90 days

class CacheErrorLoggerService {
  private db: IDBPDatabase<ErrorLogDB> | null = null;
  private originalConsoleError: typeof console.error = console.error.bind(console);

  /**
   * Initialize the error log database
   */
  async init(): Promise<IDBPDatabase<ErrorLogDB>> {
    if (this.db) return this.db;

    this.db = await openDB<ErrorLogDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });

          // Create indexes for efficient querying
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('module', 'module');
          store.createIndex('errorType', 'errorType');
          store.createIndex('severity', 'severity');
          store.createIndex('resolved', 'resolved');
          store.createIndex('userId', 'userId');
        }
      },
    });

    console.log('✅ [ErrorLogger] Error log database initialized');
    return this.db;
  }

  /**
   * Log a cache error
   */
  async logError(error: Omit<CacheErrorLog, 'id' | 'timestamp' | 'resolved'>): Promise<number | undefined> {
    try {
      const db = await this.init();

      const errorLog: Omit<CacheErrorLog, 'id'> = {
        ...error,
        timestamp: new Date().toISOString(),
        resolved: false,
      };

      const id = await db.add(STORE_NAME, errorLog as CacheErrorLog);

      // Log to console for immediate visibility using original console.error to prevent recursion
      const emoji = this.getSeverityEmoji(error.severity);
      
      // Use console.log instead of console.error to avoid triggering the error handler interceptor
      console.log(
        `${emoji} [ErrorLogger] ${error.module}.${error.function}:`,
        error.errorMessage,
        {
          type: error.errorType,
          severity: error.severity,
          operation: error.operation,
          context: error.operationContext,
        }
      );

      // Auto-cleanup old logs periodically
      this.cleanupOldLogs().catch(err => 
        console.warn('⚠️ [ErrorLogger] Cleanup failed:', err)
      );

      return id;
    } catch (err) {
      // Fallback to console if logging fails - use console.log to prevent recursion
      console.log('❌ [ErrorLogger] Failed to log error:', err);
      console.log('Original error:', error);
      return undefined;
    }
  }

  /**
   * Log a cache error with automatic context extraction
   */
  async logCacheError(
    module: string,
    functionName: string,
    error: Error | unknown,
    operation: string,
    context?: Record<string, any>
  ): Promise<number | undefined> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Auto-detect error type
    let errorType: CacheErrorLog['errorType'] = 'unknown';
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      errorType = 'network';
    } else if (errorMessage.includes('quota') || errorMessage.includes('storage')) {
      errorType = 'storage';
    } else if (errorMessage.includes('sync')) {
      errorType = 'sync';
    } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      errorType = 'validation';
    } else {
      errorType = 'logical';
    }

    // Auto-detect severity
    let severity: CacheErrorLog['severity'] = 'medium';
    if (errorMessage.includes('critical') || errorMessage.includes('fatal')) {
      severity = 'critical';
    } else if (errorMessage.includes('quota exceeded') || errorMessage.includes('sync failed')) {
      severity = 'high';
    } else if (errorMessage.includes('warning') || errorMessage.includes('retry')) {
      severity = 'low';
    }

    // Get user context from localStorage or session
    const userId = localStorage.getItem('userId') || undefined;
    const userName = localStorage.getItem('userName') || undefined;
    const userRole = localStorage.getItem('userRole') || undefined;
    const branchId = localStorage.getItem('selectedBranch') || undefined;
    const branchName = localStorage.getItem('selectedBranchName') || undefined;

    return this.logError({
      module,
      function: functionName,
      errorType,
      errorMessage,
      errorStack,
      operation,
      operationContext: context,
      userId,
      userName,
      userRole,
      branchId,
      branchName,
      isOnline: navigator.onLine,
      severity,
    });
  }

  /**
   * Get all error logs with optional filters
   */
  async getLogs(filters?: {
    module?: string;
    errorType?: string;
    severity?: string;
    resolved?: boolean;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<CacheErrorLog[]> {
    try {
      const db = await this.init();
      let logs = await db.getAll(STORE_NAME);

      // Apply filters
      if (filters) {
        if (filters.module) {
          logs = logs.filter(log => log.module === filters.module);
        }
        if (filters.errorType) {
          logs = logs.filter(log => log.errorType === filters.errorType);
        }
        if (filters.severity) {
          logs = logs.filter(log => log.severity === filters.severity);
        }
        if (filters.resolved !== undefined) {
          logs = logs.filter(log => log.resolved === filters.resolved);
        }
        if (filters.userId) {
          logs = logs.filter(log => log.userId === filters.userId);
        }
        if (filters.startDate) {
          logs = logs.filter(log => log.timestamp >= filters.startDate!);
        }
        if (filters.endDate) {
          logs = logs.filter(log => log.timestamp <= filters.endDate!);
        }
        if (filters.limit) {
          logs = logs.slice(0, filters.limit);
        }
      }

      // Sort by timestamp (newest first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return logs;
    } catch (error) {
      console.error('❌ [ErrorLogger] Failed to get logs:', error);
      return [];
    }
  }

  /**
   * Get error log by ID
   */
  async getLog(id: number): Promise<CacheErrorLog | undefined> {
    try {
      const db = await this.init();
      return await db.get(STORE_NAME, id);
    } catch (error) {
      console.error('❌ [ErrorLogger] Failed to get log:', error);
      return undefined;
    }
  }

  /**
   * Mark an error as resolved
   */
  async markResolved(id: number, resolvedBy: string, notes?: string): Promise<boolean> {
    try {
      const db = await this.init();
      const log = await db.get(STORE_NAME, id);

      if (!log) {
        console.warn('⚠️ [ErrorLogger] Log not found:', id);
        return false;
      }

      const updatedLog: CacheErrorLog = {
        ...log,
        resolved: true,
        resolvedAt: new Date().toISOString(),
        resolvedBy,
        notes,
      };

      await db.put(STORE_NAME, updatedLog);
      console.log('✅ [ErrorLogger] Log marked as resolved:', id);
      return true;
    } catch (error) {
      console.error('❌ [ErrorLogger] Failed to mark log as resolved:', error);
      return false;
    }
  }

  /**
   * Delete error log
   */
  async deleteLog(id: number): Promise<boolean> {
    try {
      const db = await this.init();
      await db.delete(STORE_NAME, id);
      console.log('✅ [ErrorLogger] Log deleted:', id);
      return true;
    } catch (error) {
      console.error('❌ [ErrorLogger] Failed to delete log:', error);
      return false;
    }
  }

  /**
   * Clear all logs
   */
  async clearAllLogs(): Promise<boolean> {
    try {
      const db = await this.init();
      await db.clear(STORE_NAME);
      console.log('✅ [ErrorLogger] All logs cleared');
      return true;
    } catch (error) {
      console.error('❌ [ErrorLogger] Failed to clear logs:', error);
      return false;
    }
  }

  /**
   * Get error statistics
   */
  async getStats(): Promise<{
    total: number;
    unresolved: number;
    resolved: number;
    byModule: Record<string, number>;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    last24Hours: number;
    last7Days: number;
  }> {
    try {
      const logs = await this.getLogs();

      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const week = 7 * day;

      const stats = {
        total: logs.length,
        unresolved: logs.filter(log => !log.resolved).length,
        resolved: logs.filter(log => log.resolved).length,
        byModule: {} as Record<string, number>,
        byType: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
        last24Hours: logs.filter(log => now - new Date(log.timestamp).getTime() < day).length,
        last7Days: logs.filter(log => now - new Date(log.timestamp).getTime() < week).length,
      };

      // Count by module
      logs.forEach(log => {
        stats.byModule[log.module] = (stats.byModule[log.module] || 0) + 1;
        stats.byType[log.errorType] = (stats.byType[log.errorType] || 0) + 1;
        stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('❌ [ErrorLogger] Failed to get stats:', error);
      return {
        total: 0,
        unresolved: 0,
        resolved: 0,
        byModule: {},
        byType: {},
        bySeverity: {},
        last24Hours: 0,
        last7Days: 0,
      };
    }
  }

  /**
   * Export logs as JSON
   */
  async exportLogs(filters?: Parameters<typeof this.getLogs>[0]): Promise<string> {
    const logs = await this.getLogs(filters);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Export logs as CSV
   */
  async exportLogsCSV(filters?: Parameters<typeof this.getLogs>[0]): Promise<string> {
    const logs = await this.getLogs(filters);

    if (logs.length === 0) {
      return 'No logs to export';
    }

    // CSV headers
    const headers = [
      'ID',
      'Timestamp',
      'Module',
      'Function',
      'Error Type',
      'Severity',
      'Error Message',
      'Operation',
      'User ID',
      'User Name',
      'User Role',
      'Branch ID',
      'Branch Name',
      'Is Online',
      'Resolved',
      'Resolved At',
      'Resolved By',
      'Notes',
    ];

    // CSV rows
    const rows = logs.map(log => [
      log.id,
      log.timestamp,
      log.module,
      log.function,
      log.errorType,
      log.severity,
      `"${log.errorMessage.replace(/"/g, '""')}"`, // Escape quotes
      log.operation,
      log.userId || '',
      log.userName || '',
      log.userRole || '',
      log.branchId || '',
      log.branchName || '',
      log.isOnline ? 'Yes' : 'No',
      log.resolved ? 'Yes' : 'No',
      log.resolvedAt || '',
      log.resolvedBy || '',
      log.notes ? `"${log.notes.replace(/"/g, '""')}"` : '',
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Cleanup old logs (older than retention period)
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      const db = await this.init();
      const logs = await db.getAll(STORE_NAME);

      // Delete logs older than retention period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_DAYS);
      const cutoffTimestamp = cutoffDate.toISOString();

      let deleted = 0;
      for (const log of logs) {
        if (log.timestamp < cutoffTimestamp && log.id) {
          await db.delete(STORE_NAME, log.id);
          deleted++;
        }
      }

      // If we still exceed max logs, delete oldest ones
      if (logs.length > MAX_LOGS) {
        const sortedLogs = logs.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        const toDelete = sortedLogs.slice(0, logs.length - MAX_LOGS);
        for (const log of toDelete) {
          if (log.id) {
            await db.delete(STORE_NAME, log.id);
            deleted++;
          }
        }
      }

      if (deleted > 0) {
        console.log(`🗑️ [ErrorLogger] Cleaned up ${deleted} old logs`);
      }
    } catch (error) {
      console.warn('⚠️ [ErrorLogger] Failed to cleanup old logs:', error);
    }
  }

  /**
   * Get severity emoji for console logging
   */
  private getSeverityEmoji(severity: CacheErrorLog['severity']): string {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔵';
      default:
        return '⚪';
    }
  }
}

// Export singleton instance
export const cacheErrorLogger = new CacheErrorLoggerService();

// Helper function for quick error logging
export async function logCacheError(
  module: string,
  functionName: string,
  error: Error | unknown,
  operation: string,
  context?: Record<string, any>
): Promise<void> {
  await cacheErrorLogger.logCacheError(module, functionName, error, operation, context);
}

