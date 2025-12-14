import { useState, useEffect, useRef } from 'react';
import { loadParentVariants } from '../features/lats/lib/variantHelpers';
import { ParentVariant } from '../stores/useDataStore';
import { useParentVariantsData } from '../stores/useDataStore';

// Cache for parent variants data to prevent unnecessary refetches
const parentVariantsCache = new Map<string, {
  data: ParentVariant[];
  timestamp: number;
}>();

// Cache timeout (5 minutes)
const CACHE_TIMEOUT = 5 * 60 * 1000;

interface UseParentVariantsOptions {
  productId?: string;
  autoFetch?: boolean;
  cacheKey?: string;
}

interface UseParentVariantsReturn {
  parentVariants: ParentVariant[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useParentVariants(options: UseParentVariantsOptions = {}): UseParentVariantsReturn {
  const { productId, autoFetch = true, cacheKey = 'default' } = options;

  const preloadedVariants = useParentVariantsData();
  const [parentVariants, setParentVariants] = useState<ParentVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchParentVariants = async (forceRefresh = false) => {
    if (!isMountedRef.current) return;

    const cacheKeyWithProduct = `${cacheKey}_${productId || 'all'}`;

    // Check preloaded data first (unless force refresh)
    if (!forceRefresh && preloadedVariants.length > 0) {
      if (productId) {
        // Filter variants for specific product
        const productVariants = preloadedVariants.filter(v => v.product_id === productId);
        console.log(`✅ Using preloaded parent variants for product ${productId}: ${productVariants.length} variants`);
        setParentVariants(productVariants);
      } else {
        console.log(`✅ Using preloaded parent variants: ${preloadedVariants.length} variants`);
        setParentVariants(preloadedVariants);
      }
      setLoading(false);
      setError(null);
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = parentVariantsCache.get(cacheKeyWithProduct);
      if (cached && Date.now() - cached.timestamp < CACHE_TIMEOUT) {
        setParentVariants(cached.data);
        setLoading(false);
        setError(null);
        return;
      }
    }

    // Fetch from API
    try {
      setLoading(true);
      setError(null);

      let data: ParentVariant[];

      if (productId) {
        // Load variants for specific product
        data = await loadParentVariants(productId);
      } else {
        // For now, return empty array if no productId specified
        // In the future, this could load all variants across all products
        data = [];
      }

      // Update cache
      parentVariantsCache.set(cacheKeyWithProduct, {
        data,
        timestamp: Date.now()
      });

      if (isMountedRef.current) {
        setParentVariants(data);
        setLoading(false);
        setError(null);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch parent variants';

      if (isMountedRef.current) {
        console.error('❌ Error fetching parent variants:', errorMessage);
        setError(errorMessage);
        setLoading(false);
      }
    }
  };

  const refetch = async () => {
    await fetchParentVariants(true);
  };

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchParentVariants();
    }
  }, [autoFetch, productId, cacheKey]);

  return {
    parentVariants,
    loading,
    error,
    refetch
  };
}
