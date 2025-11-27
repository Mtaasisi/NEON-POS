import { supabase } from '../../../lib/supabaseClient';
import { getProducts } from '../../../lib/latsProductApi';

export interface LiveInventoryMetrics {
  totalValue: number;
  retailValue: number;
  totalStock: number;
  totalProducts: number;
  activeProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  reorderAlerts: number;
  lastUpdated: string;
}

export interface LiveInventoryValue {
  costValue: number;
  retailValue: number;
  potentialProfit: number;
  profitMargin: number;
}

/**
 * Live Inventory Service - Fetches real-time inventory data from database
 */
export class LiveInventoryService {
  private static cache: { data: LiveInventoryMetrics | null; timestamp: number } = {
    data: null,
    timestamp: 0
  };
  private static readonly CACHE_DURATION = 30000; // 30 seconds cache

  /**
   * Clear the cache to force fresh data on next request
   */
  static clearCache(): void {
    this.cache.data = null;
    this.cache.timestamp = 0;
    console.log('🗑️ [LiveInventoryService] Cache cleared');
  }

  /**
   * Get live inventory metrics by fetching real data from database
   * 🚀 OPTIMIZED: Uses cached product data to avoid duplicate queries
   */
  static async getLiveInventoryMetrics(): Promise<LiveInventoryMetrics> {
    // Check cache first
    const now = Date.now();
    if (this.cache.data && (now - this.cache.timestamp) < this.CACHE_DURATION) {
      // Only log in development mode to reduce console noise
      if (import.meta.env.MODE === 'development') {
        console.log('📋 [LiveInventoryService] Using cached metrics');
      }
      return this.cache.data;
    }
    try {
      // Only log in development mode to reduce console noise
      if (import.meta.env.MODE === 'development') {
        console.log('🔍 [LiveInventoryService] Fetching live inventory metrics...');
      }
      
      // Get current branch from localStorage
      const currentBranchId = localStorage.getItem('current_branch_id');
      console.log('🏪 [LiveInventoryService] Current branch:', currentBranchId);
      
      // 🚀 OPTIMIZATION: Use cached products from main API instead of direct DB query
      // This reuses the existing cache and deduplication system
      const cachedProducts = await getProducts();
      
      // Build variants query (still needed as variants aren't always in product response)
      let variantsQuery = supabase
        .from('lats_product_variants')
        .select('id, product_id, quantity, cost_price, unit_price, selling_price, min_quantity, branch_id, is_shared');
      
      // Get branch settings to check share_inventory flag
      let branchSettings: any = null;
      if (currentBranchId) {
        try {
          const { data } = await supabase
            .from('store_locations')
            .select('data_isolation_mode, share_inventory')
            .eq('id', currentBranchId)
            .single();
          branchSettings = data;
        } catch (err) {
          console.warn('⚠️ [LiveInventoryService] Could not fetch branch settings');
        }
      }
      
      // Apply branch filtering to variants based on share_inventory setting
      if (currentBranchId && branchSettings) {
        if (branchSettings.data_isolation_mode === 'isolated') {
          // ISOLATED MODE: Only show variants from this branch
          variantsQuery = variantsQuery.eq('branch_id', currentBranchId);
          console.log(`🔒 [LiveInventoryService] ISOLATED MODE - Variants: Only showing from branch ${currentBranchId}`);
        } else if (branchSettings.data_isolation_mode === 'shared') {
          // SHARED MODE: Show all variants (no filter)
          console.log(`📊 [LiveInventoryService] SHARED MODE - Variants: Showing all variants`);
        } else if (branchSettings.data_isolation_mode === 'hybrid') {
          // HYBRID MODE: Check share_inventory flag
          if (branchSettings.share_inventory) {
            // Inventory is shared - show this branch's variants + shared variants
            variantsQuery = variantsQuery.or(`branch_id.eq.${currentBranchId},is_shared.eq.true,branch_id.is.null`);
            console.log(`⚖️ [LiveInventoryService] HYBRID MODE - Variants are SHARED - Showing branch ${currentBranchId} + shared variants`);
          } else {
            // Inventory is NOT shared - only show this branch's variants
            variantsQuery = variantsQuery.eq('branch_id', currentBranchId);
            console.log(`⚖️ [LiveInventoryService] HYBRID MODE - Variants are NOT SHARED - Only showing branch ${currentBranchId}`);
          }
        }
      } else if (currentBranchId) {
        // Default: show this branch's variants + unassigned variants
        variantsQuery = variantsQuery.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
      } else {
        console.log('⚠️ [LiveInventoryService] No branch selected - showing all data');
      }
      
      // Fetch variants only (products already cached)
      const { data: variants, error: variantsError } = await variantsQuery;
      
      if (variantsError) {
        console.error('❌ [LiveInventoryService] Error fetching variants:', variantsError);
        throw variantsError;
      }

      // Convert cached products to the format expected by the rest of the function
      const products = cachedProducts.map(p => ({
        id: p.id,
        name: p.name,
        is_active: p.isActive,
        branch_id: p.branchId,
        is_shared: p.isShared
      }));
      
      // 🔧 NOTE: We no longer fetch products separately
      // Using cached products from getProducts() which already has:
      // 1. Products from current branch (branch_id = currentBranchId)
      // 2. Shared products from other branches (is_shared = true)
      // 3. Unassigned products (branch_id IS NULL)
      // Unassigned products (branch_id = null) are handled separately by the admin

      // Map variants to their products
      const variantsByProduct = variants.reduce((acc: any, variant: any) => {
        if (!acc[variant.product_id]) {
          acc[variant.product_id] = [];
        }
        acc[variant.product_id].push(variant);
        return acc;
      }, {});

      // Attach variants to products
      const productsWithVariants = products.map((product: any) => ({
        ...product,
        lats_product_variants: variantsByProduct[product.id] || []
      }));

      // Only log in development mode to reduce console noise
      if (import.meta.env.MODE === 'development') {
        console.log(`📦 [LiveInventoryService] Fetched ${productsWithVariants?.length || 0} products for live calculation`);
      }

      // Calculate live metrics
      let totalValue = 0;
      let retailValue = 0;
      let totalStock = 0;
      let totalProducts = productsWithVariants?.length || 0;
      let activeProducts = 0;
      let lowStockItems = 0;
      let outOfStockItems = 0;
      let reorderAlerts = 0;

      productsWithVariants?.forEach((product) => {
        const variants = product.lats_product_variants || [];
        const isActive = product.is_active;
        
        if (isActive) {
          activeProducts++;
        }

        // Calculate total stock for this product
        const productStock = variants.reduce((sum: number, variant: any) => {
          return sum + (variant.quantity || 0);
        }, 0);

        totalStock += productStock;

        // Calculate total value for this product (using cost price)
        const productValue = variants.reduce((sum: number, variant: any) => {
          const costPrice = variant.cost_price || 0;
          const quantity = variant.quantity || 0;
          const variantValue = costPrice * quantity;
          
          // Debug logging for each variant (only in development mode)
          if (import.meta.env.MODE === 'development' && variantValue > 0) {
            console.log(`💰 [LiveInventoryService] ${product.name} - ${variant.name || 'Default'}: ${quantity} × ${costPrice} = ${variantValue}`);
          }
          
          return sum + variantValue;
        }, 0);

        // Debug logging for product total if multiple variants (only in development mode)
        if (import.meta.env.MODE === 'development' && variants.length > 1) {
          console.log(`📊 [LiveInventoryService] ${product.name} - Total from ${variants.length} variants: ${productValue}`);
        }

        totalValue += productValue;

        // Calculate retail value for this product
        const productRetailValue = variants.reduce((sum: number, variant: any) => {
          const sellingPrice = variant.selling_price || 0;
          const quantity = variant.quantity || 0;
          const variantRetailValue = sellingPrice * quantity;
          
          // Debug logging for each variant retail value (only in development mode)
          if (import.meta.env.MODE === 'development' && variantRetailValue > 0) {
            console.log(`💰 [LiveInventoryService] ${product.name} - ${variant.name || 'Default'} (Retail): ${quantity} × ${sellingPrice} = ${variantRetailValue}`);
          }
          
          return sum + variantRetailValue;
        }, 0);

        retailValue += productRetailValue;

        // Check stock status
        if (productStock <= 0) {
          outOfStockItems++;
        } else if (productStock <= 10) {
          lowStockItems++;
        }

        // Check reorder alerts
        const mainVariant = variants[0];
        if (mainVariant?.min_quantity && productStock <= mainVariant.min_quantity) {
          reorderAlerts++;
        }
      });

      const metrics: LiveInventoryMetrics = {
        totalValue,
        retailValue,
        totalStock,
        totalProducts,
        activeProducts,
        lowStockItems,
        outOfStockItems,
        reorderAlerts,
        lastUpdated: new Date().toISOString()
      };

      // Only log in development mode to reduce console noise
      if (import.meta.env.MODE === 'development') {
        console.log('✅ [LiveInventoryService] Live metrics calculated:', {
          totalValue: metrics.totalValue,
          retailValue: metrics.retailValue,
          totalStock: metrics.totalStock,
          totalProducts: metrics.totalProducts,
          activeProducts: metrics.activeProducts,
          lowStockItems: metrics.lowStockItems,
          outOfStockItems: metrics.outOfStockItems,
          reorderAlerts: metrics.reorderAlerts
        });
      }

      // Cache the results
      this.cache.data = metrics;
      this.cache.timestamp = now;

      return metrics;

    } catch (error) {
      console.error('❌ [LiveInventoryService] Error calculating live metrics:', error);
      throw error;
    }
  }

  /**
   * Get live inventory value breakdown (cost, retail, profit)
   */
  static async getLiveInventoryValue(): Promise<LiveInventoryValue> {
    try {
      console.log('🔍 [LiveInventoryService] Fetching live inventory value breakdown...');
      
      // Fetch all variants with pricing data for active products
      const { data: variants, error: variantsError } = await supabase
        .from('lats_product_variants')
        .select('id, quantity, cost_price, unit_price, product_id');

      if (variantsError) {
        console.error('❌ [LiveInventoryService] Error fetching variants:', variantsError);
        throw variantsError;
      }

      // Filter for active products by fetching active products separately
      const productIds = variants?.map(v => v.product_id).filter(Boolean) || [];
      const { data: activeProducts, error: productsError } = await supabase
        .from('lats_products')
        .select('id')
        .eq('is_active', true)
        .in('id', productIds);

      if (productsError) {
        console.warn('⚠️ [LiveInventoryService] Error fetching active products:', productsError);
      }

      // Filter variants to only include those for active products
      const activeProductIds = new Set(activeProducts?.map(p => p.id) || []);
      const activeVariants = variants?.filter(v => activeProductIds.has(v.product_id)) || [];

      console.log(`📦 [LiveInventoryService] Fetched ${activeVariants?.length || 0} active variants for value calculation`);

      let costValue = 0;
      let retailValue = 0;

      activeVariants?.forEach((variant: any) => {
        const quantity = variant.quantity || 0;
        const costPrice = variant.cost_price || 0;
        const sellingPrice = variant.selling_price || 0;

        costValue += costPrice * quantity;
        retailValue += sellingPrice * quantity;
      });

      const potentialProfit = retailValue - costValue;
      const profitMargin = costValue > 0 ? (potentialProfit / costValue) * 100 : 0;

      const value: LiveInventoryValue = {
        costValue,
        retailValue,
        potentialProfit,
        profitMargin
      };

      console.log('✅ [LiveInventoryService] Live value calculated:', {
        costValue: value.costValue,
        retailValue: value.retailValue,
        potentialProfit: value.potentialProfit,
        profitMargin: value.profitMargin
      });

      return value;

    } catch (error) {
      console.error('❌ [LiveInventoryService] Error calculating live value:', error);
      throw error;
    }
  }

  /**
   * Get live inventory metrics for a specific category
   */
  static async getLiveCategoryMetrics(categoryId: string): Promise<LiveInventoryMetrics> {
    try {
      console.log(`🔍 [LiveInventoryService] Fetching live metrics for category: ${categoryId}`);
      
      // Fetch products and variants separately
      const [productsResult, variantsResult] = await Promise.allSettled([
        supabase
          .from('lats_products')
          .select('id, name, is_active, category_id')
          .eq('category_id', categoryId),
        supabase
          .from('lats_product_variants')
          .select('id, product_id, quantity, cost_price, unit_price, selling_price, min_quantity')
      ]);

      if (productsResult.status === 'rejected') {
        console.error('❌ [LiveInventoryService] Error fetching category products:', productsResult.reason);
        throw productsResult.reason;
      }

      const products = productsResult.value.data || [];
      const allVariants = variantsResult.status === 'fulfilled' ? (variantsResult.value.data || []) : [];

      // Filter variants for products in this category and map them
      const productIds = new Set(products.map((p: any) => p.id));
      const variants = allVariants.filter((v: any) => productIds.has(v.product_id));
      
      const variantsByProduct = variants.reduce((acc: any, variant: any) => {
        if (!acc[variant.product_id]) {
          acc[variant.product_id] = [];
        }
        acc[variant.product_id].push(variant);
        return acc;
      }, {});

      const productsWithVariants = products.map((product: any) => ({
        ...product,
        lats_product_variants: variantsByProduct[product.id] || []
      }));

      // Calculate metrics for this category only
      let totalValue = 0;
      let totalStock = 0;
      let totalProducts = productsWithVariants?.length || 0;
      let activeProducts = 0;
      let lowStockItems = 0;
      let outOfStockItems = 0;
      let reorderAlerts = 0;

      productsWithVariants?.forEach((product) => {
        const variants = product.lats_product_variants || [];
        const isActive = product.is_active;
        
        if (isActive) {
          activeProducts++;
        }

        const productStock = variants.reduce((sum: number, variant: any) => {
          return sum + (variant.quantity || 0);
        }, 0);

        totalStock += productStock;

        const productValue = variants.reduce((sum: number, variant: any) => {
          const costPrice = variant.cost_price || 0;
          const quantity = variant.quantity || 0;
          return sum + (costPrice * quantity);
        }, 0);

        totalValue += productValue;

        if (productStock <= 0) {
          outOfStockItems++;
        } else if (productStock <= 10) {
          lowStockItems++;
        }

        const mainVariant = variants[0];
        if (mainVariant?.min_quantity && productStock <= mainVariant.min_quantity) {
          reorderAlerts++;
        }
      });

      return {
        totalValue,
        totalStock,
        totalProducts,
        activeProducts,
        lowStockItems,
        outOfStockItems,
        reorderAlerts,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ [LiveInventoryService] Error calculating category metrics:', error);
      throw error;
    }
  }

  /**
   * Get live inventory metrics for a specific supplier
   */
  static async getLiveSupplierMetrics(supplierId: string): Promise<LiveInventoryMetrics> {
    try {
      console.log(`🔍 [LiveInventoryService] Fetching live metrics for supplier: ${supplierId}`);
      
      // Fetch products and variants separately
      const [productsResult, variantsResult] = await Promise.allSettled([
        supabase
          .from('lats_products')
          .select('id, name, is_active, supplier_id')
          .eq('supplier_id', supplierId),
        supabase
          .from('lats_product_variants')
          .select('id, product_id, quantity, cost_price, unit_price, selling_price, min_quantity')
      ]);

      if (productsResult.status === 'rejected') {
        console.error('❌ [LiveInventoryService] Error fetching supplier products:', productsResult.reason);
        throw productsResult.reason;
      }

      const products = productsResult.value.data || [];
      const allVariants = variantsResult.status === 'fulfilled' ? (variantsResult.value.data || []) : [];

      // Filter variants for products from this supplier and map them
      const productIds = new Set(products.map((p: any) => p.id));
      const variants = allVariants.filter((v: any) => productIds.has(v.product_id));
      
      const variantsByProduct = variants.reduce((acc: any, variant: any) => {
        if (!acc[variant.product_id]) {
          acc[variant.product_id] = [];
        }
        acc[variant.product_id].push(variant);
        return acc;
      }, {});

      const productsWithVariants = products.map((product: any) => ({
        ...product,
        lats_product_variants: variantsByProduct[product.id] || []
      }));

      // Calculate metrics for this supplier only
      let totalValue = 0;
      let totalStock = 0;
      let totalProducts = productsWithVariants?.length || 0;
      let activeProducts = 0;
      let lowStockItems = 0;
      let outOfStockItems = 0;
      let reorderAlerts = 0;

      productsWithVariants?.forEach((product) => {
        const variants = product.lats_product_variants || [];
        const isActive = product.is_active;
        
        if (isActive) {
          activeProducts++;
        }

        const productStock = variants.reduce((sum: number, variant: any) => {
          return sum + (variant.quantity || 0);
        }, 0);

        totalStock += productStock;

        const productValue = variants.reduce((sum: number, variant: any) => {
          const costPrice = variant.cost_price || 0;
          const quantity = variant.quantity || 0;
          return sum + (costPrice * quantity);
        }, 0);

        totalValue += productValue;

        if (productStock <= 0) {
          outOfStockItems++;
        } else if (productStock <= 10) {
          lowStockItems++;
        }

        const mainVariant = variants[0];
        if (mainVariant?.min_quantity && productStock <= mainVariant.min_quantity) {
          reorderAlerts++;
        }
      });

      return {
        totalValue,
        totalStock,
        totalProducts,
        activeProducts,
        lowStockItems,
        outOfStockItems,
        reorderAlerts,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ [LiveInventoryService] Error calculating supplier metrics:', error);
      throw error;
    }
  }
}
