/**
 * Variant Helper Functions
 * ========================
 * Helper functions for working with parent-child variant system
 */

import { supabase } from '../../../lib/supabaseClient';

// ============================================
// FILTERING FUNCTIONS
// ============================================

/**
 * Filter out IMEI child variants, keeping only parent and standard variants
 * Use this when displaying variants to users for selection (PO creation, etc.)
 */
export const filterParentVariantsOnly = (variants: any[]): any[] => {
  if (!variants || variants.length === 0) return [];
  
  return variants.filter((variant) => {
    // Keep parent variants
    if (variant.is_parent === true || variant.variant_type === 'parent') {
      return true;
    }
    
    // Keep standard variants (ones that aren't children and don't have a parent)
    if (
      (!variant.parent_variant_id || variant.parent_variant_id === null) &&
      variant.variant_type !== 'imei_child'
    ) {
      return true;
    }
    
    // Filter out IMEI children
    return false;
  });
};

/**
 * Check if a variant is an IMEI child variant
 */
export const isIMEIChild = (variant: any): boolean => {
  return (
    variant.variant_type === 'imei_child' ||
    (variant.parent_variant_id != null && variant.variant_attributes?.imei != null)
  );
};

/**
 * Check if a variant is a parent variant
 */
export const isParentVariant = (variant: any): boolean => {
  return variant.is_parent === true || variant.variant_type === 'parent';
};

/**
 * Check if a variant can track IMEIs (is or can become a parent)
 */
export const canTrackIMEIs = (variant: any): boolean => {
  return (
    isParentVariant(variant) ||
    (variant.variant_type === 'standard' && !isIMEIChild(variant))
  );
};

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Load parent variants only for a product
 * Use this in PO creation and similar scenarios
 */
export const loadParentVariants = async (product_id: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_product_variants')
      .select('*')
      .eq('product_id', product_id)
      .eq('is_active', true)
      .or('variant_type.eq.parent,variant_type.eq.standard,variant_type.is.null')
      .is('parent_variant_id', null) // Exclude children
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading parent variants:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error loading parent variants:', error);
    return [];
  }
};

/**
 * Load all variants with child count for display
 */
export const loadVariantsWithChildCount = async (product_id: string): Promise<any[]> => {
  try {
    // First, get parent variants
    const parentVariants = await loadParentVariants(product_id);

    // Then, get child counts for each parent
    const variantsWithCounts = await Promise.all(
      parentVariants.map(async (variant) => {
        const { count, error } = await supabase
          .from('lats_product_variants')
          .select('id', { count: 'exact', head: true })
          .eq('parent_variant_id', variant.id)
          .eq('variant_type', 'imei_child')
          .eq('is_active', true)
          .gt('quantity', 0);

        return {
          ...variant,
          available_imeis: error ? 0 : count || 0,
        };
      })
    );

    return variantsWithCounts;
  } catch (error) {
    console.error('Error loading variants with child count:', error);
    return [];
  }
};

/**
 * Load child IMEIs for a parent variant
 * ✅ FIX: Also includes legacy inventory_items for the same product
 */
export const loadChildIMEIs = async (parent_variant_id: string): Promise<any[]> => {
  try {
    // First, get the parent variant to find product_id
    const { data: parentVariant, error: parentError } = await supabase
      .from('lats_product_variants')
      .select('product_id')
      .eq('id', parent_variant_id)
      .single();

    if (parentError || !parentVariant) {
      console.error('Error loading parent variant:', parentError);
      return [];
    }

    const productId = parentVariant.product_id;

    // Load IMEI child variants
    const { data: imeiChildren, error: imeiError } = await supabase
      .from('lats_product_variants')
      .select('*')
      .eq('parent_variant_id', parent_variant_id)
      .eq('variant_type', 'imei_child')
      .order('created_at', { ascending: false });

    if (imeiError) {
      console.error('Error loading IMEI children:', imeiError);
    }

    // ✅ FIX: Load legacy inventory_items for this product
    // IMEI and serial_number are synced in database (same value), so just query once
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('product_id', productId)
      .not('serial_number', 'is', null) // serial_number and imei are synced, so this gets all items
      .order('created_at', { ascending: false })
      .limit(100);

    if (inventoryError) {
      console.error('Error loading inventory items:', inventoryError);
    }

    // ✅ DEBUG: Log inventory items found
    console.log(`[loadChildIMEIs] Found ${inventoryItems?.length || 0} inventory items for product ${productId}`);

    // ✅ FIX: Get parent variant price to use as fallback for legacy items
    const { data: parentVariantPrice } = await supabase
      .from('lats_product_variants')
      .select('selling_price')
      .eq('id', parent_variant_id)
      .single();
    
    const parentPrice = parentVariantPrice?.selling_price || 0;

    // Convert inventory_items to variant-like format for display
    // ✅ FIX: Only include legacy items that belong to this specific parent variant
    const convertedItems = (inventoryItems || [])
      .filter(item => item.variant_id === parent_variant_id) // Only items for this parent
      .map(item => {
        // ✅ FIX: Treat IMEI and serial number as the same - use whichever is available
        const identifier = item.serial_number || item.imei || 'Unknown';
        
        // ✅ FIX: Use parent variant's price as fallback if legacy item doesn't have a price
        const itemPrice = item.selling_price;
        const finalPrice = itemPrice && itemPrice > 0 ? itemPrice : parentPrice;
        
        return {
          id: item.id,
          name: identifier,
          selling_price: finalPrice,
          sellingPrice: finalPrice,
          price: finalPrice,
          variant_attributes: {
            // Store both but treat them as the same
            serial_number: identifier,
            imei: identifier,
            mac_address: item.mac_address || '',
            condition: item.condition || 'new',
            location: item.location || '',
            status: item.status || 'available'
          },
          quantity: 1,
          is_active: item.status === 'available',
          created_at: item.created_at,
          // Mark as legacy item
          is_legacy: true,
          // ✅ FIX: Ensure variant_type is set so it displays correctly
          variant_type: 'imei_child',
          // ✅ FIX: Set parent_variant_id to match the parent
          parent_variant_id: parent_variant_id
        };
      });

    // ✅ DEBUG: Log converted items with details
    console.log(`[loadChildIMEIs] Converted ${convertedItems.length} inventory items for parent ${parent_variant_id} (filtered from ${inventoryItems.length} total)`);
    if (convertedItems.length > 0) {
      console.log(`[loadChildIMEIs] Sample legacy items:`, convertedItems.slice(0, 3).map(item => ({
        id: item.id,
        serial: item.variant_attributes?.serial_number,
        imei: item.variant_attributes?.imei,
        is_active: item.is_active,
        quantity: item.quantity,
        parent_variant_id: item.parent_variant_id
      })));
    }

    // Combine IMEI children and converted inventory items
    const allChildren = [
      ...(imeiChildren || []),
      ...convertedItems
    ];

    // ✅ DEBUG: Log total children with breakdown
    console.log(`[loadChildIMEIs] Total children: ${allChildren.length} (${imeiChildren?.length || 0} IMEI + ${convertedItems.length} legacy)`);
    console.log(`[loadChildIMEIs] IMEI children IDs:`, (imeiChildren || []).map(c => c.id).slice(0, 3));
    console.log(`[loadChildIMEIs] Legacy items IDs:`, convertedItems.map(c => c.id).slice(0, 3));

    // Sort by created_at descending (most recent first)
    const sorted = allChildren.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });

    return sorted;
  } catch (error) {
    console.error('Error loading child IMEIs:', error);
    return [];
  }
};

/**
 * Load available child IMEIs (only active, unsold ones)
 * ✅ FIX: Also includes legacy inventory_items for the same product
 */
export const loadAvailableChildIMEIs = async (parent_variant_id: string): Promise<any[]> => {
  try {
    // First, get the parent variant to find product_id
    const { data: parentVariant, error: parentError } = await supabase
      .from('lats_product_variants')
      .select('product_id')
      .eq('id', parent_variant_id)
      .single();

    if (parentError || !parentVariant) {
      console.error('Error loading parent variant:', parentError);
      return [];
    }

    const productId = parentVariant.product_id;

    // Load IMEI child variants (available only)
    const { data: imeiChildren, error: imeiError } = await supabase
      .from('lats_product_variants')
      .select('*')
      .eq('parent_variant_id', parent_variant_id)
      .eq('variant_type', 'imei_child')
      .eq('is_active', true)
      .gt('quantity', 0)
      .order('created_at', { ascending: false });

    if (imeiError) {
      console.error('Error loading IMEI children:', imeiError);
    }

    // ✅ FIX: Also load legacy inventory_items for this product (available only)
    // IMEI and serial_number are synced in database (same value), so just query once
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('product_id', productId)
      .not('serial_number', 'is', null) // serial_number and imei are synced, so this gets all items
      .eq('status', 'available')
      .order('created_at', { ascending: false })
      .limit(100);

    if (inventoryError) {
      console.error('Error loading inventory items:', inventoryError);
    }

    // Convert inventory_items to variant-like format for display
    const convertedItems = (inventoryItems || []).map(item => ({
      id: item.id,
      name: item.serial_number || item.imei || 'Unknown',
      variant_attributes: {
        serial_number: item.serial_number || '',
        imei: item.imei || '',
        mac_address: item.mac_address || '',
        condition: item.condition || 'new',
        location: item.location || '',
        status: item.status || 'available'
      },
      quantity: 1,
      is_active: item.status === 'available',
      created_at: item.created_at,
      is_legacy: true,
      variant_type: 'imei_child'
    }));

    // Combine IMEI children and converted inventory items
    const allChildren = [
      ...(imeiChildren || []),
      ...convertedItems
    ];

    // Sort by created_at descending (most recent first)
    const sorted = allChildren.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });

    return sorted;
  } catch (error) {
    console.error('Error loading available child IMEIs:', error);
    return [];
  }
};

// ============================================
// STOCK CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate total stock for a parent variant from its children
 */
export const calculateParentStock = async (parent_variant_id: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('lats_product_variants')
      .select('quantity')
      .eq('parent_variant_id', parent_variant_id)
      .eq('variant_type', 'imei_child')
      .eq('is_active', true);

    if (error) {
      console.error('Error calculating parent stock:', error);
      return 0;
    }

    return (data || []).reduce((sum, child) => sum + (child.quantity || 0), 0);
  } catch (error) {
    console.error('Error calculating parent stock:', error);
    return 0;
  }
};

/**
 * Update parent variant stock from children
 */
export const updateParentStock = async (parent_variant_id: string): Promise<boolean> => {
  try {
    const totalStock = await calculateParentStock(parent_variant_id);

    const { error } = await supabase
      .from('lats_product_variants')
      .update({
        quantity: totalStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parent_variant_id);

    if (error) {
      console.error('Error updating parent stock:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating parent stock:', error);
    return false;
  }
};

/**
 * Calculate total product stock (sum of all parent variants)
 */
export const calculateProductStock = async (product_id: string): Promise<number> => {
  try {
    const parentVariants = await loadParentVariants(product_id);
    
    let totalStock = 0;
    for (const parent of parentVariants) {
      if (parent.is_parent || parent.variant_type === 'parent') {
        // Calculate from children
        const childStock = await calculateParentStock(parent.id);
        totalStock += childStock;
      } else {
        // Standard variant - use its quantity directly
        totalStock += parent.quantity || 0;
      }
    }

    return totalStock;
  } catch (error) {
    console.error('Error calculating product stock:', error);
    return 0;
  }
};

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Get variant display name with IMEI count if applicable
 */
export const getVariantDisplayName = (variant: any, includeIMEICount = false): string => {
  const baseName = variant.variant_name || variant.name || 'Unnamed Variant';
  
  if (includeIMEICount && (variant.is_parent || variant.variant_type === 'parent')) {
    const imeiCount = variant.available_imeis || 0;
    if (imeiCount > 0) {
      return `${baseName} (${imeiCount} devices)`;
    }
  }
  
  return baseName;
};

/**
 * Get IMEI/Serial Number from variant attributes
 * ✅ FIX: IMEI and serial_number are the same - use whichever is available
 */
export const getVariantIMEI = (variant: any): string | null => {
  // IMEI and serial_number are synced to the same value
  return variant.variant_attributes?.imei || variant.variant_attributes?.serial_number || null;
};

/**
 * Format child IMEI for display
 */
export const formatIMEIForDisplay = (imei: string): string => {
  if (!imei) return 'N/A';
  
  // Show first 4 and last 4 digits: 1234...5678
  if (imei.length > 8) {
    return `${imei.substring(0, 4)}...${imei.substring(imei.length - 4)}`;
  }
  
  return imei;
};

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate that a variant can receive IMEI numbers
 */
export const validateVariantForIMEI = (variant: any): { valid: boolean; message?: string } => {
  if (!variant) {
    return { valid: false, message: 'Variant not found' };
  }

  if (isIMEIChild(variant)) {
    return { valid: false, message: 'This is already an IMEI child variant' };
  }

  if (!canTrackIMEIs(variant)) {
    return { valid: false, message: 'This variant cannot track IMEIs' };
  }

  return { valid: true };
};

/**
 * Check if IMEI format is valid
 */
export const validateIMEIFormat = (imei: string): { valid: boolean; message?: string } => {
  if (!imei || imei.trim().length === 0) {
    return { valid: false, message: 'IMEI is required' };
  }

  const cleaned = imei.trim();
  
  // IMEI should be 15 digits
  if (!/^\d{15}$/.test(cleaned)) {
    return { valid: false, message: 'IMEI must be exactly 15 digits' };
  }

  return { valid: true };
};

// ============================================
// CONVERSION HELPERS
// ============================================

/**
 * Convert standard variant to parent variant
 * Call this when first IMEI is added to a standard variant
 */
export const convertToParent = async (variant_id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('lats_product_variants')
      .update({
        is_parent: true,
        variant_type: 'parent',
        updated_at: new Date().toISOString(),
      })
      .eq('id', variant_id);

    if (error) {
      console.error('Error converting to parent:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error converting to parent:', error);
    return false;
  }
};

// ============================================
// EXPORT ALL
// ============================================

export const variantHelpers = {
  // Filtering
  filterParentVariantsOnly,
  isIMEIChild,
  isParentVariant,
  canTrackIMEIs,
  
  // Querying
  loadParentVariants,
  loadVariantsWithChildCount,
  loadChildIMEIs,
  loadAvailableChildIMEIs,
  
  // Stock calculation
  calculateParentStock,
  updateParentStock,
  calculateProductStock,
  
  // Display
  getVariantDisplayName,
  getVariantIMEI,
  formatIMEIForDisplay,
  
  // Validation
  validateVariantForIMEI,
  validateIMEIFormat,
  
  // Conversion
  convertToParent,
};

export default variantHelpers;

