import { useMemo, useRef } from 'react';

/**
 * Custom hook for deduplicating arrays by a key field
 * Generates stable, unique keys for React rendering
 * 
 * @param items - Array of items to deduplicate
 * @param keyField - Field name to use for deduplication (default: 'id')
 * @returns Object with deduplicated items and a key generator function
 * 
 * @example
 * const { items: uniqueAccounts, getKey } = useDeduplicated(paymentAccounts);
 * uniqueAccounts.map((account, idx) => (
 *   <div key={getKey(account.id, idx)}>{account.name}</div>
 * ))
 */
export function useDeduplicated<T extends Record<string, any>>(
  items: T[],
  keyField: keyof T = 'id'
) {
  // Generate a stable render ID that persists across re-renders
  const renderIdRef = useRef(`render-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  
  // Deduplicate items using Map for O(n) performance
  const deduplicatedItems = useMemo(() => {
    const itemMap = new Map<string, T>();
    let duplicateCount = 0;
    
    items.forEach((item, index) => {
      if (!item || !item[keyField]) {
        console.warn(`useDeduplicated: Item at index ${index} is missing ${String(keyField)}`, item);
        return;
      }
      
      const key = String(item[keyField]);
      
      if (itemMap.has(key)) {
        duplicateCount++;
      } else {
        itemMap.set(key, item);
      }
    });
    
    // Log warnings if duplicates were found
    if (duplicateCount > 0) {
      console.warn(
        `useDeduplicated: Found and removed ${duplicateCount} duplicate(s) from ${items.length} items using key field "${String(keyField)}"`
      );
    }
    
    return Array.from(itemMap.values());
  }, [items, keyField]);
  
  /**
   * Generates a unique, stable key for React rendering
   * Combines render ID, item key, and index for absolute uniqueness
   */
  const getKey = (itemKey: string | number, index: number): string => {
    return `${renderIdRef.current}-${String(itemKey)}-${index}`;
  };
  
  return {
    items: deduplicatedItems,
    getKey,
    originalCount: items.length,
    deduplicatedCount: deduplicatedItems.length,
    hasDuplicates: items.length !== deduplicatedItems.length
  };
}

/**
 * Simpler version that just returns deduplicated items without key generation
 */
export function useDeduplicatedSimple<T extends Record<string, any>>(
  items: T[],
  keyField: keyof T = 'id'
): T[] {
  return useMemo(() => {
    const itemMap = new Map<string, T>();
    
    items.forEach(item => {
      if (item && item[keyField]) {
        const key = String(item[keyField]);
        if (!itemMap.has(key)) {
          itemMap.set(key, item);
        }
      }
    });
    
    return Array.from(itemMap.values());
  }, [items, keyField]);
}

