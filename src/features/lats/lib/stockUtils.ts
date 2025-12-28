/**
 * Stock calculation utilities for consistent inventory metrics
 */

export interface StockCalculation {
  totalStock: number;
  availableStock: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  isInStock: boolean;
}

/**
 * Calculate stock for a product, excluding IMEI child variants and subtracting reserved quantities
 * @param variants - Array of product variants
 * @param lowStockThreshold - Threshold for low stock (default: 10)
 * @returns StockCalculation object with total, available stock and status flags
 */
export function calculateProductStock(
  variants: any[],
  lowStockThreshold: number = 10
): StockCalculation {
  if (!variants || variants.length === 0) {
    return {
      totalStock: 0,
      availableStock: 0,
      isLowStock: false,
      isOutOfStock: true,
      isInStock: false
    };
  }

  // Filter out IMEI child variants
  const regularVariants = variants.filter(variant => {
    // Exclude IMEI child variants based on multiple criteria
    const isImeiChild = variant.parent_variant_id ||
                       variant.parentVariantId ||
                       variant.variant_type === 'imei_child' ||
                       variant.variantType === 'imei_child' ||
                       (variant.name && variant.name.toLowerCase().includes('imei:'));

    return !isImeiChild;
  });

  // Calculate total stock from regular variants
  const totalStock = regularVariants.reduce((sum, variant) => {
    return sum + (variant.quantity || 0);
  }, 0);

  // Calculate available stock (subtract reserved quantities)
  const availableStock = regularVariants.reduce((sum, variant) => {
    const quantity = variant.quantity || 0;
    const reserved = variant.reserved_quantity || variant.reservedQuantity || 0;
    return sum + Math.max(0, quantity - reserved);
  }, 0);

  // Determine stock status based on available stock
  const isOutOfStock = availableStock <= 0;
  const isLowStock = availableStock > 0 && availableStock <= lowStockThreshold;
  const isInStock = availableStock > lowStockThreshold;

  return {
    totalStock,
    availableStock,
    isLowStock,
    isOutOfStock,
    isInStock
  };
}

/**
 * Calculate aggregate stock metrics for multiple products
 * @param products - Array of products with variants
 * @param lowStockThreshold - Threshold for low stock (default: 10)
 * @returns Aggregate metrics
 */
export function calculateAggregateStockMetrics(
  products: any[],
  lowStockThreshold: number = 10
) {
  let totalProducts = 0;
  let lowStockProducts = 0;
  let outOfStockProducts = 0;
  let inStockProducts = 0;
  let productsWithStock = 0; // Products with any stock (> 0)
  let totalValue = 0;
  let retailValue = 0;
  let totalStockQuantity = 0;

  products.forEach(product => {
    if (!product.variants || product.variants.length === 0) {
      // Products without variants are considered out of stock
      outOfStockProducts++;
      totalProducts++;
      return;
    }

    totalProducts++;
    const stockCalc = calculateProductStock(product.variants, lowStockThreshold);

    if (stockCalc.isOutOfStock) {
      outOfStockProducts++;
    } else if (stockCalc.isLowStock) {
      lowStockProducts++;
      productsWithStock++; // Low stock products have stock
    } else if (stockCalc.isInStock) {
      inStockProducts++;
      productsWithStock++; // Sufficient stock products have stock
    }

    // Calculate values using available stock
    product.variants.forEach((variant: any) => {
      // Only count regular variants (not IMEI children)
      const isImeiChild = variant.parent_variant_id ||
                         variant.parentVariantId ||
                         variant.variant_type === 'imei_child' ||
                         variant.variantType === 'imei_child' ||
                         (variant.name && variant.name.toLowerCase().includes('imei:'));

      if (!isImeiChild) {
        const availableQty = Math.max(0, (variant.quantity || 0) - (variant.reserved_quantity || variant.reservedQuantity || 0));

        // Add to total stock quantity
        totalStockQuantity += availableQty;

        // Cost value calculation
        const costPrice = variant.costPrice || variant.cost_price || 0;
        totalValue += costPrice * availableQty;

        // Retail value calculation
        const sellingPrice = variant.sellingPrice || variant.selling_price || variant.price || 0;
        retailValue += sellingPrice * availableQty;
      }
    });
  });

  return {
    totalProducts,
    lowStockProducts,
    outOfStockProducts,
    inStockProducts,
    productsWithStock,
    totalValue,
    retailValue,
    totalStockQuantity,
    reorderAlerts: lowStockProducts // Products that need attention (low stock)
  };
}
