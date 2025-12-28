import { supabase } from './supabaseClient';

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
 * FIXED: Now includes complete variant and product information
 */
export const getStockTransfers = async (
  branchId?: string,
  status?: string
): Promise<StockTransfer[]> => {
  try {
    console.log('📦 [stockTransferApi] Fetching transfers...', { branchId, status });

    // Build the base query with complete joins
    let baseQuery = supabase
      .from('branch_transfers')
      .select(`
        *,
        from_branch:store_locations!from_branch_id(
          id, 
          name, 
          code, 
          city, 
          is_active
        ),
        to_branch:store_locations!to_branch_id(
          id, 
          name, 
          code, 
          city, 
          is_active
        ),
        variant:lats_product_variants!entity_id(
          id,
          variant_name,
          sku,
          quantity,
          reserved_quantity,
          product:lats_products(id, name, sku)
        )
      `)
      .eq('transfer_type', 'stock')
      .order('created_at', { ascending: false });

    // Apply filters
    if (branchId) {
      baseQuery = baseQuery.or(`from_branch_id.eq.${branchId},to_branch_id.eq.${branchId}`);
    }

    if (status && status !== 'all') {
      baseQuery = baseQuery.eq('status', status);
    }

    const { data, error } = await baseQuery;

    if (error) {
      console.error('❌ Error fetching transfers:', error);
      throw error;
    }

    console.log(`✅ Fetched ${data?.length || 0} transfers`);
    return data || [];
  } catch (error: any) {
    console.error('❌ Failed to fetch transfers:', error);
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
      .select('quantity, reserved_quantity, branch_id, variant_name, sku')
      .eq('id', transfer.entity_id)
      .single();

    if (variantError) {
      throw new Error('Product variant not found');
    }

    // Calculate available stock (total - reserved)
    const availableStock = variantData.quantity - (variantData.reserved_quantity || 0);

    if (availableStock < transfer.quantity) {
      throw new Error(
        `Insufficient available stock. Total: ${variantData.quantity}, ` +
        `Reserved: ${variantData.reserved_quantity || 0}, ` +
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

    // Create the transfer
    const { data, error } = await supabase
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
      .select(`
        *,
        from_branch:store_locations!from_branch_id(id, name, code, city, is_active),
        to_branch:store_locations!to_branch_id(id, name, code, city, is_active),
        variant:lats_product_variants!entity_id(
          id,
          variant_name,
          sku,
          quantity,
          reserved_quantity,
          product:lats_products(id, name, sku)
        )
      `)
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

    console.log('✅ Transfer created with stock reserved:', data);
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
      .select('*, from_branch:store_locations!from_branch_id(id)')
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
    if (transfer.requested_by === userId) {
      throw new Error('You cannot approve your own transfer request');
    }

    // Update transfer status
    const { data, error } = await supabase
      .from('branch_transfers')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString()
      })
      .eq('id', transferId)
      .select(`
        *,
        from_branch:store_locations!from_branch_id(id, name, code, city, is_active),
        to_branch:store_locations!to_branch_id(id, name, code, city, is_active),
        variant:lats_product_variants!entity_id(
          id,
          variant_name,
          sku,
          quantity,
          reserved_quantity,
          product:lats_products(id, name, sku)
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error approving transfer:', error);
      throw error;
    }

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

    // Update transfer with separate rejection reason
    const { data, error } = await supabase
      .from('branch_transfers')
      .update({
        status: 'rejected',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        rejection_reason: reason || null // Separate field, doesn't overwrite notes
      })
      .eq('id', transferId)
      .select(`
        *,
        from_branch:store_locations!from_branch_id(id, name, code, city, is_active),
        to_branch:store_locations!to_branch_id(id, name, code, city, is_active),
        variant:lats_product_variants!entity_id(
          id,
          variant_name,
          sku,
          quantity,
          reserved_quantity,
          product:lats_products(id, name, sku)
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error rejecting transfer:', error);
      throw error;
    }

    console.log('✅ Transfer rejected and stock released:', data);
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

    const { data, error } = await supabase
      .from('branch_transfers')
      .update({
        status: 'in_transit'
      })
      .eq('id', transferId)
      .select(`
        *,
        from_branch:store_locations!from_branch_id(id, name, code, city, is_active),
        to_branch:store_locations!to_branch_id(id, name, code, city, is_active),
        variant:lats_product_variants!entity_id(
          id,
          variant_name,
          sku,
          quantity,
          reserved_quantity,
          product:lats_products(id, name, sku)
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error marking transfer in transit:', error);
      throw error;
    }

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
 * FIXES ISSUES #1, #2, #3, #4
 */
export const completeStockTransfer = async (
  transferId: string,
  userId?: string
): Promise<StockTransfer> => {
  try {
    console.log('✅ [stockTransferApi] Completing transfer:', transferId);

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

    // Fetch the updated transfer with all details
    const { data: transfer, error: fetchError } = await supabase
      .from('branch_transfers')
      .select(`
        *,
        from_branch:store_locations!from_branch_id(id, name, code, city, is_active),
        to_branch:store_locations!to_branch_id(id, name, code, city, is_active),
        variant:lats_product_variants!entity_id(
          id,
          variant_name,
          sku,
          quantity,
          reserved_quantity,
          product:lats_products(id, name, sku)
        )
      `)
      .eq('id', transferId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching updated transfer:', fetchError);
      throw fetchError;
    }

    console.log('✅ Transfer completed with full details:', transfer);
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

    const { data, error } = await supabase
      .from('branch_transfers')
      .update({
        status: 'cancelled',
        rejection_reason: reason || null
      })
      .eq('id', transferId)
      .select(`
        *,
        from_branch:store_locations!from_branch_id(id, name, code, city, is_active),
        to_branch:store_locations!to_branch_id(id, name, code, city, is_active),
        variant:lats_product_variants!entity_id(
          id,
          variant_name,
          sku,
          quantity,
          reserved_quantity,
          product:lats_products(id, name, sku)
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error cancelling transfer:', error);
      throw error;
    }

    console.log('✅ Transfer cancelled and stock released:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to cancel transfer:', error);
    throw error;
  }
};

/**
 * Get transfer statistics for a branch
 */
export const getTransferStats = async (branchId: string): Promise<TransferStats> => {
  try {
    console.log('📊 [stockTransferApi] Fetching transfer stats for branch:', branchId);

    const { data, error } = await supabase
      .from('branch_transfers')
      .select('status, quantity')
      .or(`from_branch_id.eq.${branchId},to_branch_id.eq.${branchId}`)
      .eq('transfer_type', 'stock');

    if (error) {
      console.error('❌ Error fetching transfer stats:', error);
      throw error;
    }

    const stats: TransferStats = {
      total: data?.length || 0,
      pending: data?.filter((t: any) => t.status === 'pending').length || 0,
      approved: data?.filter((t: any) => t.status === 'approved').length || 0,
      in_transit: data?.filter((t: any) => t.status === 'in_transit').length || 0,
      completed: data?.filter((t: any) => t.status === 'completed').length || 0,
      rejected: data?.filter((t: any) => t.status === 'rejected').length || 0,
      cancelled: data?.filter((t: any) => t.status === 'cancelled').length || 0,
      total_items: data?.reduce((sum: number, t: any) => sum + (t.quantity || 0), 0) || 0
    };

    console.log('✅ Transfer stats:', stats);
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
      .select('quantity, reserved_quantity')
      .eq('id', variantId)
      .single();

    if (error || !data) {
      return 0;
    }

    return data.quantity - (data.reserved_quantity || 0);
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
    const { data, error } = await supabase
      .from('branch_transfers')
      .select(`
        *,
        from_branch:store_locations!from_branch_id(id, name, code, city),
        to_branch:store_locations!to_branch_id(id, name, code, city)
      `)
      .eq('entity_id', variantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching transfer history:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Failed to get transfer history:', error);
    return [];
  }
};

