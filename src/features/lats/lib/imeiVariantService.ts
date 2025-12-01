/**
 * IMEI Variant Service - Parent-Child System
 * ==========================================
 * NEW ARCHITECTURE:
 * - Parent Variants: Represent product attributes (e.g., "128GB", "Black")
 * - Child Variants: Individual items with unique IMEI numbers
 * 
 * Example:
 *   Product: iPhone 6
 *   └── Parent Variant: "128GB" (Stock: 5)
 *       ├── Child: IMEI 123456789012345
 *       ├── Child: IMEI 234567890123456
 *       ├── Child: IMEI 345678901234567
 *       ├── Child: IMEI 456789012345678
 *       └── Child: IMEI 567890123456789
 */

import { supabase } from '../../../lib/supabaseClient';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface IMEIVariantData {
  imei: string;
  serial_number?: string;
  mac_address?: string;
  condition?: string;
  cost_price: number;
  selling_price: number;
  location?: string;
  warranty_start?: string;
  warranty_end?: string;
  notes?: string;
  source?: 'purchase' | 'trade-in' | 'transfer' | 'other';
}

export interface CreateIMEIVariantParams {
  product_id: string;
  product_name: string;
  branch_id: string;
  variants: IMEIVariantData[];
  parent_variant_id?: string; // Parent variant to add IMEIs to
}

export interface ParentVariant {
  id: string;
  product_id: string;
  variant_name: string;
  name: string;
  sku: string;
  cost_price: number;
  selling_price: number;
  quantity: number; // Auto-calculated from children
  available_imeis: number;
  is_parent: boolean;
  variant_type: 'parent' | 'standard';
  variant_attributes: any;
  branch_id: string;
}

export interface ChildIMEIVariant {
  id: string;
  parent_variant_id: string;
  product_id: string;
  imei: string;
  serial_number?: string;
  mac_address?: string;
  condition: string;
  cost_price: number;
  selling_price: number;
  quantity: number;
  is_active: boolean;
  created_at: string;
  variant_attributes: any;
}

// ============================================
// PARENT VARIANT FUNCTIONS
// ============================================

/**
 * Get all parent variants for a product (used in PO creation)
 * These are the variants users select, not individual IMEIs
 */
export const getParentVariantsForProduct = async (
  product_id: string
): Promise<ParentVariant[]> => {
  try {
    const { data, error } = await supabase.rpc('get_parent_variants', {
      product_id_param: product_id,
    });

    if (error) throw error;
    return (data || []) as ParentVariant[];
  } catch (error) {
    console.error('Error getting parent variants:', error);
    
    // Fallback to direct query if RPC not available
    try {
      const { data, error: fallbackError } = await supabase
        .from('lats_product_variants')
        .select('*')
        .eq('product_id', product_id)
        .eq('is_active', true)
        .in('variant_type', ['parent', 'standard'])
        .order('created_at', { ascending: true });

      if (fallbackError) throw fallbackError;
      return (data || []) as ParentVariant[];
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      return [];
    }
  }
};

/**
 * Create a parent variant (e.g., "128GB", "Black", etc.)
 * This is done when creating a product with variants
 */
export const createParentVariant = async (params: {
  product_id: string;
  variant_name: string;
  sku?: string;
  cost_price?: number;
  selling_price?: number;
  attributes?: any;
  branch_id?: string;
}) => {
  try {
    const timestamp = Date.now().toString(36);
    const generatedSKU = params.sku || `VAR-${timestamp}`;

    const { data, error } = await supabase
      .from('lats_product_variants')
      .insert({
        product_id: params.product_id,
        variant_name: params.variant_name,
        sku: generatedSKU,
        cost_price: params.cost_price || 0,
        selling_price: params.selling_price || 0,
        quantity: 0, // Will be calculated from children
        is_active: true,
        is_parent: true,
        variant_type: 'parent',
        variant_attributes: params.attributes || {},
        branch_id: params.branch_id,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error creating parent variant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create parent variant',
    };
  }
};

/**
 * Convert existing standard variant to parent variant
 * Used when first IMEI is added to a standard variant
 */
export const convertToParentVariant = async (variant_id: string) => {
  try {
    const { error } = await supabase
      .from('lats_product_variants')
      .update({
        is_parent: true,
        variant_type: 'parent',
        updated_at: new Date().toISOString(),
      })
      .eq('id', variant_id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error converting to parent variant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert variant',
    };
  }
};

// ============================================
// IMEI (CHILD) VARIANT FUNCTIONS
// ============================================

/**
 * Check if IMEI already exists in system
 */
export const checkIMEIExists = async (imei: string): Promise<boolean> => {
  try {
    // ✅ FIX: Use RPC function if available (most reliable)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('imei_exists', {
        check_imei: imei
      });
      
      if (!rpcError && typeof rpcData === 'boolean') {
        return rpcData;
      }
    } catch (rpcErr) {
      // RPC function might not exist, fall back to direct query
    }

    // ✅ FIX: Query IMEI children and filter in memory to avoid SQL syntax issues
    // This is more reliable than using .filter() with JSONB operators which can cause SQL syntax errors
    const { data, error } = await supabase
      .from('lats_product_variants')
      .select('id, variant_attributes')
      .eq('variant_type', 'imei_child')
      .eq('is_active', true)
      .limit(1000); // Reasonable limit for IMEI check

    if (error) {
      console.error('Error checking IMEI:', error);
      return false;
    }

    // Filter in memory to find matching IMEI
    const matching = (data || []).find((variant: any) => {
      const variantImei = variant.variant_attributes?.imei || 
                         variant.variant_attributes?.['imei'] ||
                         variant.attributes?.imei;
      return variantImei === imei;
    });

    return !!matching;
  } catch (error) {
    console.error('Error checking IMEI:', error);
    return false;
  }
};

/**
 * Add IMEI to parent variant (MAIN FUNCTION FOR RECEIVING STOCK)
 * This is called when receiving a PO with IMEI numbers
 */
export const addIMEIToParentVariant = async (
  parent_variant_id: string,
  imeiData: IMEIVariantData
) => {
  // 🔧 DEBUG: Log function entry
  console.log('🔧 [DEBUG] addIMEIToParentVariant called');
  console.log('📥 [DEBUG] Input:', {
    parent_variant_id,
    imei: imeiData.imei,
    serial_number: imeiData.serial_number,
    cost_price: imeiData.cost_price,
    selling_price: imeiData.selling_price,
    condition: imeiData.condition || 'new',
  });

  try {
    // 🔧 DEBUG: Prepare RPC call
    console.log('⏳ [DEBUG] Step 1: Preparing Supabase RPC call...');
    
    // ✅ FIX: Always send all parameters with proper types to avoid Supabase RPC type resolution issues
    // Ensure numeric types are always numbers (not undefined/null) so Supabase can resolve the function signature
    // Build params object explicitly to avoid any undefined values
    const rpcParams: Record<string, any> = {
      parent_variant_id_param: parent_variant_id,
      imei_param: imeiData.imei || '',
    };
    
    // ✅ UNIFIED: Serial number and IMEI are the same - always use IMEI value
    // Serial number is TEXT type and accepts any text value (no numeric validation)
    // This ensures they are stored in a single field with the same relationship
    rpcParams.serial_number_param = String(imeiData.imei || '');  // Explicitly convert to string/text
    
    if (imeiData.mac_address != null && imeiData.mac_address !== '') {
      rpcParams.mac_address_param = imeiData.mac_address;
    }
    
    // Always include numeric parameters with explicit defaults
    rpcParams.cost_price_param = (typeof imeiData.cost_price === 'number' && !isNaN(imeiData.cost_price)) 
      ? imeiData.cost_price 
      : 0;
    
    rpcParams.selling_price_param = (typeof imeiData.selling_price === 'number' && !isNaN(imeiData.selling_price)) 
      ? imeiData.selling_price 
      : 0; // Always a number, never undefined
    
    rpcParams.condition_param = imeiData.condition || 'new';
    
    if (imeiData.notes != null && imeiData.notes !== '') {
      rpcParams.notes_param = imeiData.notes;
    }
    
    // ✅ CRITICAL: Final validation - ensure all numeric params are actually numbers
    // This prevents Supabase from seeing 'unknown' type
    if (typeof rpcParams.cost_price_param !== 'number') {
      rpcParams.cost_price_param = 0;
    }
    if (typeof rpcParams.selling_price_param !== 'number') {
      rpcParams.selling_price_param = 0;
    }
    
    console.log('📤 [DEBUG] RPC Parameters:', rpcParams);
    console.log('📤 [DEBUG] Parameter types:', {
      cost_price_type: typeof rpcParams.cost_price_param,
      selling_price_type: typeof rpcParams.selling_price_param,
      cost_price_value: rpcParams.cost_price_param,
      selling_price_value: rpcParams.selling_price_param,
    });

    // Use database function for atomic operation
    console.log('⏳ [DEBUG] Step 2: Calling supabase.rpc(add_imei_to_parent_variant)...');
    const { data, error } = await supabase.rpc('add_imei_to_parent_variant', rpcParams);

    // 🔧 DEBUG: Log RPC response
    console.log('📨 [DEBUG] Step 3: RPC Response received');
    console.log('   - Data:', data);
    console.log('   - Error:', error);

    if (error) {
      console.error('❌ [DEBUG] RPC Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    const result = data?.[0];
    console.log('⏳ [DEBUG] Step 4: Processing result:', result);

    if (!result?.success) {
      console.error('❌ [DEBUG] Function returned failure:', {
        success: result?.success,
        error_message: result?.error_message,
        child_variant_id: result?.child_variant_id,
      });
      throw new Error(result?.error_message || 'Failed to add IMEI');
    }

    console.log('✅ [DEBUG] Success! Child variant created:', result.child_variant_id);
    console.log('✅ [DEBUG] IMEI added successfully:', imeiData.imei);

    return {
      success: true,
      child_variant_id: result.child_variant_id,
      imei: imeiData.imei,
    };
  } catch (error) {
    console.error('❌ [DEBUG] Exception caught in addIMEIToParentVariant:');
    console.error('   - Error type:', error?.constructor?.name);
    console.error('   - Error message:', error instanceof Error ? error.message : String(error));
    console.error('   - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('   - Full error object:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add IMEI',
    };
  }
};

/**
 * Add multiple IMEIs to parent variant (bulk operation)
 * Used when receiving multiple units in a PO
 */
export const addIMEIsToParentVariant = async (
  parent_variant_id: string,
  imeis: IMEIVariantData[]
) => {
  // 🔧 DEBUG: Log bulk operation start
  console.log('🔧 [DEBUG] ═══════════════════════════════════════════════');
  console.log('🔧 [DEBUG] addIMEIsToParentVariant (BULK) started');
  console.log('🔧 [DEBUG] ═══════════════════════════════════════════════');
  console.log('📥 [DEBUG] Parent Variant ID:', parent_variant_id);
  console.log('📥 [DEBUG] Total IMEIs to process:', imeis.length);
  console.log('📥 [DEBUG] IMEI list:', imeis.map(i => i.imei).join(', '));
  console.log('');

  const results = [];
  const errors = [];
  let processedCount = 0;

  for (const imeiData of imeis) {
    processedCount++;
    console.log(`⏳ [DEBUG] Processing IMEI ${processedCount}/${imeis.length}: ${imeiData.imei}`);
    console.log('');

    const result = await addIMEIToParentVariant(parent_variant_id, imeiData);
    
    if (result.success) {
      console.log(`✅ [DEBUG] IMEI ${processedCount} succeeded: ${imeiData.imei}`);
      results.push(result);
    } else {
      console.error(`❌ [DEBUG] IMEI ${processedCount} failed: ${imeiData.imei}`);
      console.error(`   Error: ${result.error}`);
      errors.push({
        imei: imeiData.imei,
        error: result.error,
      });
    }
    
    console.log('');
  }

  console.log('🔧 [DEBUG] ═══════════════════════════════════════════════');
  console.log('🔧 [DEBUG] BULK OPERATION COMPLETE');
  console.log('🔧 [DEBUG] ═══════════════════════════════════════════════');
  console.log(`📊 [DEBUG] Results Summary:`);
  console.log(`   ✅ Successful: ${results.length}`);
  console.log(`   ❌ Failed: ${errors.length}`);
  console.log(`   📈 Success Rate: ${((results.length / imeis.length) * 100).toFixed(1)}%`);
  
  if (errors.length > 0) {
    console.error(`❌ [DEBUG] Failed IMEIs:`, errors);
  }
  
  console.log('🔧 [DEBUG] ═══════════════════════════════════════════════');
  console.log('');

  return {
    success: errors.length === 0,
    created: results.length,
    failed: errors.length,
    data: results,
    errors,
  };
};

/**
 * Get all child IMEIs for a parent variant
 * ✅ FIX: Also includes legacy inventory_items for the same product
 */
export const getChildIMEIs = async (
  parent_variant_id: string
): Promise<ChildIMEIVariant[]> => {
  try {
    // ✅ FIX: Get parent variant price for fallback
    const { data: parentVariant } = await supabase
      .from('lats_product_variants')
      .select('selling_price')
      .eq('id', parent_variant_id)
      .single();
    
    const parentPrice = parentVariant?.selling_price || 0;

    // ✅ FIX: Use loadChildIMEIs which includes legacy inventory items
    const { loadChildIMEIs } = await import('./variantHelpers');
    const allChildren = await loadChildIMEIs(parent_variant_id);

    return allChildren.map((child: any) => {
      // ✅ FIX: Use parent variant's price as fallback if child doesn't have a price
      const childPrice = child.selling_price || child.sellingPrice || child.price;
      const finalPrice = childPrice && childPrice > 0 ? childPrice : parentPrice;
      
      return {
        id: child.id,
        parent_variant_id,
        product_id: child.product_id || '',
        imei: child.variant_attributes?.imei || '',
        serial_number: child.variant_attributes?.serial_number || '',
        condition: child.variant_attributes?.condition || 'new',
        cost_price: child.cost_price || 0,
        selling_price: finalPrice,
        quantity: child.quantity || 0,
        is_active: child.is_active !== false,
        created_at: child.created_at,
        variant_attributes: child.variant_attributes || {},
        is_legacy: child.is_legacy || false,
      };
    });
  } catch (error) {
    console.error('Error getting child IMEIs:', error);
    return [];
  }
};

/**
 * Get available IMEIs for POS (only active/unsold items)
 */
export const getAvailableIMEIsForPOS = async (
  parent_variant_id: string
): Promise<ChildIMEIVariant[]> => {
  try {
    // ✅ FIX: Get parent variant price for fallback
    const { data: parentVariant } = await supabase
      .from('lats_product_variants')
      .select('selling_price')
      .eq('id', parent_variant_id)
      .single();
    
    const parentPrice = parentVariant?.selling_price || 0;

    // ✅ FIX: Use loadAvailableChildIMEIs which includes legacy inventory items
    const { loadAvailableChildIMEIs } = await import('./variantHelpers');
    const allChildren = await loadAvailableChildIMEIs(parent_variant_id);

    return allChildren.map((child: any) => {
      // ✅ FIX: Use parent variant's price as fallback if child doesn't have a price
      const childPrice = child.selling_price || child.sellingPrice || child.price;
      const finalPrice = childPrice && childPrice > 0 ? childPrice : parentPrice;
      
      return {
        id: child.id,
        parent_variant_id,
        product_id: child.product_id || '',
        imei: child.variant_attributes?.imei || '',
        serial_number: child.variant_attributes?.serial_number || '',
        condition: child.variant_attributes?.condition || 'new',
        cost_price: child.cost_price || 0,
        selling_price: finalPrice,
        quantity: child.quantity || 0,
        is_active: child.is_active !== false,
        created_at: child.created_at,
        variant_attributes: child.variant_attributes || {},
        is_legacy: child.is_legacy || false,
      };
    });
  } catch (error) {
    console.error('Error getting available IMEIs for POS:', error);
    return [];
  }
};

/**
 * Mark IMEI as sold (called when item is sold in POS)
 */
export const markIMEIAsSold = async (
  child_variant_id: string,
  sale_id?: string
) => {
  try {
    // ✅ FIX: Check if this is a legacy item (inventory_items) or IMEI child (lats_product_variants)
    // First, try to find it in lats_product_variants
    const { data: variantData, error: variantError } = await supabase
      .from('lats_product_variants')
      .select('id')
      .eq('id', child_variant_id)
      .single();

    // If not found in variants, check if it's a legacy inventory item
    if (variantError || !variantData) {
      // ✅ FIX: Handle legacy inventory_items
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('id, status, product_id, variant_id, metadata')
        .eq('id', child_variant_id)
        .single();

      if (inventoryItem) {
        // Mark legacy item as sold
        // Note: inventory_items table doesn't have sold_at or sale_id columns, so we store them in metadata
        const updatedMetadata = {
          ...(inventoryItem.metadata || {}),
          sold_at: new Date().toISOString(),
          ...(sale_id ? { sale_id: sale_id } : {}),
        };

        const { error: updateError } = await supabase
          .from('inventory_items')
          .update({
            status: 'sold',
            metadata: updatedMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq('id', child_variant_id);

        if (updateError) throw updateError;

        // Create stock movement for legacy item
        // ✅ FIX: Verify variant_id exists in lats_product_variants before using it
        // For legacy items, variant_id might not exist in lats_product_variants
        if (inventoryItem.id) {
          let validVariantId = null;
          if (inventoryItem.variant_id) {
            // Check if variant exists in lats_product_variants
            const { data: variantCheck } = await supabase
              .from('lats_product_variants')
              .select('id')
              .eq('id', inventoryItem.variant_id)
              .maybeSingle();
            
            validVariantId = variantCheck ? inventoryItem.variant_id : null;
          }

          const { error: movementError } = await supabase
            .from('lats_stock_movements')
            .insert({
              product_id: inventoryItem.product_id || null,
              variant_id: validVariantId, // NULL if variant doesn't exist in lats_product_variants
              movement_type: 'sale',
              quantity: -1,
              reference_type: 'pos_sale',
              reference_id: sale_id || null,
              notes: `Sold legacy item ${child_variant_id}`,
              created_at: new Date().toISOString(),
            });

          if (movementError) {
            console.warn('Failed to create stock movement for legacy item:', movementError);
          }
        }

        return { success: true };
      }

      throw new Error('Item not found in variants or inventory_items');
    }

    // ✅ FIX: Handle IMEI child variant (existing logic)
    // ✅ FIX: Convert undefined to null to prevent PostgreSQL from treating it as a column name
    const { data, error } = await supabase.rpc('mark_imei_as_sold', {
      child_variant_id_param: child_variant_id,
      sale_id_param: sale_id ?? null,
    });

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error marking IMEI as sold:', error);
    
    // Fallback to manual update for variants
    try {
      // Get current variant attributes
      const { data: currentVariant, error: fetchError } = await supabase
        .from('lats_product_variants')
        .select('variant_attributes')
        .eq('id', child_variant_id)
        .single();

      if (fetchError) throw fetchError;

      // Update variant attributes manually using JSONB merge
      const updatedAttributes = {
        ...(currentVariant?.variant_attributes || {}),
        sold_at: new Date().toISOString(),
        ...(sale_id ? { sale_id: sale_id } : {}),
      };

      const { error: updateError } = await supabase
        .from('lats_product_variants')
        .update({
          quantity: 0,
          is_active: false,
          variant_attributes: updatedAttributes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', child_variant_id);

      if (updateError) throw updateError;

      return { success: true };
    } catch (fallbackError) {
      return {
        success: false,
        error:
          fallbackError instanceof Error
            ? fallbackError.message
            : 'Failed to mark as sold',
      };
    }
  }
};

// ============================================
// LEGACY SUPPORT FUNCTIONS
// ============================================

/**
 * Create standalone IMEI variants (legacy support)
 * Use addIMEIToParentVariant instead for new code
 */
export const createIMEIVariants = async (params: CreateIMEIVariantParams) => {
  console.warn('⚠️ createIMEIVariants is deprecated. Use addIMEIsToParentVariant instead.');
  
  const { product_id, variants, branch_id } = params;
  
  if (!params.parent_variant_id) {
    return {
      success: false,
      error: 'parent_variant_id is required. Create a parent variant first.',
    };
  }

  return await addIMEIsToParentVariant(params.parent_variant_id, variants);
};

/**
 * Get variant by IMEI (search across all IMEIs)
 */
export const getVariantByIMEI = async (imei: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('lats_product_variants')
      .select(`
        *,
        parent:lats_product_variants!parent_variant_id(
          id,
          variant_name,
          name,
          sku
        ),
        product:lats_products(
          id,
          name,
          sku
        )
      `)
      .filter("variant_attributes->>'imei'", 'eq', imei)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting variant by IMEI:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting variant by IMEI:', error);
    return null;
  }
};

/**
 * Search IMEI variants across all products
 */
export const searchIMEIVariants = async (
  searchTerm: string,
  branch_id?: string
): Promise<any[]> => {
  console.warn(`🔍 [searchIMEIVariants] FUNCTION CALLED - searchTerm: "${searchTerm}", branch_id: ${branch_id || 'none'}`);
  try {
    const searchLower = searchTerm.toLowerCase().trim();
    const matchingVariants: any[] = [];

    // Search in lats_product_variants (IMEI children)
    // For IMEI/serial number searches, we search across all branches to ensure we find the item
    // Note: We don't filter by quantity > 0 to allow searching for sold/out-of-stock items
    let query = supabase
      .from('lats_product_variants')
      .select(`
        *,
        product_id,
        parent:lats_product_variants!parent_variant_id(
          id,
          variant_name,
          name
        ),
        product:lats_products(
          id,
          name
        )
      `)
      .eq('variant_type', 'imei_child')
      .eq('is_active', true);
      // Removed .gt('quantity', 0) to allow searching for all variants, even if sold out
    
    // Note: Not filtering by branch_id for IMEI searches to ensure we find items across branches
    // The branch filter can be applied at the product level if needed

    const { data: variantData, error: variantError } = await query
      .order('created_at', { ascending: false })
      .limit(500);

    console.warn(`🔍 [searchIMEIVariants] Query result: variantData=${variantData?.length || 0} variants, error=${variantError ? 'yes' : 'no'}`);

    if (variantError) {
      console.error('❌ [searchIMEIVariants] Error fetching IMEI variants:', variantError);
    } else if (variantData) {
      console.warn(`🔍 [searchIMEIVariants] Fetched ${variantData.length} IMEI child variants from database`);
      console.warn(`🔍 [searchIMEIVariants] Searching for: "${searchTerm}"`);
      
      // Debug: Show first few variants' structure
      if (variantData.length > 0 && import.meta.env.DEV) {
        console.warn(`📋 [searchIMEIVariants] Sample variant structure:`, {
          firstVariant: {
            id: variantData[0].id,
            product_id: variantData[0].product_id,
            variant_attributes: variantData[0].variant_attributes,
            variant_type: variantData[0].variant_type,
            is_active: variantData[0].is_active,
            quantity: variantData[0].quantity
          }
        });
      }
      
      // Filter client-side by IMEI or serial number
      variantData.forEach((variant: any) => {
        // Handle variant_attributes that might be a string (JSON) or object
        let variantAttrs = variant.variant_attributes;
        if (typeof variantAttrs === 'string') {
          try {
            variantAttrs = JSON.parse(variantAttrs);
          } catch (e) {
            variantAttrs = {};
          }
        }
        
        const imei = variantAttrs?.imei || variantAttrs?.IMEI || '';
        const serialNumber = variantAttrs?.serial_number || variantAttrs?.serialNumber || variantAttrs?.serial || '';
        const sku = variant.sku || '';
        
        // Debug: Log variants that might match
        if (import.meta.env.DEV && (imei || serialNumber || sku)) {
          const imeiMatch = String(imei).toLowerCase().includes(searchLower);
          const serialMatch = String(serialNumber).toLowerCase().includes(searchLower);
          const skuMatch = String(sku).toLowerCase().includes(searchLower);
          
          if (imeiMatch || serialMatch || skuMatch || 
              String(imei).toLowerCase() === searchLower ||
              String(serialNumber).toLowerCase() === searchLower) {
            console.warn(`✅ [searchIMEIVariants] Found matching variant:`, {
              product_id: variant.product_id,
              imei,
              serial_number: serialNumber,
              sku,
              quantity: variant.quantity,
              is_active: variant.is_active
            });
          }
        }
        
        // Check if search term matches IMEI, serial number, or SKU
        if (
          String(imei).toLowerCase().includes(searchLower) ||
          String(serialNumber).toLowerCase().includes(searchLower) ||
          String(sku).toLowerCase().includes(searchLower) ||
          String(imei).toLowerCase() === searchLower ||
          String(serialNumber).toLowerCase() === searchLower
        ) {
          matchingVariants.push(variant);
        }
      });
      
      if (import.meta.env.DEV) {
        console.warn(`📊 [searchIMEIVariants] Total matching variants found: ${matchingVariants.length}`);
      }
    }

    // Also search in legacy inventory_items table
    let inventoryQuery = supabase
      .from('inventory_items')
      .select(`
        *,
        product:lats_products(
          id,
          name
        ),
        variant:lats_product_variants(
          id,
          product_id
        )
      `)
      .eq('status', 'available')
      .not('serial_number', 'is', null);

    if (branch_id) {
      // Note: inventory_items might not have branch_id, so we'll filter client-side if needed
    }

    const { data: inventoryData, error: inventoryError } = await inventoryQuery
      .limit(500);

    if (inventoryError) {
      console.error('Error fetching inventory items:', inventoryError);
    } else if (inventoryData) {
      // Filter client-side by serial number or IMEI
      inventoryData.forEach((item: any) => {
        const serialNumber = item.serial_number || '';
        const imei = item.imei || '';
        
        if (
          String(serialNumber).toLowerCase().includes(searchLower) ||
          String(imei).toLowerCase().includes(searchLower) ||
          String(serialNumber).toLowerCase() === searchLower ||
          String(imei).toLowerCase() === searchLower
        ) {
          // Convert inventory_item to variant-like format
          const productId = item.product_id || item.variant?.product_id || item.product?.id;
          if (productId) {
            matchingVariants.push({
              id: item.id,
              product_id: productId,
              variant_attributes: {
                imei: imei || serialNumber,
                serial_number: serialNumber || imei
              },
              product: item.product,
              variant_type: 'imei_child',
              // Mark as from inventory_items
              _from_inventory_items: true
            });
          }
        }
      });
    }

    if (import.meta.env.DEV && matchingVariants.length > 0) {
      console.warn(`✅ [searchIMEIVariants] Found ${matchingVariants.length} matching variants for "${searchTerm}"`);
    }

    return matchingVariants.slice(0, 50); // Limit to 50 results
  } catch (error) {
    console.error('Error searching IMEI variants:', error);
    return [];
  }
};

/**
 * Get all available IMEI variants for a product (for POS)
 * Returns flat list of all available IMEIs across all parent variants
 */
export const getAvailableIMEIVariantsForProduct = async (
  product_id: string,
  branch_id?: string
): Promise<any[]> => {
  try {
    let query = supabase
      .from('lats_product_variants')
      .select(`
        *,
        parent:lats_product_variants!parent_variant_id(
          id,
          variant_name,
          name
        )
      `)
      .eq('product_id', product_id)
      .eq('variant_type', 'imei_child')
      .eq('is_active', true)
      .gt('quantity', 0);

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting available IMEI variants:', error);
    return [];
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate parent variant stock from children
 */
export const calculateParentStock = async (
  parent_variant_id: string
): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('calculate_parent_variant_stock', {
      parent_variant_id_param: parent_variant_id,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error calculating parent stock:', error);
    return 0;
  }
};

/**
 * Batch add IMEIs from CSV or bulk input
 */
export const batchAddIMEIVariants = async (
  parent_variant_id: string,
  imeis: string[],
  default_cost_price: number,
  default_selling_price: number
) => {
  const variants: IMEIVariantData[] = imeis.map((imei) => ({
    imei: imei.trim(),
    cost_price: default_cost_price,
    selling_price: default_selling_price,
    condition: 'new',
    source: 'purchase' as const,
  }));

  return await addIMEIsToParentVariant(parent_variant_id, variants);
};

/**
 * Get variant details with product and parent info
 */
export const getIMEIVariantDetails = async (variant_id: string) => {
  try {
    const { data, error } = await supabase
      .from('lats_product_variants')
      .select(`
        *,
        parent:lats_product_variants!parent_variant_id(
          id,
          variant_name,
          name,
          sku
        ),
        product:lats_products(
          id,
          name,
          description,
          sku,
          category:lats_categories(id, name)
        )
      `)
      .eq('id', variant_id)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting IMEI variant details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get variant details',
    };
  }
};

/**
 * Update IMEI variant information
 */
export const updateIMEIVariant = async (
  variant_id: string,
  updates: Partial<IMEIVariantData>
) => {
  try {
    // Get current variant to merge attributes
    const { data: currentVariant } = await supabase
      .from('lats_product_variants')
      .select('variant_attributes')
      .eq('id', variant_id)
      .single();

    const updatedAttributes = {
      ...(currentVariant?.variant_attributes || {}),
      ...updates,
    };

    const { data, error } = await supabase
      .from('lats_product_variants')
      .update({
        cost_price: updates.cost_price,
        selling_price: updates.selling_price,
        variant_attributes: updatedAttributes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', variant_id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating IMEI variant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update variant',
    };
  }
};

/**
 * Delete IMEI variant (soft delete)
 */
export const deleteIMEIVariant = async (variant_id: string) => {
  try {
    const { error } = await supabase
      .from('lats_product_variants')
      .update({
        is_active: false,
        quantity: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', variant_id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting IMEI variant:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete variant',
    };
  }
};

// ============================================
// BACKWARDS COMPATIBILITY
// ============================================

// Alias for backwards compatibility
export const selectIMEIVariantForSale = markIMEIAsSold;
export const getAvailableIMEIVariants = getAvailableIMEIVariantsForProduct;
