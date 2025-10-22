/**
 * Trade-In Inventory Integration Service
 * Handles adding traded-in devices to inventory and tracking repair status
 */

import { supabase } from '../../../lib/supabase';
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
    const activeBranchId = localStorage.getItem('activeBranchId') || '00000000-0000-0000-0000-000000000001';
    
    // Try to find existing "Trade-In Items" category
    const { data: existingCategory } = await supabase
      .from('lats_categories')
      .select('id')
      .eq('name', 'Trade-In Items')
      .eq('branch_id', activeBranchId)
      .maybeSingle();

    if (existingCategory) {
      return existingCategory.id;
    }

    // Create new category if it doesn't exist
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

    if (error) {
      console.error('Error creating Trade-In category:', error);
      // Fall back to first available category
      const { data: fallbackCategory } = await supabase
        .from('lats_categories')
        .select('id')
        .limit(1)
        .single();
      
      return fallbackCategory?.id || '00000000-0000-0000-0000-000000000001';
    }

    return newCategory.id;
  } catch (error) {
    console.error('Error in getOrCreateTradeInCategory:', error);
    return '00000000-0000-0000-0000-000000000001'; // Fallback
  }
};

/**
 * Add traded-in device to inventory
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
    const activeBranchId = localStorage.getItem('activeBranchId') || '00000000-0000-0000-0000-000000000001';

    // Create product name
    const productName = `${transaction.device_name} - ${transaction.device_model} (Trade-In)`;
    const sku = `TI-${transaction.device_imei || Date.now()}`;

    // Step 1: Create the product
    const { data: product, error: productError } = await supabase
      .from('lats_products')
      .insert({
        name: productName,
        description: `Trade-in device - ${transaction.condition_rating} condition. ${transaction.condition_description || ''}`,
        sku: sku,
        category_id: categoryId,
        branch_id: activeBranchId,
        cost_price: transaction.final_trade_in_value, // What we paid for it
        selling_price: resalePrice || transaction.final_trade_in_value * 1.2, // 20% markup by default
        stock_quantity: 1,
        is_active: !needsRepair, // Only active if doesn't need repair
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (productError) throw productError;

    // Step 2: Create a variant with the IMEI
    const { data: variant, error: variantError } = await supabase
      .from('lats_product_variants')
      .insert({
        product_id: product.id,
        variant_name: transaction.device_imei ? `IMEI: ${transaction.device_imei}` : 'Default',
        sku: sku,
        cost_price: transaction.final_trade_in_value,
        selling_price: resalePrice || transaction.final_trade_in_value * 1.2,
        stock_quantity: 1,
        is_active: !needsRepair,
        variant_attributes: {
          imei: transaction.device_imei,
          serial_number: transaction.device_serial_number,
          condition: transaction.condition_rating,
          trade_in_transaction: transaction.id,
          original_owner: transaction.customer_id,
          damage_items: transaction.damage_items,
        },
      })
      .select()
      .single();

    if (variantError) throw variantError;

    // Step 3: Create inventory item record
    const { data: inventoryItem, error: inventoryError } = await supabase
      .from('lats_inventory_items')
      .insert({
        product_id: product.id,
        variant_id: variant.id,
        branch_id: activeBranchId,
        quantity: 1,
        location_id: locationId,
        status: needsRepair ? 'needs_repair' : 'available',
        notes: needsRepair ? repairNotes : 'Trade-in device ready for sale',
        created_by: userData?.user?.id,
      })
      .select()
      .single();

    if (inventoryError) throw inventoryError;

    // Step 4: Update trade-in transaction with inventory references
    const { error: updateError } = await supabase
      .from('lats_trade_in_transactions')
      .update({
        inventory_item_id: inventoryItem.id,
        needs_repair: needsRepair,
        repair_status: needsRepair ? 'pending' : 'completed',
        ready_for_resale: !needsRepair,
        resale_price: resalePrice || transaction.final_trade_in_value * 1.2,
      })
      .eq('id', transaction.id);

    if (updateError) throw updateError;

    // Step 5: Create stock movement record
    await supabase.from('lats_stock_movements').insert({
      product_id: product.id,
      variant_id: variant.id,
      branch_id: activeBranchId,
      movement_type: 'trade_in',
      quantity: 1,
      reference_type: 'trade_in_transaction',
      reference_id: transaction.id,
      notes: `Trade-in from customer: ${transaction.customer?.name}`,
      created_by: userData?.user?.id,
    });

    return {
      success: true,
      data: {
        product,
        variant,
        inventoryItem,
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

