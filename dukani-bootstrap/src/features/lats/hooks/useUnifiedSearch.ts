import { useState, useCallback } from 'react';
import { useInventoryStore } from '../stores/useInventoryStore';
import { searchSpareParts } from '../lib/sparePartsApi';
import { Product } from '../types/inventory';
import { SparePart } from '../types/spareParts';

export interface UnifiedSearchResult {
  products: Product[];
  spareParts: SparePart[];
  total: number;
}

export interface UnifiedSearchOptions {
  includeProducts?: boolean;
  includeSpareParts?: boolean;
  inStockOnly?: boolean;
  categoryId?: string;
  limit?: number;
}

export const useUnifiedSearch = () => {
  const { searchProducts } = useInventoryStore();
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<UnifiedSearchResult>({
    products: [],
    spareParts: [],
    total: 0
  });

  const search = useCallback(async (
    query: string,
    options: UnifiedSearchOptions = {}
  ) => {
    if (!query.trim()) {
      setResults({ products: [], spareParts: [], total: 0 });
      return;
    }

    setIsSearching(true);
    try {
      const {
        includeProducts = true,
        includeSpareParts = true,
        inStockOnly = false,
        limit = 50
      } = options;

      const promises: Promise<any>[] = [];

      if (includeProducts) {
        promises.push(searchProducts(query));
      } else {
        promises.push(Promise.resolve({ ok: true, data: [] }));
      }

      if (includeSpareParts) {
        promises.push(searchSpareParts(query));
      } else {
        promises.push(Promise.resolve([]));
      }

      const [productsResponse, spareParts] = await Promise.all(promises);

      let products: Product[] = productsResponse.ok ? productsResponse.data : [];
      let filteredSpareParts: SparePart[] = Array.isArray(spareParts) ? spareParts : [];

      // Filter by stock if needed
      if (inStockOnly) {
        products = products.filter(p => (p.stockQuantity || 0) > 0);
        filteredSpareParts = filteredSpareParts.filter(sp => (sp.quantity || 0) > 0);
      }

      // Filter by category if specified
      if (options.categoryId) {
        products = products.filter(p => p.categoryId === options.categoryId);
        filteredSpareParts = filteredSpareParts.filter(sp => sp.category_id === options.categoryId);
      }

      // Apply limit
      if (limit) {
        products = products.slice(0, limit);
        filteredSpareParts = filteredSpareParts.slice(0, limit);
      }

      setResults({
        products,
        spareParts: filteredSpareParts,
        total: products.length + filteredSpareParts.length
      });
    } catch (error) {
      console.error('Unified search error:', error);
      setResults({ products: [], spareParts: [], total: 0 });
    } finally {
      setIsSearching(false);
    }
  }, [searchProducts]);

  const clearResults = useCallback(() => {
    setResults({ products: [], spareParts: [], total: 0 });
  }, []);

  return {
    search,
    results,
    isSearching,
    clearResults
  };
};
