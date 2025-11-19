/**
 * API Hooks
 * React hooks for API integration with loading states
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';
import { showToast } from '../components/ui/ImprovedToast';
import { getUserFriendlyError } from '../utils/errorMessages';

/**
 * Hook for fetching data with loading state
 */
export function useApiQuery<T>(
  queryFn: () => Promise<any>,
  options: {
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    showErrorToast?: boolean;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      const responseData = result.data || result;
      setData(responseData);
      options.onSuccess?.(responseData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options.onError?.(error);
      
      if (options.showErrorToast !== false) {
        showToast.error({
          title: 'Error',
          message: getUserFriendlyError(error),
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [queryFn, options]);

  useEffect(() => {
    if (options.enabled !== false) {
      refetch();
    }
  }, [options.enabled, refetch]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for API mutations (create, update, delete)
 */
export function useApiMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<any>,
  options: {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    showSuccessToast?: boolean;
    showErrorToast?: boolean;
    successMessage?: string;
  } = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (variables: TVariables) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mutationFn(variables);
      const responseData = result.data || result;
      
      options.onSuccess?.(responseData);
      
      if (options.showSuccessToast !== false) {
        showToast.success({
          message: options.successMessage || 'Success!',
        });
      }

      return responseData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options.onError?.(error);
      
      if (options.showErrorToast !== false) {
        showToast.error({
          title: 'Error',
          message: getUserFriendlyError(error),
        });
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, options]);

  return {
    mutate,
    isLoading,
    error,
  };
}

/**
 * Hook for products
 */
export function useProducts() {
  return useApiQuery(
    () => apiClient.getProducts(),
    { showErrorToast: true }
  );
}

/**
 * Hook for product search
 */
export function useProductSearch(query: string) {
  return useApiQuery(
    () => apiClient.searchProducts(query),
    { enabled: query.length > 0 }
  );
}

/**
 * Hook for customers
 */
export function useCustomersApi(search?: string) {
  return useApiQuery(
    () => apiClient.getCustomers({ search }),
    { showErrorToast: true }
  );
}

/**
 * Hook for sales
 */
export function useSales() {
  return useApiQuery(
    () => apiClient.getSales(),
    { showErrorToast: true }
  );
}

/**
 * Hook for creating sale
 */
export function useCreateSale() {
  return useApiMutation(
    (data: any) => apiClient.createSale(data),
    {
      showSuccessToast: true,
      successMessage: 'Sale completed successfully!',
    }
  );
}

/**
 * Hook for adding to cart
 */
export function useAddToCart() {
  return useApiMutation(
    (data: { productId: string; variantId?: string; quantity: number }) =>
      apiClient.addToCart(data),
    {
      showSuccessToast: true,
      successMessage: 'Added to cart!',
    }
  );
}

