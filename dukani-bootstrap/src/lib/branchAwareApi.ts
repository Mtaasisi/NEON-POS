/**
 * Branch-Aware API Helper
 * Adds branch filtering to all database queries
 */

import { supabase } from './supabaseClient';
import { logQueryDebug, isDebugMode } from './branchIsolationDebugger';
import type { ShareableEntityType, StoreLocationSchema } from './database/schema';
import { ENTITY_TO_COLUMN_MAP } from './database/schema';

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

// ============================================================================
// BRANCH ISOLATION VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate that a product query is properly branch-isolated
 * This helps prevent stock leakage across branches
 */
export const validateBranchIsolation = async (
  operation: string,
  branchId: string,
  expectedIsolation: 'isolated' | 'shared' | 'hybrid'
): Promise<{ valid: boolean; issues: string[] }> => {
  const issues: string[] = [];

  try {
    // Check if branch exists and is active
    const { data: branch, error: branchError } = await supabase
      .from('store_locations')
      .select('id, name, is_active, data_isolation_mode, share_inventory')
      .eq('id', branchId)
      .single();

    if (branchError || !branch) {
      issues.push(`Branch ${branchId} not found or inactive`);
      return { valid: false, issues };
    }

    if (!branch.is_active) {
      issues.push(`Branch ${branchId} is not active`);
      return { valid: false, issues };
    }

    // Validate isolation mode matches expectation
    if (expectedIsolation === 'isolated' && branch.data_isolation_mode !== 'isolated') {
      issues.push(`Expected isolated mode but branch is in ${branch.data_isolation_mode} mode`);
    }

    if (expectedIsolation === 'hybrid' && !branch.share_inventory && branch.data_isolation_mode === 'hybrid') {
      // This is correct - hybrid with isolated inventory
    } else if (expectedIsolation === 'hybrid' && branch.share_inventory) {
      issues.push(`Expected isolated inventory but branch has share_inventory=true`);
    }

    // Check for variants without branch_id (critical issue)
    const { count: variantsWithoutBranchId, error: variantError } = await supabase
      .from('lats_product_variants')
      .select('*', { count: 'exact', head: true })
      .is('branch_id', null);

    if (variantError) {
      issues.push(`Could not check variant branch isolation: ${variantError.message}`);
    } else if (variantsWithoutBranchId && variantsWithoutBranchId > 0) {
      issues.push(`${variantsWithoutBranchId} variants found without branch_id assignment (critical)`);
    }

    // Check for products incorrectly assigned to branches (should be global)
    const { count: productsWithBranchId, error: productError } = await supabase
      .from('lats_products')
      .select('*', { count: 'exact', head: true })
      .not('branch_id', 'is', null);

    if (productError) {
      issues.push(`Could not check product branch assignment: ${productError.message}`);
    } else if (productsWithBranchId && productsWithBranchId > 0) {
      issues.push(`${productsWithBranchId} products incorrectly assigned to branches (should be global)`);
    }

    return { valid: issues.length === 0, issues };

  } catch (error) {
    issues.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { valid: false, issues };
  }
};

/**
 * Log branch isolation operation for debugging
 * Call this before any branch-sensitive operation
 */
export const logBranchIsolationOperation = (
  operation: string,
  branchId: string,
  details?: any
) => {
  console.log(`🔒 [BranchIsolation] ${operation}:`, {
    branchId,
    timestamp: new Date().toISOString(),
    details
  });
};

/**
 * Emergency validation function - run this if you suspect branch isolation issues
 */
export const runBranchIsolationHealthCheck = async (): Promise<{
  healthy: boolean;
  summary: string;
  details: any;
}> => {
  console.log('🔍 Running branch isolation health check...');

  const currentBranchId = getCurrentBranchId();
  if (!currentBranchId) {
    return {
      healthy: false,
      summary: 'No current branch selected',
      details: { currentBranchId: null }
    };
  }

  const validation = await validateBranchIsolation('health_check', currentBranchId, 'hybrid');

  const summary = validation.valid
    ? 'Branch isolation is healthy'
    : `Found ${validation.issues.length} branch isolation issues`;

  console.log(`🏥 Health Check Result: ${summary}`);
  if (!validation.valid) {
    console.warn('❌ Issues found:', validation.issues);
  }

  return {
    healthy: validation.valid,
    summary,
    details: {
      currentBranchId,
      issues: validation.issues,
      timestamp: new Date().toISOString()
    }
  };
};

// Get branch settings
export const getBranchSettings = async (branchId: string): Promise<StoreLocationSchema | null> => {
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

    if (error) {
      // PGRST116 means "No rows found" - this is a valid state when branch settings don't exist yet
      if (error.code === 'PGRST116') {
        console.log('ℹ️ No branch settings found for branch:', branchId);
        return null;
      }
      throw error;
    }
    
    // Update cache
    branchSettingsCache.set(branchId, data);
    cacheTimestamp = now;
    
    return data as StoreLocationSchema;
  } catch (error) {
    // Only log non-PGRST116 errors as actual errors
    if ((error as any)?.code !== 'PGRST116') {
      console.error('Error fetching branch settings:', error);
    }
    return null;
  }
};

// Check if data type is shared for current branch
export const isDataShared = async (entityType: ShareableEntityType): Promise<boolean> => {
  const branchId = getCurrentBranchId();
  if (!branchId) return true; // No branch selected = show all data

  try {
    const branch = await getBranchSettings(branchId);
    if (!branch) return true;

    // Shared mode = everything shared
    if (branch.data_isolation_mode === 'shared') {
      return true;
    }

    // Isolated mode = nothing shared (ALL entities isolated, ignore share_* flags)
    if (branch.data_isolation_mode === 'isolated') {
      return false; // Always return false - all entities are isolated
    }

    // Hybrid mode = check specific flag using schema mapping
    const columnName = ENTITY_TO_COLUMN_MAP[entityType];
    if (columnName && columnName in branch) {
      return branch[columnName] as boolean;
    }

    return true; // Default to shared if entity type not found
  } catch (error) {
    console.error('Error checking data sharing:', error);
    return true; // Default to shared on error
  }
};

// Add branch filter to query builder
export const addBranchFilter = async (
  query: any,
  entityType: ShareableEntityType
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

  // SHARED MODE: Show all data (no filter)
  if (branch?.data_isolation_mode === 'shared') {
    console.log(`📊 No branch filter applied (${entityType} shared in shared mode)`);
    logQueryDebug(entityType, query, 'shared', false);
    return query;
  }

  // ISOLATED MODE: ALL entities must be isolated (filter by branch_id only)
  // In isolated mode, ignore all share_* flags - everything is branch-specific
  if (branch?.data_isolation_mode === 'isolated') {
    // Entity is isolated - only show this branch's data (ignore is_shared flag)
    console.log(`🔒 ISOLATED MODE: Filtering ${entityType} by branch ${branchId} (all entities isolated)`);
    logQueryDebug(entityType, query, 'isolated', true);
    return query.eq('branch_id', branchId);
  }

  // HYBRID MODE: Check if this entity type is shared
  if (branch?.data_isolation_mode === 'hybrid') {
    if (shared) {
      // Entity is shared - show this branch's data + shared data
      console.log(`🔄 HYBRID SHARED: ${entityType} - branch ${branchId} + shared data`);
      logQueryDebug(entityType, query, 'hybrid', true);
      return query.or(`branch_id.eq.${branchId},is_shared.eq.true,branch_id.is.null`);
    } else {
      // Entity is NOT shared - only show this branch's data (strict isolation)
      console.log(`⚖️ HYBRID NOT SHARED: ${entityType} - branch ${branchId} only (isolated)`);
      logQueryDebug(entityType, query, 'hybrid', true);
      return query.eq('branch_id', branchId);
    }
  }

  // Default: apply branch filter (shouldn't reach here, but safety fallback)
  console.log(`🔒 DEFAULT: Filtering ${entityType} by branch ${branchId}`);
  logQueryDebug(entityType, query, branch?.data_isolation_mode || 'isolated', true);
  return query.eq('branch_id', branchId);
};

// Create entity with branch assignment
export const createWithBranch = async (
  tableName: string,
  data: any,
  entityType: ShareableEntityType
) => {
  const branchId = getCurrentBranchId();
  
  // Get branch settings to check isolation mode
  let shared = false;
  if (branchId) {
    const branch = await getBranchSettings(branchId);
    if (branch) {
      // In isolated mode, all entities are isolated (not shared)
      if (branch.data_isolation_mode === 'isolated') {
        shared = false; // Force isolation
      } else {
        // In shared or hybrid mode, check the specific share flag
        shared = await isDataShared(entityType);
      }
    }
  }

  // Special handling for finance_accounts
  let entityData: any = {
    ...data,
    branch_id: shared ? null : branchId,
    is_shared: shared
  };

  // For finance_accounts: ALWAYS make them isolated with branch_id
  // This ensures every account belongs to a specific branch
  if (tableName === 'finance_accounts') {
    // Ensure account_name is set (required by database)
    entityData.account_name = entityData.account_name || entityData.name || 'Unnamed Account';
    entityData.name = entityData.name || entityData.account_name || 'Unnamed Account';
    
    // Ensure account_type is set (required by database - NOT NULL constraint)
    entityData.account_type = entityData.account_type || entityData.type || 'cash';
    // If type is not set, use account_type
    entityData.type = entityData.type || entityData.account_type || 'cash';
    
    // Force isolation: always set is_shared = false and ensure branch_id is set
    entityData.is_shared = false;
    
    // If no branch_id provided and no current branch, get default branch
    if (!entityData.branch_id && !branchId) {
      // Try to get first active branch as fallback
      const { data: defaultBranch } = await supabase
        .from('store_locations')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      if (defaultBranch) {
        entityData.branch_id = defaultBranch.id;
        console.log(`📍 Using default branch for account: ${defaultBranch.id}`);
      } else {
        console.warn('⚠️ No active branch found. Account will be created without branch_id.');
      }
    } else {
      // Use provided branch_id or current branch
      entityData.branch_id = entityData.branch_id || branchId;
    }
  }

  // For expenses and finance_expenses: ALWAYS ensure branch_id is set
  if (tableName === 'expenses' || tableName === 'finance_expenses') {
    // Force branch_id to be set (expenses are always isolated per branch)
    if (!entityData.branch_id && !branchId) {
      // Try to get first active branch as fallback
      const { data: defaultBranch } = await supabase
        .from('store_locations')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      if (defaultBranch) {
        entityData.branch_id = defaultBranch.id;
        console.log(`📍 Using default branch for expense: ${defaultBranch.id}`);
      } else {
        console.warn('⚠️ No active branch found. Expense will be created without branch_id.');
      }
    } else {
      // Use provided branch_id or current branch
      entityData.branch_id = entityData.branch_id || branchId;
    }
  }

  // For lats_purchase_orders: ALWAYS ensure branch_id is set
  // Purchase orders are always isolated per branch
  if (tableName === 'lats_purchase_orders') {
    // Force branch_id to be set
    if (!entityData.branch_id && !branchId) {
      // Try to get first active branch as fallback
      const { data: defaultBranch } = await supabase
        .from('store_locations')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      if (defaultBranch) {
        entityData.branch_id = defaultBranch.id;
        console.log(`📍 Using default branch for purchase order: ${defaultBranch.id}`);
      } else {
        console.warn('⚠️ No active branch found. Purchase order will be created without branch_id.');
      }
    } else {
      // Use provided branch_id or current branch
      entityData.branch_id = entityData.branch_id || branchId;
    }
  }

  console.log(`💾 Creating ${entityType} with branch settings:`, {
    branch_id: entityData.branch_id,
    is_shared: entityData.is_shared,
    isolation_mode: branchId ? (await getBranchSettings(branchId))?.data_isolation_mode : 'none'
  });

  // Explicitly select branch_id and is_shared to ensure they're included
  const { data: result, error } = await supabase
    .from(tableName)
    .insert([entityData])
    .select('*, branch_id, is_shared')
    .single();

  if (error) {
    console.error(`❌ Error creating ${entityType}:`, error);
    throw error;
  }

  // Log the created entity with branch info
  if (result) {
    console.log(`✅ Created ${entityType} with branch_id=${result.branch_id || 'NULL'}, is_shared=${result.is_shared}`);
  }

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

  // Apply branch filter based on isolation settings
  const branchId = getCurrentBranchId();
  
  if (!branchId) {
    return (await query).data || [];
  }

  const branch = await getBranchSettings(branchId);
  const shared = await isDataShared('products');
  
  // SHARED MODE: Show all products (no filter)
  if (branch?.data_isolation_mode === 'shared') {
    // No filter needed
  }
  // ISOLATED MODE: Only show products from this branch (ignore is_shared flag)
  else if (branch?.data_isolation_mode === 'isolated') {
    query = query.eq('branch_id', branchId);
  }
  // HYBRID MODE: Check share_products flag
  else if (branch?.data_isolation_mode === 'hybrid') {
    if (shared) {
      // Products are shared - show this branch's products + shared products
      query = query.or(`branch_id.eq.${branchId},is_shared.eq.true,branch_id.is.null`);
    } else {
      // Products are NOT shared - only show this branch's products (strict isolation)
      query = query.eq('branch_id', branchId);
    }
  }
  // Default: apply branch filter (safety fallback - should not reach here)
  else {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
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

