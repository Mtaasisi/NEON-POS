/**
 * Branch Product Management API
 * Functions for managing products at the branch level
 */

import { supabase } from './supabaseClient';
import { getCurrentBranchId } from './branchAwareApi';

export interface DeleteProductsResult {
  success: boolean;
  productsDeleted: number;
  variantsDeleted: number;
  branchId: string;
  branchName: string;
  error?: string;
}

/**
 * Delete all products in the current branch
 * ⚠️ WARNING: This is a destructive operation!
 */
export const deleteAllBranchProducts = async (): Promise<DeleteProductsResult> => {
  try {
    const branchId = getCurrentBranchId();
    
    if (!branchId) {
      throw new Error('No branch selected. Please select a branch first.');
    }

    // Get branch details
    const { data: branch, error: branchError } = await supabase
      .from('lats_store_locations')
      .select('id, name')
      .eq('id', branchId)
      .single();

    if (branchError || !branch) {
      throw new Error('Failed to fetch branch details');
    }

    console.log(`🗑️ Deleting all products for branch: ${branch.name} (${branchId})`);

    // Count products before deletion
    const { count: productCount } = await supabase
      .from('lats_products')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId);

    // Count variants before deletion
    const { count: variantCount } = await supabase
      .from('lats_product_variants')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId);

    console.log(`📦 Products to delete: ${productCount || 0}`);
    console.log(`🔢 Variants to delete: ${variantCount || 0}`);

    // Delete variants first (they reference products)
    const { error: variantsError } = await supabase
      .from('lats_product_variants')
      .delete()
      .eq('branch_id', branchId);

    if (variantsError) {
      throw new Error(`Failed to delete variants: ${variantsError.message}`);
    }

    console.log(`✅ Deleted ${variantCount || 0} variants`);

    // Delete products
    const { error: productsError } = await supabase
      .from('lats_products')
      .delete()
      .eq('branch_id', branchId);

    if (productsError) {
      throw new Error(`Failed to delete products: ${productsError.message}`);
    }

    console.log(`✅ Deleted ${productCount || 0} products`);
    console.log(`🎉 All products deleted successfully from ${branch.name}!`);

    return {
      success: true,
      productsDeleted: productCount || 0,
      variantsDeleted: variantCount || 0,
      branchId: branch.id,
      branchName: branch.name
    };
  } catch (error: any) {
    console.error('❌ Error deleting products:', error);
    return {
      success: false,
      productsDeleted: 0,
      variantsDeleted: 0,
      branchId: getCurrentBranchId() || '',
      branchName: 'Unknown',
      error: error.message || 'Unknown error occurred'
    };
  }
};

/**
 * Delete all products in a specific branch by branch ID
 * ⚠️ WARNING: This is a destructive operation!
 */
export const deleteAllProductsByBranchId = async (branchId: string): Promise<DeleteProductsResult> => {
  try {
    // Get branch details
    const { data: branch, error: branchError } = await supabase
      .from('lats_store_locations')
      .select('id, name')
      .eq('id', branchId)
      .single();

    if (branchError || !branch) {
      throw new Error('Branch not found');
    }

    console.log(`🗑️ Deleting all products for branch: ${branch.name} (${branchId})`);

    // Count products before deletion
    const { count: productCount } = await supabase
      .from('lats_products')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId);

    // Count variants before deletion
    const { count: variantCount } = await supabase
      .from('lats_product_variants')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId);

    console.log(`📦 Products to delete: ${productCount || 0}`);
    console.log(`🔢 Variants to delete: ${variantCount || 0}`);

    // Delete variants first
    const { error: variantsError } = await supabase
      .from('lats_product_variants')
      .delete()
      .eq('branch_id', branchId);

    if (variantsError) {
      throw new Error(`Failed to delete variants: ${variantsError.message}`);
    }

    console.log(`✅ Deleted ${variantCount || 0} variants`);

    // Delete products
    const { error: productsError } = await supabase
      .from('lats_products')
      .delete()
      .eq('branch_id', branchId);

    if (productsError) {
      throw new Error(`Failed to delete products: ${productsError.message}`);
    }

    console.log(`✅ Deleted ${productCount || 0} products`);
    console.log(`🎉 All products deleted successfully from ${branch.name}!`);

    return {
      success: true,
      productsDeleted: productCount || 0,
      variantsDeleted: variantCount || 0,
      branchId: branch.id,
      branchName: branch.name
    };
  } catch (error: any) {
    console.error('❌ Error deleting products:', error);
    return {
      success: false,
      productsDeleted: 0,
      variantsDeleted: 0,
      branchId,
      branchName: 'Unknown',
      error: error.message || 'Unknown error occurred'
    };
  }
};

/**
 * Get product count for current branch
 */
export const getCurrentBranchProductCount = async (): Promise<number> => {
  const branchId = getCurrentBranchId();
  
  if (!branchId) {
    return 0;
  }

  const { count } = await supabase
    .from('lats_products')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', branchId);

  return count || 0;
};

/**
 * Get product count for a specific branch
 */
export const getBranchProductCount = async (branchId: string): Promise<number> => {
  const { count } = await supabase
    .from('lats_products')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', branchId);

  return count || 0;
};

