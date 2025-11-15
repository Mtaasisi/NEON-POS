/**
 * Branch-Aware API Helper
 * Adds branch filtering to all database queries
 */

import { supabase } from './supabaseClient';
import { logQueryDebug, isDebugMode } from './branchIsolationDebugger';

// Cache for branch settings
const branchSettingsCache = new Map<string, any>();
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute

// Get current branch from localStorage
export const getCurrentBranchId = (): string | null => {
  return localStorage.getItem('current_branch_id');
};

// Clear branch cache (useful after updating settings)
export const clearBranchCache = () => {
  branchSettingsCache.clear();
  cacheTimestamp = 0;
};

// Get branch settings
export const getBranchSettings = async (branchId: string) => {
  try {
    // Check cache
    const now = Date.now();
    if (now - cacheTimestamp < CACHE_DURATION && branchSettingsCache.has(branchId)) {
      return branchSettingsCache.get(branchId);
    }

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
  entityType: 'products' | 'customers' | 'inventory' | 'suppliers' | 'categories' | 'employees' | 'payments' | 'accounts' | 'gift_cards' | 'quality_checks' | 'recurring_expenses' | 'communications' | 'reports' | 'finance_transfers'
): Promise<boolean> => {
  const branchId = getCurrentBranchId();
  if (!branchId) return true; // No branch selected = show all data

  try {
    const branch = await getBranchSettings(branchId);
    if (!branch) return true;

    // Shared mode = everything shared
    if (branch.data_isolation_mode === 'shared') {
      return true;
    }

    // Isolated mode = nothing shared
    if (branch.data_isolation_mode === 'isolated') {
      return false;
    }

    // Hybrid mode = check specific flag
    const shareMapping = {
      products: branch.share_products,
      customers: branch.share_customers,
      inventory: branch.share_inventory,
      suppliers: branch.share_suppliers,
      categories: branch.share_categories,
      employees: branch.share_employees,
      payments: branch.share_payments,
      accounts: branch.share_accounts,
      gift_cards: branch.share_gift_cards,
      quality_checks: branch.share_quality_checks,
      recurring_expenses: branch.share_recurring_expenses,
      communications: branch.share_communications,
      reports: branch.share_reports,
      finance_transfers: branch.share_finance_transfers
    };

    return shareMapping[entityType] ?? true;
  } catch (error) {
    console.error('Error checking data sharing:', error);
    return true; // Default to shared on error
  }
};

// Add branch filter to query builder
export const addBranchFilter = async (
  query: any,
  entityType: 'products' | 'customers' | 'inventory' | 'suppliers' | 'categories' | 'employees' | 'payments' | 'accounts' | 'gift_cards' | 'quality_checks' | 'recurring_expenses' | 'communications' | 'reports' | 'finance_transfers'
) => {
  const branchId = getCurrentBranchId();
  
  // No branch selected or admin viewing all - no filter
  if (!branchId) {
    console.log(`📊 No branch filter applied (no branch selected)`);
    logQueryDebug(entityType, query, 'shared', false);
    return query;
  }

  const branch = await getBranchSettings(branchId);
  const shared = await isDataShared(entityType);

  if (shared) {
    if (branch?.data_isolation_mode === 'shared') {
      console.log(`📊 No branch filter applied (${entityType} shared in shared mode)`);
      logQueryDebug(entityType, query, 'shared', false);
      return query;
    }

    if (branch?.data_isolation_mode === 'hybrid') {
      console.log(`🔄 HYBRID SHARED: ${entityType} - branch ${branchId} + shared data`);
      logQueryDebug(entityType, query, 'hybrid', true);
      return query.or(`branch_id.eq.${branchId},is_shared.eq.true`);
    }
  }

  console.log(`🔒 ISOLATED DATA: Filtering ${entityType} by branch ${branchId}`);
  logQueryDebug(entityType, query, branch?.data_isolation_mode || 'isolated', true);
  return query.eq('branch_id', branchId);
};

// Create entity with branch assignment
export const createWithBranch = async (
  tableName: string,
  data: any,
  entityType: 'products' | 'customers' | 'inventory' | 'suppliers' | 'categories' | 'employees' | 'payments' | 'accounts' | 'gift_cards' | 'quality_checks' | 'recurring_expenses' | 'communications' | 'reports' | 'finance_transfers'
) => {
  const branchId = getCurrentBranchId();
  const shared = await isDataShared(entityType);

  const entityData = {
    ...data,
    branch_id: shared ? null : branchId,
    is_shared: shared
  };

  console.log(`💾 Creating ${entityType} with branch settings:`, {
    branch_id: entityData.branch_id,
    is_shared: entityData.is_shared
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

// Get branch-filtered products
export const getBranchProducts = async () => {
  let query = supabase
    .from('lats_products')
    .select(`
      *,
      category:lats_categories!category_id(*),
      variants:lats_product_variants!product_id(*)
    `)
    .eq('is_active', true);

  // Apply branch filter without awaiting (to keep query builder)
  const branchId = getCurrentBranchId();
  const shared = await isDataShared('products');
  
  if (branchId && !shared) {
    query = query.or(`branch_id.eq.${branchId},is_shared.eq.true`);
  }

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

  // Sales are ALWAYS branch-specific
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
  createWithBranch,
  createSaleWithBranch,
  getBranchProducts,
  getBranchSales
};

