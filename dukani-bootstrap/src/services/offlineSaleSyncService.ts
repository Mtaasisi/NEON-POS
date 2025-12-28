/**
 * Offline Sale Sync Service
 * Handles offline-first sale creation with background sync
 */

import { supabase } from '../lib/supabaseClient';
import { saleProcessingService } from '../lib/saleProcessingService';
import { cacheErrorLogger } from './cacheErrorLogger';

interface OfflineSale {
  id: string;
  saleData: any;
  timestamp: number;
  synced: boolean;
  syncAttempts: number;
  error?: string;
  errorLogged?: boolean; // Track if we've already logged the error for this sale
}

class OfflineSaleSyncService {
  private readonly STORAGE_KEY = 'pos_offline_sales';
  private readonly MAX_SYNC_ATTEMPTS = 3;
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private readonly MAX_OFFLINE_SALES = 100; // Maximum number of offline sales to store
  private readonly CLEANUP_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days - remove old synced sales
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean up every 5 minutes (not on every save)
  private syncInterval: NodeJS.Timeout | null = null;
  private lastCleanupTime = 0;
  private isCleaningUp = false; // Prevent recursive cleanup calls
  private onlineHandler: (() => void) | null = null;

  /**
   * Save sale locally first (offline-first)
   */
  async saveSaleLocally(saleData: any): Promise<{ success: boolean; saleId: string; error?: string }> {
    try {
      const offlineSale: OfflineSale = {
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        saleData,
        timestamp: Date.now(),
        synced: false,
        syncAttempts: 0,
      };

      // Get existing sales and add new one
      const offlineSales = this.getOfflineSales();
      offlineSales.push(offlineSale);
      this.saveOfflineSales(offlineSales);

      // Try to sync immediately if online
      if (navigator.onLine) {
        this.syncSale(offlineSale.id).catch(err => {
          console.warn('⚠️ [OfflineSaleSync] Immediate sync failed, will retry:', err);
        });
      }

      return {
        success: true,
        saleId: offlineSale.id,
      };
    } catch (error) {
      console.error('❌ [OfflineSaleSync] Failed to save sale locally:', error);
      
      // Log error with context
      await cacheErrorLogger.logCacheError(
        'offlineSaleSyncService',
        'saveSaleLocally',
        error,
        'save',
        {
          saleDataKeys: Object.keys(saleData),
          timestamp: Date.now(),
          isOnline: navigator.onLine,
        }
      );
      
      return {
        success: false,
        saleId: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync a specific sale to online database
   */
  async syncSale(saleId: string): Promise<{ success: boolean; error?: string }> {
    const offlineSales = this.getOfflineSales();
    const sale = offlineSales.find(s => s.id === saleId);

    if (!sale) {
      return { success: false, error: 'Sale not found' };
    }

    if (sale.synced) {
      return { success: true };
    }

    if (sale.syncAttempts >= this.MAX_SYNC_ATTEMPTS) {
      return { success: false, error: 'Max sync attempts reached' };
    }

    try {
      // Use the existing sale processing service with forceOnline flag
      // This ensures the sale is actually synced to the server, not saved locally again
      const result = await saleProcessingService.processSale(sale.saleData, { forceOnline: true });

      if (result.success) {
        // Remove immediately after successful sync (don't keep synced sales)
        this.removeOfflineSale(saleId);
        
        console.log('✅ [OfflineSaleSync] Sale synced successfully and removed from local storage:', saleId);
        return { success: true };
      } else {
        throw new Error(result.error || 'Sale processing failed');
      }
    } catch (error) {
      sale.syncAttempts++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      sale.error = errorMessage;
      this.updateOfflineSale(sale);

      // ✅ FIX: Reduce console noise for stock-related errors
      // Stock errors are expected when stock changes between offline sale and sync
      const isStockError = errorMessage.includes('Insufficient stock') || 
                          errorMessage.includes('stock') ||
                          errorMessage.includes('Stock');
      
      // Only log first attempt or non-stock errors at warn level
      // Stock errors after first attempt are logged at debug level
      if (isStockError && sale.syncAttempts > 1) {
        // Stock errors after first attempt - use debug level
        if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
          console.debug(`ℹ️ [OfflineSaleSync] Sync attempt ${sale.syncAttempts} failed (stock issue):`, errorMessage);
        }
      } else if (sale.syncAttempts === 1) {
        // First attempt - always log (but use info for stock errors)
        if (isStockError) {
          // ✅ FIX: Consolidate first attempt messages
          console.log(
            `ℹ️ [OfflineSaleSync] Sync attempt ${sale.syncAttempts} failed (stock issue): ${errorMessage}\n` +
            `   This can happen when stock changes between offline sale and sync. Will retry up to ${this.MAX_SYNC_ATTEMPTS} times.`
          );
        } else {
          console.warn(`⚠️ [OfflineSaleSync] Sync attempt ${sale.syncAttempts} failed:`, errorMessage);
        }
      } else {
        // Subsequent attempts for non-stock errors
        console.warn(`⚠️ [OfflineSaleSync] Sync attempt ${sale.syncAttempts} failed:`, errorMessage);
      }

      // If max attempts reached, log once (warning for stock issues, error for others)
      // ✅ FIX: Only log once per sale to prevent console spam
      // Stock-related failures are expected in offline-first scenarios, so use warning level
      if (sale.syncAttempts >= this.MAX_SYNC_ATTEMPTS && !sale.errorLogged) {
        sale.errorLogged = true; // Mark as logged to prevent repeated errors
        this.updateOfflineSale(sale);
        
        // Log to error tracking system
        await cacheErrorLogger.logCacheError(
          'offlineSaleSyncService',
          'syncSale',
          new Error(errorMessage),
          'sync',
          {
            saleId,
            syncAttempts: sale.syncAttempts,
            maxAttempts: this.MAX_SYNC_ATTEMPTS,
            isStockError,
            saleTimestamp: sale.timestamp,
            isOnline: navigator.onLine,
          }
        );
        
        if (isStockError) {
          // ✅ FIX: Suppress individual stock-related warnings - they'll be summarized in syncAllPendingSales
          // Only log non-stock errors individually as they're more critical
        } else {
          console.error(`❌ [OfflineSaleSync] Sale ${saleId.substring(0, 20)}... failed after ${this.MAX_SYNC_ATTEMPTS} attempts:`, errorMessage);
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync all pending sales
   */
  async syncAllPendingSales(): Promise<{ synced: number; failed: number }> {
    if (!navigator.onLine) {
      console.log('ℹ️ [OfflineSaleSync] Offline, skipping sync');
      return { synced: 0, failed: 0 };
    }

    // Clean up old sales periodically (not every sync to avoid performance issues)
    this.cleanupOldSyncedSales();

    const offlineSales = this.getOfflineSales();
    // ✅ FIX: Filter out sales that have already reached max attempts to avoid unnecessary processing
    const pendingSales = offlineSales.filter(s => !s.synced && s.syncAttempts < this.MAX_SYNC_ATTEMPTS);
    // Count sales that have already reached max attempts (for summary)
    const maxAttemptsSales = offlineSales.filter(s => !s.synced && s.syncAttempts >= this.MAX_SYNC_ATTEMPTS);
    const maxAttemptsStockErrors = maxAttemptsSales.filter(s => 
      s.error && (s.error.includes('Insufficient stock') || s.error.includes('stock'))
    ).length;

    if (pendingSales.length === 0 && maxAttemptsSales.length === 0) {
      return { synced: 0, failed: 0 };
    }

    // Only log if there are sales to sync (reduce noise)
    if (pendingSales.length > 0) {
      console.log(`🔄 [OfflineSaleSync] Syncing ${pendingSales.length} pending sale(s)...`);
    }

    let synced = 0;
    let failed = 0;
    let stockErrors = 0;

    for (const sale of pendingSales) {
      const result = await this.syncSale(sale.id);
      if (result.success) {
        synced++;
      } else {
        failed++;
        // Track stock-related errors separately
        if (result.error && (result.error.includes('Insufficient stock') || result.error.includes('stock'))) {
          stockErrors++;
        }
      }
    }

    // ✅ FIX: Only log summary if there were sales to sync, and be more informative
    // Include summary of sales that already reached max attempts (but only once per session)
    if (pendingSales.length > 0 || (maxAttemptsSales.length > 0 && maxAttemptsStockErrors === maxAttemptsSales.length)) {
      if (synced > 0 && failed === 0 && maxAttemptsSales.length === 0) {
        console.log(`✅ [OfflineSaleSync] All ${synced} sale(s) synced successfully`);
      } else if (synced > 0) {
        const stockMsg = stockErrors > 0 ? ` (${stockErrors} stock-related)` : '';
        const maxAttemptsMsg = maxAttemptsSales.length > 0 ? `, ${maxAttemptsSales.length} already at max attempts` : '';
        console.log(`✅ [OfflineSaleSync] Sync complete: ${synced} synced, ${failed} failed${stockMsg}${maxAttemptsMsg}`);
      } else if (failed > 0) {
        // If all failures are stock-related, provide helpful context
        if (stockErrors === failed) {
          const maxAttemptsMsg = maxAttemptsSales.length > 0 ? ` (${maxAttemptsSales.length} already at max attempts)` : '';
          console.log(`ℹ️ [OfflineSaleSync] ${failed} sale(s) failed to sync (all stock-related)${maxAttemptsMsg}. Stock changed between offline sale and sync.`);
        } else {
          console.log(`ℹ️ [OfflineSaleSync] ${failed} sale(s) failed to sync. Will retry automatically.`);
        }
      } else if (maxAttemptsSales.length > 0 && maxAttemptsStockErrors === maxAttemptsSales.length) {
        // Only show summary of max attempts sales if all are stock-related (to reduce noise)
        console.log(`ℹ️ [OfflineSaleSync] ${maxAttemptsSales.length} sale(s) already at max sync attempts (stock-related). Stock changed between offline sale and sync.`);
      }
    }

    return { synced, failed };
  }

  /**
   * Clean up old synced sales (called periodically, debounced)
   */
  private async cleanupOldSyncedSales(): Promise<void> {
    // Prevent multiple simultaneous cleanups
    if (this.isCleaningUp) {
      return;
    }

    const now = Date.now();
    // Only cleanup if enough time has passed since last cleanup
    if ((now - this.lastCleanupTime) < this.CLEANUP_INTERVAL) {
      return;
    }

    try {
      this.isCleaningUp = true;
      const sales = this.getOfflineSales();
      const cleaned = this.cleanupOldSales(sales);
      
      if (cleaned.length < sales.length) {
        const removed = sales.length - cleaned.length;
        // Use direct save to avoid recursive cleanup
        const limited = this.limitSalesCount(cleaned);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limited));
        this.lastCleanupTime = now;
        console.log(`🧹 [OfflineSaleSync] Cleaned up ${removed} old synced sales`);
      } else {
        this.lastCleanupTime = now;
      }
    } catch (error) {
      console.warn('⚠️ [OfflineSaleSync] Cleanup error:', error);
      
      // Log error with context
      await cacheErrorLogger.logCacheError(
        'offlineSaleSyncService',
        'cleanupOldSyncedSales',
        error,
        'delete',
        {
          salesCount: this.getOfflineSales().length,
          lastCleanupTime: this.lastCleanupTime,
        }
      );
    } finally {
      this.isCleaningUp = false;
    }
  }

  /**
   * Start automatic sync interval
   */
  startAutoSync(): void {
    if (this.syncInterval) {
      return; // Already running
    }

    // Clean up old sales on startup
    this.cleanupOldSyncedSales();

    // Listen for online events to trigger immediate sync
    this.onlineHandler = () => {
      console.log('📶 [OfflineSaleSync] Device came online, syncing pending sales...');
      // Small delay to ensure network is stable
      setTimeout(() => {
        this.syncAllPendingSales().catch(err => {
          console.warn('⚠️ [OfflineSaleSync] Online sync error:', err);
        });
      }, 1000);
    };
    window.addEventListener('online', this.onlineHandler);

    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        // Clean up old sales periodically (not on every sync to avoid performance issues)
        this.cleanupOldSyncedSales();
        
        // Use setTimeout to defer sync and prevent blocking
        setTimeout(() => {
          this.syncAllPendingSales().catch(err => {
            console.warn('⚠️ [OfflineSaleSync] Auto sync error:', err);
          });
        }, 100); // Small delay to prevent blocking
      }
    }, this.SYNC_INTERVAL);

    console.log('✅ [OfflineSaleSync] Auto sync started');
  }

  /**
   * Stop automatic sync interval
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    // Remove online event listener
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
    
    console.log('✅ [OfflineSaleSync] Auto sync stopped');
  }

  /**
   * Get all offline sales
   */
  getOfflineSales(): OfflineSale[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Get pending sales count
   */
  getPendingSalesCount(): number {
    return this.getOfflineSales().filter(s => !s.synced).length;
  }

  /**
   * Save offline sales with quota management (optimized to prevent performance issues)
   */
  private saveOfflineSales(sales: OfflineSale[]): void {
    // Prevent recursive calls during cleanup
    if (this.isCleaningUp) {
      return;
    }

    try {
      // Only do full cleanup periodically (not on every save)
      const now = Date.now();
      const shouldCleanup = (now - this.lastCleanupTime) > this.CLEANUP_INTERVAL;
      
      let salesToSave = sales;
      
      if (shouldCleanup) {
        // Clean up old synced sales before saving
        salesToSave = this.cleanupOldSales(sales);
        this.lastCleanupTime = now;
      }
      
      // Always limit the number of sales stored (keep most recent)
      salesToSave = this.limitSalesCount(salesToSave);
      
      // Single JSON.stringify operation (optimized)
      const jsonData = JSON.stringify(salesToSave);
      
      // Check if data would exceed quota (rough estimate: 5MB limit)
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      if (jsonData.length > MAX_SIZE) {
        console.warn('⚠️ [OfflineSaleSync] Data size approaching limit, cleaning up more aggressively...');
        // Remove oldest synced sales first, then oldest unsynced if still too large
        const aggressiveCleanup = this.aggressiveCleanup(salesToSave);
        const aggressiveJson = JSON.stringify(aggressiveCleanup);
        
        if (aggressiveJson.length > MAX_SIZE) {
          // Last resort: keep only the most recent 50 unsynced sales
          const emergencyCleanup = this.emergencyCleanup(aggressiveCleanup);
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(emergencyCleanup));
          console.warn('⚠️ [OfflineSaleSync] Emergency cleanup performed - kept only most recent unsynced sales');
          return;
        }
        
        localStorage.setItem(this.STORAGE_KEY, aggressiveJson);
        return;
      }
      
      localStorage.setItem(this.STORAGE_KEY, jsonData);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('❌ [OfflineSaleSync] QuotaExceededError - performing emergency cleanup...');
        this.isCleaningUp = true;
        try {
          // Emergency cleanup: keep only most recent unsynced sales
          const emergencySales = this.emergencyCleanup(sales);
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(emergencySales));
          console.warn('⚠️ [OfflineSaleSync] Emergency cleanup completed - some old sales may have been removed');
        } catch (emergencyError) {
          console.error('❌ [OfflineSaleSync] Emergency cleanup also failed:', emergencyError);
          // Last resort: clear all synced sales
          const unsyncedOnly = sales.filter(s => !s.synced);
          try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(unsyncedOnly));
            console.warn('⚠️ [OfflineSaleSync] Removed all synced sales to free space');
          } catch (finalError) {
            console.error('❌ [OfflineSaleSync] Failed to save even after cleanup:', finalError);
          }
        } finally {
          this.isCleaningUp = false;
        }
      } else {
        console.error('❌ [OfflineSaleSync] Failed to save offline sales:', error);
        
        // Log error with context
        cacheErrorLogger.logCacheError(
          'offlineSaleSyncService',
          'saveOfflineSales',
          error,
          'save',
          {
            salesCount: sales.length,
            isCleaningUp: this.isCleaningUp,
          }
        ).catch(err => console.error('Failed to log error:', err));
      }
    }
  }

  /**
   * Clean up old synced sales
   */
  private cleanupOldSales(sales: OfflineSale[]): OfflineSale[] {
    const now = Date.now();
    return sales.filter(sale => {
      // Keep unsynced sales
      if (!sale.synced) return true;
      
      // Remove synced sales older than CLEANUP_AGE_MS
      const age = now - sale.timestamp;
      return age < this.CLEANUP_AGE_MS;
    });
  }

  /**
   * Limit the number of sales stored (keep most recent)
   */
  private limitSalesCount(sales: OfflineSale[]): OfflineSale[] {
    if (sales.length <= this.MAX_OFFLINE_SALES) {
      return sales;
    }
    
    // Sort by timestamp (most recent first)
    const sorted = [...sales].sort((a, b) => b.timestamp - a.timestamp);
    
    // Keep all unsynced sales + most recent synced sales up to limit
    const unsynced = sorted.filter(s => !s.synced);
    const synced = sorted.filter(s => s.synced);
    
    // Keep up to MAX_OFFLINE_SALES total, prioritizing unsynced
    const keepCount = Math.min(this.MAX_OFFLINE_SALES, sorted.length);
    const syncedToKeep = Math.max(0, keepCount - unsynced.length);
    
    return [...unsynced, ...synced.slice(0, syncedToKeep)];
  }

  /**
   * Aggressive cleanup when approaching quota
   */
  private aggressiveCleanup(sales: OfflineSale[]): OfflineSale[] {
    // Remove all synced sales older than 1 day
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const filtered = sales.filter(sale => {
      if (!sale.synced) return true; // Keep all unsynced
      return sale.timestamp > oneDayAgo; // Keep synced from last 24 hours
    });
    
    // If still too many, limit to most recent 50
    if (filtered.length > 50) {
      const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp);
      const unsynced = sorted.filter(s => !s.synced);
      const synced = sorted.filter(s => s.synced);
      return [...unsynced, ...synced.slice(0, Math.max(0, 50 - unsynced.length))];
    }
    
    return filtered;
  }

  /**
   * Emergency cleanup - keep only most recent unsynced sales
   */
  private emergencyCleanup(sales: OfflineSale[]): OfflineSale[] {
    // Keep only unsynced sales, sorted by most recent
    const unsynced = sales.filter(s => !s.synced);
    const sorted = unsynced.sort((a, b) => b.timestamp - a.timestamp);
    
    // Keep only the 50 most recent unsynced sales
    return sorted.slice(0, 50);
  }

  /**
   * Update offline sale
   */
  private updateOfflineSale(updatedSale: OfflineSale): void {
    const sales = this.getOfflineSales();
    const index = sales.findIndex(s => s.id === updatedSale.id);
    if (index !== -1) {
      sales[index] = updatedSale;
      this.saveOfflineSales(sales);
    }
  }

  /**
   * Remove offline sale
   */
  private removeOfflineSale(saleId: string): void {
    const sales = this.getOfflineSales();
    const filtered = sales.filter(s => s.id !== saleId);
    this.saveOfflineSales(filtered);
  }

  /**
   * Clear all offline sales (use with caution)
   */
  clearAllOfflineSales(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('✅ [OfflineSaleSync] All offline sales cleared');
  }
}

export const offlineSaleSyncService = new OfflineSaleSyncService();

