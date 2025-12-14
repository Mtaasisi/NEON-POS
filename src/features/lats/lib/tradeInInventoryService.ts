/**
 * Trade-In Inventory Integration Service
 * Handles adding traded-in devices to inventory and tracking repair status
 */

import { supabase } from '../../../lib/supabaseClient';
import type { TradeInTransaction } from '../types/tradeIn';

export interface AddToInventoryParams {
  transaction: TradeInTransaction;
  categoryId?: string;
  locationId?: string;
  needsRepair?: boolean;
  repairNotes?: string;
  resalePrice?: number;
}

/**
 * Get or create "Trade-In Items" category
 */
export const getOrCreateTradeInCategory = async (): Promise<string> => {
  try {
    const activeBranchId = localStorage.getItem('current_branch_id');
    
    // Try to find existing "Trade-In Items" category (check all branches first)
    const { data: existingCategory } = await supabase
      .from('lats_categories')
      .select('id')
      .eq('name', 'Trade-In Items')
      .maybeSingle();

    if (existingCategory) {
      console.log('✅ Found existing Trade-In category:', existingCategory.id);
      return existingCategory.id;
    }

    // Try to create new category
    const { data: newCategory, error } = await supabase
      .from('lats_categories')
      .insert({
        name: 'Trade-In Items',
        description: 'Devices acquired through trade-in transactions',
        branch_id: activeBranchId,
        is_active: true,
      })
      .select('id')
      .single();

    if (!error && newCategory) {
      console.log('✅ Created new Trade-In category:', newCategory.id);
      return newCategory.id;
    }

    console.warn('⚠️ Failed to create Trade-In category, using fallback:', error);
    
    // Fall back to any existing category
    const { data: fallbackCategory } = await supabase
      .from('lats_categories')
      .select('id')
      .limit(1)
      .single();
      
    if (fallbackCategory) {
      console.log('✅ Using fallback category:', fallbackCategory.id);
      return fallbackCategory.id;
    }

    // Last resort: Use "Uncategorized" if it exists or return error
    throw new Error('No categories available in database');
  } catch (error) {
    console.error('❌ Error in getOrCreateTradeInCategory:', error);
    
    // Final fallback: try to get ANY category
    try {
      const { data: anyCategory } = await supabase
        .from('lats_categories')
        .select('id')
        .limit(1)
        .single();
      
      if (anyCategory) {
        console.log('⚠️ Using emergency fallback category:', anyCategory.id);
        return anyCategory.id;
      }
    } catch (finalError) {
      console.error('❌ Cannot get any category:', finalError);
    }
    
    throw new Error('Failed to get or create category for trade-in');
  }
};

/**
 * Add traded-in device to inventory
 * 
 * Role-based permissions:
 * - Admin: Can add trade-ins at ANY status (pending, approved, completed)
 * - Non-admin (e.g., Customer Care): Can only add completed or approved trade-ins
 * 
 * When adding a trade-in to inventory:
 * - 'pending' or 'approved' status → automatically marked as 'completed'
 * - Creates product and variant with IMEI tracking
 * - Creates stock movement record
 * - Links customer as supplier for resale tracking
 */
export const addTradeInDeviceToInventory = async (params: AddToInventoryParams) => {
  const {
    transaction,
    categoryId,
    locationId,
    needsRepair = false,
    repairNotes,
    resalePrice,
  } = params;

  try {
    const { data: userData } = await supabase.auth.getUser();
    const activeBranchId = localStorage.getItem('current_branch_id') || transaction.branch_id;

    // Get current user's role to determine permissions
    let userRole = null;
    if (userData?.user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .single();
      userRole = profile?.role;
    }
    
    const isAdmin = userRole === 'admin';

    // ✅ Role-based validation:
    // - Admin: Can add trade-ins at any status (full control)
    // - Non-admin: Only completed or approved transactions
    if (!isAdmin && transaction.status !== 'completed' && transaction.status !== 'approved') {
      console.error('❌ Cannot add non-completed/non-approved trade-in to inventory:', {
        transaction_id: transaction.id,
        transaction_number: transaction.transaction_number,
        current_status: transaction.status,
        user_role: userRole
      });
      throw new Error(`Only completed or approved trade-in transactions can be added to inventory. Current status: ${transaction.status}. Please complete the transaction first in Trade-In Management.`);
    }
    
    if (isAdmin && transaction.status === 'pending') {
      console.log('✅ [ADMIN] Adding pending trade-in to inventory (admin override)');
    }

    // ✅ Check for duplicate IMEI
    if (transaction.device_imei) {
      const { data: existingIMEI } = await supabase
        .from('lats_product_variants')
        .select('id, product_id, variant_attributes')
        .filter("variant_attributes->>'imei'", 'eq', transaction.device_imei)
        .maybeSingle();
      
      if (existingIMEI) {
        console.warn('⚠️ Duplicate IMEI detected:', transaction.device_imei);
        throw new Error(`Device with IMEI ${transaction.device_imei} already exists in inventory. Cannot add duplicate devices.`);
      }
    }

    // Create product name based on device model (not unique per device)
    const productName = `${transaction.device_name} - ${transaction.device_model} (Trade-In)`;
    const variantSku = `TI-${Date.now()}-${transaction.device_imei || 'NOIMEI'}`;

    // Get customer name for supplier display
    const customerName = transaction.customer?.name || 
                        `${transaction.customer?.first_name || ''} ${transaction.customer?.last_name || ''}`.trim() ||
                        'Trade-In Customer';
    
    // Step 1: Create or get supplier entry for customer
    // Use customer name as "supplier" for trade-in devices
    let supplierId = null;
    try {
      // Check if supplier exists with this customer name
      const { data: existingSupplier } = await supabase
        .from('lats_suppliers')
        .select('id')
        .eq('name', `Trade-In: ${customerName}`)
        .maybeSingle();
      
      if (existingSupplier) {
        supplierId = existingSupplier.id;
      } else {
        // Create new supplier entry for this customer
        // Mark as trade-in customer so they don't appear in supplier management pages
        const { data: newSupplier } = await supabase
          .from('lats_suppliers')
          .insert({
            name: `Trade-In: ${customerName}`,
            contact_person: customerName,
            phone: transaction.customer?.phone || transaction.customer?.mobile,
            email: transaction.customer?.email,
            is_active: true,
            is_trade_in_customer: true, // Flag to exclude from supplier lists
          })
          .select('id')
          .single();
        
        supplierId = newSupplier?.id;
      }
    } catch (supplierError) {
      console.warn('⚠️ Could not create supplier entry for customer:', supplierError);
    }
    
    // Step 2: Check if a product already exists for this device model
    // This prevents duplicate products in the POS
    const { data: existingProduct } = await supabase
      .from('lats_products')
      .select('id, name, stock_quantity')
      .eq('name', productName)
      .eq('branch_id', activeBranchId)
      .maybeSingle();
    
    let product: any;
    
    if (existingProduct) {
      // Product already exists - we'll add a new variant to it
      console.log('✅ Found existing product for this device model:', existingProduct.id);
      product = existingProduct;
      
      // Update stock quantity (increment by 1)
      await supabase
        .from('lats_products')
        .update({ 
          stock_quantity: (existingProduct.stock_quantity || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProduct.id);
    } else {
      // Create new product for this device model
      console.log('✅ Creating new product for device model:', productName);
      const { data: newProduct, error: productError } = await supabase
        .from('lats_products')
        .insert({
          name: productName,
          description: `Trade-in devices - ${transaction.device_name} ${transaction.device_model}`,
          sku: `TI-${transaction.device_name}-${transaction.device_model}`.replace(/\s+/g, '-'),
          category_id: categoryId,
          branch_id: activeBranchId,
          supplier_id: supplierId,
          cost_price: transaction.final_trade_in_value,
          selling_price: resalePrice || transaction.final_trade_in_value * 1.2,
          stock_quantity: 1,
          min_stock_level: 0, // Don't reorder trade-ins
          is_active: !needsRepair, // Only active if doesn't need repair
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (productError) throw productError;
      product = newProduct;
    }

    // Step 3: Check if a parent variant exists for this product
    // If the product has variants, try to find a matching parent to link to
    let parentVariantId: string | null = null;
    
    if (transaction.device_imei) {
      // Look for an existing parent variant that matches the model/specs
      const { data: existingParents } = await supabase
        .from('lats_product_variants')
        .select('id, variant_name, is_parent, variant_type')
        .eq('product_id', product.id)
        .or('is_parent.eq.true,variant_type.eq.parent')
        .is('parent_variant_id', null)
        .limit(1);
      
      // If a parent exists, we'll link to it
      if (existingParents && existingParents.length > 0) {
        parentVariantId = existingParents[0].id;
        console.log(`✅ Found existing parent variant to link trade-in device to: ${parentVariantId}`);
      }
    }
    
    // Step 4: Create a variant with the IMEI and customer info
    // If linked to parent, create as child; otherwise create as standalone
    const variantData: any = {
      product_id: product.id,
      variant_name: transaction.device_imei ? `IMEI: ${transaction.device_imei}` : `Unit ${Date.now()}`,
      sku: variantSku,
      cost_price: transaction.final_trade_in_value,
      selling_price: resalePrice || transaction.final_trade_in_value * 1.2,
      quantity: 1, // Each variant has 1 unit
      is_active: !needsRepair,
      variant_attributes: {
        imei: transaction.device_imei,
        serial_number: transaction.device_serial_number,
        condition: transaction.condition_rating,
        trade_in_transaction: transaction.id,
        transaction_number: transaction.transaction_number,
        original_owner: transaction.customer_id,
        customer_name: customerName,
        customer_phone: transaction.customer?.phone || transaction.customer?.mobile,
        damage_items: transaction.damage_items,
        source: 'trade-in',
      },
      branch_id: activeBranchId,
    };
    
    // If we have a parent variant and an IMEI, create as child
    if (parentVariantId && transaction.device_imei) {
      variantData.parent_variant_id = parentVariantId;
      variantData.variant_type = 'imei_child';
      variantData.is_parent = false;
      console.log(`✅ Creating trade-in device as child variant under parent ${parentVariantId}`);
    }
    
    const { data: variant, error: variantError } = await supabase
      .from('lats_product_variants')
      .insert(variantData)
      .select()
      .single();

    if (variantError) throw variantError;

    // Step 5: Update trade-in transaction with product reference
    // If transaction was 'approved' or 'pending' (admin override), mark it as 'completed' now
    const updateData: any = {
      new_product_id: product.id,
      new_variant_id: variant.id,
      needs_repair: needsRepair,
      repair_status: needsRepair ? 'pending' : 'completed',
      ready_for_resale: !needsRepair,
      resale_price: resalePrice || transaction.final_trade_in_value * 1.2,
    };
    
    // If status is 'approved' or 'pending', mark as 'completed' since it's now added to inventory
    if (transaction.status === 'approved' || transaction.status === 'pending') {
      updateData.status = 'completed';
      updateData.completed_at = new Date().toISOString();
      console.log(`✅ Marking ${transaction.status} transaction as completed after adding to inventory`);
    }
    
    const { error: updateError } = await supabase
      .from('lats_trade_in_transactions')
      .update(updateData)
      .eq('id', transaction.id);

    if (updateError) {
      console.warn('⚠️ Could not update trade-in transaction with product link:', updateError);
      // Don't fail the entire operation if this update fails
    }

    // Step 6: Create stock movement record
    try {
      await supabase.from('lats_stock_movements').insert({
        product_id: product.id,
        variant_id: variant.id,
        branch_id: activeBranchId,
        movement_type: 'trade_in',
        quantity: 1,
        reference_type: 'trade_in_transaction',
        reference_id: transaction.id,
        notes: `Trade-in from customer: ${transaction.customer?.name || 'Unknown'}`,
        created_by: userData?.user?.id,
      });
    } catch (movementError) {
      console.warn('⚠️ Could not create stock movement record:', movementError);
      // Don't fail if stock movement fails
    }

    return {
      success: true,
      data: {
        product,
        variant,
      },
    };
  } catch (error) {
    console.error('Error adding trade-in device to inventory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add device to inventory',
    };
  }
};

/**
 * Update repair status of traded-in device
 */
export const updateTradeInRepairStatus = async (
  transactionId: string,
  status: 'pending' | 'in_repair' | 'completed',
  repairCost?: number,
  repairNotes?: string
) => {
  try {
    const updates: any = {
      repair_status: status,
    };

    if (repairCost !== undefined) {
      updates.repair_cost = repairCost;
    }

    if (status === 'completed') {
      updates.ready_for_resale = true;
      
      // Get the transaction to update inventory
      const { data: transaction } = await supabase
        .from('lats_trade_in_transactions')
        .select('inventory_item_id, resale_price, final_trade_in_value')
        .eq('id', transactionId)
        .single();

      if (transaction?.inventory_item_id) {
        // Update inventory item status
        await supabase
          .from('lats_inventory_items')
          .update({
            status: 'available',
            notes: `Repair completed. ${repairNotes || ''}`,
          })
          .eq('id', transaction.inventory_item_id);

        // Update product/variant to be active
        const { data: inventoryItem } = await supabase
          .from('lats_inventory_items')
          .select('product_id, variant_id')
          .eq('id', transaction.inventory_item_id)
          .single();

        if (inventoryItem) {
          await supabase
            .from('lats_products')
            .update({ is_active: true })
            .eq('id', inventoryItem.product_id);

          await supabase
            .from('lats_product_variants')
            .update({ is_active: true })
            .eq('id', inventoryItem.variant_id);
        }

        // Adjust resale price if repair cost is significant
        if (repairCost && transaction.final_trade_in_value) {
          const totalCost = transaction.final_trade_in_value + repairCost;
          const newResalePrice = totalCost * 1.3; // 30% markup after repair
          
          updates.resale_price = newResalePrice;

          // Update product selling price
          if (inventoryItem) {
            await supabase
              .from('lats_products')
              .update({ selling_price: newResalePrice })
              .eq('id', inventoryItem.product_id);

            await supabase
              .from('lats_product_variants')
              .update({ selling_price: newResalePrice })
              .eq('id', inventoryItem.variant_id);
          }
        }
      }
    }

    const { data, error } = await supabase
      .from('lats_trade_in_transactions')
      .update(updates)
      .eq('id', transactionId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating repair status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update repair status',
    };
  }
};

/**
 * Mark device as ready for resale
 */
export const markDeviceReadyForResale = async (
  transactionId: string,
  resalePrice: number
) => {
  try {
    // Update transaction
    const { error: transactionError } = await supabase
      .from('lats_trade_in_transactions')
      .update({
        ready_for_resale: true,
        resale_price: resalePrice,
      })
      .eq('id', transactionId);

    if (transactionError) throw transactionError;

    // Get inventory item
    const { data: transaction } = await supabase
      .from('lats_trade_in_transactions')
      .select('inventory_item_id')
      .eq('id', transactionId)
      .single();

    if (transaction?.inventory_item_id) {
      // Get product and variant IDs
      const { data: inventoryItem } = await supabase
        .from('lats_inventory_items')
        .select('product_id, variant_id')
        .eq('id', transaction.inventory_item_id)
        .single();

      if (inventoryItem) {
        // Update product
        await supabase
          .from('lats_products')
          .update({
            selling_price: resalePrice,
            is_active: true,
          })
          .eq('id', inventoryItem.product_id);

        // Update variant
        await supabase
          .from('lats_product_variants')
          .update({
            selling_price: resalePrice,
            is_active: true,
          })
          .eq('id', inventoryItem.variant_id);

        // Update inventory item
        await supabase
          .from('lats_inventory_items')
          .update({ status: 'available' })
          .eq('id', transaction.inventory_item_id);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking device ready for resale:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark device ready for resale',
    };
  }
};

/**
 * Get all traded-in devices in inventory
 */
export const getTradeInDevicesInInventory = async (filters?: {
  needsRepair?: boolean;
  readyForResale?: boolean;
  branchId?: string;
}) => {
  try {
    let query = supabase
      .from('lats_trade_in_transactions')
      .select(`
        *,
        customer:lats_customers(id, name, phone),
        inventory_item:lats_inventory_items(
          *,
          product:lats_products(id, name, sku, selling_price),
          variant:lats_product_variants(id, variant_name, selling_price)
        )
      `)
      .not('inventory_item_id', 'is', null)
      .order('created_at', { ascending: false });

    if (filters?.needsRepair !== undefined) {
      query = query.eq('needs_repair', filters.needsRepair);
    }

    if (filters?.readyForResale !== undefined) {
      query = query.eq('ready_for_resale', filters.readyForResale);
    }

    if (filters?.branchId) {
      query = query.eq('branch_id', filters.branchId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching trade-in devices:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch devices',
    };
  }
};

