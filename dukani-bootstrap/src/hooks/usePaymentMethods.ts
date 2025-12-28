import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PaymentMethod } from '../stores/useDataStore';
import { usePaymentMethodsData } from '../stores/useDataStore';

// Cache for payment methods data to prevent unnecessary refetches
const paymentMethodsDataCache = new Map<string, {
  data: PaymentMethod[];
  timestamp: number;
}>();

// Cache timeout (5 minutes)
const CACHE_TIMEOUT = 5 * 60 * 1000;

interface UsePaymentMethodsOptions {
  autoFetch?: boolean;
  cacheKey?: string;
  activeOnly?: boolean;
}

interface UsePaymentMethodsReturn {
  paymentMethods: PaymentMethod[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePaymentMethods(options: UsePaymentMethodsOptions = {}): UsePaymentMethodsReturn {
  const { autoFetch = true, cacheKey = 'default', activeOnly = true } = options;

  const preloadedPaymentMethods = usePaymentMethodsData();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchPaymentMethods = async (forceRefresh = false) => {
    if (!isMountedRef.current) return;

    const cacheKeyWithType = `${cacheKey}_${activeOnly ? 'active' : 'all'}`;

    // Check preloaded data first (unless force refresh)
    if (!forceRefresh && preloadedPaymentMethods.length > 0) {
      let filteredMethods = preloadedPaymentMethods;
      if (activeOnly) {
        filteredMethods = preloadedPaymentMethods.filter(method => method.is_active !== false);
      }
      console.log(`✅ Using preloaded payment methods: ${filteredMethods.length} methods`);
      setPaymentMethods(filteredMethods);
      setLoading(false);
      setError(null);
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = paymentMethodsDataCache.get(cacheKeyWithType);
      if (cached && Date.now() - cached.timestamp < CACHE_TIMEOUT) {
        setPaymentMethods(cached.data);
        setLoading(false);
        setError(null);
        return;
      }
    }

    // Fetch from API
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      // Filter if needed
      let filteredData = data || [];
      if (activeOnly) {
        filteredData = filteredData.filter(method => method.is_active !== false);
      }

      // Update cache
      paymentMethodsDataCache.set(cacheKeyWithType, {
        data: filteredData,
        timestamp: Date.now()
      });

      if (isMountedRef.current) {
        setPaymentMethods(filteredData);
        setLoading(false);
        setError(null);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch payment methods';

      if (isMountedRef.current) {
        console.error('❌ Error fetching payment methods:', errorMessage);
        setError(errorMessage);
        setLoading(false);
      }
    }
  };

  const refetch = async () => {
    await fetchPaymentMethods(true);
  };

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchPaymentMethods();
    }
  }, [autoFetch, cacheKey, activeOnly]);

  return {
    paymentMethods,
    loading,
    error,
    refetch
  };
}