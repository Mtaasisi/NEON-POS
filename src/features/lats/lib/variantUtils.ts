/**
 * Variant Utility Functions
 * Provides helper functions for working with product variants
 */

import { ProductVariant } from '../types/inventory';

/**
 * Get the display name for a variant
 * Priority: variant_name > name > fallback
 */
export const getVariantDisplayName = (variant: ProductVariant, fallback = 'Unnamed Variant'): string => {
  // 🔍 DEBUG: Log variant data to see what we're receiving
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [getVariantDisplayName] Variant data:', {
      variant_name: (variant as any).variant_name,
      name: variant.name,
      id: (variant as any).id,
      sku: (variant as any).sku,
      fullVariant: variant
    });
  }
  
  const displayName = (variant as any).variant_name || variant.name || fallback;
  console.log(`✅ [getVariantDisplayName] Returning: "${displayName}" (variant_name: ${(variant as any).variant_name}, name: ${variant.name})`);
  
  return displayName;
};

/**
 * Check if a variant is from a trade-in
 */
export const isTradeInVariant = (variant: ProductVariant): boolean => {
  const attrs = (variant as any).variant_attributes || 
                (variant as any).variantAttributes || 
                variant.attributes || 
                {};
  return attrs.source === 'trade-in';
};

/**
 * Check if a variant is from migration
 */
export const isMigratedVariant = (variant: ProductVariant): boolean => {
  const attrs = (variant as any).variant_attributes || 
                (variant as any).variantAttributes || 
                variant.attributes || 
                {};
  return attrs.source === 'migration';
};

/**
 * Get the unique identifier for a variant (IMEI, Serial Number, etc.)
 */
export const getVariantIdentifier = (variant: ProductVariant): string | null => {
  const attrs = (variant as any).variant_attributes || 
                (variant as any).variantAttributes || 
                variant.attributes || 
                {};
  return attrs.imei || attrs.serial_number || null;
};

/**
 * Get all variant attributes as a clean object
 * Merges variant_attributes (primary) with attributes (legacy) to ensure all data is available
 */
export const getVariantAttributes = (variant: ProductVariant): Record<string, any> => {
  const variantAttrs = (variant as any).variant_attributes || 
                      (variant as any).variantAttributes || 
                      {};
  const legacyAttrs = variant.attributes || {};
  
  // Merge both, with variant_attributes taking precedence
  return { ...legacyAttrs, ...variantAttrs };
};

/**
 * Get the source badge configuration for a variant
 */
export const getVariantSourceBadge = (variant: ProductVariant): {
  text: string;
  className: string;
} | null => {
  const attrs = getVariantAttributes(variant);
  
  if (attrs.source === 'trade-in') {
    return {
      text: 'Trade-In',
      className: 'bg-orange-100 text-orange-800'
    };
  }
  
  if (attrs.source === 'migration') {
    return {
      text: 'Migrated',
      className: 'bg-blue-100 text-blue-800'
    };
  }
  
  if (attrs.source === 'purchase') {
    return {
      text: 'Purchased',
      className: 'bg-green-100 text-green-800'
    };
  }
  
  return null;
};

/**
 * Get customer information from a trade-in variant
 */
export const getTradeInCustomerInfo = (variant: ProductVariant): {
  name?: string;
  phone?: string;
  transactionNumber?: string;
} | null => {
  const attrs = getVariantAttributes(variant);
  
  if (attrs.source !== 'trade-in') {
    return null;
  }
  
  return {
    name: attrs.customer_name,
    phone: attrs.customer_phone,
    transactionNumber: attrs.transaction_number
  };
};

/**
 * Get condition badge configuration
 */
export const getConditionBadge = (condition?: string): {
  text: string;
  className: string;
} => {
  switch (condition?.toLowerCase()) {
    case 'excellent':
      return {
        text: 'Excellent',
        className: 'bg-green-100 text-green-800'
      };
    case 'good':
      return {
        text: 'Good',
        className: 'bg-blue-100 text-blue-800'
      };
    case 'fair':
      return {
        text: 'Fair',
        className: 'bg-yellow-100 text-yellow-800'
      };
    case 'poor':
      return {
        text: 'Poor',
        className: 'bg-red-100 text-red-800'
      };
    case 'new':
      return {
        text: 'New',
        className: 'bg-purple-100 text-purple-800'
      };
    case 'used':
      return {
        text: 'Used',
        className: 'bg-gray-100 text-gray-800'
      };
    default:
      return {
        text: condition || 'Unknown',
        className: 'bg-gray-100 text-gray-600'
      };
  }
};

/**
 * Format variant attributes for display
 * Returns a clean array of key-value pairs, excluding internal fields
 */
export const formatVariantAttributesForDisplay = (variant: ProductVariant): Array<{
  label: string;
  value: string;
}> => {
  const attrs = getVariantAttributes(variant);
  const result: Array<{ label: string; value: string }> = [];
  
  // Fields to exclude from display
  const excludeFields = ['source', 'migrated_at', 'notes', 'original_inventory_item_id', 'parent_variant_id'];
  
  // Field labels mapping
  const labelMap: Record<string, string> = {
    imei: 'IMEI',
    serial_number: 'Serial Number',
    mac_address: 'MAC Address',
    customer_name: 'Customer Name',
    customer_phone: 'Customer Phone',
    original_owner: 'Original Owner',
    transaction_number: 'Transaction #',
    trade_in_transaction: 'Trade-In ID',
    condition: 'Condition',
    damage_items: 'Damage Items',
    warranty_start: 'Warranty Start',
    warranty_end: 'Warranty End',
    location: 'Location'
  };
  
  Object.entries(attrs).forEach(([key, value]) => {
    if (!excludeFields.includes(key) && value != null && value !== '') {
      const label = labelMap[key] || key.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      result.push({
        label,
        value: String(value)
      });
    }
  });
  
  return result;
};

/**
 * Check if variant is low stock
 */
export const isLowStock = (variant: ProductVariant): boolean => {
  return variant.quantity <= variant.minQuantity;
};

/**
 * Check if variant is out of stock
 */
export const isOutOfStock = (variant: ProductVariant): boolean => {
  return variant.quantity <= 0;
};

/**
 * Get stock status badge
 */
export const getStockStatusBadge = (variant: ProductVariant): {
  text: string;
  className: string;
} => {
  if (isOutOfStock(variant)) {
    return {
      text: 'Out of Stock',
      className: 'bg-red-100 text-red-700'
    };
  }
  
  if (isLowStock(variant)) {
    return {
      text: 'Low Stock',
      className: 'bg-orange-100 text-orange-700'
    };
  }
  
  return {
    text: 'In Stock',
    className: 'bg-green-100 text-green-700'
  };
};

/**
 * Calculate profit margin for a variant
 */
export const calculateVariantProfitMargin = (variant: ProductVariant): number => {
  if (!variant.costPrice || variant.costPrice === 0) {
    return 0;
  }
  
  return ((variant.sellingPrice - variant.costPrice) / variant.costPrice) * 100;
};

/**
 * Check if a product is a trade-in product (has any trade-in variants)
 */
export const isTradeInProduct = (variants?: ProductVariant[]): boolean => {
  return variants?.some(v => isTradeInVariant(v)) || false;
};

/**
 * Validates and creates a default variant for a product
 * Used when products are added to POs without variants
 */
export const validateAndCreateDefaultVariant = async (
  productId: string,
  productName: string,
  options: {
    costPrice?: number;
    sellingPrice?: number;
    quantity?: number;
    minQuantity?: number;
    sku?: string;
    attributes?: Record<string, any>;
  } = {}
): Promise<{ success: boolean; variantId?: string; error?: string }> => {
  try {
    // Import supabase dynamically to avoid circular dependencies
    const { supabase } = await import('../../../lib/supabaseClient');
    
    console.log('🔄 Creating default variant for product:', productId);
    
    // Check if product already has variants
    const { data: existingVariants, error: checkError } = await supabase
      .from('lats_product_variants')
      .select('id')
      .eq('product_id', productId)
      .is('parent_variant_id', null); // Only check parent variants
    
    if (checkError) {
      console.error('❌ Error checking existing variants:', checkError);
      return { success: false, error: checkError.message };
    }
    
    if (existingVariants && existingVariants.length > 0) {
      console.log('✅ Product already has variants, skipping default variant creation');
      return { success: true, variantId: existingVariants[0].id };
    }
    
    // Generate SKU if not provided
    const variantSku = options.sku || `${productId.substring(0, 8)}-DEFAULT`;
    
    // Create default variant
    const { data: newVariant, error: createError } = await supabase
      .from('lats_product_variants')
      .insert({
        product_id: productId,
        name: 'Default',
        variant_name: 'Default',
        sku: variantSku,
        cost_price: options.costPrice || 0,
        selling_price: options.sellingPrice || 0,
        unit_price: options.sellingPrice || 0,
        quantity: options.quantity || 0,
        min_quantity: options.minQuantity || 0,
        variant_attributes: options.attributes || {},
        attributes: options.attributes || {},
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error('❌ Error creating default variant:', createError);
      return { success: false, error: createError.message };
    }
    
    console.log('✅ Default variant created successfully:', newVariant.id);
    return { success: true, variantId: newVariant.id };
    
  } catch (error: any) {
    console.error('❌ Exception creating default variant:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};
