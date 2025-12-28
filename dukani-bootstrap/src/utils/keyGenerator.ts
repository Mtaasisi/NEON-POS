/**
 * Utilities for generating safe, unique React keys
 * Prevents duplicate key warnings and ensures stable rendering
 */

let instanceCounter = 0;

/**
 * Generates a unique instance ID
 * Useful for creating stable keys in React components
 */
export function generateInstanceId(): string {
  instanceCounter += 1;
  return `instance-${Date.now()}-${instanceCounter}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Creates a composite key from multiple parts
 * Ensures uniqueness even if individual parts might be duplicated
 * 
 * @param parts - Array of key components (strings, numbers, or undefined)
 * @returns A unique composite key
 * 
 * @example
 * createCompositeKey('account', account.id, index) // "account-abc123-0"
 * createCompositeKey(prefix, id, undefined, index) // "prefix-abc123-0"
 */
export function createCompositeKey(...parts: (string | number | undefined)[]): string {
  return parts
    .filter(part => part !== undefined && part !== null && part !== '')
    .map(part => String(part))
    .join('-');
}

/**
 * Deduplicates an array of objects by a specific key field
 * 
 * @param items - Array of objects to deduplicate
 * @param keyField - The field to use for uniqueness check
 * @param warnOnDuplicates - Whether to log warnings when duplicates are found
 * @returns Deduplicated array
 */
export function deduplicateByKey<T extends Record<string, any>>(
  items: T[],
  keyField: keyof T = 'id',
  warnOnDuplicates = true
): T[] {
  const seen = new Map<string, T>();
  let duplicateCount = 0;
  
  items.forEach((item, index) => {
    if (!item || item[keyField] === undefined || item[keyField] === null) {
      if (warnOnDuplicates) {
        console.warn(`Item at index ${index} has no ${String(keyField)}:`, item);
      }
      return;
    }
    
    const key = String(item[keyField]);
    
    if (seen.has(key)) {
      duplicateCount++;
    } else {
      seen.set(key, item);
    }
  });
  
  if (warnOnDuplicates && duplicateCount > 0) {
    console.warn(
      `Removed ${duplicateCount} duplicate(s) from ${items.length} items (key: ${String(keyField)})`
    );
  }
  
  return Array.from(seen.values());
}

/**
 * Creates a stable key generator function
 * Useful for components that need consistent keys across renders
 * 
 * @param prefix - Optional prefix for the keys
 * @returns A function that generates unique keys
 * 
 * @example
 * const getKey = createKeyGenerator('payment');
 * items.map((item, idx) => <div key={getKey(item.id, idx)} />)
 */
export function createKeyGenerator(prefix?: string) {
  const instanceId = generateInstanceId();
  
  return (itemKey: string | number, index?: number): string => {
    const parts = [prefix, instanceId, String(itemKey), index];
    return createCompositeKey(...parts);
  };
}

/**
 * Validates that an array has unique keys
 * Useful for debugging and testing
 * 
 * @param items - Array of items
 * @param keyField - Field to check for uniqueness
 * @returns Object with validation results
 */
export function validateUniqueKeys<T extends Record<string, any>>(
  items: T[],
  keyField: keyof T = 'id'
): {
  isValid: boolean;
  duplicates: Array<{ key: string; count: number; indices: number[] }>;
  totalDuplicates: number;
} {
  const keyCount = new Map<string, number[]>();
  
  items.forEach((item, index) => {
    if (item && item[keyField] !== undefined) {
      const key = String(item[keyField]);
      const indices = keyCount.get(key) || [];
      indices.push(index);
      keyCount.set(key, indices);
    }
  });
  
  const duplicates = Array.from(keyCount.entries())
    .filter(([, indices]) => indices.length > 1)
    .map(([key, indices]) => ({
      key,
      count: indices.length,
      indices
    }));
  
  return {
    isValid: duplicates.length === 0,
    duplicates,
    totalDuplicates: duplicates.reduce((sum, dup) => sum + dup.count - 1, 0)
  };
}

