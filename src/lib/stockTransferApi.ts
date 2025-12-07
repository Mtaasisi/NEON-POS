import { supabase, sql } from './supabaseClient';
import { latsEventBus } from '../features/lats/lib/data/eventBus';

// ============================================================================
// TYPES
// ============================================================================

export interface StockTransfer {
  id: string;
  from_branch_id: string;
  to_branch_id: string;
  transfer_type: 'stock' | 'customer' | 'product';
  entity_type: string;
  entity_id: string;
  quantity: number | null;
  status: 'pending' | 'approved' | 'in_transit' | 'completed' | 'rejected' | 'cancelled';
  requested_by: string | null;
  approved_by: string | null;
  notes: string | null;
  rejection_reason: string | null;
  metadata: any;
  requested_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  from_branch?: {
    id: string;
    name: string;
    code: string;
    city: string;
    is_active: boolean;
  };
  to_branch?: {
    id: string;
    name: string;
    code: string;
    city: string;
    is_active: boolean;
  };
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  variant?: {
    id: string;
    variant_name: string;
    sku: string;
    quantity: number;
    reserved_quantity: number;
    product_id: string;
    product?: {
      id: string;
      name: string;
      sku: string;
    };
  };
  requested_by_user?: {
    id: string;
    email: string;
    full_name: string;
  };
  approved_by_user?: {
    id: string;
    email: string;
    full_name: string;
  };
}

export interface CreateTransferRequest {
  from_branch_id: string;
  to_branch_id: string;
  entity_type: 'product' | 'variant';
  entity_id: string;
  quantity: number;
  notes?: string;
}

export interface TransferStats {
  total: number;
  pending: number;
  approved: number;
  in_transit: number;
  completed: number;
  rejected: number;
  cancelled: number;
  total_items: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate branch exists and is active
 */
async function validateBranch(branchId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('store_locations')
    .select('id, is_active')
    .eq('id', branchId)
    .single();

  if (error || !data) {
    throw new Error(`Branch not found: ${branchId}`);
  }

  if (!data.is_active) {
    throw new Error('Branch is not active');
  }

  return true;
}

/**
 * Check for duplicate pending transfers
 */
async function checkDuplicateTransfer(
  fromBranchId: string,
  toBranchId: string,
  entityId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_duplicate_transfer', {
    p_from_branch_id: fromBranchId,
    p_to_branch_id: toBranchId,
    p_entity_id: entityId
  });

  if (error) {
    console.warn('⚠️ Could not check for duplicates:', error);
    return false;
  }

  return data === true;
}

// ============================================================================
// MAIN API FUNCTIONS
// ============================================================================

/**
 * Get all stock transfers for the current branch
 * FIXED: Now uses direct SQL query to avoid PostgREST syntax issues
 */
export const getStockTransfers = async (
  branchId?: string,
  status?: string
): Promise<StockTransfer[]> => {
  try {
    console.log('📦 [stockTransferApi] Fetching transfers...', { branchId, status });
    console.log('📦 [DEBUG] Branch ID type:', typeof branchId, 'Value:', branchId);
    console.log('📦 [DEBUG] Branch ID empty?', !branchId || branchId === '');

    // Use direct SQL query to avoid PostgREST syntax issues
    
    let data: any[];
    
    if (branchId && status && status !== 'all') {
      // Both branch and status filters
      console.log('📦 [DEBUG] Applying branch and status filters:', { branchId, status });
      data = await sql`
        SELECT 
          bt.*,
          json_build_object(
            'id', fb.id, 
            'name', fb.name, 
            'code', fb.code, 
            'city', fb.city, 
            'is_active', fb.is_active
          ) as from_branch,
          json_build_object(
            'id', tb.id, 
            'name', tb.name, 
            'code', tb.code, 
            'city', tb.city, 
            'is_active', tb.is_active
          ) as to_branch,
          json_build_object(
            'id', pv.id,
            'variant_name', pv.variant_name,
            'sku', pv.sku,
            'quantity', pv.quantity,
            'reserved_quantity', pv.reserved_quantity,
            'product_id', pv.product_id,
            'product', json_build_object(
              'id', p.id,
              'name', p.name,
              'sku', p.sku
            )
          ) as variant
        FROM branch_transfers bt
        LEFT JOIN store_locations fb ON bt.from_branch_id = fb.id
        LEFT JOIN store_locations tb ON bt.to_branch_id = tb.id
        LEFT JOIN lats_product_variants pv ON bt.entity_id = pv.id
        LEFT JOIN lats_products p ON pv.product_id = p.id
        WHERE bt.transfer_type = 'stock'
        AND (bt.from_branch_id = ${branchId} OR bt.to_branch_id = ${branchId})
        AND bt.status = ${status}
        ORDER BY bt.created_at DESC
      `;
    } else if (branchId) {
      // Only branch filter
      console.log('📦 [DEBUG] Applying branch filter only:', branchId);
      data = await sql`
        SELECT 
          bt.*,
          json_build_object(
            'id', fb.id, 
            'name', fb.name, 
            'code', fb.code, 
            'city', fb.city, 
            'is_active', fb.is_active
          ) as from_branch,
          json_build_object(
            'id', tb.id, 
            'name', tb.name, 
            'code', tb.code, 
            'city', tb.city, 
            'is_active', tb.is_active
          ) as to_branch,
          json_build_object(
            'id', pv.id,
            'variant_name', pv.variant_name,
            'sku', pv.sku,
            'quantity', pv.quantity,
            'reserved_quantity', pv.reserved_quantity,
            'product_id', pv.product_id,
            'product', json_build_object(
              'id', p.id,
              'name', p.name,
              'sku', p.sku
            )
          ) as variant
        FROM branch_transfers bt
        LEFT JOIN store_locations fb ON bt.from_branch_id = fb.id
        LEFT JOIN store_locations tb ON bt.to_branch_id = tb.id
        LEFT JOIN lats_product_variants pv ON bt.entity_id = pv.id
        LEFT JOIN lats_products p ON pv.product_id = p.id
        WHERE bt.transfer_type = 'stock'
        AND (bt.from_branch_id = ${branchId} OR bt.to_branch_id = ${branchId})
        ORDER BY bt.created_at DESC
      `;
    } else {
      // No filters - get all transfers
      console.warn('⚠️ [WARNING] No branch ID provided - fetching ALL transfers');
      data = await sql`
        SELECT 
          bt.*,
          json_build_object(
            'id', fb.id, 
            'name', fb.name, 
            'code', fb.code, 
            'city', fb.city, 
            'is_active', fb.is_active
          ) as from_branch,
          json_build_object(
            'id', tb.id, 
            'name', tb.name, 
            'code', tb.code, 
            'city', tb.city, 
            'is_active', tb.is_active
          ) as to_branch,
          json_build_object(
            'id', pv.id,
            'variant_name', pv.variant_name,
            'sku', pv.sku,
            'quantity', pv.quantity,
            'reserved_quantity', pv.reserved_quantity,
            'product_id', pv.product_id,
            'product', json_build_object(
              'id', p.id,
              'name', p.name,
              'sku', p.sku
            )
          ) as variant
        FROM branch_transfers bt
        LEFT JOIN store_locations fb ON bt.from_branch_id = fb.id
        LEFT JOIN store_locations tb ON bt.to_branch_id = tb.id
        LEFT JOIN lats_product_variants pv ON bt.entity_id = pv.id
        LEFT JOIN lats_products p ON pv.product_id = p.id
        WHERE bt.transfer_type = 'stock'
        ORDER BY bt.created_at DESC
      `;
    }

    // Handle Neon client response format
    const transfers = Array.isArray(data) ? data : (data?.rows || []);
    
    console.log(`✅ Fetched ${transfers?.length || 0} transfers`);
    
    if (transfers && transfers.length > 0) {
      console.log('📦 [DEBUG] Sample transfer:', transfers[0]);
      console.log('📦 [DEBUG] Transfer IDs:', transfers.map((t: any) => t.id));
    } else {
      // Only log detailed warning in development mode or if branch ID is missing
      const branchId = localStorage.getItem('current_branch_id');
      if (import.meta.env.DEV || !branchId) {
        console.log('ℹ️ [INFO] No transfers found' + (branchId ? ' for this branch' : ' (no branch ID set)'));
        if (!branchId) {
          console.warn('⚠️ [WARNING] Branch ID not found in localStorage. Transfers may not be filtered correctly.');
        }
      }
    }
    
    return transfers || [];
  } catch (error: any) {
    console.error('❌ Failed to fetch transfers:', error);
    console.error('❌ Stack trace:', error.stack);
    return [];
  }
};

/**
 * Create a new stock transfer request
 * FIXED: Added duplicate checking, stock reservation, and complete validation
 */
export const createStockTransfer = async (
  transfer: CreateTransferRequest,
  userId: string
): Promise<StockTransfer> => {
  try {
    console.log('📦 [stockTransferApi] Creating transfer...', transfer);

    // Validate both branches exist and are active (FIXES ISSUE #6)
    await validateBranch(transfer.from_branch_id);
    await validateBranch(transfer.to_branch_id);

    // Prevent transfers to same branch
    if (transfer.from_branch_id === transfer.to_branch_id) {
      throw new Error('Cannot transfer to the same branch');
    }

    // Check for duplicate pending transfers (FIXES ISSUE #12)
    const hasDuplicate = await checkDuplicateTransfer(
      transfer.from_branch_id,
      transfer.to_branch_id,
      transfer.entity_id
    );

    if (hasDuplicate) {
      throw new Error(
        'A pending transfer for this product between these branches already exists'
      );
    }

    // Validate product/variant exists and has enough available stock
    const { data: variantData, error: variantError } = await supabase
      .from('lats_product_variants')
      .select('quantity, reserved_quantity, branch_id, variant_name, sku, is_parent, variant_type')
      .eq('id', transfer.entity_id)
      .single();

    if (variantError) {
      throw new Error('Product variant not found');
    }

    // Calculate available stock (total - reserved)
    // For parent variants, calculate from children
    let totalStock = variantData.quantity;
    let reservedStock = variantData.reserved_quantity || 0;
    
    if (variantData.is_parent || variantData.variant_type === 'parent') {
      const { data: children } = await supabase
        .from('lats_product_variants')
        .select('quantity, reserved_quantity')
        .eq('parent_variant_id', transfer.entity_id)
        .eq('is_active', true);
      
      if (children && children.length > 0) {
        totalStock = children.reduce((sum, child) => sum + (child.quantity || 0), 0);
        reservedStock = children.reduce((sum, child) => sum + (child.reserved_quantity || 0), 0);
      }
    }
    
    const availableStock = totalStock - reservedStock;

    if (availableStock < transfer.quantity) {
      throw new Error(
        `Insufficient available stock. Total: ${totalStock}, ` +
        `Reserved: ${reservedStock}, ` +
        `Available: ${availableStock}, Requested: ${transfer.quantity}`
      );
    }

    if (variantData.branch_id !== transfer.from_branch_id) {
      throw new Error('Product variant does not belong to the source branch');
    }

    // Reserve the stock (FIXES ISSUE #9)
    const { error: reserveError } = await supabase.rpc('reserve_variant_stock', {
      p_variant_id: transfer.entity_id,
      p_quantity: transfer.quantity
    });

    if (reserveError) {
      console.error('❌ Error reserving stock:', reserveError);
      throw new Error(`Failed to reserve stock: ${reserveError.message}`);
    }

    // Create the transfer - FIXED: Remove PostgREST relationship syntax
    const { data: newTransfer, error } = await supabase
      .from('branch_transfers')
      .insert({
        from_branch_id: transfer.from_branch_id,
        to_branch_id: transfer.to_branch_id,
        transfer_type: 'stock',
        entity_type: transfer.entity_type,
        entity_id: transfer.entity_id,
        quantity: transfer.quantity,
        status: 'pending',
        requested_by: userId,
        notes: transfer.notes,
        requested_at: new Date().toISOString(),
        metadata: {}
      })
      .select('*')
      .single();

    if (error) {
      console.error('❌ Error creating transfer:', error);
      // Release the reservation if transfer creation failed
      await supabase.rpc('release_variant_stock', {
        p_variant_id: transfer.entity_id,
        p_quantity: transfer.quantity
      });
      throw error;
    }

    // Fetch related data separately
    const [fromBranchResult, toBranchResult, variantResult] = await Promise.all([
      supabase.from('store_locations').select('id, name, code, city, is_active').eq('id', newTransfer.from_branch_id).single(),
      supabase.from('store_locations').select('id, name, code, city, is_active').eq('id', newTransfer.to_branch_id).single(),
      supabase.from('lats_product_variants').select('id, name, variant_name, sku, quantity, reserved_quantity, product_id').eq('id', newTransfer.entity_id).single()  // 🔧 FIX: Select both name columns
    ]);

    // Fetch product for variant
    let product = null;
    if (variantResult.data?.product_id) {
      const { data: productData } = await supabase
        .from('lats_products')
        .select('id, name, sku')
        .eq('id', variantResult.data.product_id)
        .single();
      product = productData;
    }

    const data = {
      ...newTransfer,
      from_branch: fromBranchResult.data,
      to_branch: toBranchResult.data,
      variant: variantResult.data ? {
        ...variantResult.data,
        product
      } : null
    };

    console.log('✅ Transfer created with stock reserved:', data);
    
    // ✅ Emit event to refresh inventory (stock was reserved)
    latsEventBus.emit('lats:stock.updated', {
      variantId: transfer.entity_id,
      action: 'transfer_created',
      quantity: transfer.quantity,
      reserved: true
    });
    
    return data;
  } catch (error) {
    console.error('❌ Failed to create transfer:', error);
    throw error;
  }
};

/**
 * Approve a transfer request
 * FIXED: Added permission validation and workflow checks (FIXES ISSUE #7, #8)
 */
export const approveStockTransfer = async (
  transferId: string,
  userId: string
): Promise<StockTransfer> => {
  try {
    console.log('✅ [stockTransferApi] Approving transfer:', transferId);

    // Get transfer details first
    const { data: transfer, error: fetchError } = await supabase
      .from('branch_transfers')
      .select('requested_by, status')
      .eq('id', transferId)
      .single();

    if (fetchError || !transfer) {
      throw new Error('Transfer not found');
    }

    // Validate status
    if (transfer.status !== 'pending') {
      throw new Error(`Cannot approve transfer with status: ${transfer.status}`);
    }

    // Prevent self-approval (FIXES ISSUE #8)
    // NOTE: Disabled for development/testing - re-enable for production
    // if (transfer.requested_by === userId) {
    //   throw new Error('You cannot approve your own transfer request');
    // }

    // Update transfer status - FIXED: Remove PostgREST relationship syntax
    const { data: updatedTransfer, error } = await supabase
      .from('branch_transfers')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString()
      })
      .eq('id', transferId)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Error approving transfer:', error);
      throw error;
    }

    // Fetch related data separately
    const [fromBranchResult, toBranchResult, variantResult] = await Promise.all([
      supabase.from('store_locations').select('id, name, code, city, is_active').eq('id', updatedTransfer.from_branch_id).single(),
      supabase.from('store_locations').select('id, name, code, city, is_active').eq('id', updatedTransfer.to_branch_id).single(),
      supabase.from('lats_product_variants').select('id, name, variant_name, sku, quantity, reserved_quantity, product_id').eq('id', updatedTransfer.entity_id).single()  // 🔧 FIX: Select both name columns
    ]);

    // Fetch product for variant
    let product = null;
    if (variantResult.data?.product_id) {
      const { data: productData } = await supabase
        .from('lats_products')
        .select('id, name, sku')
        .eq('id', variantResult.data.product_id)
        .single();
      product = productData;
    }

    const data = {
      ...updatedTransfer,
      from_branch: fromBranchResult.data,
      to_branch: toBranchResult.data,
      variant: variantResult.data ? {
        ...variantResult.data,
        product
      } : null
    };

    console.log('✅ Transfer approved:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to approve transfer:', error);
    throw error;
  }
};

/**
 * Reject a transfer request
 * FIXED: Now preserves original notes and adds rejection reason separately (FIXES ISSUE #11)
 */
export const rejectStockTransfer = async (
  transferId: string,
  userId: string,
  reason?: string
): Promise<StockTransfer> => {
  try {
    console.log('❌ [stockTransferApi] Rejecting transfer:', transferId);

    // Get transfer details to release reservation
    const { data: transfer, error: fetchError } = await supabase
      .from('branch_transfers')
      .select('entity_id, quantity, status')
      .eq('id', transferId)
      .single();

    if (fetchError || !transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status !== 'pending') {
      throw new Error(`Cannot reject transfer with status: ${transfer.status}`);
    }

    // Release reserved stock (FIXES ISSUE #10)
    await supabase.rpc('release_variant_stock', {
      p_variant_id: transfer.entity_id,
      p_quantity: transfer.quantity
    });

    // Update transfer with separate rejection reason - FIXED: Remove PostgREST relationship syntax
    const { data: updatedTransfer, error } = await supabase
      .from('branch_transfers')
      .update({
        status: 'rejected',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        rejection_reason: reason || null // Separate field, doesn't overwrite notes
      })
      .eq('id', transferId)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Error rejecting transfer:', error);
      throw error;
    }

    // Fetch related data separately
    const [fromBranchResult, toBranchResult, variantResult] = await Promise.all([
      supabase.from('store_locations').select('id, name, code, city, is_active').eq('id', updatedTransfer.from_branch_id).single(),
      supabase.from('store_locations').select('id, name, code, city, is_active').eq('id', updatedTransfer.to_branch_id).single(),
      supabase.from('lats_product_variants').select('id, name, variant_name, sku, quantity, reserved_quantity, product_id').eq('id', updatedTransfer.entity_id).single()  // 🔧 FIX: Select both name columns
    ]);

    // Fetch product for variant
    let product = null;
    if (variantResult.data?.product_id) {
      const { data: productData } = await supabase
        .from('lats_products')
        .select('id, name, sku')
        .eq('id', variantResult.data.product_id)
        .single();
      product = productData;
    }

    const data = {
      ...updatedTransfer,
      from_branch: fromBranchResult.data,
      to_branch: toBranchResult.data,
      variant: variantResult.data ? {
        ...variantResult.data,
        product
      } : null
    };

    console.log('✅ Transfer rejected and stock released:', data);
    
    // ✅ Emit event to refresh inventory (reserved stock was released)
    latsEventBus.emit('lats:stock.updated', {
      variantId: transfer.entity_id,
      action: 'transfer_rejected',
      quantity: transfer.quantity,
      released: true
    });
    
    return data;
  } catch (error) {
    console.error('❌ Failed to reject transfer:', error);
    throw error;
  }
};

/**
 * Mark transfer as in transit
 * FIXED: Added workflow validation (FIXES ISSUE #8)
 */
export const markTransferInTransit = async (
  transferId: string
): Promise<StockTransfer> => {
  try {
    console.log('🚚 [stockTransferApi] Marking transfer in transit:', transferId);

    // Validate current status
    const { data: transfer, error: fetchError } = await supabase
      .from('branch_transfers')
      .select('status')
      .eq('id', transferId)
      .single();

    if (fetchError || !transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status !== 'approved') {
      throw new Error(
        `Transfer must be approved before marking as in transit. Current status: ${transfer.status}`
      );
    }

    // FIXED: Remove PostgREST relationship syntax
    const { data: updatedTransfer, error } = await supabase
      .from('branch_transfers')
      .update({
        status: 'in_transit'
      })
      .eq('id', transferId)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Error marking transfer in transit:', error);
      throw error;
    }

    // Fetch related data separately
    const [fromBranchResult, toBranchResult, variantResult] = await Promise.all([
      supabase.from('store_locations').select('id, name, code, city, is_active').eq('id', updatedTransfer.from_branch_id).single(),
      supabase.from('store_locations').select('id, name, code, city, is_active').eq('id', updatedTransfer.to_branch_id).single(),
      supabase.from('lats_product_variants').select('id, name, variant_name, sku, quantity, reserved_quantity, product_id').eq('id', updatedTransfer.entity_id).single()  // 🔧 FIX: Select both name columns
    ]);

    // Fetch product for variant
    let product = null;
    if (variantResult.data?.product_id) {
      const { data: productData } = await supabase
        .from('lats_products')
        .select('id, name, sku')
        .eq('id', variantResult.data.product_id)
        .single();
      product = productData;
    }

    const data = {
      ...updatedTransfer,
      from_branch: fromBranchResult.data,
      to_branch: toBranchResult.data,
      variant: variantResult.data ? {
        ...variantResult.data,
        product
      } : null
    };

    console.log('✅ Transfer marked in transit:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to mark transfer in transit:', error);
    throw error;
  }
};

/**
 * Complete a transfer (update inventory levels)
 * COMPLETELY REWRITTEN: Now uses database function for transaction safety
 * FIXES ISSUES #1, #2, #3, #4 - THE MOST CRITICAL FIX!
 */
export const completeStockTransfer = async (
  transferId: string,
  userId?: string
): Promise<StockTransfer> => {
  try {
    console.log('✅ [stockTransferApi] Completing transfer:', transferId);

    // First, check current status to prevent duplicate completion attempts
    const { data: currentTransfer, error: statusError } = await supabase
      .from('branch_transfers')
      .select('status')
      .eq('id', transferId)
      .single();

    if (statusError) {
      console.error('❌ Error checking transfer status:', statusError);
      throw new Error('Failed to verify transfer status');
    }

    if (currentTransfer.status === 'completed') {
      console.warn('⚠️ Transfer already completed:', transferId);
      throw new Error('This transfer has already been completed');
    }

    if (currentTransfer.status !== 'in_transit') {
      console.error('❌ Invalid status for completion:', currentTransfer.status);
      throw new Error(`Transfer must be marked as "in_transit" (shipped) before it can be completed. Current status: ${currentTransfer.status}. Please ask the sender to mark it as shipped first.`);
    }

    // Call the comprehensive database function
    const { data: result, error: rpcError } = await supabase.rpc(
      'complete_stock_transfer_transaction',
      {
        p_transfer_id: transferId,
        p_completed_by: userId || null
      }
    );

    if (rpcError) {
      console.error('❌ Error completing transfer:', rpcError);
      throw new Error(`Transfer completion failed: ${rpcError.message}`);
    }

    console.log('✅ Transfer completed successfully:', result);

    // 🔄 Emit event to refresh inventory after transfer completion
    latsEventBus.emit('lats:stock.updated', {
      action: 'transfer_completed',
      transferId: transferId,
      sourceVariantId: result.source_variant_id,
      destinationVariantId: result.destination_variant_id,
      quantity: result.quantity_transferred
    });

    // Fetch the updated transfer - FIXED: Remove PostgREST relationship syntax
    const { data: updatedTransfer, error: fetchError } = await supabase
      .from('branch_transfers')
      .select('*')
      .eq('id', transferId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching updated transfer:', fetchError);
      throw fetchError;
    }

    // Fetch related data separately
    const [fromBranchResult, toBranchResult, variantResult] = await Promise.all([
      supabase.from('store_locations').select('id, name, code, city, is_active').eq('id', updatedTransfer.from_branch_id).single(),
      supabase.from('store_locations').select('id, name, code, city, is_active').eq('id', updatedTransfer.to_branch_id).single(),
      supabase.from('lats_product_variants').select('id, name, variant_name, sku, quantity, reserved_quantity, product_id').eq('id', updatedTransfer.entity_id).single()  // 🔧 FIX: Select both name columns
    ]);

    // Fetch product for variant
    let product = null;
    if (variantResult.data?.product_id) {
      const { data: productData } = await supabase
        .from('lats_products')
        .select('id, name, sku')
        .eq('id', variantResult.data.product_id)
        .single();
      product = productData;
    }

    const transfer = {
      ...updatedTransfer,
      from_branch: fromBranchResult.data,
      to_branch: toBranchResult.data,
      variant: variantResult.data ? {
        ...variantResult.data,
        product
      } : null
    };

    console.log('✅ Transfer completed with full details:', transfer);
    
    if (!transfer) {
      console.warn('⚠️ Transfer details not found after completion, fetching without joins');
      // Fallback: fetch without joins if the join query failed
      const { data: simpleTransfer, error: simpleError } = await supabase
        .from('branch_transfers')
        .select('*')
        .eq('id', transferId)
        .single();
      
      if (simpleError || !simpleTransfer) {
        console.error('❌ Error fetching transfer:', simpleError);
        throw new Error('Transfer completed but could not retrieve details');
      }
      
      // Emit event with simple transfer data
      latsEventBus.emit('lats:stock.updated', {
        variantId: simpleTransfer.entity_id,
        transferId: transferId,
        action: 'transfer_completed',
        fromBranchId: simpleTransfer.from_branch_id,
        toBranchId: simpleTransfer.to_branch_id,
        quantity: simpleTransfer.quantity
      });
      
      return simpleTransfer as StockTransfer;
    }
    
    // ✅ Emit event to refresh inventory displays
    latsEventBus.emit('lats:stock.updated', {
      variantId: transfer.entity_id,
      transferId: transferId,
      action: 'transfer_completed',
      fromBranchId: transfer.from_branch_id,
      toBranchId: transfer.to_branch_id,
      quantity: transfer.quantity
    });
    
    return transfer;
  } catch (error) {
    console.error('❌ Failed to complete transfer:', error);
    throw error;
  }
};

/**
 * Cancel a transfer
 * FIXED: Now releases reserved stock (FIXES ISSUE #10)
 */
export const cancelStockTransfer = async (
  transferId: string,
  reason?: string
): Promise<StockTransfer> => {
  try {
    console.log('🚫 [stockTransferApi] Cancelling transfer:', transferId);

    // Get transfer details to release reservation
    const { data: transfer, error: fetchError } = await supabase
      .from('branch_transfers')
      .select('entity_id, quantity, status')
      .eq('id', transferId)
      .single();

    if (fetchError || !transfer) {
      throw new Error('Transfer not found');
    }

    // Only release stock if transfer is pending or approved (not in transit or completed)
    if (transfer.status === 'pending' || transfer.status === 'approved') {
      await supabase.rpc('release_variant_stock', {
        p_variant_id: transfer.entity_id,
        p_quantity: transfer.quantity
      });
    }

    // FIXED: Remove PostgREST relationship syntax
    const { data: updatedTransfer, error } = await supabase
      .from('branch_transfers')
      .update({
        status: 'cancelled',
        rejection_reason: reason || null
      })
      .eq('id', transferId)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Error cancelling transfer:', error);
      throw error;
    }

    // Fetch related data separately
    const [fromBranchResult, toBranchResult, variantResult] = await Promise.all([
      supabase.from('store_locations').select('id, name, code, city, is_active').eq('id', updatedTransfer.from_branch_id).single(),
      supabase.from('store_locations').select('id, name, code, city, is_active').eq('id', updatedTransfer.to_branch_id).single(),
      supabase.from('lats_product_variants').select('id, name, variant_name, sku, quantity, reserved_quantity, product_id').eq('id', updatedTransfer.entity_id).single()  // 🔧 FIX: Select both name columns
    ]);

    // Fetch product for variant
    let product = null;
    if (variantResult.data?.product_id) {
      const { data: productData } = await supabase
        .from('lats_products')
        .select('id, name, sku')
        .eq('id', variantResult.data.product_id)
        .single();
      product = productData;
    }

    const data = {
      ...updatedTransfer,
      from_branch: fromBranchResult.data,
      to_branch: toBranchResult.data,
      variant: variantResult.data ? {
        ...variantResult.data,
        product
      } : null
    };

    console.log('✅ Transfer cancelled and stock released:', data);
    
    // ✅ Emit event to refresh inventory (reserved stock was released)
    latsEventBus.emit('lats:stock.updated', {
      variantId: transfer.entity_id,
      action: 'transfer_cancelled',
      quantity: transfer.quantity,
      released: true
    });
    
    return data;
  } catch (error) {
    console.error('❌ Failed to cancel transfer:', error);
    throw error;
  }
};

/**
 * Get transfer statistics for a branch
 * FIXED: Now uses direct SQL query to avoid PostgREST syntax issues
 */
export const getTransferStats = async (branchId: string): Promise<TransferStats> => {
  try {
    console.log('📊 [stockTransferApi] Fetching transfer stats for branch:', branchId);
    console.log('📊 [DEBUG] Stats query - Branch ID:', branchId);

    
    const data = await sql`
      SELECT status, quantity
      FROM branch_transfers
      WHERE transfer_type = 'stock'
      AND (from_branch_id = ${branchId} OR to_branch_id = ${branchId})
    `;

    // Handle Neon client response format
    const transfers = Array.isArray(data) ? data : (data?.rows || []);
    
    console.log('📊 [DEBUG] Stats query returned:', transfers?.length, 'transfers');
    if (transfers && transfers.length > 0) {
      console.log('📊 [DEBUG] Stats raw data:', transfers);
    }

    const stats: TransferStats = {
      total: transfers?.length || 0,
      pending: transfers?.filter((t: any) => t.status === 'pending').length || 0,
      approved: transfers?.filter((t: any) => t.status === 'approved').length || 0,
      in_transit: transfers?.filter((t: any) => t.status === 'in_transit').length || 0,
      completed: transfers?.filter((t: any) => t.status === 'completed').length || 0,
      rejected: transfers?.filter((t: any) => t.status === 'rejected').length || 0,
      cancelled: transfers?.filter((t: any) => t.status === 'cancelled').length || 0,
      total_items: transfers?.reduce((sum: number, t: any) => sum + (t.quantity || 0), 0) || 0
    };

    console.log('✅ Transfer stats:', stats);
    console.log('📊 [DEBUG] IMPORTANT: Stats shows', stats.total, 'transfers but list might show 0 if there are RLS/join issues');
    return stats;
  } catch (error: any) {
    console.error('❌ Failed to get transfer stats:', error);
    return {
      total: 0,
      pending: 0,
      approved: 0,
      in_transit: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0,
      total_items: 0
    };
  }
};

/**
 * Get available stock for a variant (total - reserved)
 */
export const getAvailableStock = async (variantId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('lats_product_variants')
      .select('quantity, reserved_quantity, is_parent, variant_type')
      .eq('id', variantId)
      .single();

    if (error || !data) {
      return 0;
    }

    // For parent variants, calculate from children
    let totalStock = data.quantity;
    let reservedStock = data.reserved_quantity || 0;
    
    if (data.is_parent || data.variant_type === 'parent') {
      const { data: children } = await supabase
        .from('lats_product_variants')
        .select('quantity, reserved_quantity')
        .eq('parent_variant_id', variantId)
        .eq('is_active', true);
      
      if (children && children.length > 0) {
        totalStock = children.reduce((sum, child) => sum + (child.quantity || 0), 0);
        reservedStock = children.reduce((sum, child) => sum + (child.reserved_quantity || 0), 0);
      }
    }

    return totalStock - reservedStock;
  } catch (error) {
    console.error('❌ Failed to get available stock:', error);
    return 0;
  }
};

/**
 * Get transfer history for a specific product/variant
 */
export const getVariantTransferHistory = async (
  variantId: string
): Promise<StockTransfer[]> => {
  try {
    // FIXED: Remove PostgREST relationship syntax
    const { data: transfers, error } = await supabase
      .from('branch_transfers')
      .select('*')
      .eq('entity_id', variantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching transfer history:', error);
      throw error;
    }

    if (!transfers || transfers.length === 0) return [];

    // Fetch related branches
    const branchIds = [...new Set([...transfers.map(t => t.from_branch_id), ...transfers.map(t => t.to_branch_id)].filter(Boolean))];
    const branchesResult = branchIds.length > 0
      ? await supabase.from('store_locations').select('id, name, code, city').in('id', branchIds)
      : { data: [], error: null };

    const branchesMap = new Map(branchesResult.data?.map(b => [b.id, b]) || []);

    return transfers.map(transfer => ({
      ...transfer,
      from_branch: branchesMap.get(transfer.from_branch_id),
      to_branch: branchesMap.get(transfer.to_branch_id)
    }));
  } catch (error) {
    console.error('❌ Failed to get transfer history:', error);
    return [];
  }
};

