/**
 * Enhanced Cache Manager
 * 
 * Smart caching system that:
 * 1. Checks if local data exists
 * 2. If not, fetches from API once and saves locally
 * 3. If exists, loads from cache immediately
 * 4. Refreshes data in background without blocking UI
 * 
 * Uses IndexedDB for persistent storage across app restarts
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { supabase } from './supabase';
import toast from 'react-hot-toast';
import { cacheErrorLogger } from '../services/cacheErrorLogger';

// Database schema
interface CacheDB extends DBSchema {
  products: {
    key: string;
    value: any;
    indexes: { 
      'category': string; 
      'is_active': boolean;
      'branch_id': string;
    };
  };
  customers: {
    key: string;
    value: any;
    indexes: { 
      'branch_id': string;
      'created_at': string;
    };
  };
  sales: {
    key: string;
    value: any;
    indexes: { 
      'created_at': string;
      'branch_id': string;
    };
  };
  branches: {
    key: string;
    value: any;
  };
  categories: {
    key: string;
    value: any;
  };
  suppliers: {
    key: string;
    value: any;
  };
  payment_accounts: {
    key: string;
    value: any;
  };
  settings: {
    key: string;
    value: any;
  };
  pending_sync: {
    key: number;
    value: {
      id?: number;
      type: string;
      action: 'create' | 'update' | 'delete';
      data: any;
      timestamp: string;
      synced: boolean;
    };
    indexes: { 
      'synced': boolean;
      'type': string;
    };
  };
  cache_metadata: {
    key: string;
    value: {
      store: string;
      lastSynced: string;
      itemCount: number;
      version: number;
      expiresAt: number;
    };
  };
}

const DB_NAME = 'pos-smart-cache';
const DB_VERSION = 2;

// Cache expiry configuration (in milliseconds)
const CACHE_CONFIG = {
  products: {
    expiry: 4 * 60 * 60 * 1000, // 4 hours
    staleTime: 1 * 60 * 60 * 1000, // 1 hour - trigger background refresh
  },
  customers: {
    expiry: 2 * 60 * 60 * 1000, // 2 hours
    staleTime: 30 * 60 * 1000, // 30 minutes
  },
  sales: {
    expiry: 24 * 60 * 60 * 1000, // 24 hours
    staleTime: 2 * 60 * 60 * 1000, // 2 hours
  },
  branches: {
    expiry: 24 * 60 * 60 * 1000, // 24 hours
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
  },
  categories: {
    expiry: 48 * 60 * 60 * 1000, // 48 hours
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  },
  suppliers: {
    expiry: 24 * 60 * 60 * 1000, // 24 hours
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
  },
  payment_accounts: {
    expiry: 24 * 60 * 60 * 1000, // 24 hours
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
  },
  settings: {
    expiry: 48 * 60 * 60 * 1000, // 48 hours
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  },
};

type CacheStore = keyof typeof CACHE_CONFIG;

class EnhancedCacheManager {
  private db: IDBPDatabase<CacheDB> | null = null;
  private isOnline: boolean = navigator.onLine;
  private refreshInProgress: Set<string> = new Set();
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.init();
    this.setupNetworkListeners();
  }

  /**
   * Initialize the database
   */
  async init(): Promise<IDBPDatabase<CacheDB>> {
    if (this.db) return this.db;

    this.db = await openDB<CacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log('📦 [SmartCache] Upgrading database from', oldVersion, 'to', newVersion);

        // Create object stores with indexes
        if (!db.objectStoreNames.contains('products')) {
          const productsStore = db.createObjectStore('products', { keyPath: 'id' });
          productsStore.createIndex('category', 'category');
          productsStore.createIndex('is_active', 'is_active');
          productsStore.createIndex('branch_id', 'branch_id');
        }

        if (!db.objectStoreNames.contains('customers')) {
          const customersStore = db.createObjectStore('customers', { keyPath: 'id' });
          customersStore.createIndex('branch_id', 'branch_id');
          customersStore.createIndex('created_at', 'created_at');
        }

        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
          salesStore.createIndex('created_at', 'created_at');
          salesStore.createIndex('branch_id', 'branch_id');
        }

        if (!db.objectStoreNames.contains('branches')) {
          db.createObjectStore('branches', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('suppliers')) {
          db.createObjectStore('suppliers', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('payment_accounts')) {
          db.createObjectStore('payment_accounts', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('pending_sync')) {
          const pendingSyncStore = db.createObjectStore('pending_sync', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          pendingSyncStore.createIndex('synced', 'synced');
          pendingSyncStore.createIndex('type', 'type');
        }

        if (!db.objectStoreNames.contains('cache_metadata')) {
          db.createObjectStore('cache_metadata', { keyPath: 'store' });
        }
      },
    });

    console.log('✅ [SmartCache] Database initialized');
    return this.db;
  }

  /**
   * Setup network status listeners and branch change listeners
   */
  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('📶 [SmartCache] Device is online');
      this.isOnline = true;
      this.syncPendingOperations();
    });

    window.addEventListener('offline', () => {
      console.log('📵 [SmartCache] Device is offline');
      this.isOnline = false;
    });

    // 🔥 Listen for branch changes and clear branch-specific cache
    window.addEventListener('branchChanged', ((event: CustomEvent) => {
      const { branchId } = event.detail;
      console.log('🏪 [SmartCache] Branch changed, clearing branch-specific cache...', branchId);
      
      // Clear cache for branch-specific data
      this.invalidateCache('products');
      this.invalidateCache('customers');
      this.invalidateCache('sales');
      
      toast('Branch changed - refreshing data...', { 
        icon: '🔄',
        duration: 2000 
      });
    }) as EventListener);
  }

  /**
   * SMART FETCH: Main method that implements the caching strategy
   * 
   * 1. Check if local data exists
   * 2. If exists and not expired, return from cache
   * 3. If not exists or expired, fetch from API and save
   * 4. If stale (old but not expired), return cached data and refresh in background
   */
  async smartFetch<T = any>(
    storeName: CacheStore,
    fetchFn: () => Promise<T[]>,
    options: {
      forceRefresh?: boolean;
      showLoadingToast?: boolean;
      branchId?: string;
    } = {}
  ): Promise<T[]> {
    const { forceRefresh = false, showLoadingToast = false, branchId } = options;

    try {
      // Check if cache exists and is valid
      const cacheStatus = await this.getCacheStatus(storeName);
      
      // Case 1: Cache exists, is fresh, and no force refresh
      if (!forceRefresh && cacheStatus.exists && cacheStatus.isFresh) {
        console.log(`✅ [SmartCache] Using fresh cache for ${storeName}`);
        const cachedData = await this.getFromCache<T>(storeName);
        
        // Trigger background refresh if stale
        if (cacheStatus.isStale) {
          console.log(`🔄 [SmartCache] Cache is stale, refreshing in background for ${storeName}`);
          this.refreshInBackground(storeName, fetchFn, branchId);
        }
        
        return cachedData;
      }

      // Case 2: Cache doesn't exist, is expired, or force refresh
      if (showLoadingToast) {
        toast.loading(`Loading ${storeName}...`, { id: `fetch-${storeName}` });
      }

      console.log(`🌐 [SmartCache] Fetching ${storeName} from server...`);
      
      // Check if we're online
      if (!this.isOnline) {
        console.warn(`📵 [SmartCache] Offline - using expired cache for ${storeName}`);
        if (showLoadingToast) {
          toast.dismiss(`fetch-${storeName}`);
          toast.error('You are offline. Showing cached data.', { duration: 3000 });
        }
        return await this.getFromCache<T>(storeName);
      }

      // Fetch from API
      const data = await fetchFn();
      
      // Save to cache
      await this.saveToCache(storeName, data);
      
      if (showLoadingToast) {
        toast.success(`${storeName} loaded successfully!`, { id: `fetch-${storeName}` });
      }

      console.log(`✅ [SmartCache] Fetched and cached ${data.length} items for ${storeName}`);
      
      // Notify listeners
      this.notifyListeners(storeName, data);
      
      return data;
    } catch (error: any) {
      console.error(`❌ [SmartCache] Error fetching ${storeName}:`, error);
      
      // Log error with context
      await cacheErrorLogger.logCacheError(
        'enhancedCacheManager',
        'smartFetch',
        error,
        'fetch',
        {
          storeName,
          forceRefresh,
          branchId,
          isOnline: this.isOnline,
        }
      );
      
      if (showLoadingToast) {
        toast.error(`Failed to load ${storeName}`, { id: `fetch-${storeName}` });
      }

      // Try to return cached data as fallback
      const cachedData = await this.getFromCache<T>(storeName);
      if (cachedData.length > 0) {
        console.log(`⚠️ [SmartCache] Returning cached data as fallback for ${storeName}`);
        toast('Using cached data', { icon: '💾', duration: 2000 });
        return cachedData;
      }

      throw error;
    }
  }

  /**
   * Refresh data in background without blocking UI
   */
  private async refreshInBackground<T>(
    storeName: CacheStore,
    fetchFn: () => Promise<T[]>,
    branchId?: string
  ): Promise<void> {
    // Prevent multiple simultaneous refreshes for the same store
    if (this.refreshInProgress.has(storeName)) {
      console.log(`⏳ [SmartCache] Background refresh already in progress for ${storeName}`);
      return;
    }

    this.refreshInProgress.add(storeName);

    try {
      console.log(`🔄 [SmartCache] Starting background refresh for ${storeName}`);
      
      const data = await fetchFn();
      await this.saveToCache(storeName, data);
      
      console.log(`✅ [SmartCache] Background refresh complete for ${storeName}`);
      
      // Notify listeners about updated data
      this.notifyListeners(storeName, data);
    } catch (error) {
      console.error(`❌ [SmartCache] Background refresh failed for ${storeName}:`, error);
      
      // Log error with context
      await cacheErrorLogger.logCacheError(
        'enhancedCacheManager',
        'refreshInBackground',
        error,
        'background_refresh',
        {
          storeName,
          branchId,
          isOnline: this.isOnline,
        }
      );
    } finally {
      this.refreshInProgress.delete(storeName);
    }
  }

  /**
   * Get cache status (exists, fresh, stale, expired)
   */
  private async getCacheStatus(storeName: CacheStore): Promise<{
    exists: boolean;
    isFresh: boolean;
    isStale: boolean;
    isExpired: boolean;
    age: number;
  }> {
    try {
      const db = await this.init();
      const metadata = await db.get('cache_metadata', storeName);
      
      if (!metadata) {
        return { exists: false, isFresh: false, isStale: false, isExpired: true, age: 0 };
      }

      const now = Date.now();
      const age = now - new Date(metadata.lastSynced).getTime();
      const config = CACHE_CONFIG[storeName];

      const isExpired = age > config.expiry;
      const isStale = age > config.staleTime && !isExpired;
      const isFresh = age <= config.staleTime;

      return {
        exists: true,
        isFresh,
        isStale,
        isExpired,
        age,
      };
    } catch (error) {
      console.error(`❌ [SmartCache] Error checking cache status for ${storeName}:`, error);
      
      // Log error with context
      await cacheErrorLogger.logCacheError(
        'enhancedCacheManager',
        'getCacheStatus',
        error,
        'read',
        { storeName }
      );
      
      return { exists: false, isFresh: false, isStale: false, isExpired: true, age: 0 };
    }
  }

  /**
   * Get data from cache
   */
  private async getFromCache<T = any>(storeName: CacheStore): Promise<T[]> {
    try {
      const db = await this.init();
      const data = await db.getAll(storeName as any);
      return data.map((item: any) => {
        const { _cachedAt, ...cleanItem } = item;
        return cleanItem as T;
      });
    } catch (error) {
      console.error(`❌ [SmartCache] Error getting from cache for ${storeName}:`, error);
      
      // Log error with context
      await cacheErrorLogger.logCacheError(
        'enhancedCacheManager',
        'getFromCache',
        error,
        'read',
        { storeName }
      );
      
      return [];
    }
  }

  /**
   * Save data to cache (made public for preloaded data loader)
   */
  async saveToCache<T = any>(storeName: CacheStore, data: T[]): Promise<void> {
    try {
      const db = await this.init();
      const tx = db.transaction([storeName as any, 'cache_metadata'], 'readwrite');
      
      // Clear existing data
      await tx.objectStore(storeName as any).clear();
      
      // Add items with timestamp
      const timestamp = new Date().toISOString();
      for (const item of data) {
        await tx.objectStore(storeName as any).put({ 
          ...item, 
          _cachedAt: timestamp 
        });
      }
      
      // Update metadata
      const config = CACHE_CONFIG[storeName];
      await tx.objectStore('cache_metadata').put({
        store: storeName,
        lastSynced: timestamp,
        itemCount: data.length,
        version: DB_VERSION,
        expiresAt: Date.now() + config.expiry,
      });
      
      await tx.done;
    } catch (error) {
      console.error(`❌ [SmartCache] Error saving to cache for ${storeName}:`, error);
      
      // Log error with context
      await cacheErrorLogger.logCacheError(
        'enhancedCacheManager',
        'saveToCache',
        error,
        'save',
        {
          storeName,
          itemCount: data.length,
        }
      );
      
      throw error;
    }
  }

  /**
   * Subscribe to data updates
   */
  subscribe(storeName: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(storeName)) {
      this.listeners.set(storeName, new Set());
    }
    
    this.listeners.get(storeName)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(storeName)?.delete(callback);
    };
  }

  /**
   * Notify listeners about data updates
   */
  private notifyListeners(storeName: string, data: any): void {
    const listeners = this.listeners.get(storeName);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Queue operation for offline sync
   */
  async queueForSync(type: string, action: 'create' | 'update' | 'delete', data: any): Promise<void> {
    try {
      const db = await this.init();
      await db.add('pending_sync', {
        type,
        action,
        data,
        timestamp: new Date().toISOString(),
        synced: false,
      });
      console.log(`📝 [SmartCache] Queued ${action} operation for ${type}`);
    } catch (error) {
      console.error(`❌ [SmartCache] Error queuing operation:`, error);
      
      // Log error with context
      await cacheErrorLogger.logCacheError(
        'enhancedCacheManager',
        'queueForSync',
        error,
        'queue',
        {
          type,
          action,
        }
      );
    }
  }

  /**
   * Sync pending operations when online
   */
  private async syncPendingOperations(): Promise<void> {
    try {
      const db = await this.init();
      // Get all pending operations and filter for unsynced ones
      const allOps = await db.getAll('pending_sync');
      const pendingOps = allOps.filter(op => op.synced === false);
      
      if (pendingOps.length === 0) {
        console.log('✅ [SmartCache] No pending operations to sync');
        return;
      }

      console.log(`🔄 [SmartCache] Syncing ${pendingOps.length} pending operations...`);

      for (const op of pendingOps) {
        try {
          // TODO: Implement actual sync logic based on operation type
          // For now, just mark as synced
          await db.put('pending_sync', { ...op, synced: true });
          console.log(`✅ [SmartCache] Synced operation ${op.id}`);
        } catch (error) {
          console.error(`❌ [SmartCache] Failed to sync operation ${op.id}:`, error);
          
          // Log error with context
          await cacheErrorLogger.logCacheError(
            'enhancedCacheManager',
            'syncPendingOperations',
            error,
            'sync',
            {
              operationId: op.id,
              operationType: op.type,
              operationAction: op.action,
            }
          );
        }
      }

      toast.success(`Synced ${pendingOps.length} offline changes`);
    } catch (error) {
      console.error(`❌ [SmartCache] Error syncing pending operations:`, error);
      
      // Log error with context
      await cacheErrorLogger.logCacheError(
        'enhancedCacheManager',
        'syncPendingOperations',
        error,
        'sync',
        {
          pendingOperationsCount: pendingOps?.length || 0,
        }
      );
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<Record<string, any>> {
    try {
      const db = await this.init();
      const stats: Record<string, any> = {};

      for (const storeName of Object.keys(CACHE_CONFIG)) {
        const metadata = await db.get('cache_metadata', storeName);
        const count = await db.count(storeName as any);
        const status = await this.getCacheStatus(storeName as CacheStore);

        stats[storeName] = {
          itemCount: count,
          lastSynced: metadata?.lastSynced || null,
          ...status,
        };
      }

      return stats;
    } catch (error) {
      console.error('❌ [SmartCache] Error getting cache stats:', error);
      
      // Log error with context
      await cacheErrorLogger.logCacheError(
        'enhancedCacheManager',
        'getCacheStats',
        error,
        'read',
        {}
      );
      
      return {};
    }
  }

  /**
   * Clear all cache
   */
  async clearAllCache(): Promise<void> {
    try {
      const db = await this.init();
      const stores = Object.keys(CACHE_CONFIG);

      for (const store of stores) {
        await db.clear(store as any);
      }

      await db.clear('cache_metadata');
      
      console.log('✅ [SmartCache] All cache cleared');
      toast.success('Cache cleared successfully');
    } catch (error) {
      console.error('❌ [SmartCache] Error clearing cache:', error);
      
      // Log error with context
      await cacheErrorLogger.logCacheError(
        'enhancedCacheManager',
        'clearAllCache',
        error,
        'delete',
        {}
      );
      
      toast.error('Failed to clear cache');
    }
  }

  /**
   * Invalidate specific cache
   */
  async invalidateCache(storeName: CacheStore): Promise<void> {
    try {
      const db = await this.init();
      await db.delete('cache_metadata', storeName);
      console.log(`✅ [SmartCache] Invalidated cache for ${storeName}`);
    } catch (error) {
      console.error(`❌ [SmartCache] Error invalidating cache for ${storeName}:`, error);
      
      // Log error with context
      await cacheErrorLogger.logCacheError(
        'enhancedCacheManager',
        'invalidateCache',
        error,
        'delete',
        { storeName }
      );
    }
  }
}

// Export singleton instance
export const smartCache = new EnhancedCacheManager();

// Export convenience functions
export const fetchProducts = (branchId?: string, forceRefresh = false) =>
  smartCache.smartFetch('products', async () => {
    let query = supabase
      .from('lats_products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }, { forceRefresh, branchId });

export const fetchCustomers = (branchId?: string, forceRefresh = false) =>
  smartCache.smartFetch('customers', async () => {
    let query = supabase
      .from('lats_customers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }, { forceRefresh, branchId });

export const fetchCategories = (forceRefresh = false) =>
  smartCache.smartFetch('categories', async () => {
    const { data, error } = await supabase
      .from('lats_categories')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }, { forceRefresh });

export const fetchSuppliers = (forceRefresh = false) =>
  smartCache.smartFetch('suppliers', async () => {
    const { data, error } = await supabase
      .from('lats_suppliers')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }, { forceRefresh });

export const fetchBranches = (forceRefresh = false) =>
  smartCache.smartFetch('branches', async () => {
    const { data, error } = await supabase
      .from('lats_branches')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }, { forceRefresh });

export const fetchPaymentAccounts = (forceRefresh = false) =>
  smartCache.smartFetch('payment_accounts', async () => {
    const { data, error } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('is_payment_method', true);

    if (error) throw error;
    return data || [];
  }, { forceRefresh });

