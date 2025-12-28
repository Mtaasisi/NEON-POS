import { toast } from 'react-hot-toast';

/**
 * Validates and adjusts children variants array to match stock quantity
 */
export const adjustChildrenVariantsForStock = (
  currentChildren: string[],
  stockQuantity: number,
  useChildrenVariants: boolean
): string[] => {
  if (!useChildrenVariants || stockQuantity <= 0) {
    return [];
  }

  // Ensure array has exactly stockQuantity elements
  let adjusted: string[];
  if (currentChildren.length < stockQuantity) {
    // Add empty fields if stock increased
    adjusted = [...currentChildren, ...Array(stockQuantity - currentChildren.length).fill('')];
  } else if (currentChildren.length > stockQuantity) {
    // Trim excess fields if stock decreased
    adjusted = currentChildren.slice(0, stockQuantity);
    toast.info(`Reduced Serial number fields to ${stockQuantity} to match stock quantity.`);
  } else {
    // Same length, no change needed
    adjusted = currentChildren;
  }

  return adjusted;
};

/**
 * Validates children variants for duplicates and stock quantity limits
 */
export const validateChildrenVariants = (
  value: string[],
  stockQuantity: number,
  useChildrenVariants: boolean,
  allVariants: Array<{ childrenVariants?: string[] }>,
  currentVariantIndex: number,
  itemLabel: string = 'Serial number'
): { isValid: boolean; adjustedValue?: string[] } => {
  const trimmedChildren = value.map(c => c.trim()).filter(Boolean);

  // If tracking is enabled, ensure array length matches stock quantity exactly
  if (useChildrenVariants && stockQuantity > 0) {
    // Ensure array has exactly stockQuantity elements
    let adjustedValue = [...value];
    if (adjustedValue.length < stockQuantity) {
      // Pad with empty strings
      adjustedValue = [...adjustedValue, ...Array(stockQuantity - adjustedValue.length).fill('')];
    } else if (adjustedValue.length > stockQuantity) {
      // Trim to stock quantity
      adjustedValue = adjustedValue.slice(0, stockQuantity);
    }
    value = adjustedValue;
  }

  // Check if total number of fields (including empty) exceeds stock quantity
  if (value.length > stockQuantity && stockQuantity > 0) {
    toast.error(`Cannot have more than ${stockQuantity} ${itemLabel} fields. Stock quantity is ${stockQuantity}.`);
    // Limit to stock quantity
    return { isValid: false, adjustedValue: value.slice(0, stockQuantity) };
  }

  // Check if number of filled items exceeds stock quantity
  if (trimmedChildren.length > stockQuantity && stockQuantity > 0) {
    toast.error(`Cannot add more than ${stockQuantity} filled ${itemLabel}s. Stock quantity is ${stockQuantity}.`);
    return { isValid: false };
  }

  // Check for duplicates within the same variant
  const uniqueChildren = new Set(trimmedChildren.map(c => c.toLowerCase()));
  if (trimmedChildren.length !== uniqueChildren.size) {
    const duplicate = trimmedChildren.find((child, i) => 
      trimmedChildren.findIndex(c => c.toLowerCase() === child.toLowerCase()) !== i
    );
    toast.error(`Duplicate ${itemLabel} "${duplicate}" found in this variant. Each item must be unique.`);
    return { isValid: false };
  }

  // Check for duplicates across ALL variants (case-insensitive)
  for (const child of trimmedChildren) {
    const isDuplicateInOtherVariants = allVariants.some((variant, i) => {
      if (i === currentVariantIndex) return false; // Skip current variant
      const otherChildren = variant.childrenVariants || [];
      return otherChildren.some(c => c.trim().toLowerCase() === child.toLowerCase());
    });

    if (isDuplicateInOtherVariants) {
      toast.error(`${itemLabel} "${child}" already exists in another variant. Each item must be unique across all variants.`);
      return { isValid: false };
    }
  }

  return { isValid: true, adjustedValue: value };
};

/**
 * Format price with comma separators
 */
export const formatPrice = (price: number | string): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (num % 1 === 0) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Check for duplicate variant names
 */
export const checkDuplicateVariantName = (
  name: string,
  allVariants: Array<{ name?: string }>,
  currentIndex: number
): boolean => {
  const trimmedName = name.trim();
  if (!trimmedName) return false;
  
  return allVariants.some((variant, i) => 
    i !== currentIndex && 
    variant.name?.toLowerCase().trim() === trimmedName.toLowerCase()
  );
};
