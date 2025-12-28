/**
 * Data Preload Service
 * Loads all necessary data at login and maintains cache
 * Provides smart data fetching that checks cache before making API calls
 * 
 * Enhanced with:
 * 1. Check if local data exists
 * 2. If not, fetch from API and save locally
 * 3. If exists, load from cache immediately
 * 4. Background refresh without blocking UI
 */

import { supabase } from '../lib/supabase';
import { useDataStore } from '../stores/useDataStore';
import { useInventoryStore } from '../features/lats/stores/useInventoryStore';
import { smartCache, fetchProducts, fetchCustomers, fetchCategories, fetchSuppliers, fetchBranches, fetchPaymentAccounts } from '../lib/enhancedCacheManager';
import { loadParentVariants } from '../features/lats/lib/variantHelpers';
import { clearQueryCache } from '../lib/deduplicatedQueries';

interface PreloadResult {
  success: boolean;
  loaded: string[];
  failed: string[];
  errors: Record<string, string>;
  duration: number;
  fromCache: boolean;
}

class DataPreloadService {
  private isPreloading = false;
  private preloadPromise: Promise<PreloadResult> | null = null;

  /**
   * 🚀 OPTIMIZED: Preload all data at once with enhanced performance
   * Uses smart batching, parallel requests, and intelligent caching
   *
   * Strategy:
   * 1. Check cache first - if exists, return immediately (fast load)
   * 2. If cache is stale, trigger background refresh (non-blocking)
   * 3. If no cache, fetch from API with optimized batching (first load only)
   * 4. Group related data fetches to minimize database round trips
   */
  async preloadAllData(force = false): Promise<PreloadResult> {
    // Return existing preload promise if already preloading
    if (this.isPreloading && this.preloadPromise) {
      console.log('📦 Preload already in progress, returning existing promise');
      return this.preloadPromise;
    }

    const startTime = Date.now();
    const dataStore = useDataStore.getState();

    // Check cache status from smart cache
    const cacheStats = await smartCache.getCacheStats();
    const hasCachedData = Object.values(cacheStats).some((stat: any) => stat.itemCount > 0);
    const hasValidCache = Object.values(cacheStats).some((stat: any) => stat.isFresh);

    // If we have valid cache and not forcing refresh, use cached data
    if (!force && hasValidCache && dataStore.isLoaded) {
      console.log('✅ [Preload] Using valid cache, skipping preload');
      
      // Check if any cache is stale - trigger background refresh
      const hasStaleCache = Object.values(cacheStats).some((stat: any) => stat.isStale);
      if (hasStaleCache) {
        console.log('🔄 [Preload] Cache is stale, triggering background refresh');
        this.refreshInBackground();
      }
      
      return {
        success: true,
        loaded: ['cache'],
        failed: [],
        errors: {},
        duration: 0,
        fromCache: true
      };
    }

    this.isPreloading = true;
    dataStore.setPreloading(true);
    dataStore.clearAllErrors();

    console.log('🚀 [Preload] Starting data preload with smart cache...');

    this.preloadPromise = this.executePreloadWithSmartCache(force);
    const result = await this.preloadPromise;

    this.isPreloading = false;
    this.preloadPromise = null;
    dataStore.setPreloading(false);
    dataStore.markAsLoaded();

    const duration = Date.now() - startTime;
    console.log(`✅ [Preload] Completed in ${duration}ms`);
    console.log(`   Loaded: ${result.loaded.join(', ')}`);
    if (result.failed.length > 0) {
      console.log(`   Failed: ${result.failed.join(', ')}`);
    }

    return { ...result, duration };
  }

  /**
   * Execute preload using smart cache (new method)
   */
  private async executePreloadWithSmartCache(forceRefresh = false): Promise<Omit<PreloadResult, 'duration'>> {
    const loaded: string[] = [];
    const failed: string[] = [];
    const errors: Record<string, string> = {};
    const dataStore = useDataStore.getState();

    // Get current branch
    const currentBranchId = localStorage.getItem('current_branch_id') || undefined;

    const tasks = [
      {
        name: 'products',
        fn: async () => {
          const products = await fetchProducts(currentBranchId, forceRefresh);
          dataStore.setProducts(products);
          
          // ⚡ IMMEDIATELY cache products in productCacheService for instant access
          if (products && products.length > 0) {
            try {
              const { productCacheService } = await import('../lib/productCacheService');
              productCacheService.saveProducts(products);
              console.log(`✅ [Preload] Cached ${products.length} products in productCacheService`);
            } catch (cacheError) {
              console.warn('⚠️ [Preload] Could not populate productCacheService:', cacheError);
            }
          }
          
          // ⚡ Preload child variants IMMEDIATELY when products are loaded
          if (products && products.length > 0) {
            try {
              console.log('🚀 [Preload] Starting child variants preload...');
              const { childVariantsCacheService } = await import('../services/childVariantsCacheService');
              await childVariantsCacheService.preloadAllChildVariants(products);
              console.log('✅ [Preload] Child variants preloaded successfully');
            } catch (error) {
              console.warn('⚠️ [Preload] Child variants preload failed (non-critical):', error);
              // Don't throw - continue with other preloads
            }
          }
          
          return products;
        }
      },
      {
        name: 'customers',
        fn: async () => {
          const customers = await fetchCustomers(currentBranchId, forceRefresh);
          dataStore.setCustomers(customers);
          
          // ⚡ IMMEDIATELY cache customers in customerCacheService for instant access
          if (customers && customers.length > 0) {
            try {
              const { customerCacheService } = await import('../lib/customerCacheService');
              customerCacheService.saveCustomers(customers);
              console.log(`✅ [Preload] Cached ${customers.length} customers in customerCacheService`);
            } catch (cacheError) {
              console.warn('⚠️ [Preload] Could not populate customerCacheService:', cacheError);
            }
          }
          
          return customers;
        }
      },
      {
        name: 'categories',
        fn: async () => {
          const categories = await fetchCategories(forceRefresh);
          dataStore.setCategories(categories);
          return categories;
        }
      },
      {
        name: 'suppliers',
        fn: async () => {
          const suppliers = await fetchSuppliers(forceRefresh);
          dataStore.setSuppliers(suppliers);
          return suppliers;
        }
      },
      {
        name: 'branches',
        fn: async () => {
          const branches = await fetchBranches(forceRefresh);
          dataStore.setBranches(branches);
          return branches;
        }
      },
      {
        name: 'payment_accounts',
        fn: async () => {
          // Clear existing payment accounts and cache to ensure fresh load
          dataStore.setPaymentAccounts([]);
          const currentBranchId = localStorage.getItem('current_branch_id');
          const cacheKey = `payment-methods-${currentBranchId || 'all'}`;
          clearQueryCache(cacheKey);

          const accounts = await fetchPaymentAccounts(forceRefresh);
          // Store payment accounts in dataStore for immediate access
          // Note: With branch isolation (share_accounts: false), this loads accounts for current branch only
          console.log(`📦 [Preload] Loaded ${accounts.length} payment accounts for branch ${currentBranchId || 'none'}`);
          dataStore.setPaymentAccounts(accounts);
          return accounts;
        }
      },
      {
        name: 'parent_variants',
        fn: async () => {
          const parentVariants = await this.preloadParentVariants();
          dataStore.setParentVariants(parentVariants);
          return parentVariants;
        }
      },
      {
        name: 'employees',
        fn: async () => {
          const employees = await this.preloadEmployees();
          dataStore.setEmployees(employees);
          return employees;
        }
      },
      {
        name: 'payment_methods',
        fn: async () => {
          const paymentMethods = await this.preloadPaymentMethods();
          dataStore.setPaymentMethods(paymentMethods);
          return paymentMethods;
        }
      },
      {
        name: 'attendance_records',
        fn: async () => {
          const attendanceRecords = await this.preloadAttendanceRecords();
          dataStore.setAttendanceRecords(attendanceRecords);
          return attendanceRecords;
        }
      },
      {
        name: 'settings',
        fn: async () => {
          const settings = await this.preloadSettings();
          dataStore.setSettings(settings);
          return settings;
        }
      },
      {
        name: 'admin_settings',
        fn: async () => {
          const adminSettings = await this.preloadAdminSettings();
          dataStore.setAdminSettings(adminSettings);
          return adminSettings;
        }
      },
      {
        name: 'purchase_orders',
        fn: async () => {
          const purchaseOrders = await this.preloadPurchaseOrders();
          dataStore.setPurchaseOrders(purchaseOrders);
          return purchaseOrders;
        }
      },
      {
        name: 'stock_movements',
        fn: async () => {
          const stockMovements = await this.preloadStockMovements();
          dataStore.setStockMovements(stockMovements);
          return stockMovements;
        }
      },
      {
        name: 'sales',
        fn: async () => {
          const sales = await this.preloadSales();
          dataStore.setSales(sales);
          return sales;
        }
      }
    ];

    // Execute all tasks in parallel
    const results = await Promise.allSettled(
      tasks.map(async (task) => {
        try {
          console.log(`📥 [Preload] Loading ${task.name}...`);
          await task.fn();
          loaded.push(task.name);
          console.log(`✅ [Preload] Loaded ${task.name}`);
        } catch (error: any) {
          failed.push(task.name);
          errors[task.name] = error.message;
          console.error(`❌ [Preload] Failed to load ${task.name}:`, error.message);
        }
      })
    );

    return {
      success: failed.length === 0,
      loaded,
      failed,
      errors,
      fromCache: !forceRefresh
    };
  }

  /**
   * Refresh data in background without blocking UI
   */
  private async refreshInBackground(): Promise<void> {
    console.log('🔄 [Preload] Starting background refresh (non-blocking)...');
    
    // Use setTimeout to ensure this runs asynchronously
    setTimeout(async () => {
      try {
        await this.executePreloadWithSmartCache(true);
        console.log('✅ [Preload] Background refresh completed');
      } catch (error) {
        console.error('❌ [Preload] Background refresh failed:', error);
      }
    }, 0);
  }

  private async executePreload(): Promise<PreloadResult> {
    const loaded: string[] = [];
    const failed: string[] = [];
    const errors: Record<string, string> = {};

    // Define preload tasks with priorities
    // Critical data first, then secondary data
    const tasks = [
      // Priority 1: Essential data
      { name: 'customers', fn: () => this.preloadCustomers(), priority: 1 },
      { name: 'products', fn: () => this.preloadProducts(), priority: 1 },
      { name: 'categories', fn: () => this.preloadCategories(), priority: 1 },
      
      // Priority 2: Important data
      { name: 'suppliers', fn: () => this.preloadSuppliers(), priority: 2 },
      { name: 'branches', fn: () => this.preloadBranches(), priority: 2 },
      { name: 'settings', fn: () => this.preloadSettings(), priority: 2 },
      
      // Priority 3: Secondary data
      { name: 'users', fn: () => this.preloadUsers(), priority: 3 },
      { name: 'devices', fn: () => this.preloadDevices(), priority: 3 },
    ];

    const totalTasks = tasks.length;
    let completedTasks = 0;

    // Execute priority 1 tasks in parallel
    const priority1Tasks = tasks.filter(t => t.priority === 1);
    await Promise.allSettled(
      priority1Tasks.map(async (task) => {
        try {
          await task.fn();
          loaded.push(task.name);
          console.log(`✅ Loaded ${task.name}`);
        } catch (error: any) {
          failed.push(task.name);
          errors[task.name] = error.message;
          console.error(`❌ Failed to load ${task.name}:`, error.message);
        } finally {
          completedTasks++;
          this.updateProgress(completedTasks, totalTasks, task.name);
        }
      })
    );

    // Execute priority 2 tasks in parallel
    const priority2Tasks = tasks.filter(t => t.priority === 2);
    await Promise.allSettled(
      priority2Tasks.map(async (task) => {
        try {
          await task.fn();
          loaded.push(task.name);
          console.log(`✅ Loaded ${task.name}`);
        } catch (error: any) {
          failed.push(task.name);
          errors[task.name] = error.message;
          console.error(`❌ Failed to load ${task.name}:`, error.message);
        } finally {
          completedTasks++;
          this.updateProgress(completedTasks, totalTasks, task.name);
        }
      })
    );

    // Execute priority 3 tasks in parallel
    const priority3Tasks = tasks.filter(t => t.priority === 3);
    await Promise.allSettled(
      priority3Tasks.map(async (task) => {
        try {
          await task.fn();
          loaded.push(task.name);
          console.log(`✅ Loaded ${task.name}`);
        } catch (error: any) {
          failed.push(task.name);
          errors[task.name] = error.message;
          console.error(`❌ Failed to load ${task.name}:`, error.message);
        } finally {
          completedTasks++;
          this.updateProgress(completedTasks, totalTasks, task.name);
        }
      })
    );

    return {
      success: failed.length === 0,
      loaded,
      failed,
      errors
    };
  }

  private updateProgress(completed: number, total: number, currentTask: string) {
    const progress = Math.round((completed / total) * 100);
    const dataStore = useDataStore.getState();
    dataStore.setPreloadProgress(progress, `Loading ${currentTask}...`);
  }

  // Individual preload functions
  private async preloadCustomers() {
    const dataStore = useDataStore.getState();

    // Check cache first
    if (dataStore.isCacheValid('customers') && dataStore.customers && dataStore.customers.length > 0) {
      console.log('📦 Using cached customers');
      return;
    }

    try {
      let data, error;

      // Try lats_customers table first (primary table)
      try {
        ({ data, error } = await supabase
          .from('lats_customers')
          .select('*')
          .order('name', { ascending: true })
          .limit(1000));

        if (error) throw error;
        if (import.meta.env.DEV) console.log(`✅ Preloaded ${data?.length || 0} customers from lats_customers table`);
      } catch (latsError: any) {
        // If lats_customers fails, try customers table as fallback
        console.warn('⚠️ Error fetching from lats_customers, trying customers table:', latsError.message);

        ({ data, error } = await supabase
          .from('customers')
          .select('*')
          .order('name', { ascending: true })
          .limit(1000));

        if (error) throw error;
        if (import.meta.env.DEV) console.log(`✅ Preloaded ${data?.length || 0} customers from customers table`);
      }

      // Transform data to ensure consistent format
      const transformedData = (data || []).map(customer => ({
        ...customer,
        // Ensure name field exists (some tables might have first_name + last_name)
        name: customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown Customer'
      }));

      dataStore.setCustomers(transformedData);
      if (import.meta.env.DEV) console.log(`✅ Preloaded ${transformedData.length} customers (transformed)`);

      // Also populate customerCacheService for components that use it
      if (transformedData && transformedData.length > 0) {
        try {
          const { customerCacheService } = await import('../lib/customerCacheService');
          customerCacheService.saveCustomers(transformedData);
          if (import.meta.env.DEV) console.log(`✅ Also cached ${transformedData.length} customers in customerCacheService`);
        } catch (cacheError) {
          console.warn('⚠️ Could not populate customerCacheService:', cacheError);
        }
      }
    } catch (error: any) {
      console.error('❌ Error preloading customers from both tables:', error);
      dataStore.setError('customers', error.message);
      throw error;
    }
  }

  private async preloadProducts() {
    const dataStore = useDataStore.getState();

    // Check cache first
    if (dataStore.isCacheValid('products') && dataStore.products && dataStore.products.length > 0) {
      console.log('📦 Using cached products');
      
      // ⚡ IMMEDIATELY cache products in productCacheService when using cached products
      const products = dataStore.products;
      if (products && products.length > 0) {
        try {
          const { productCacheService } = await import('../lib/productCacheService');
          productCacheService.saveProducts(products);
          console.log(`✅ [Preload] Cached ${products.length} products in productCacheService`);
        } catch (cacheError) {
          console.warn('⚠️ [Preload] Could not populate productCacheService:', cacheError);
        }
      }
      
      // ⚡ Preload child variants IMMEDIATELY when using cached products
      if (products && products.length > 0) {
        try {
          console.log('🚀 [Preload] Starting child variants preload for cached products...');
          const { childVariantsCacheService } = await import('../services/childVariantsCacheService');
          await childVariantsCacheService.preloadAllChildVariants(products);
          console.log('✅ [Preload] Child variants preloaded for cached products');
        } catch (error) {
          console.warn('⚠️ [Preload] Child variants preload failed (non-critical):', error);
        }
      }
      
      return;
    }

    try {
      // Use inventory store method which has better optimization
      const inventoryStore = useInventoryStore.getState();
      await inventoryStore.loadProducts({ page: 1, limit: 500 });
      
      // Copy to data store
      const products = inventoryStore.products;
      dataStore.setProducts(products);
      console.log(`✅ Preloaded ${products.length} products`);
      
      // ⚡ IMMEDIATELY cache products in productCacheService for instant access
      if (products && products.length > 0) {
        try {
          const { productCacheService } = await import('../lib/productCacheService');
          productCacheService.saveProducts(products);
          console.log(`✅ [Preload] Cached ${products.length} products in productCacheService`);
        } catch (cacheError) {
          console.warn('⚠️ [Preload] Could not populate productCacheService:', cacheError);
        }
      }
      
      // ⚡ Preload child variants IMMEDIATELY after products are loaded
      if (products && products.length > 0) {
        try {
          console.log('🚀 [Preload] Starting child variants preload...');
          const { childVariantsCacheService } = await import('../services/childVariantsCacheService');
          await childVariantsCacheService.preloadAllChildVariants(products);
          console.log('✅ [Preload] Child variants preloaded successfully');
        } catch (error) {
          console.warn('⚠️ [Preload] Child variants preload failed (non-critical):', error);
          // Don't throw - continue even if child variants preload fails
        }
      }
    } catch (error: any) {
      console.error('❌ Error preloading products:', error);
      dataStore.setError('products', error.message);
      throw error;
    }
  }

  private async preloadCategories() {
    const dataStore = useDataStore.getState();

    // Check cache first
    if (dataStore.isCacheValid('categories') && dataStore.categories && dataStore.categories.length > 0) {
      console.log('📦 Using cached categories');
      return;
    }

    try {
      const inventoryStore = useInventoryStore.getState();
      await inventoryStore.loadCategories();
      
      // Copy to data store
      const categories = inventoryStore.categories;
      dataStore.setCategories(categories);
      console.log(`✅ Preloaded ${categories.length} categories`);
    } catch (error: any) {
      console.error('❌ Error preloading categories:', error);
      dataStore.setError('categories', error.message);
      throw error;
    }
  }

  private async preloadSuppliers() {
    const dataStore = useDataStore.getState();

    // Check cache first
    if (dataStore.isCacheValid('suppliers') && dataStore.suppliers && dataStore.suppliers.length > 0) {
      console.log('📦 Using cached suppliers');
      return;
    }

    try {
      const inventoryStore = useInventoryStore.getState();
      await inventoryStore.loadSuppliers();
      
      // Copy to data store
      const suppliers = inventoryStore.suppliers;
      dataStore.setSuppliers(suppliers);
      console.log(`✅ Preloaded ${suppliers.length} suppliers`);
    } catch (error: any) {
      console.error('❌ Error preloading suppliers:', error);
      dataStore.setError('suppliers', error.message);
      throw error;
    }
  }

  private async preloadBranches() {
    const dataStore = useDataStore.getState();

    // Check cache first
    if (dataStore.isCacheValid('branches') && dataStore.branches && dataStore.branches.length > 0) {
      console.log('📦 Using cached branches');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('lats_branches')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      dataStore.setBranches(data || []);
      console.log(`✅ Preloaded ${data?.length || 0} branches`);
    } catch (error: any) {
      console.error('❌ Error preloading branches:', error);
      dataStore.setError('branches', error.message);
      // Don't throw - branches are not critical
    }
  }

  private async preloadSettings() {
    const dataStore = useDataStore.getState();

    // Check cache first
    if (dataStore.isCacheValid('settings') && dataStore.settings) {
      console.log('📦 Using cached settings');
      return;
    }

    try {
      // Use comprehensive POS settings API to load ALL settings data
      const { POSSettingsAPI } = await import('../lib/posSettingsApi');
      const allSettings = await POSSettingsAPI.loadAllSettings();

      // Store all settings in dataStore for fast access
      dataStore.setSettings(allSettings);
      if (import.meta.env.DEV) console.log('✅ Preloaded all POS settings data');
    } catch (error: any) {
      console.error('❌ Error preloading settings:', error);
      dataStore.setError('settings', error.message);
      // Don't throw - settings are not critical
    }
  }

  private async preloadAdminSettings() {
    const dataStore = useDataStore.getState();

    // Check cache first
    if (dataStore.isCacheValid('adminSettings') && dataStore.adminSettings && dataStore.adminSettings.length > 0) {
      console.log('📦 Using cached admin settings');
      return;
    }

    try {
      // Load all admin settings from the admin_settings table
      const { getAdminSettings } = await import('../lib/adminSettingsApi');
      const adminSettings = await getAdminSettings();

      // Store admin settings in dataStore for fast access
      dataStore.setAdminSettings(adminSettings);
      console.log(`✅ Preloaded ${adminSettings.length} admin settings`);
    } catch (error: any) {
      console.error('❌ Error preloading admin settings:', error);
      dataStore.setError('adminSettings', error.message);
      // Don't throw - admin settings are not critical
    }
  }

  private async preloadPurchaseOrders() {
    const dataStore = useDataStore.getState();

    // Check cache first
    if (dataStore.isCacheValid('purchaseOrders') && dataStore.purchaseOrders && dataStore.purchaseOrders.length > 0) {
      console.log('📦 Using cached purchase orders');
      return;
    }

    try {
      // Load purchase orders via inventory store
      const { useInventoryStore } = await import('../features/lats/stores/useInventoryStore');
      const inventoryStore = useInventoryStore.getState();

      // Use the inventory store's loadPurchaseOrders method
      await inventoryStore.loadPurchaseOrders();

      // Get the loaded purchase orders and store in dataStore
      const purchaseOrders = inventoryStore.purchaseOrders || [];
      dataStore.setPurchaseOrders(purchaseOrders);
      console.log(`✅ Preloaded ${purchaseOrders.length} purchase orders`);
    } catch (error: any) {
      console.error('❌ Error preloading purchase orders:', error);
      dataStore.setError('purchaseOrders', error.message);
      // Don't throw - purchase orders are not critical for initial app load
    }
  }

  private async preloadStockMovements() {
    const dataStore = useDataStore.getState();

    // Check cache first
    if (dataStore.isCacheValid('stockMovements') && dataStore.stockMovements && dataStore.stockMovements.length > 0) {
      console.log('📦 Using cached stock movements');
      return;
    }

    try {
      // Stock movements table was dropped during consolidation
      // Return empty array for compatibility
      dataStore.setStockMovements([]);
      console.log('ℹ️ Stock movements table was consolidated - no data to preload');
    } catch (error: any) {
      console.error('❌ Error preloading stock movements:', error);
      dataStore.setError('stockMovements', error.message);
      // Don't throw - stock movements are not critical for initial app load
    }
  }

  private async preloadSales() {
    const dataStore = useDataStore.getState();

    // Check cache first
    if (dataStore.isCacheValid('sales') && dataStore.sales && dataStore.sales.length > 0) {
      console.log('📦 Using cached sales');
      return;
    }

    try {
      // Load sales via inventory store
      const { useInventoryStore } = await import('../features/lats/stores/useInventoryStore');
      const inventoryStore = useInventoryStore.getState();

      // Use the inventory store's loadSales method
      await inventoryStore.loadSales();

      // Get the loaded sales and store in dataStore
      const sales = inventoryStore.sales || [];
      dataStore.setSales(sales);
      console.log(`✅ Preloaded ${sales.length} sales records`);
    } catch (error: any) {
      console.error('❌ Error preloading sales:', error);
      dataStore.setError('sales', error.message);
      // Don't throw - sales are not critical for initial app load
    }
  }

  private async preloadUsers() {
    const dataStore = useDataStore.getState();

    // Check cache first
    if (dataStore.isCacheValid('users') && dataStore.users && dataStore.users.length > 0) {
      console.log('📦 Using cached users');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;

      dataStore.setUsers(data || []);
      console.log(`✅ Preloaded ${data?.length || 0} users`);
    } catch (error: any) {
      console.error('❌ Error preloading users:', error);
      dataStore.setError('users', error.message);
      // Don't throw - users are not critical
    }
  }

  private async preloadDevices() {
    const dataStore = useDataStore.getState();

    // Check cache first
    if (dataStore.isCacheValid('devices') && dataStore.devices && dataStore.devices.length > 0) {
      console.log('📦 Using cached devices');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      dataStore.setDevices(data || []);
      console.log(`✅ Preloaded ${data?.length || 0} devices`);
    } catch (error: any) {
      console.error('❌ Error preloading devices:', error);
      dataStore.setError('devices', error.message);
      // Don't throw - devices are not critical
    }
  }

  private async preloadParentVariants() {
    const dataStore = useDataStore.getState();

    // Check cache first
    if (dataStore.isCacheValid('parentVariants') && dataStore.parentVariants && dataStore.parentVariants.length > 0) {
      console.log('📦 Using cached parent variants');
      return;
    }

    try {
      // Get all products to load variants for each
      const products = dataStore.products;
      if (!products || products.length === 0) {
        console.log('⚠️ No products available, skipping parent variants preload');
        return;
      }

      const allParentVariants: any[] = [];

      // Load parent variants for each product
      for (const product of products.slice(0, 50)) { // Limit to first 50 products for performance
        try {
          const variants = await loadParentVariants(product.id);
          if (variants && variants.length > 0) {
            // Add product_id to each variant for reference
            const variantsWithProductId = variants.map(variant => ({
              ...variant,
              product_id: product.id
            }));
            allParentVariants.push(...variantsWithProductId);
          }
        } catch (error) {
          // Skip individual product errors
          console.warn(`⚠️ Failed to load variants for product ${product.id}:`, error);
        }
      }

      dataStore.setParentVariants(allParentVariants);
      console.log(`✅ Preloaded ${allParentVariants.length} parent variants`);
    } catch (error: any) {
      console.error('❌ Error preloading parent variants:', error);
      dataStore.setError('parentVariants', error.message);
      // Don't throw - variants are not critical
    }
  }

  private async preloadEmployees() {
    const dataStore = useDataStore.getState();

    // Check cache first
    if (dataStore.isCacheValid('employees') && dataStore.employees && dataStore.employees.length > 0) {
      console.log('📦 Using cached employees');
      return;
    }

    try {
      // Employees table was dropped during consolidation - use users table instead
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      // Transform users data to employee format for compatibility
      const employees = (data || []).map(user => ({
        id: user.id,
        full_name: user.name || user.email,
        email: user.email,
        phone: user.phone,
        role: 'user',
        is_active: true,
        created_at: user.created_at,
        updated_at: user.updated_at
      }));

      dataStore.setEmployees(employees);
      console.log(`✅ Preloaded ${employees.length} employees (from users table)`);
    } catch (error: any) {
      console.error('❌ Error preloading employees:', error);
      dataStore.setError('employees', error.message);
      // Don't throw - employees are not critical
    }
  }

  private async preloadPaymentMethods() {
    const dataStore = useDataStore.getState();

    // Check cache first
    if (dataStore.isCacheValid('paymentMethods') && dataStore.paymentMethods && dataStore.paymentMethods.length > 0) {
      console.log('📦 Using cached payment methods');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      dataStore.setPaymentMethods(data || []);
      console.log(`✅ Preloaded ${data?.length || 0} payment methods`);
    } catch (error: any) {
      console.error('❌ Error preloading payment methods:', error);
      dataStore.setError('paymentMethods', error.message);
      // Don't throw - payment methods are not critical
    }
  }

  private async preloadAttendanceRecords() {
    const dataStore = useDataStore.getState();

    // Check cache first
    if (dataStore.isCacheValid('attendanceRecords') && dataStore.attendanceRecords && dataStore.attendanceRecords.length > 0) {
      console.log('📦 Using cached attendance records');
      return;
    }

    try {
      // Attendance records table was dropped during consolidation
      // Return empty array for compatibility
      dataStore.setAttendanceRecords([]);
      console.log(`ℹ️ Attendance records table was consolidated - no data to preload`);
    } catch (error: any) {
      console.error('❌ Error preloading attendance records:', error);
      dataStore.setError('attendanceRecords', error.message);
      // Don't throw - attendance records are not critical
    }
  }

  /**
   * Refresh specific data type
   */
  async refreshData(dataType: string) {
    console.log(`🔄 Refreshing ${dataType}...`);

    const refreshFunctions: Record<string, () => Promise<void>> = {
      customers: () => this.preloadCustomers(),
      products: () => this.preloadProducts(),
      categories: () => this.preloadCategories(),
      suppliers: () => this.preloadSuppliers(),
      branches: () => this.preloadBranches(),
      settings: () => this.preloadSettings(),
      admin_settings: () => this.preloadAdminSettings(),
      purchase_orders: () => this.preloadPurchaseOrders(),
      stock_movements: () => this.preloadStockMovements(),
      sales: () => this.preloadSales(),
      users: () => this.preloadUsers(),
      devices: () => this.preloadDevices(),
      parent_variants: () => this.preloadParentVariants(),
      employees: () => this.preloadEmployees(),
      payment_methods: () => this.preloadPaymentMethods(),
      attendance_records: () => this.preloadAttendanceRecords(),
    };

    const dataStore = useDataStore.getState();
    dataStore.invalidateCache(dataType);

    const refreshFn = refreshFunctions[dataType];
    if (refreshFn) {
      try {
        await refreshFn();
        if (import.meta.env.DEV) console.log(`✅ Refreshed ${dataType}`);
      } catch (error: any) {
        console.error(`❌ Failed to refresh ${dataType}:`, error);
        throw error;
      }
    } else {
      console.warn(`⚠️ No refresh function for ${dataType}`);
    }
  }

  /**
   * Check if all cache is valid
   */
  private checkAllCacheValid(): boolean {
    const dataStore = useDataStore.getState();
    const dataTypes = ['customers', 'products', 'categories', 'suppliers'];
    
    return dataTypes.every(type => dataStore.isCacheValid(type));
  }

  /**
   * Clear all data and reset preload state
   */
  clearAll() {
    const dataStore = useDataStore.getState();
    dataStore.clearAllData();
    this.isPreloading = false;
    this.preloadPromise = null;
    console.log('🧹 Cleared all preloaded data');
  }

  /**
   * Get preload summary
   */
  getSummary() {
    const dataStore = useDataStore.getState();
    return dataStore.getPreloadSummary();
  }
}

// Export singleton instance
export const dataPreloadService = new DataPreloadService();

