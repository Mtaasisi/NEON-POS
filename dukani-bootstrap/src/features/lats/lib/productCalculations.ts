import { ProductVariant } from '../types/inventory';

// Maximum realistic amount (1 trillion) to detect corrupt data
const MAX_REALISTIC_AMOUNT = 1_000_000_000_000;

/**
 * Validate if a price value is realistic and not corrupted
 */
const isValidPrice = (price: number): boolean => {
  if (!isFinite(price)) return false;
  if (isNaN(price)) return false;
  if (Math.abs(price) > MAX_REALISTIC_AMOUNT) return false;
  return true;
};

/**
 * Safely get a validated price value, returning 0 for corrupt values
 * Returns the validated price and a flag indicating if the original was corrupt
 */
const getValidatedPrice = (price: number | string | null | undefined): { price: number; wasCorrupt: boolean } => {
  const numPrice = Number(price) || 0;
  const valid = isValidPrice(numPrice);
  return {
    price: valid ? numPrice : 0,
    wasCorrupt: !valid && numPrice !== 0 // Corrupt if invalid but not zero (zero is legitimate)
  };
};

/**
 * Safely get a validated quantity value
 */
const getValidatedQuantity = (quantity: number | null | undefined): number => {
  const numQuantity = Number(quantity) || 0;
  if (!isFinite(numQuantity) || isNaN(numQuantity) || numQuantity < 0) return 0;
  // Quantity can be large but let's cap it at a reasonable maximum (10 million)
  if (numQuantity > 10_000_000) return 0;
  return numQuantity;
};

/**
 * Check if a variant is an IMEI child variant that should be excluded from stock calculations
 */
const isImeiChildVariant = (variant: ProductVariant): boolean => {
  // Check multiple possible field names and formats
  return !!(
    (variant as any).parent_variant_id ||
    (variant as any).parentVariantId ||
    variant.variantType === 'imei_child' ||
    (variant as any).variant_type === 'imei_child' ||
    (variant.name && variant.name.toLowerCase().includes('imei:'))
  );
};

/**
 * Calculate total stock quantity from product variants
 * Excludes IMEI child variants (they are counted as part of their parent variant)
 */
export const calculateTotalStock = (variants: ProductVariant[]): number => {
  // Filter out IMEI child variants - they should not be counted separately
  // Parent variants already have their stock calculated from children
  const parentVariants = variants.filter(variant => !isImeiChildVariant(variant));
  
  return parentVariants.reduce((sum, variant) => sum + getValidatedQuantity(variant.quantity), 0);
};

/**
 * Calculate total cost value from product variants
 * Filters out corrupt price/quantity data before calculation
 */
export const calculateTotalCostValue = (variants: ProductVariant[]): number => {
  return variants.reduce((sum, variant) => {
    const { price: costPrice, wasCorrupt: priceCorrupt } = getValidatedPrice(variant.costPrice);
    const quantity = getValidatedQuantity(variant.quantity);
    
    // If price was corrupt, skip this variant to prevent corruption from propagating
    if (priceCorrupt) {
      console.warn(`⚠️ Corrupt costPrice detected for variant ${variant.id || variant.sku}: ${variant.costPrice}. Skipping from calculation.`);
      return sum;
    }
    
    return sum + (costPrice * quantity);
  }, 0);
};

/**
 * Calculate total retail value from product variants
 * Filters out corrupt price/quantity data before calculation
 */
export const calculateTotalRetailValue = (variants: ProductVariant[]): number => {
  return variants.reduce((sum, variant) => {
    const { price: sellingPrice, wasCorrupt: priceCorrupt } = getValidatedPrice(variant.sellingPrice || variant.price);
    const quantity = getValidatedQuantity(variant.quantity);
    
    // If price was corrupt, skip this variant to prevent corruption from propagating
    if (priceCorrupt) {
      console.warn(`⚠️ Corrupt sellingPrice detected for variant ${variant.id || variant.sku}: ${variant.sellingPrice || variant.price}. Skipping from calculation.`);
      return sum;
    }
    
    return sum + (sellingPrice * quantity);
  }, 0);
};

/**
 * Calculate potential profit from product variants
 */
export const calculatePotentialProfit = (variants: ProductVariant[]): number => {
  const retailValue = calculateTotalRetailValue(variants);
  const costValue = calculateTotalCostValue(variants);
  return retailValue - costValue;
};

/**
 * Calculate profit margin percentage
 */
export const calculateProfitMargin = (variants: ProductVariant[]): number => {
  const retailValue = calculateTotalRetailValue(variants);
  const profit = calculatePotentialProfit(variants);
  return retailValue > 0 ? (profit / retailValue) * 100 : 0;
};

/**
 * Get stock status for a product
 */
export const getStockStatus = (variants: ProductVariant[]): 'out-of-stock' | 'low' | 'normal' => {
  const totalStock = calculateTotalStock(variants);
  
  if (totalStock <= 0) return 'out-of-stock';
  
  // Check if any variant has low stock (quantity <= minQuantity)
  const hasLowStock = variants.some(variant => 
    (variant.quantity ?? 0) > 0 && (variant.quantity ?? 0) <= (variant.minQuantity ?? 0)
  );
  
  if (hasLowStock || totalStock <= 10) return 'low';
  return 'normal';
};

/**
 * Get low stock variants
 */
export const getLowStockVariants = (variants: ProductVariant[]): ProductVariant[] => {
  return variants.filter(variant => 
    (variant.quantity ?? 0) > 0 && (variant.quantity ?? 0) <= (variant.minQuantity ?? 0)
  );
};

/**
 * Get out of stock variants
 */
export const getOutOfStockVariants = (variants: ProductVariant[]): ProductVariant[] => {
  return variants.filter(variant => (variant.quantity ?? 0) <= 0);
};

/**
 * Get active variants
 */
export const getActiveVariants = (variants: ProductVariant[]): ProductVariant[] => {
  return variants.filter(variant => variant.isActive !== false);
};

/**
 * Format currency with proper locale
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format number with proper locale
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Get price range for variants
 * Filters out corrupt prices before calculating range
 */
export const getPriceRange = (variants: ProductVariant[]): { min: number; max: number; range: string } => {
  const prices = variants
    .map(v => v.sellingPrice)
    .map(p => getValidatedPrice(p))
    .filter(({ price, wasCorrupt }) => !wasCorrupt && price > 0)
    .map(({ price }) => price);
  
  if (prices.length === 0) {
    return { min: 0, max: 0, range: 'No price set' };
  }
  
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  
  const range = min === max 
    ? formatCurrency(min)
    : `${formatCurrency(min)} - ${formatCurrency(max)}`;
  
  return { min, max, range };
};

/**
 * Get cost price range for variants
 * Filters out corrupt prices before calculating range
 */
export const getCostPriceRange = (variants: ProductVariant[]): { min: number; max: number; range: string } => {
  const prices = variants
    .map(v => v.costPrice)
    .map(p => getValidatedPrice(p))
    .filter(({ price, wasCorrupt }) => !wasCorrupt && price > 0)
    .map(({ price }) => price);
  
  if (prices.length === 0) {
    return { min: 0, max: 0, range: 'No cost set' };
  }
  
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  
  const range = min === max 
    ? formatCurrency(min)
    : `${formatCurrency(min)} - ${formatCurrency(max)}`;
  
  return { min, max, range };
};
