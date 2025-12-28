import { useState, useEffect, useRef } from 'react';
import { loadChildIMEIs, loadAvailableChildIMEIs } from '../features/lats/lib/variantHelpers';
import { childVariantsCacheService } from '../services/childVariantsCacheService';
import { ChildVariant } from '../stores/useDataStore';
import { useChildVariantsData } from '../stores/useDataStore';

// Cache for child variants data to prevent unnecessary refetches
const childVariantsCache = new Map<string, {
  data: ChildVariant[];
  timestamp: number;
}>();

// Cache timeout (5 minutes)
const CACHE_TIMEOUT = 5 * 60 * 1000;

interface UseChildVariantsOptions {
  parentVariantId?: string;
  availableOnly?: boolean;
  autoFetch?: boolean;
  cacheKey?: string;
}

interface UseChildVariantsReturn {
  childVariants: ChildVariant[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useChildVariants(options: UseChildVariantsOptions = {}): UseChildVariantsReturn {
  const { parentVariantId, availableOnly = false, autoFetch = true, cacheKey = 'default' } = options;

  const preloadedVariants = useChildVariantsData();
  const [childVariants, setChildVariants] = useState<ChildVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchChildVariants = async (forceRefresh = false) => {
    if (!isMountedRef.current || !parentVariantId) return;

    const cacheKeyWithParent = `${cacheKey}_${parentVariantId}_${availableOnly ? 'available' : 'all'}`;

    // Check child variants cache service first (unless force refresh)
    if (!forceRefresh) {
      const cachedChildren = childVariantsCacheService.getChildVariants(parentVariantId);
      if (cachedChildren && cachedChildren.length > 0) {
        console.log(`✅ Using cached child variants for parent ${parentVariantId}: ${cachedChildren.length} variants`);
        setChildVariants(cachedChildren);
        setLoading(false);
        setError(null);
        return;
      }
    }

    // Check preloaded data (as fallback)
    if (!forceRefresh && preloadedVariants.length > 0) {
      const parentVariants = preloadedVariants.filter(v => v.parent_variant_id === parentVariantId);
      if (parentVariants.length > 0) {
        console.log(`✅ Using preloaded child variants for parent ${parentVariantId}: ${parentVariants.length} variants`);
        setChildVariants(parentVariants);
        setLoading(false);
        setError(null);
        return;
      }
    }

    // Check local cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = childVariantsCache.get(cacheKeyWithParent);
      if (cached && Date.now() - cached.timestamp < CACHE_TIMEOUT) {
        setChildVariants(cached.data);
        setLoading(false);
        setError(null);
        return;
      }
    }

    // Fetch from API
    try {
      setLoading(true);
      setError(null);

      let data: ChildVariant[];

      if (availableOnly) {
        data = await loadAvailableChildIMEIs(parentVariantId);
      } else {
        data = await loadChildIMEIs(parentVariantId);
      }

      // Update cache
      childVariantsCache.set(cacheKeyWithParent, {
        data,
        timestamp: Date.now()
      });

      if (isMountedRef.current) {
        setChildVariants(data);
        setLoading(false);
        setError(null);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch child variants';

      if (isMountedRef.current) {
        console.error('❌ Error fetching child variants:', errorMessage);
        setError(errorMessage);
        setLoading(false);
      }
    }
  };

  const refetch = async () => {
    await fetchChildVariants(true);
  };

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && parentVariantId) {
      fetchChildVariants();
    }
  }, [autoFetch, parentVariantId, availableOnly, cacheKey]);

  return {
    childVariants,
    loading,
    error,
    refetch
  };
}
