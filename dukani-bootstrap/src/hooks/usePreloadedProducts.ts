/**
 * usePreloadedProducts Hook
 * Access preloaded products without triggering additional loads
 */

import { useInventoryStore } from '../features/lats/stores/useInventoryStore';
import { useEffect, useState } from 'react';

export const usePreloadedProducts = () => {
  const { products, loadProducts } = useInventoryStore();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Only load if products are truly empty on first mount
    if (isInitialLoad && products.length === 0) {
      console.log('🔄 [usePreloadedProducts] Products not loaded, triggering load...');
      loadProducts({ page: 1, limit: 500 }, false);
      setIsInitialLoad(false);
    } else if (isInitialLoad) {
      console.log(`✅ [usePreloadedProducts] Using ${products.length} preloaded products`);
      setIsInitialLoad(false);
    }
  }, []);

  return {
    products,
    isLoading: products.length === 0,
    hasProducts: products.length > 0
  };
};

