/**
 * Automatic Background Sync Service
 * Syncs downloaded database when WiFi/network is available
 */

import { fullDatabaseDownloadService } from './fullDatabaseDownloadService';
import { useInventoryStore } from '../features/lats/stores/useInventoryStore';

interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: number | null;
  lastSyncSuccess: boolean;
  nextSyncTime: number | null;
  syncInterval: number; // in milliseconds
  error: string | null;
}

class AutoSyncService {
  private syncInterval: number = 30 * 60 * 1000; // 30 minutes default
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private lastSyncTime: number | null = null;
  private lastSyncSuccess: boolean = false;
  private error: string | null = null;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Load settings from localStorage
    const savedInterval = localStorage.getItem('auto_sync_interval');
    if (savedInterval) {
      this.syncInterval = parseInt(savedInterval, 10);
    }

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Start auto sync if online
    if (navigator.onLine) {
      this.startAutoSync();
    }

    console.log('🔧 [AutoSync] Service initialized', {
      syncInterval: this.syncInterval / 1000 / 60 + ' minutes',
      isOnline: navigator.onLine
    });
  }

  private handleOnline() {
    console.log('🌐 [AutoSync] Network online - starting auto sync');
    this.startAutoSync();
    // Trigger immediate sync when coming online
    this.syncNow();
  }

  private handleOffline() {
    console.log('📴 [AutoSync] Network offline - pausing auto sync');
    this.stopAutoSync();
  }

  /**
   * Start automatic background sync
   */
  startAutoSync() {
    if (this.syncTimer) {
      return; // Already running
    }

    if (!navigator.onLine) {
      console.warn('⚠️ [AutoSync] Cannot start - offline');
      return;
    }

    console.log(`🔄 [AutoSync] Starting automatic sync (every ${this.syncInterval / 1000 / 60} minutes)`);
    
    this.syncTimer = setInterval(() => {
      this.syncNow();
    }, this.syncInterval);

    // Trigger first sync after a short delay
    setTimeout(() => {
      this.syncNow();
    }, 5000); // 5 seconds delay
  }

  /**
   * Stop automatic background sync
   */
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('⏸️ [AutoSync] Stopped automatic sync');
    }
  }

  /**
   * Sync now (manual trigger)
   */
  async syncNow(): Promise<{ success: boolean; error?: string }> {
    if (this.isSyncing) {
      console.log('⏳ [AutoSync] Sync already in progress, skipping...');
      return { success: false, error: 'Sync already in progress' };
    }

    if (!navigator.onLine) {
      console.warn('⚠️ [AutoSync] Cannot sync - offline');
      this.error = 'Offline';
      this.notifyListeners();
      return { success: false, error: 'Offline' };
    }

    const isDownloaded = fullDatabaseDownloadService.isDownloaded();
    if (!isDownloaded) {
      console.log('ℹ️ [AutoSync] No database downloaded, skipping sync');
      return { success: false, error: 'No database downloaded' };
    }

    this.isSyncing = true;
    this.error = null;
    this.notifyListeners();

    const startTime = Date.now();
    console.log('🔄 [AutoSync] Starting background sync...');

    try {
      // Sync products (most important for POS)
      console.log('📦 [AutoSync] Syncing products...');
      const result = await fullDatabaseDownloadService.downloadFullDatabase((progress) => {
        if (import.meta.env.DEV) {
          console.log(`🔄 [AutoSync] Progress: ${progress.percentage}% - ${progress.currentTask}`);
        }
      });

      const syncTime = Date.now() - startTime;

      if (result.success) {
        this.lastSyncTime = Date.now();
        this.lastSyncSuccess = true;
        this.error = null;

        // Refresh inventory store
        const store = useInventoryStore.getState();
        if (store.products.length === 0 || result.data.products > 0) {
          console.log('🔄 [AutoSync] Refreshing inventory store...');
          await store.loadProducts({ page: 1, limit: 200 }, true);
        }

        const totalItems = Object.values(result.data).reduce((a: number, b: number) => a + b, 0);
        console.log(`✅ [AutoSync] Sync completed successfully in ${(syncTime / 1000).toFixed(1)}s`, {
          totalItems,
          products: result.data.products,
          variants: result.data.variants,
          customers: result.data.customers
        });

        // Verify all data after sync
        if (import.meta.env.DEV) {
          console.log('🔍 [AutoSync] Verifying synced data...');
          const verification = await fullDatabaseDownloadService.verifyAllData();
          if (verification.allOk) {
            console.log('✅ [AutoSync] All data verified successfully');
          } else {
            console.warn('⚠️ [AutoSync] Verification found issues:', verification.summary);
          }
        }

        this.notifyListeners();
        return { success: true };
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.error = errorMessage;
      this.lastSyncSuccess = false;
      
      console.error('❌ [AutoSync] Sync failed:', errorMessage);
      this.notifyListeners();
      return { success: false, error: errorMessage };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      lastSyncSuccess: this.lastSyncSuccess,
      nextSyncTime: this.syncTimer ? Date.now() + this.syncInterval : null,
      syncInterval: this.syncInterval,
      error: this.error
    };
  }

  /**
   * Set sync interval
   */
  setSyncInterval(intervalMinutes: number) {
    this.syncInterval = intervalMinutes * 60 * 1000;
    localStorage.setItem('auto_sync_interval', this.syncInterval.toString());
    
    // Restart with new interval
    this.stopAutoSync();
    if (navigator.onLine) {
      this.startAutoSync();
    }

    console.log(`⚙️ [AutoSync] Sync interval set to ${intervalMinutes} minutes`);
  }

  /**
   * Subscribe to sync status updates
   */
  subscribe(listener: (status: SyncStatus) => void) {
    this.listeners.add(listener);
    // Immediately notify with current status
    listener(this.getStatus());
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach(listener => listener(status));
  }

  /**
   * Check if sync is enabled
   */
  isEnabled(): boolean {
    return this.syncTimer !== null;
  }
}

export const autoSyncService = new AutoSyncService();

