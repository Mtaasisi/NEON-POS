/**
 * useSmartCache Hook
 * 
 * React hook for smart data caching with automatic:
 * - Cache checking
 * - Background refresh
 * - Loading states
 * - Error handling
 * 
 * Usage:
 * const { data, isLoading, error, refresh } = useSmartCache('products', fetchProducts);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { smartCache } from '../lib/enhancedCacheManager';

interface UseSmartCacheOptions<T> {
  enabled?: boolean;
  forceRefresh?: boolean;
  showLoadingToast?: boolean;
  branchId?: string;
  onSuccess?: (data: T[]) => void;
  onError?: (error: Error) => void;
}

interface UseSmartCacheReturn<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  isStale: boolean;
  lastUpdated: Date | null;
}

/**
 * Smart cache hook with automatic background refresh
 */
export function useSmartCache<T = any>(
  cacheKey: string,
  fetchFn: () => Promise<T[]>,
  options: UseSmartCacheOptions<T> = {}
): UseSmartCacheReturn<T> {
  const {
    enabled = true,
    forceRefresh = false,
    showLoadingToast = false,
    branchId,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);

  const fetchData = useCallback(async (force = false) => {
    if (!enabled || fetchInProgress.current) return;

    fetchInProgress.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      
      if (isMounted.current) {
        setData(result);
        setLastUpdated(new Date());
        setIsStale(false);
        onSuccess?.(result);
      }
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      if (isMounted.current) {
        setError(error);
        onError?.(error);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        fetchInProgress.current = false;
      }
    }
  }, [enabled, fetchFn, onSuccess, onError]);

  // Subscribe to cache updates
  useEffect(() => {
    const unsubscribe = smartCache.subscribe(cacheKey, (updatedData) => {
      if (isMounted.current) {
        setData(updatedData);
        setLastUpdated(new Date());
        setIsStale(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [cacheKey]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData(forceRefresh);
    }

    return () => {
      isMounted.current = false;
    };
  }, [enabled, forceRefresh, branchId, fetchData]);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refresh,
    isStale,
    lastUpdated,
  };
}

/**
 * Hook specifically for products with smart caching
 */
export function useSmartProducts(branchId?: string, options: Omit<UseSmartCacheOptions<any>, 'branchId'> = {}) {
  return useSmartCache(
    'products',
    async () => {
      const { smartCache } = await import('../lib/enhancedCacheManager');
      return smartCache.smartFetch('products', async () => {
        const { supabase } = await import('../lib/supabase');
        let query = supabase
          .from('lats_products')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1000);

        if (branchId) {
          query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      }, { branchId });
    },
    { ...options, branchId }
  );
}

/**
 * Hook specifically for customers with smart caching
 */
export function useSmartCustomers(branchId?: string, options: Omit<UseSmartCacheOptions<any>, 'branchId'> = {}) {
  return useSmartCache(
    'customers',
    async () => {
      const { smartCache } = await import('../lib/enhancedCacheManager');
      return smartCache.smartFetch('customers', async () => {
        const { supabase } = await import('../lib/supabase');
        let query = supabase
          .from('lats_customers')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

        if (branchId) {
          query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      }, { branchId });
    },
    { ...options, branchId }
  );
}

/**
 * Hook specifically for categories with smart caching
 */
export function useSmartCategories(options: UseSmartCacheOptions<any> = {}) {
  return useSmartCache(
    'categories',
    async () => {
      const { smartCache } = await import('../lib/enhancedCacheManager');
      return smartCache.smartFetch('categories', async () => {
        const { supabase } = await import('../lib/supabase');
        const { addBranchFilter } = await import('../lib/branchAwareApi');
        let query = supabase
          .from('lats_categories')
          .select('*')
          .eq('is_active', true);
        
        // Apply branch filtering
        query = await addBranchFilter(query, 'categories');
        const { data, error } = await query;

        if (error) throw error;
        return data || [];
      });
    },
    options
  );
}

/**
 * Hook specifically for branches with smart caching
 */
export function useSmartBranches(options: UseSmartCacheOptions<any> = {}) {
  return useSmartCache(
    'branches',
    async () => {
      const { smartCache } = await import('../lib/enhancedCacheManager');
      return smartCache.smartFetch('branches', async () => {
        const { supabase } = await import('../lib/supabase');
        const { data, error } = await supabase
          .from('lats_branches')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;
        return data || [];
      });
    },
    options
  );
}

/**
 * Hook specifically for suppliers with smart caching
 */
export function useSmartSuppliers(options: UseSmartCacheOptions<any> = {}) {
  return useSmartCache(
    'suppliers',
    async () => {
      const { smartCache } = await import('../lib/enhancedCacheManager');
      return smartCache.smartFetch('suppliers', async () => {
        const { supabase } = await import('../lib/supabase');
        const { addBranchFilter } = await import('../lib/branchAwareApi');
        let query = supabase
          .from('lats_suppliers')
          .select('*')
          .eq('is_active', true);
        
        // Apply branch filtering
        query = await addBranchFilter(query, 'suppliers');
        const { data, error } = await query;

        if (error) throw error;
        return data || [];
      });
    },
    options
  );
}

/**
 * Hook to get cache statistics
 */
export function useCacheStats() {
  const [stats, setStats] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const cacheStats = await smartCache.getCacheStats();
        setStats(cacheStats);
      } catch (error) {
        console.error('Failed to load cache stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();

    // Refresh stats every 10 seconds
    const interval = setInterval(loadStats, 10000);

    return () => clearInterval(interval);
  }, []);

  return { stats, isLoading };
}

/**
 * Hook to clear cache
 */
export function useClearCache() {
  const [isClearing, setIsClearing] = useState(false);

  const clearCache = useCallback(async () => {
    setIsClearing(true);
    try {
      await smartCache.clearAllCache();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsClearing(false);
    }
  }, []);

  return { clearCache, isClearing };
}

