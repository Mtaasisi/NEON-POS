/**
 * Full Database Download Service
 * Downloads all essential data for offline-first operation
 */

import { supabase } from '../lib/supabaseClient';
import { productCacheService } from '../lib/productCacheService';
import { customerCacheService } from '../lib/customerCacheService';
import { useDataStore } from '../stores/useDataStore';
import { childVariantsCacheService } from './childVariantsCacheService';

interface DownloadProgress {
  current: number;
  total: number;
  currentTask: string;
  percentage: number;
}

interface DownloadResult {
  success: boolean;
  data: {
    products: number;
    customers: number;
    categories: number;
    suppliers: number;
    paymentMethods: number;
    paymentAccounts: number;
    variants: number;
    childVariants: number;
    employees: number;
    branches: number;
    installmentPlans: number;
    recentSales: number;
    stockLevels: number;
    settings: number;
  };
  error?: string;
  timestamp: string;
}

class FullDatabaseDownloadService {
  private readonly STORAGE_KEY = 'pos_full_database';
  private readonly VERSION = '1.0';

  /**
   * Download all essential data from database
   */
  async downloadFullDatabase(
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<DownloadResult> {
    const startTime = Date.now();
    const tasks = [
      { name: 'products', fn: () => this.downloadProducts() },
      { name: 'customers', fn: () => this.downloadCustomers() },
      { name: 'categories', fn: () => this.downloadCategories() },
      { name: 'suppliers', fn: () => this.downloadSuppliers() },
      { name: 'paymentMethods', fn: () => this.downloadPaymentMethods() },
      { name: 'paymentAccounts', fn: () => this.downloadPaymentAccounts() },
      { name: 'variants', fn: () => this.downloadVariants() },
      { name: 'childVariants', fn: () => this.downloadChildVariants() },
      { name: 'employees', fn: () => this.downloadEmployees() },
      { name: 'branches', fn: () => this.downloadBranches() },
      { name: 'installmentPlans', fn: () => this.downloadInstallmentPlans() },
      { name: 'recentSales', fn: () => this.downloadRecentSales() },
      { name: 'stockLevels', fn: () => this.downloadStockLevels() },
      { name: 'settings', fn: () => this.downloadSettings() },
    ];

    const result: DownloadResult = {
      success: false,
      data: {
        products: 0,
        customers: 0,
        categories: 0,
        suppliers: 0,
        paymentMethods: 0,
        paymentAccounts: 0,
        variants: 0,
        childVariants: 0,
        employees: 0,
        branches: 0,
        installmentPlans: 0,
        recentSales: 0,
        stockLevels: 0,
        settings: 0,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: tasks.length,
            currentTask: task.name,
            percentage: Math.round(((i + 1) / tasks.length) * 100),
          });
        }

        const data = await task.fn();
        result.data[task.name as keyof typeof result.data] = data.length;

        // 🔍 LOG: Data downloaded
        if (import.meta.env.DEV) {
          console.log(`✅ [Download] ${task.name}: ${data.length} items downloaded`);
        }

        // Save to appropriate cache
        if (task.name === 'products') {
          productCacheService.saveProducts(data);
          if (import.meta.env.DEV) {
            console.log(`💾 [Download] Products saved to cache: ${data.length} products`);
          }
        } else if (task.name === 'customers') {
          customerCacheService.saveCustomers(data);
          if (import.meta.env.DEV) {
            console.log(`💾 [Download] Customers saved to cache: ${data.length} customers`);
          }
        }

        // Update data store
        const dataStore = useDataStore.getState();
        if (task.name === 'products') {
          dataStore.setProducts(data);
          if (import.meta.env.DEV) {
            console.log(`📦 [Download] Products loaded into data store: ${data.length} products`);
          }
        } else if (task.name === 'customers') {
          dataStore.setCustomers(data);
          if (import.meta.env.DEV) {
            console.log(`📦 [Download] Customers loaded into data store: ${data.length} customers`);
          }
        } else if (task.name === 'categories') {
          dataStore.setCategories(data);
          if (import.meta.env.DEV) {
            console.log(`📦 [Download] Categories loaded into data store: ${data.length} categories`);
          }
        } else if (task.name === 'suppliers') {
          dataStore.setSuppliers(data);
          if (import.meta.env.DEV) {
            console.log(`📦 [Download] Suppliers loaded into data store: ${data.length} suppliers`);
          }
        } else if (task.name === 'paymentMethods') {
          dataStore.setPaymentMethods(data);
          if (import.meta.env.DEV) {
            console.log(`📦 [Download] Payment methods loaded into data store: ${data.length} methods`);
          }
        } else if (task.name === 'paymentAccounts') {
          dataStore.setPaymentAccounts(data);
          if (import.meta.env.DEV) {
            console.log(`📦 [Download] Payment accounts loaded into data store: ${data.length} accounts`);
          }
        } else if (task.name === 'variants') {
          dataStore.setParentVariants(data);
          if (import.meta.env.DEV) {
            console.log(`📦 [Download] Variants loaded into data store: ${data.length} variants`);
          }
        } else if (task.name === 'childVariants') {
          dataStore.setChildVariants(data);
          if (import.meta.env.DEV) {
            console.log(`📦 [Download] Child variants loaded into data store: ${data.length} child variants`);
          }
        } else if (task.name === 'employees') {
          dataStore.setEmployees(data);
          if (import.meta.env.DEV) {
            console.log(`📦 [Download] Employees loaded into data store: ${data.length} employees`);
          }
        } else if (task.name === 'branches') {
          dataStore.setBranches(data);
          if (import.meta.env.DEV) {
            console.log(`📦 [Download] Branches loaded into data store: ${data.length} branches`);
          }
        } else if (task.name === 'installmentPlans') {
          // Save installment plans to cache
          const { installmentCacheService } = await import('../lib/installmentCacheService');
          const currentBranchId = localStorage.getItem('current_branch_id');
          if (currentBranchId) {
            installmentCacheService.saveInstallments(data, currentBranchId);
            if (import.meta.env.DEV) {
              console.log(`💾 [Download] Installment plans saved to cache: ${data.length} plans`);
            }
          }
        } else if (task.name === 'recentSales') {
          // Save recent sales to localStorage for quick access
          localStorage.setItem('pos_recent_sales_cache', JSON.stringify({
            data,
            timestamp: Date.now(),
            version: '1.0'
          }));
          if (import.meta.env.DEV) {
            console.log(`💾 [Download] Recent sales saved to cache: ${data.length} sales`);
          }
        } else if (task.name === 'stockLevels') {
          // Save stock levels to cache
          localStorage.setItem('pos_stock_levels_cache', JSON.stringify({
            data,
            timestamp: Date.now(),
            version: '1.0'
          }));
          if (import.meta.env.DEV) {
            console.log(`💾 [Download] Stock levels saved to cache: ${data.length} stock entries`);
          }
        } else if (task.name === 'settings') {
          // Save settings to localStorage
          localStorage.setItem('pos_settings_cache', JSON.stringify({
            data,
            timestamp: Date.now(),
            version: '1.0'
          }));
          if (import.meta.env.DEV) {
            console.log(`💾 [Download] Settings saved to cache: ${data.length} settings`);
          }
        }
      }

      // Save metadata
      const metadata = {
        version: this.VERSION,
        timestamp: new Date().toISOString(),
        downloadTime: Date.now() - startTime,
        data: result.data,
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(metadata));

      result.success = true;
      
      // 🔍 COMPREHENSIVE CONSOLE LOGGING & VERIFICATION
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ [FullDatabaseDownload] DOWNLOAD COMPLETED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const totalItems = Object.values(result.data).reduce((a: number, b: number) => a + b, 0);
      console.log('📊 Download Summary:', {
        totalItems,
        products: result.data.products,
        customers: result.data.customers,
        categories: result.data.categories,
        suppliers: result.data.suppliers,
        variants: result.data.variants,
        childVariants: result.data.childVariants,
        employees: result.data.employees,
        branches: result.data.branches,
        paymentMethods: result.data.paymentMethods,
        paymentAccounts: result.data.paymentAccounts,
        installmentPlans: result.data.installmentPlans,
        recentSales: result.data.recentSales,
        stockLevels: result.data.stockLevels,
        settings: result.data.settings,
        downloadTime: `${(Date.now() - startTime) / 1000}s`
      });
      
      // 🔍 VERIFY ALL DATA TYPES
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 [Verification] Checking all downloaded data...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const dataStore = useDataStore.getState();
      const verificationResults: any = {};
      
      // Verify Products
      if (result.data.products > 0) {
        const { productCacheService } = await import('../lib/productCacheService');
        const cachedProducts = productCacheService.getProducts();
        const storeProducts = dataStore.products;
        
        const productsWithVariants = cachedProducts?.filter((p: any) => p.variants && p.variants.length > 0).length || 0;
        const totalVariants = cachedProducts?.reduce((sum: number, p: any) => sum + (p.variants?.length || 0), 0) || 0;
        
        verificationResults.products = {
          downloaded: result.data.products,
          inCache: cachedProducts?.length || 0,
          inStore: storeProducts.length,
          withVariants: productsWithVariants,
          totalVariants: totalVariants,
          status: (cachedProducts?.length || 0) === result.data.products && storeProducts.length === result.data.products ? '✅ OK' : '⚠️ MISMATCH'
        };
        
        if (productsWithVariants === 0) {
          verificationResults.products.warning = '⚠️ No products have variants!';
        }
      }
      
      // Verify Customers
      if (result.data.customers > 0) {
        const { customerCacheService } = await import('../lib/customerCacheService');
        const cachedCustomers = customerCacheService.getCustomers();
        const storeCustomers = dataStore.customers;
        
        verificationResults.customers = {
          downloaded: result.data.customers,
          inCache: cachedCustomers?.length || 0,
          inStore: storeCustomers.length,
          status: (cachedCustomers?.length || 0) === result.data.customers && storeCustomers.length === result.data.customers ? '✅ OK' : '⚠️ MISMATCH'
        };
      }
      
      // Verify Categories
      if (result.data.categories > 0) {
        const storeCategories = dataStore.categories;
        verificationResults.categories = {
          downloaded: result.data.categories,
          inStore: storeCategories.length,
          status: storeCategories.length === result.data.categories ? '✅ OK' : '⚠️ MISMATCH'
        };
      }
      
      // Verify Suppliers
      if (result.data.suppliers > 0) {
        const storeSuppliers = dataStore.suppliers;
        verificationResults.suppliers = {
          downloaded: result.data.suppliers,
          inStore: storeSuppliers.length,
          status: storeSuppliers.length === result.data.suppliers ? '✅ OK' : '⚠️ MISMATCH'
        };
      }
      
      // Verify Payment Methods
      if (result.data.paymentMethods > 0) {
        const storePaymentMethods = dataStore.paymentMethods;
        verificationResults.paymentMethods = {
          downloaded: result.data.paymentMethods,
          inStore: storePaymentMethods.length,
          status: storePaymentMethods.length === result.data.paymentMethods ? '✅ OK' : '⚠️ MISMATCH'
        };
      }
      
      // Verify Payment Accounts
      if (result.data.paymentAccounts > 0) {
        const storePaymentAccounts = dataStore.paymentAccounts;
        verificationResults.paymentAccounts = {
          downloaded: result.data.paymentAccounts,
          inStore: storePaymentAccounts.length,
          status: storePaymentAccounts.length === result.data.paymentAccounts ? '✅ OK' : '⚠️ MISMATCH'
        };
      }
      
      // Verify Variants
      if (result.data.variants > 0) {
        const storeVariants = dataStore.parentVariants;
        verificationResults.variants = {
          downloaded: result.data.variants,
          inStore: storeVariants.length,
          status: storeVariants.length === result.data.variants ? '✅ OK' : '⚠️ MISMATCH'
        };
      }
      
      // Verify Child Variants
      if (result.data.childVariants > 0) {
        const storeChildVariants = dataStore.childVariants;
        verificationResults.childVariants = {
          downloaded: result.data.childVariants,
          inStore: storeChildVariants.length,
          status: storeChildVariants.length === result.data.childVariants ? '✅ OK' : '⚠️ MISMATCH'
        };
      }
      
      // Verify Employees
      if (result.data.employees > 0) {
        const storeEmployees = dataStore.employees;
        verificationResults.employees = {
          downloaded: result.data.employees,
          inStore: storeEmployees.length,
          status: storeEmployees.length === result.data.employees ? '✅ OK' : '⚠️ MISMATCH'
        };
      }
      
      // Verify Branches
      if (result.data.branches > 0) {
        const storeBranches = dataStore.branches;
        verificationResults.branches = {
          downloaded: result.data.branches,
          inStore: storeBranches.length,
          status: storeBranches.length === result.data.branches ? '✅ OK' : '⚠️ MISMATCH'
        };
      }
      
      // Verify Recent Sales (from localStorage)
      try {
        const salesCache = localStorage.getItem('pos_recent_sales_cache');
        const salesData = salesCache ? JSON.parse(salesCache).data : [];
        verificationResults.recentSales = {
          downloaded: result.data.recentSales,
          inCache: salesData.length,
          status: salesData.length === result.data.recentSales ? '✅ OK' : '⚠️ MISMATCH'
        };
      } catch (e) {
        verificationResults.recentSales = {
          downloaded: result.data.recentSales,
          inCache: 0,
          status: '❌ ERROR'
        };
      }
      
      // Verify Stock Levels (from localStorage)
      try {
        const stockCache = localStorage.getItem('pos_stock_levels_cache');
        const stockData = stockCache ? JSON.parse(stockCache).data : [];
        verificationResults.stockLevels = {
          downloaded: result.data.stockLevels,
          inCache: stockData.length,
          status: stockData.length === result.data.stockLevels ? '✅ OK' : '⚠️ MISMATCH'
        };
      } catch (e) {
        verificationResults.stockLevels = {
          downloaded: result.data.stockLevels,
          inCache: 0,
          status: '❌ ERROR'
        };
      }
      
      // Verify Settings (from localStorage)
      try {
        const settingsCache = localStorage.getItem('pos_settings_cache');
        const settingsData = settingsCache ? JSON.parse(settingsCache).data : [];
        verificationResults.settings = {
          downloaded: result.data.settings,
          inCache: Array.isArray(settingsData) ? settingsData.length : (settingsData ? 1 : 0),
          status: '✅ OK'
        };
      } catch (e) {
        verificationResults.settings = {
          downloaded: result.data.settings,
          inCache: 0,
          status: '❌ ERROR'
        };
      }
      
      // Print verification results
      console.log('📋 Verification Results:');
      Object.entries(verificationResults).forEach(([key, value]: [string, any]) => {
        console.log(`  ${key}:`, value);
      });
      
      // Summary
      const allOk = Object.values(verificationResults).every((v: any) => v.status === '✅ OK');
      const hasWarnings = Object.values(verificationResults).some((v: any) => v.status === '⚠️ MISMATCH' || v.warning);
      const hasErrors = Object.values(verificationResults).some((v: any) => v.status === '❌ ERROR');
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      if (allOk && !hasWarnings) {
        console.log('✅ [Verification] ALL DATA TYPES VERIFIED SUCCESSFULLY');
      } else if (hasErrors) {
        console.error('❌ [Verification] SOME DATA TYPES HAVE ERRORS');
      } else {
        console.warn('⚠️ [Verification] SOME DATA TYPES HAVE WARNINGS');
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      console.log('💾 Storage:', {
        timestamp: new Date().toISOString(),
        version: this.VERSION
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Auto-verify after download
      console.log('🔍 [Download] Running automatic verification...');
      const verification = await this.verifyAllData();
      if (!verification.allOk) {
        console.warn('⚠️ [Download] Verification found issues - please check console logs above');
      }

      return result;
    } catch (error) {
      console.error('❌ [FullDatabaseDownload] Download failed:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
      return result;
    }
  }

  /**
   * Download products WITH variants attached (like getProductsApi)
   */
  private async downloadProducts(): Promise<any[]> {
    try {
      console.log('🔍 [Download] Starting product download with variants...');
      
      // Get current branch for filtering
      const currentBranchId = localStorage.getItem('current_branch_id');
      
      // Fetch branch settings for data isolation
      let branchSettings: any = null;
      if (currentBranchId) {
        const { data: settings } = await supabase
          .from('store_locations')
          .select('id, name, data_isolation_mode, share_products')
          .eq('id', currentBranchId)
          .single();
        branchSettings = settings;
      }
      
      // Fetch products with branch filtering
      let query = supabase
      .from('lats_products')
        .select('id, name, description, sku, barcode, category_id, supplier_id, cost_price, stock_quantity, min_stock_level, max_stock_level, is_active, image_url, brand, model, warranty_period, created_at, updated_at, specification, condition, selling_price, total_quantity, total_value, storage_room_id, shelf_id, branch_id, is_shared, sharing_mode, visible_to_branches')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

      // Apply branch filtering
      if (currentBranchId && branchSettings) {
        if (branchSettings.data_isolation_mode === 'isolated') {
          query = query.or(`is_shared.eq.true,branch_id.eq.${currentBranchId}`);
        } else if (branchSettings.data_isolation_mode === 'hybrid') {
          query = query.or(`is_shared.eq.true,branch_id.eq.${currentBranchId},branch_id.is.null`);
        }
      } else if (currentBranchId) {
        query = query.or(`branch_id.eq.${currentBranchId},branch_id.is.null,is_shared.eq.true`);
      }
      
      const { data: products, error: productsError } = await query;
      
      if (productsError) throw productsError;
      if (!products || products.length === 0) {
        console.warn('⚠️ [Download] No products found');
        return [];
      }
      
      console.log(`✅ [Download] Fetched ${products.length} products, now fetching variants...`);
      
      // Fetch all variants for these products
      const productIds = products.map(p => p.id).filter(Boolean);
      if (productIds.length === 0) {
        return products.map(p => ({ ...p, variants: [] }));
      }
      
      let variantQuery = supabase
        .from('lats_product_variants')
        .select('id, product_id, name, variant_name, sku, attributes, variant_attributes, cost_price, selling_price, quantity, reserved_quantity, min_quantity, created_at, updated_at, branch_id, is_shared, is_parent, variant_type, parent_variant_id')
        .in('product_id', productIds)
        .is('parent_variant_id', null)
        .eq('is_active', true)
        .order('name');
      
      // Apply branch filtering to variants
      if (currentBranchId && branchSettings) {
        if (branchSettings.data_isolation_mode === 'isolated') {
          variantQuery = variantQuery.or(`is_shared.eq.true,branch_id.eq.${currentBranchId}`);
        } else if (branchSettings.data_isolation_mode === 'hybrid') {
          variantQuery = variantQuery.or(`is_shared.eq.true,branch_id.eq.${currentBranchId},branch_id.is.null`);
        }
      } else if (currentBranchId) {
        variantQuery = variantQuery.or(`branch_id.eq.${currentBranchId},branch_id.is.null,is_shared.eq.true`);
      }
      
      const { data: allVariants, error: variantsError } = await variantQuery;
      
      if (variantsError) {
        console.warn('⚠️ [Download] Error fetching variants:', variantsError);
      }
      
      const variants = allVariants || [];
      console.log(`✅ [Download] Fetched ${variants.length} variants`);
      
      // Group variants by product ID
      const variantsByProductId = new Map<string, any[]>();
      variants.forEach(variant => {
        if (!variantsByProductId.has(variant.product_id)) {
          variantsByProductId.set(variant.product_id, []);
        }
        variantsByProductId.get(variant.product_id)!.push(variant);
      });
      
      // Attach variants to products (matching getProductsApi format)
      const productsWithVariants = products.map(product => {
        const productVariants = variantsByProductId.get(product.id) || [];
        const firstVariant = productVariants[0];
        
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          sku: product.sku,
          barcode: product.barcode,
          specification: product.specification,
          images: product.image_url ? [product.image_url] : [],
          image_url: product.image_url || null,
          categoryId: product.category_id,
          supplierId: product.supplier_id,
          isActive: product.is_active,
          price: product.selling_price || firstVariant?.selling_price || 0,
          costPrice: product.cost_price || firstVariant?.cost_price || 0,
          stockQuantity: product.stock_quantity || 0,
          minStockLevel: product.min_stock_level || 0,
          totalQuantity: product.total_quantity || 0,
          totalValue: product.total_value || 0,
          createdAt: product.created_at,
          updatedAt: product.updated_at,
          variants: productVariants.map((variant: any) => ({
            id: variant.id,
            productId: variant.product_id,
            sku: variant.sku,
            name: variant.variant_name || variant.name || 'Unnamed',
            attributes: variant.variant_attributes || variant.attributes || {},
            costPrice: variant.cost_price || 0,
            sellingPrice: variant.selling_price || 0,
            price: variant.selling_price || 0,
            stockQuantity: variant.quantity || 0,
            minStockLevel: variant.min_quantity || 0,
            quantity: variant.quantity || 0,
            minQuantity: variant.min_quantity || 0,
            weight: null,
            dimensions: null,
            createdAt: variant.created_at,
            updatedAt: variant.updated_at
          }))
        };
      });
      
      const productsWithVariantsCount = productsWithVariants.filter(p => p.variants.length > 0).length;
      console.log(`✅ [Download] Products with variants: ${productsWithVariantsCount} / ${productsWithVariants.length}`);
      
      return productsWithVariants;
    } catch (error) {
      console.error('❌ [Download] Error downloading products:', error);
      throw error;
    }
  }

  /**
   * Download customers
   */
  private async downloadCustomers(): Promise<any[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Download categories
   */
  private async downloadCategories(): Promise<any[]> {
    try {
      // Try lats_categories first (new table) with is_active filter
      let { data, error } = await supabase
        .from('lats_categories')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      // If no data or error, try without is_active filter (in case column doesn't exist or all are inactive)
      if (error || !data || data.length === 0) {
        console.log('ℹ️ [Download] Trying categories without is_active filter...');
        const { data: allData, error: allError } = await supabase
          .from('lats_categories')
          .select('*')
          .order('name', { ascending: true });
        
        if (!allError && allData) {
          data = allData;
          error = null;
        }
      }

      if (error) {
        // Fallback to legacy categories table
        console.warn('⚠️ [Download] lats_categories not found, trying legacy categories table');
        const { data: legacyData, error: legacyError } = await supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true });
        
        if (legacyError) {
          console.warn('⚠️ [Download] Legacy categories table also failed:', legacyError);
          return [];
        }
        return legacyData || [];
      }
      
      return data || [];
    } catch (error) {
      console.warn('⚠️ [Download] Failed to download categories:', error);
      return [];
    }
  }

  /**
   * Download suppliers
   */
  private async downloadSuppliers(): Promise<any[]> {
    try {
      // Try lats_suppliers first (new table) with is_active filter
      let { data, error } = await supabase
        .from('lats_suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      // If no data or error, try without is_active filter
      if (error || !data || data.length === 0) {
        console.log('ℹ️ [Download] Trying suppliers without is_active filter...');
        const { data: allData, error: allError } = await supabase
          .from('lats_suppliers')
          .select('*')
          .order('name', { ascending: true });
        
        if (!allError && allData) {
          data = allData;
          error = null;
        }
      }

      if (error) {
        // Fallback to legacy suppliers table
        console.warn('⚠️ [Download] lats_suppliers not found, trying legacy suppliers table');
        const { data: legacyData, error: legacyError } = await supabase
          .from('suppliers')
          .select('*')
          .order('name', { ascending: true });
        
        if (legacyError) {
          console.warn('⚠️ [Download] Legacy suppliers table also failed:', legacyError);
          return [];
        }
        return legacyData || [];
      }
      
      return data || [];
    } catch (error) {
      console.warn('⚠️ [Download] Failed to download suppliers:', error);
      return [];
    }
  }

  /**
   * Download payment methods
   * Note: Payment methods are stored in finance_accounts where is_payment_method = true
   */
  private async downloadPaymentMethods(): Promise<any[]> {
    try {
      // Payment methods are actually in finance_accounts, not a separate table
      const { data, error } = await supabase
        .from('finance_accounts')
        .select('*')
        .eq('is_active', true)
        .eq('is_payment_method', true)
        .order('name', { ascending: true });

      if (error) {
        // Try legacy payment_methods table if it exists
        console.log('ℹ️ [Download] Trying legacy payment_methods table...');
        const { data: legacyData, error: legacyError } = await supabase
          .from('payment_methods')
          .select('*')
          .order('name', { ascending: true });
        
        if (!legacyError && legacyData) {
          return legacyData || [];
        }
        console.warn('⚠️ [Download] Payment methods not found:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.warn('⚠️ [Download] Failed to download payment methods:', error);
      return [];
    }
  }

  /**
   * Download payment accounts
   */
  private async downloadPaymentAccounts(): Promise<any[]> {
    try {
      let { data, error } = await supabase
        .from('finance_accounts')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      // If no data or error, try without is_active filter
      if (error || !data || data.length === 0) {
        console.log('ℹ️ [Download] Trying payment accounts without is_active filter...');
        const { data: allData, error: allError } = await supabase
          .from('finance_accounts')
          .select('*')
          .order('name', { ascending: true });
        
        if (!allError && allData) {
          data = allData;
          error = null;
        }
      }

      if (error) {
        console.warn('⚠️ [Download] Failed to download payment accounts:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.warn('⚠️ [Download] Failed to download payment accounts:', error);
      return [];
    }
  }

  /**
   * Download parent variants
   */
  private async downloadVariants(): Promise<any[]> {
    const { data, error } = await supabase
      .from('lats_product_variants')
      .select('*')
      .is('parent_variant_id', null)
      .eq('is_active', true)
      .order('variant_name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Download child variants
   */
  private async downloadChildVariants(): Promise<any[]> {
    const { data, error } = await supabase
      .from('lats_product_variants')
      .select('*')
      .eq('variant_type', 'imei_child')
      .eq('is_active', true)
      .gt('quantity', 0)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Download employees
   * Try both lats_employees and employees tables
   */
  private async downloadEmployees(): Promise<any[]> {
    try {
      // Try lats_employees first (new table)
      let { data, error } = await supabase
        .from('lats_employees')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      // If no data or error, try without is_active filter
      if (error || !data || data.length === 0) {
        console.log('ℹ️ [Download] Trying lats_employees without is_active filter...');
        const { data: allData, error: allError } = await supabase
          .from('lats_employees')
          .select('*')
          .order('name', { ascending: true });
        
        if (!allError && allData) {
          data = allData;
          error = null;
        }
      }

      // If still no data, try legacy employees table
      if (error || !data || data.length === 0) {
        console.log('ℹ️ [Download] Trying legacy employees table...');
        const { data: legacyData, error: legacyError } = await supabase
          .from('employees')
          .select('*')
          .or('is_active.eq.true,status.eq.active')
          .order('full_name', { ascending: true });
        
        if (!legacyError && legacyData && legacyData.length > 0) {
          return legacyData || [];
        }
      }

      if (error) {
        console.warn('⚠️ [Download] Failed to download employees:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.warn('⚠️ [Download] Failed to download employees:', error);
      return [];
    }
  }

  /**
   * Download branches
   */
  private async downloadBranches(): Promise<any[]> {
    const { data, error } = await supabase
      .from('store_locations')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Download installment plans for current branch
   */
  private async downloadInstallmentPlans(): Promise<any[]> {
    try {
      const currentBranchId = localStorage.getItem('current_branch_id');
      
      let query = supabase
        .from('customer_installment_plans')
        .select('*')
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1000); // Limit to most recent 1000 active plans

      // Filter by branch if available
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('⚠️ [Download] Failed to download installment plans:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.warn('⚠️ [Download] Failed to download installment plans:', error);
      return [];
    }
  }

  /**
   * Download recent sales (last 7 days) for quick lookup
   */
  private async downloadRecentSales(): Promise<any[]> {
    const currentBranchId = localStorage.getItem('current_branch_id');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      let query = supabase
        .from('lats_sales')
        .select('id, sale_number, customer_id, total_amount, payment_status, created_at, branch_id')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(500); // Last 500 sales

      // Filter by branch if available
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('⚠️ [Download] Failed to download recent sales:', error);
      return [];
    }
  }

  /**
   * Download current stock levels for all active variants
   */
  private async downloadStockLevels(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('lats_product_variants')
        .select('id, variant_name, sku, quantity, product_id, is_active')
        .eq('is_active', true)
        .gt('quantity', 0) // Only download items with stock
        .order('quantity', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('⚠️ [Download] Failed to download stock levels:', error);
      return [];
    }
  }

  /**
   * Download settings (general settings, POS settings)
   */
  private async downloadSettings(): Promise<any[]> {
    try {
      const settings: any = {};

      // Download general POS settings (lats_pos_general_settings)
      try {
        const { data: generalSettings, error: generalError } = await supabase
          .from('lats_pos_general_settings')
          .select('*')
          .limit(1)
          .maybeSingle(); // Use maybeSingle() instead of single() to handle no rows gracefully

        if (!generalError && generalSettings) {
          settings.general = generalSettings;
        }
      } catch (error: any) {
        // Check if it's a "table doesn't exist" error
        if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
          console.log('ℹ️ [Download] General settings table not found (optional)');
        } else {
          console.warn('⚠️ [Download] Failed to download general settings:', error);
        }
      }

      // Download settings table (if exists - legacy table)
      try {
        const { data: legacySettings, error: legacyError } = await supabase
          .from('settings')
          .select('key, value')
          .limit(100);

        if (!legacyError && legacySettings && legacySettings.length > 0) {
          settings.legacy = legacySettings;
        }
      } catch (error: any) {
        // Settings table might not exist, that's okay
        if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
          console.log('ℹ️ [Download] Legacy settings table not found (optional)');
        }
      }

      // Download dynamic pricing settings if table exists
      try {
        const { data: pricingSettings, error: pricingError } = await supabase
          .from('lats_pos_dynamic_pricing_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (!pricingError && pricingSettings) {
          settings.pricing = pricingSettings;
        }
      } catch (error: any) {
        if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
          console.log('ℹ️ [Download] Pricing settings table not found (optional)');
        }
      }

      return [settings];
    } catch (error) {
      console.warn('⚠️ [Download] Failed to download settings:', error);
      return [];
    }
  }

  /**
   * Get download metadata
   */
  getDownloadMetadata(): any | null {
    try {
      const metadata = localStorage.getItem(this.STORAGE_KEY);
      if (!metadata) return null;
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  }

  /**
   * Check if database is downloaded
   */
  isDownloaded(): boolean {
    const metadata = this.getDownloadMetadata();
    if (!metadata) return false;
    
    // Check if download is less than 24 hours old
    const downloadTime = new Date(metadata.timestamp).getTime();
    const age = Date.now() - downloadTime;
    return age < 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Clear downloaded database
   */
  clearDownload(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem('pos_recent_sales_cache');
    localStorage.removeItem('pos_stock_levels_cache');
    localStorage.removeItem('pos_settings_cache');
    productCacheService.clearProducts();
    customerCacheService.clearCustomers();
    childVariantsCacheService.clearCache();
    
    // Clear installment cache
    try {
      const { installmentCacheService } = require('../lib/installmentCacheService');
      const currentBranchId = localStorage.getItem('current_branch_id');
      if (currentBranchId) {
        installmentCacheService.clearInstallments(currentBranchId);
      }
    } catch (error) {
      console.warn('⚠️ [Download] Failed to clear installment cache:', error);
    }
  }

  /**
   * Verify all downloaded data is working correctly
   * Can be called anytime to check data status
   */
  async verifyAllData(): Promise<{
    allOk: boolean;
    results: Record<string, any>;
    summary: string;
  }> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 [Data Verification] Checking all downloaded data...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const metadata = this.getDownloadMetadata();
    if (!metadata) {
      console.log('❌ [Verification] No database downloaded');
      return {
        allOk: false,
        results: {},
        summary: 'No database downloaded'
      };
    }
    
    const dataStore = useDataStore.getState();
    const results: Record<string, any> = {};
    
    // Verify Products
    const { productCacheService } = await import('../lib/productCacheService');
    const cachedProducts = productCacheService.getProducts();
    const storeProducts = dataStore.products;
    const expectedProducts = metadata.data.products || 0;
    
    if (expectedProducts > 0) {
      const productsWithVariants = cachedProducts?.filter((p: any) => p.variants && p.variants.length > 0).length || 0;
      const totalVariants = cachedProducts?.reduce((sum: number, p: any) => sum + (p.variants?.length || 0), 0) || 0;
      
      results.products = {
        expected: expectedProducts,
        inCache: cachedProducts?.length || 0,
        inStore: storeProducts.length,
        withVariants: productsWithVariants,
        totalVariants: totalVariants,
        variantCoverage: cachedProducts?.length ? Math.round((productsWithVariants / cachedProducts.length) * 100) + '%' : '0%',
        status: (cachedProducts?.length || 0) === expectedProducts && storeProducts.length === expectedProducts ? '✅ OK' : '⚠️ MISMATCH',
        issues: []
      };
      
      if (productsWithVariants === 0 && expectedProducts > 0) {
        results.products.issues.push('No products have variants');
      }
      if ((cachedProducts?.length || 0) !== expectedProducts) {
        results.products.issues.push(`Cache mismatch: expected ${expectedProducts}, got ${cachedProducts?.length || 0}`);
      }
    }
    
    // Verify Customers
    const { customerCacheService } = await import('../lib/customerCacheService');
    const cachedCustomers = customerCacheService.getCustomers();
    const storeCustomers = dataStore.customers;
    const expectedCustomers = metadata.data.customers || 0;
    
    if (expectedCustomers > 0) {
      results.customers = {
        expected: expectedCustomers,
        inCache: cachedCustomers?.length || 0,
        inStore: storeCustomers.length,
        status: (cachedCustomers?.length || 0) === expectedCustomers && storeCustomers.length === expectedCustomers ? '✅ OK' : '⚠️ MISMATCH',
        issues: []
      };
      
      if ((cachedCustomers?.length || 0) !== expectedCustomers) {
        results.customers.issues.push(`Cache mismatch: expected ${expectedCustomers}, got ${cachedCustomers?.length || 0}`);
      }
    }
    
    // Verify Categories
    const storeCategories = dataStore.categories;
    const expectedCategories = metadata.data.categories || 0;
    
    if (expectedCategories > 0) {
      results.categories = {
        expected: expectedCategories,
        inStore: storeCategories.length,
        status: storeCategories.length === expectedCategories ? '✅ OK' : '⚠️ MISMATCH',
        issues: []
      };
      
      if (storeCategories.length !== expectedCategories) {
        results.categories.issues.push(`Store mismatch: expected ${expectedCategories}, got ${storeCategories.length}`);
      }
    }
    
    // Verify Suppliers
    const storeSuppliers = dataStore.suppliers;
    const expectedSuppliers = metadata.data.suppliers || 0;
    
    if (expectedSuppliers > 0) {
      results.suppliers = {
        expected: expectedSuppliers,
        inStore: storeSuppliers.length,
        status: storeSuppliers.length === expectedSuppliers ? '✅ OK' : '⚠️ MISMATCH',
        issues: []
      };
    }
    
    // Verify Payment Methods
    const storePaymentMethods = dataStore.paymentMethods;
    const expectedPaymentMethods = metadata.data.paymentMethods || 0;
    
    if (expectedPaymentMethods > 0) {
      results.paymentMethods = {
        expected: expectedPaymentMethods,
        inStore: storePaymentMethods.length,
        status: storePaymentMethods.length === expectedPaymentMethods ? '✅ OK' : '⚠️ MISMATCH',
        issues: []
      };
    }
    
    // Verify Payment Accounts
    const storePaymentAccounts = dataStore.paymentAccounts;
    const expectedPaymentAccounts = metadata.data.paymentAccounts || 0;
    
    if (expectedPaymentAccounts > 0) {
      results.paymentAccounts = {
        expected: expectedPaymentAccounts,
        inStore: storePaymentAccounts.length,
        status: storePaymentAccounts.length === expectedPaymentAccounts ? '✅ OK' : '⚠️ MISMATCH',
        issues: []
      };
    }
    
    // Verify Variants
    const storeVariants = dataStore.parentVariants;
    const expectedVariants = metadata.data.variants || 0;
    
    if (expectedVariants > 0) {
      results.variants = {
        expected: expectedVariants,
        inStore: storeVariants.length,
        status: storeVariants.length === expectedVariants ? '✅ OK' : '⚠️ MISMATCH',
        issues: []
      };
    }
    
    // Verify Child Variants
    const storeChildVariants = dataStore.childVariants;
    const expectedChildVariants = metadata.data.childVariants || 0;
    
    if (expectedChildVariants > 0) {
      results.childVariants = {
        expected: expectedChildVariants,
        inStore: storeChildVariants.length,
        status: storeChildVariants.length === expectedChildVariants ? '✅ OK' : '⚠️ MISMATCH',
        issues: []
      };
    }
    
    // Verify Employees
    const storeEmployees = dataStore.employees;
    const expectedEmployees = metadata.data.employees || 0;
    
    if (expectedEmployees > 0) {
      results.employees = {
        expected: expectedEmployees,
        inStore: storeEmployees.length,
        status: storeEmployees.length === expectedEmployees ? '✅ OK' : '⚠️ MISMATCH',
        issues: []
      };
    }
    
    // Verify Branches
    const storeBranches = dataStore.branches;
    const expectedBranches = metadata.data.branches || 0;
    
    if (expectedBranches > 0) {
      results.branches = {
        expected: expectedBranches,
        inStore: storeBranches.length,
        status: storeBranches.length === expectedBranches ? '✅ OK' : '⚠️ MISMATCH',
        issues: []
      };
    }
    
    // Verify Recent Sales
    try {
      const salesCache = localStorage.getItem('pos_recent_sales_cache');
      const salesData = salesCache ? JSON.parse(salesCache).data : [];
      const expectedSales = metadata.data.recentSales || 0;
      
      if (expectedSales > 0) {
        results.recentSales = {
          expected: expectedSales,
          inCache: salesData.length,
          status: salesData.length === expectedSales ? '✅ OK' : '⚠️ MISMATCH',
          issues: []
        };
      }
    } catch (e) {
      results.recentSales = {
        expected: metadata.data.recentSales || 0,
        inCache: 0,
        status: '❌ ERROR',
        issues: ['Failed to read cache']
      };
    }
    
    // Verify Stock Levels
    try {
      const stockCache = localStorage.getItem('pos_stock_levels_cache');
      const stockData = stockCache ? JSON.parse(stockCache).data : [];
      const expectedStock = metadata.data.stockLevels || 0;
      
      if (expectedStock > 0) {
        results.stockLevels = {
          expected: expectedStock,
          inCache: stockData.length,
          status: stockData.length === expectedStock ? '✅ OK' : '⚠️ MISMATCH',
          issues: []
        };
      }
    } catch (e) {
      results.stockLevels = {
        expected: metadata.data.stockLevels || 0,
        inCache: 0,
        status: '❌ ERROR',
        issues: ['Failed to read cache']
      };
    }
    
    // Print results
    console.log('📋 Verification Results:');
    Object.entries(results).forEach(([key, value]: [string, any]) => {
      console.log(`  ${key}:`, {
        status: value.status,
        expected: value.expected,
        actual: value.inCache || value.inStore,
        ...(value.issues && value.issues.length > 0 ? { issues: value.issues } : {})
      });
    });
    
    // Summary
    const allOk = Object.values(results).every((v: any) => v.status === '✅ OK');
    const hasWarnings = Object.values(results).some((v: any) => v.status === '⚠️ MISMATCH');
    const hasErrors = Object.values(results).some((v: any) => v.status === '❌ ERROR');
    
    let summary = '';
    if (allOk && !hasWarnings && !hasErrors) {
      summary = '✅ ALL DATA TYPES VERIFIED SUCCESSFULLY';
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ [Verification] ${summary}`);
    } else if (hasErrors) {
      summary = '❌ SOME DATA TYPES HAVE ERRORS';
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`❌ [Verification] ${summary}`);
    } else {
      summary = '⚠️ SOME DATA TYPES HAVE WARNINGS';
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.warn(`⚠️ [Verification] ${summary}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return {
      allOk: allOk && !hasWarnings && !hasErrors,
      results,
      summary
    };
  }
}

export const fullDatabaseDownloadService = new FullDatabaseDownloadService();

