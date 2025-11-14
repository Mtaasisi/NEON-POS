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
          return products;
        }
      },
      {
        name: 'customers',
        fn: async () => {
          const customers = await fetchCustomers(currentBranchId, forceRefresh);
          dataStore.setCustomers(customers);
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
          const accounts = await fetchPaymentAccounts(forceRefresh);
          // Store in dataStore if needed
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
    if (dataStore.isCacheValid('customers') && dataStore.customers.length > 0) {
      console.log('📦 Using cached customers');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true })
        .limit(1000); // Adjust limit as needed

      if (error) throw error;

      dataStore.setCustomers(data || []);
      console.log(`✅ Preloaded ${data?.length || 0} customers`);
    } catch (error: any) {
      console.error('❌ Error preloading customers:', error);
      dataStore.setError('customers', error.message);
      throw error;
    }
  }

  private async preloadProducts() {
    const dataStore = useDataStore.getState();
    
    // Check cache first
    if (dataStore.isCacheValid('products') && dataStore.products.length > 0) {
      console.log('📦 Using cached products');
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
    } catch (error: any) {
      console.error('❌ Error preloading products:', error);
      dataStore.setError('products', error.message);
      throw error;
    }
  }

  private async preloadCategories() {
    const dataStore = useDataStore.getState();
    
    // Check cache first
    if (dataStore.isCacheValid('categories') && dataStore.categories.length > 0) {
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
    if (dataStore.isCacheValid('suppliers') && dataStore.suppliers.length > 0) {
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
    if (dataStore.isCacheValid('branches') && dataStore.branches.length > 0) {
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
      const { data, error } = await supabase
        .from('lats_pos_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error

      dataStore.setSettings(data || {});
      console.log('✅ Preloaded settings');
    } catch (error: any) {
      console.error('❌ Error preloading settings:', error);
      dataStore.setError('settings', error.message);
      // Don't throw - settings are not critical
    }
  }

  private async preloadUsers() {
    const dataStore = useDataStore.getState();
    
    // Check cache first
    if (dataStore.isCacheValid('users') && dataStore.users.length > 0) {
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
    if (dataStore.isCacheValid('devices') && dataStore.devices.length > 0) {
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
    if (dataStore.isCacheValid('parentVariants') && dataStore.parentVariants.length > 0) {
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
    if (dataStore.isCacheValid('employees') && dataStore.employees.length > 0) {
      console.log('📦 Using cached employees');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;

      dataStore.setEmployees(data || []);
      console.log(`✅ Preloaded ${data?.length || 0} employees`);
    } catch (error: any) {
      console.error('❌ Error preloading employees:', error);
      dataStore.setError('employees', error.message);
      // Don't throw - employees are not critical
    }
  }

  private async preloadPaymentMethods() {
    const dataStore = useDataStore.getState();

    // Check cache first
    if (dataStore.isCacheValid('paymentMethods') && dataStore.paymentMethods.length > 0) {
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
    if (dataStore.isCacheValid('attendanceRecords') && dataStore.attendanceRecords.length > 0) {
      console.log('📦 Using cached attendance records');
      return;
    }

    try {
      // Load attendance records for the last 30 days to avoid loading too much data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .gte('attendance_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('attendance_date', { ascending: false })
        .limit(1000); // Limit to prevent loading too much data

      if (error) throw error;

      dataStore.setAttendanceRecords(data || []);
      console.log(`✅ Preloaded ${data?.length || 0} attendance records`);
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
        console.log(`✅ Refreshed ${dataType}`);
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

