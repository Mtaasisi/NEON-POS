/**
 * IMPROVED Branch-Aware API Helper
 * Properly respects store isolation settings
 */

import { supabase } from './supabaseClient';

// Cache for branch settings to avoid repeated queries
let branchSettingsCache: Map<string, any> = new Map();
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1 minute

// Get current branch from localStorage
export const getCurrentBranchId = (): string | null => {
  return localStorage.getItem('current_branch_id');
};

// Clear cache (useful when branch settings are updated)
export const clearBranchCache = () => {
  branchSettingsCache.clear();
  cacheTimestamp = 0;
};

// Get branch settings with caching
export const getBranchSettings = async (branchId: string) => {
  try {
    // Check cache
    const now = Date.now();
    if (now - cacheTimestamp < CACHE_DURATION && branchSettingsCache.has(branchId)) {
      console.log('🔄 Using cached branch settings for:', branchId);
      return branchSettingsCache.get(branchId);
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('store_locations')
      .select('*')
      .eq('id', branchId)
      .single();

    if (error) throw error;
    
    // Update cache
    branchSettingsCache.set(branchId, data);
    cacheTimestamp = now;
    
    return data;
  } catch (error) {
    console.error('Error fetching branch settings:', error);
    return null;
  }
};

// Check if data type is shared for current branch
export const isDataShared = async (
  entityType: 'products' | 'customers' | 'inventory' | 'suppliers' | 'categories' | 'employees'
): Promise<boolean> => {
  const branchId = getCurrentBranchId();
  if (!branchId) {
    console.log('⚠️ No branch selected - defaulting to shared mode');
    return true; // No branch selected = show all data
  }

  try {
    const branch = await getBranchSettings(branchId);
    if (!branch) {
      console.log('⚠️ Could not load branch settings - defaulting to shared mode');
      return true;
    }

    console.log(`🔍 Checking ${entityType} sharing for branch:`, branch.name);
    console.log(`   - Isolation Mode: ${branch.data_isolation_mode}`);

    // Shared mode = everything shared
    if (branch.data_isolation_mode === 'shared') {
      console.log(`   ✅ Shared mode - ${entityType} are shared`);
      return true;
    }

    // Isolated mode = nothing shared
    if (branch.data_isolation_mode === 'isolated') {
      console.log(`   🔒 Isolated mode - ${entityType} are NOT shared`);
      return false;
    }

    // Hybrid mode = check specific flag
    const shareMapping = {
      products: branch.share_products,
      customers: branch.share_customers,
      inventory: branch.share_inventory,
      suppliers: branch.share_suppliers,
      categories: branch.share_categories,
      employees: branch.share_employees
    };

    const isShared = shareMapping[entityType] ?? true;
    console.log(`   ⚖️ Hybrid mode - ${entityType} ${isShared ? 'ARE' : 'are NOT'} shared (share_${entityType}: ${isShared})`);
    
    return isShared;
  } catch (error) {
    console.error('Error checking data sharing:', error);
    return true; // Default to shared on error
  }
};

/**
 * Add branch filter to query builder - IMPROVED VERSION
 * Now properly respects the store's data_isolation_mode setting
 */
export const addBranchFilter = async (
  query: any,
  entityType: 'products' | 'customers' | 'inventory' | 'suppliers' | 'categories' | 'employees'
) => {
  const branchId = getCurrentBranchId();
  
  // No branch selected - no filter (show all)
  if (!branchId) {
    console.log(`📊 No branch filter applied (no branch selected)`);
    return query;
  }

  // Check if data is shared according to store settings
  const shared = await isDataShared(entityType);

  if (shared) {
    // Data is shared according to store settings - no filter needed
    console.log(`📊 No branch filter applied (${entityType} are shared according to store settings)`);
    return query;
  }

  // Data is isolated according to store settings - apply strict filter
  console.log(`🔒 Applying STRICT branch filter for ${entityType} (isolated mode)`);
  console.log(`   Only showing ${entityType} where branch_id = ${branchId}`);
  
  // In isolated mode, ONLY show items that belong to this specific branch
  // Do NOT show shared items
  return query.eq('branch_id', branchId);
};

/**
 * Get appropriate filter for product queries
 * This is the main fix for the data isolation issue
 */
export const getProductQueryFilter = async (query: any) => {
  const branchId = getCurrentBranchId();
  
  if (!branchId) {
    console.log('📊 No branch selected - showing all products');
    return query;
  }

  // Get branch settings to determine isolation mode
  const branch = await getBranchSettings(branchId);
  
  if (!branch) {
    console.warn('⚠️ Could not load branch settings - showing all products');
    return query;
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log(`🏪 APPLYING PRODUCT FILTER FOR: ${branch.name}`);
  console.log(`   Branch ID: ${branchId}`);
  console.log(`   Isolation Mode: ${branch.data_isolation_mode}`);
  
  // SHARED MODE: Show all products
  if (branch.data_isolation_mode === 'shared') {
    console.log('   ✅ SHARED MODE - Showing ALL products');
    console.log('═══════════════════════════════════════════════════════');
    return query; // No filter
  }
  
  // ISOLATED MODE: Only show products from this branch
  if (branch.data_isolation_mode === 'isolated') {
    console.log('   🔒 ISOLATED MODE - Showing ONLY this branch\'s products');
    console.log(`   Filter: branch_id = ${branchId}`);
    console.log('═══════════════════════════════════════════════════════');
    return query.eq('branch_id', branchId);
  }
  
  // HYBRID MODE: Check share_products flag
  if (branch.data_isolation_mode === 'hybrid') {
    if (branch.share_products) {
      console.log('   ⚖️ HYBRID MODE - Products are SHARED');
      console.log('   Filter: Showing all products');
      console.log('═══════════════════════════════════════════════════════');
      return query; // No filter - show all
    } else {
      console.log('   ⚖️ HYBRID MODE - Products are NOT SHARED');
      console.log(`   Filter: branch_id = ${branchId}`);
      console.log('═══════════════════════════════════════════════════════');
      return query.eq('branch_id', branchId);
    }
  }
  
  // Default: show all (shouldn't reach here)
  console.warn('⚠️ Unknown isolation mode - showing all products');
  console.log('═══════════════════════════════════════════════════════');
  return query;
};

// Create entity with branch assignment
export const createWithBranch = async (
  tableName: string,
  data: any,
  entityType: 'products' | 'customers' | 'inventory' | 'suppliers' | 'categories' | 'employees'
) => {
  const branchId = getCurrentBranchId();
  const shared = await isDataShared(entityType);

  const entityData = {
    ...data,
    branch_id: branchId, // Always assign to current branch
    is_shared: shared,
    sharing_mode: shared ? 'shared' : 'isolated'
  };

  console.log(`💾 Creating ${entityType} with branch settings:`, {
    branch_id: entityData.branch_id,
    is_shared: entityData.is_shared,
    sharing_mode: entityData.sharing_mode
  });

  const { data: result, error } = await supabase
    .from(tableName)
    .insert([entityData])
    .select()
    .single();

  if (error) throw error;
  return result;
};

// Create sale with branch
export const createSaleWithBranch = async (saleData: any) => {
  const branchId = getCurrentBranchId();

  const saleWithBranch = {
    ...saleData,
    branch_id: branchId || null
  };

  console.log(`💰 Creating sale for branch:`, branchId);

  const { data, error } = await supabase
    .from('lats_sales')
    .insert([saleWithBranch])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get branch-filtered products using the improved filter
export const getBranchProducts = async () => {
  let query = supabase
    .from('lats_products')
    .select(`
      *,
      category:lats_categories!category_id(*),
      variants:lats_product_variants!product_id(*)
    `)
    .eq('is_active', true);

  query = await getProductQueryFilter(query);

  const { data, error } = await query;

  if (error) throw error;
  return data;
};

// Get branch-filtered sales
export const getBranchSales = async (startDate?: string, endDate?: string) => {
  const branchId = getCurrentBranchId();

  let query = supabase
    .from('lats_sales')
    .select('*');

  // Sales are ALWAYS branch-specific (never shared)
  if (branchId) {
    query = query.eq('branch_id', branchId);
    console.log(`📊 Filtering sales by branch: ${branchId}`);
  }

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export default {
  getCurrentBranchId,
  getBranchSettings,
  isDataShared,
  addBranchFilter,
  getProductQueryFilter,
  createWithBranch,
  createSaleWithBranch,
  getBranchProducts,
  getBranchSales,
  clearBranchCache
};

