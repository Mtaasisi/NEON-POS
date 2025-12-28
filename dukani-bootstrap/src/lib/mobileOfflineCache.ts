/**
 * Mobile Offline Cache Service
 * Comprehensive offline data caching for mobile APK
 * Stores all essential data for offline operation
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { supabase } from './supabase';

// Database schema
interface MobileOfflineDB extends DBSchema {
  products: {
    key: string;
    value: any;
    indexes: { 'category': string; 'is_active': boolean };
  };
  customers: {
    key: string;
    value: any;
  };
  sales: {
    key: string;
    value: any;
    indexes: { 'created_at': string };
  };
  branches: {
    key: string;
    value: any;
  };
  categories: {
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
  pending_sales: {
    key: string;
    value: any;
    indexes: { 'created_at': string };
  };
  sync_metadata: {
    key: string;
    value: {
      store: string;
      lastSynced: string;
      itemCount: number;
      version: number;
    };
  };
}

const DB_NAME = 'mobile-offline-pos';
const DB_VERSION = 1;

// Cache expiry times (in milliseconds)
const CACHE_EXPIRY = {
  products: 24 * 60 * 60 * 1000, // 24 hours
  customers: 12 * 60 * 60 * 1000, // 12 hours
  sales: 7 * 24 * 60 * 60 * 1000, // 7 days (keep recent sales)
  branches: 24 * 60 * 60 * 1000, // 24 hours
  categories: 48 * 60 * 60 * 1000, // 48 hours
  payment_accounts: 24 * 60 * 60 * 1000, // 24 hours
  settings: 48 * 60 * 60 * 1000, // 48 hours
};

class MobileOfflineCacheService {
  private db: IDBPDatabase<MobileOfflineDB> | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<IDBPDatabase<MobileOfflineDB>> {
    if (this.db) return this.db;

    this.db = await openDB<MobileOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log('📦 [MobileCache] Upgrading database from', oldVersion, 'to', newVersion);

        // Create object stores
        if (!db.objectStoreNames.contains('products')) {
          const productsStore = db.createObjectStore('products', { keyPath: 'id' });
          productsStore.createIndex('category', 'category');
          productsStore.createIndex('is_active', 'is_active');
        }

        if (!db.objectStoreNames.contains('customers')) {
          db.createObjectStore('customers', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
          salesStore.createIndex('created_at', 'created_at');
        }

        if (!db.objectStoreNames.contains('branches')) {
          db.createObjectStore('branches', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('payment_accounts')) {
          db.createObjectStore('payment_accounts', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('pending_sales')) {
          const pendingSalesStore = db.createObjectStore('pending_sales', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          pendingSalesStore.createIndex('created_at', 'created_at');
        }

        if (!db.objectStoreNames.contains('sync_metadata')) {
          db.createObjectStore('sync_metadata', { keyPath: 'store' });
        }
      },
    });

    console.log('✅ [MobileCache] Database initialized');
    return this.db;
  }

  /**
   * Check if cache is valid (not expired)
   */
  async isCacheValid(storeName: keyof typeof CACHE_EXPIRY): Promise<boolean> {
    try {
      const db = await this.init();
      const metadata = await db.get('sync_metadata', storeName);
      
      if (!metadata) return false;

      const expiryTime = CACHE_EXPIRY[storeName];
      const now = Date.now();
      const lastSynced = new Date(metadata.lastSynced).getTime();

      return (now - lastSynced) < expiryTime;
    } catch (error) {
      console.error(`❌ [MobileCache] Error checking cache validity for ${storeName}:`, error);
      return false;
    }
  }

  /**
   * Sync all data from server
   */
  async syncAll(branchId?: string): Promise<{
    success: boolean;
    synced: string[];
    errors: string[];
  }> {
    console.log('🔄 [MobileCache] Starting full sync...', branchId ? `for branch ${branchId}` : '');

    const synced: string[] = [];
    const errors: string[] = [];

    try {
      // Sync products
      try {
        await this.syncProducts(branchId);
        synced.push('products');
      } catch (error) {
        console.error('❌ [MobileCache] Error syncing products:', error);
        errors.push('products');
      }

      // Sync customers
      try {
        await this.syncCustomers(branchId);
        synced.push('customers');
      } catch (error) {
        console.error('❌ [MobileCache] Error syncing customers:', error);
        errors.push('customers');
      }

      // Sync branches
      try {
        await this.syncBranches();
        synced.push('branches');
      } catch (error) {
        console.error('❌ [MobileCache] Error syncing branches:', error);
        errors.push('branches');
      }

      // Sync categories
      try {
        await this.syncCategories();
        synced.push('categories');
      } catch (error) {
        console.error('❌ [MobileCache] Error syncing categories:', error);
        errors.push('categories');
      }

      // Sync payment accounts
      try {
        await this.syncPaymentAccounts();
        synced.push('payment_accounts');
      } catch (error) {
        console.error('❌ [MobileCache] Error syncing payment accounts:', error);
        errors.push('payment_accounts');
      }

      // Sync recent sales
      try {
        await this.syncRecentSales(branchId);
        synced.push('sales');
      } catch (error) {
        console.error('❌ [MobileCache] Error syncing sales:', error);
        errors.push('sales');
      }

      console.log(`✅ [MobileCache] Sync complete. Synced: ${synced.join(', ')}`);
      if (errors.length > 0) {
        console.warn(`⚠️ [MobileCache] Errors: ${errors.join(', ')}`);
      }

      return {
        success: errors.length === 0,
        synced,
        errors,
      };
    } catch (error) {
      console.error('❌ [MobileCache] Fatal error during sync:', error);
      return {
        success: false,
        synced,
        errors: [...errors, 'fatal_error'],
      };
    }
  }

  /**
   * Sync products from server
   */
  async syncProducts(branchId?: string): Promise<void> {
    console.log('🔄 [MobileCache] Syncing products...');
    const db = await this.init();

    let query = supabase
      .from('lats_products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1000); // Limit to 1000 most recent products

    // Apply branch filter if provided
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to sync products: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('⚠️ [MobileCache] No products to sync');
      return;
    }

    const tx = db.transaction('products', 'readwrite');
    await tx.store.clear(); // Clear old data

    for (const product of data) {
      await tx.store.put({ ...product, _cachedAt: new Date().toISOString() });
    }

    await tx.done;

    // Update metadata
    await db.put('sync_metadata', {
      store: 'products',
      lastSynced: new Date().toISOString(),
      itemCount: data.length,
      version: DB_VERSION,
    });

    console.log(`✅ [MobileCache] Synced ${data.length} products`);
  }

  /**
   * Sync customers from server
   */
  async syncCustomers(branchId?: string): Promise<void> {
    console.log('🔄 [MobileCache] Syncing customers...');
    const db = await this.init();

    let query = supabase
      .from('lats_customers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500); // Limit to 500 most recent customers

    // Apply branch filter if provided
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to sync customers: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('⚠️ [MobileCache] No customers to sync');
      return;
    }

    const tx = db.transaction('customers', 'readwrite');
    await tx.store.clear();

    for (const customer of data) {
      await tx.store.put({ ...customer, _cachedAt: new Date().toISOString() });
    }

    await tx.done;

    await db.put('sync_metadata', {
      store: 'customers',
      lastSynced: new Date().toISOString(),
      itemCount: data.length,
      version: DB_VERSION,
    });

    console.log(`✅ [MobileCache] Synced ${data.length} customers`);
  }

  /**
   * Sync branches from server
   */
  async syncBranches(): Promise<void> {
    console.log('🔄 [MobileCache] Syncing branches...');
    const db = await this.init();

    const { data, error } = await supabase
      .from('lats_branches')
      .select('*')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to sync branches: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('⚠️ [MobileCache] No branches to sync');
      return;
    }

    const tx = db.transaction('branches', 'readwrite');
    await tx.store.clear();

    for (const branch of data) {
      await tx.store.put({ ...branch, _cachedAt: new Date().toISOString() });
    }

    await tx.done;

    await db.put('sync_metadata', {
      store: 'branches',
      lastSynced: new Date().toISOString(),
      itemCount: data.length,
      version: DB_VERSION,
    });

    console.log(`✅ [MobileCache] Synced ${data.length} branches`);
  }

  /**
   * Sync categories from server
   */
  async syncCategories(): Promise<void> {
    console.log('🔄 [MobileCache] Syncing categories...');
    const db = await this.init();

    let query = supabase
      .from('lats_categories')
      .select('*')
      .eq('is_active', true);

    // Apply branch filtering
    const { addBranchFilter } = await import('./branchAwareApi');
    query = await addBranchFilter(query, 'categories');

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to sync categories: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('⚠️ [MobileCache] No categories to sync');
      return;
    }

    const tx = db.transaction('categories', 'readwrite');
    await tx.store.clear();

    for (const category of data) {
      await tx.store.put({ ...category, _cachedAt: new Date().toISOString() });
    }

    await tx.done;

    await db.put('sync_metadata', {
      store: 'categories',
      lastSynced: new Date().toISOString(),
      itemCount: data.length,
      version: DB_VERSION,
    });

    console.log(`✅ [MobileCache] Synced ${data.length} categories`);
  }

  /**
   * Sync payment accounts from server
   */
  async syncPaymentAccounts(): Promise<void> {
    console.log('🔄 [MobileCache] Syncing payment accounts...');
    const db = await this.init();

    const { data, error } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('is_payment_method', true);

    if (error) {
      throw new Error(`Failed to sync payment accounts: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('⚠️ [MobileCache] No payment accounts to sync');
      return;
    }

    const tx = db.transaction('payment_accounts', 'readwrite');
    await tx.store.clear();

    for (const account of data) {
      await tx.store.put({ ...account, _cachedAt: new Date().toISOString() });
    }

    await tx.done;

    await db.put('sync_metadata', {
      store: 'payment_accounts',
      lastSynced: new Date().toISOString(),
      itemCount: data.length,
      version: DB_VERSION,
    });

    console.log(`✅ [MobileCache] Synced ${data.length} payment accounts`);
  }

  /**
   * Sync recent sales (last 30 days)
   */
  async syncRecentSales(branchId?: string): Promise<void> {
    console.log('🔄 [MobileCache] Syncing recent sales...');
    const db = await this.init();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let query = supabase
      .from('lats_sales')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(200); // Limit to 200 recent sales

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to sync sales: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('⚠️ [MobileCache] No sales to sync');
      return;
    }

    const tx = db.transaction('sales', 'readwrite');
    await tx.store.clear();

    for (const sale of data) {
      await tx.store.put({ ...sale, _cachedAt: new Date().toISOString() });
    }

    await tx.done;

    await db.put('sync_metadata', {
      store: 'sales',
      lastSynced: new Date().toISOString(),
      itemCount: data.length,
      version: DB_VERSION,
    });

    console.log(`✅ [MobileCache] Synced ${data.length} sales`);
  }

  /**
   * Get cached products
   */
  async getProducts(): Promise<any[]> {
    const db = await this.init();
    const products = await db.getAll('products');
    console.log(`📦 [MobileCache] Retrieved ${products.length} cached products`);
    return products;
  }

  /**
   * Get cached customers
   */
  async getCustomers(): Promise<any[]> {
    const db = await this.init();
    const customers = await db.getAll('customers');
    console.log(`📦 [MobileCache] Retrieved ${customers.length} cached customers`);
    return customers;
  }

  /**
   * Get cached sales
   */
  async getSales(): Promise<any[]> {
    const db = await this.init();
    const sales = await db.getAll('sales');
    console.log(`📦 [MobileCache] Retrieved ${sales.length} cached sales`);
    return sales;
  }

  /**
   * Get cached branches
   */
  async getBranches(): Promise<any[]> {
    const db = await this.init();
    const branches = await db.getAll('branches');
    console.log(`📦 [MobileCache] Retrieved ${branches.length} cached branches`);
    return branches;
  }

  /**
   * Get cached categories
   */
  async getCategories(): Promise<any[]> {
    const db = await this.init();
    const categories = await db.getAll('categories');
    console.log(`📦 [MobileCache] Retrieved ${categories.length} cached categories`);
    return categories;
  }

  /**
   * Get cached payment accounts
   */
  async getPaymentAccounts(): Promise<any[]> {
    const db = await this.init();
    const accounts = await db.getAll('payment_accounts');
    console.log(`📦 [MobileCache] Retrieved ${accounts.length} cached payment accounts`);
    return accounts;
  }

  /**
   * Save a pending sale (for offline mode)
   */
  async savePendingSale(sale: any): Promise<number> {
    const db = await this.init();
    const id = await db.add('pending_sales', {
      ...sale,
      created_at: new Date().toISOString(),
      synced: false,
    });
    console.log(`💾 [MobileCache] Saved pending sale with ID ${id}`);
    return id;
  }

  /**
   * Get all pending sales
   */
  async getPendingSales(): Promise<any[]> {
    const db = await this.init();
    const pendingSales = await db.getAll('pending_sales');
    console.log(`📦 [MobileCache] Retrieved ${pendingSales.length} pending sales`);
    return pendingSales.filter(s => !s.synced);
  }

  /**
   * Mark pending sale as synced
   */
  async markSaleSynced(id: number): Promise<void> {
    const db = await this.init();
    const sale = await db.get('pending_sales', id);
    if (sale) {
      await db.put('pending_sales', { ...sale, synced: true });
      console.log(`✅ [MobileCache] Marked sale ${id} as synced`);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    products: { count: number; lastSynced: string | null };
    customers: { count: number; lastSynced: string | null };
    sales: { count: number; lastSynced: string | null };
    branches: { count: number; lastSynced: string | null };
    categories: { count: number; lastSynced: string | null };
    payment_accounts: { count: number; lastSynced: string | null };
    pending_sales: { count: number };
  }> {
    const db = await this.init();

    const [
      products,
      customers,
      sales,
      branches,
      categories,
      payment_accounts,
      pending_sales,
      productsMetadata,
      customersMetadata,
      salesMetadata,
      branchesMetadata,
      categoriesMetadata,
      paymentAccountsMetadata,
    ] = await Promise.all([
      db.count('products'),
      db.count('customers'),
      db.count('sales'),
      db.count('branches'),
      db.count('categories'),
      db.count('payment_accounts'),
      db.count('pending_sales'),
      db.get('sync_metadata', 'products'),
      db.get('sync_metadata', 'customers'),
      db.get('sync_metadata', 'sales'),
      db.get('sync_metadata', 'branches'),
      db.get('sync_metadata', 'categories'),
      db.get('sync_metadata', 'payment_accounts'),
    ]);

    return {
      products: {
        count: products,
        lastSynced: productsMetadata?.lastSynced || null,
      },
      customers: {
        count: customers,
        lastSynced: customersMetadata?.lastSynced || null,
      },
      sales: {
        count: sales,
        lastSynced: salesMetadata?.lastSynced || null,
      },
      branches: {
        count: branches,
        lastSynced: branchesMetadata?.lastSynced || null,
      },
      categories: {
        count: categories,
        lastSynced: categoriesMetadata?.lastSynced || null,
      },
      payment_accounts: {
        count: payment_accounts,
        lastSynced: paymentAccountsMetadata?.lastSynced || null,
      },
      pending_sales: {
        count: pending_sales,
      },
    };
  }

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    console.log('🗑️ [MobileCache] Clearing all cached data...');
    const db = await this.init();

    await Promise.all([
      db.clear('products'),
      db.clear('customers'),
      db.clear('sales'),
      db.clear('branches'),
      db.clear('categories'),
      db.clear('payment_accounts'),
      db.clear('pending_sales'),
      db.clear('sync_metadata'),
    ]);

    console.log('✅ [MobileCache] All cache cleared');
  }
}

// Export singleton instance
export const mobileOfflineCache = new MobileOfflineCacheService();

