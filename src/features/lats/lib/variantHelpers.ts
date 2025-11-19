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
 */
export const loadChildIMEIs = async (parent_variant_id: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_product_variants')
      .select('*')
      .eq('parent_variant_id', parent_variant_id)
      .eq('variant_type', 'imei_child')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading child IMEIs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error loading child IMEIs:', error);
    return [];
  }
};

/**
 * Load available child IMEIs (only active, unsold ones)
 */
export const loadAvailableChildIMEIs = async (parent_variant_id: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('lats_product_variants')
      .select('*')
      .eq('parent_variant_id', parent_variant_id)
      .eq('variant_type', 'imei_child')
      .eq('is_active', true)
      .gt('quantity', 0)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading available child IMEIs:', error);
      return [];
    }

    return data || [];
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
 * Get IMEI from variant attributes
 */
export const getVariantIMEI = (variant: any): string | null => {
  return variant.variant_attributes?.imei || null;
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

