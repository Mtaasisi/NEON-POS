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
    const { data, error } = await supabase
      .from('lats_product_variants')
      .select('id')
      .eq('variant_attributes->>imei', imei)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking IMEI:', error);
      return false;
    }

    return !!data;
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
    
    const rpcParams = {
      parent_variant_id_param: parent_variant_id,
      imei_param: imeiData.imei,
      serial_number_param: imeiData.serial_number,
      mac_address_param: imeiData.mac_address,
      cost_price_param: imeiData.cost_price,
      selling_price_param: imeiData.selling_price,
      condition_param: imeiData.condition || 'new',
      notes_param: imeiData.notes,
    };
    
    console.log('📤 [DEBUG] RPC Parameters:', rpcParams);

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
 */
export const getChildIMEIs = async (
  parent_variant_id: string
): Promise<ChildIMEIVariant[]> => {
  try {
    const { data, error } = await supabase.rpc('get_child_imeis', {
      parent_variant_id_param: parent_variant_id,
    });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.child_id,
      parent_variant_id,
      product_id: '', // Will be filled from parent
      imei: item.imei,
      serial_number: item.serial_number,
      condition: item.variant_attributes?.condition || 'new',
      cost_price: item.cost_price,
      selling_price: item.selling_price,
      quantity: item.quantity,
      is_active: item.status === 'available',
      created_at: item.created_at,
      variant_attributes: item.variant_attributes,
    }));
  } catch (error) {
    console.error('Error getting child IMEIs:', error);
    
    // Fallback to direct query
    try {
      const { data, error: fallbackError } = await supabase
        .from('lats_product_variants')
        .select('*')
        .eq('parent_variant_id', parent_variant_id)
        .eq('variant_type', 'imei_child')
        .order('created_at', { ascending: false });

      if (fallbackError) throw fallbackError;

      return (data || []).map((v: any) => ({
        id: v.id,
        parent_variant_id,
        product_id: v.product_id,
        imei: v.variant_attributes?.imei,
        serial_number: v.variant_attributes?.serial_number,
        condition: v.variant_attributes?.condition || 'new',
        cost_price: v.cost_price,
        selling_price: v.selling_price,
        quantity: v.quantity,
        is_active: v.is_active,
        created_at: v.created_at,
        variant_attributes: v.variant_attributes,
      }));
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      return [];
    }
  }
};

/**
 * Get available IMEIs for POS (only active/unsold items)
 */
export const getAvailableIMEIsForPOS = async (
  parent_variant_id: string
): Promise<ChildIMEIVariant[]> => {
  try {
    const { data, error } = await supabase.rpc('get_available_imeis_for_pos', {
      parent_variant_id_param: parent_variant_id,
    });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.child_id,
      parent_variant_id,
      product_id: '', // Will be filled from context
      imei: item.imei,
      serial_number: item.serial_number,
      condition: item.condition || 'new',
      cost_price: item.cost_price,
      selling_price: item.selling_price,
      quantity: 1,
      is_active: true,
      created_at: item.created_at,
      variant_attributes: {},
    }));
  } catch (error) {
    console.error('Error getting available IMEIs:', error);
    
    // Fallback: get all available children
    const allChildren = await getChildIMEIs(parent_variant_id);
    return allChildren.filter((child) => child.is_active && child.quantity > 0);
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
    const { data, error } = await supabase.rpc('mark_imei_as_sold', {
      child_variant_id_param: child_variant_id,
      sale_id_param: sale_id,
    });

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error marking IMEI as sold:', error);
    
    // Fallback to manual update
    try {
      const { error: updateError } = await supabase
        .from('lats_product_variants')
        .update({
          quantity: 0,
          is_active: false,
          variant_attributes: supabase.rpc('jsonb_set', {
            target: supabase.sql`variant_attributes`,
            path: '{sold_at}',
            value: new Date().toISOString(),
          }),
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
      .eq('variant_attributes->>imei', imei)
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
  try {
    let query = supabase
      .from('lats_product_variants')
      .select(`
        *,
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
      .or(
        `variant_attributes->>imei.ilike.%${searchTerm}%,variant_attributes->>serial_number.ilike.%${searchTerm}%`
      );

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
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
