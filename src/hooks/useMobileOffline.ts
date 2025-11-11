/**
 * useMobileOffline Hook
 * Provides easy access to offline data caching and sync functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { mobileOfflineCache } from '../lib/mobileOfflineCache';
import { mobileDataSync } from '../lib/mobileDataSync';
import { isNativeApp } from '../utils/platformDetection';

interface UseMobileOfflineReturn {
  // Connection status
  isOnline: boolean;
  isSyncing: boolean;
  isNativeApp: boolean;
  
  // Cached data
  products: any[];
  customers: any[];
  sales: any[];
  branches: any[];
  categories: any[];
  paymentAccounts: any[];
  
  // Loading states
  productsLoading: boolean;
  customersLoading: boolean;
  
  // Actions
  syncNow: () => Promise<boolean>;
  getCacheStats: () => Promise<any>;
  clearCache: () => Promise<void>;
  savePendingSale: (sale: any) => Promise<number>;
  
  // Refresh functions
  refreshProducts: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
}

/**
 * Hook to access mobile offline functionality
 */
export const useMobileOffline = (): UseMobileOfflineReturn => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Cached data
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  
  // Loading states
  const [productsLoading, setProductsLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(true);

  // Load cached data
  const loadCachedData = useCallback(async () => {
    try {
      console.log('📦 [useMobileOffline] Loading cached data...');
      
      const [
        cachedProducts,
        cachedCustomers,
        cachedSales,
        cachedBranches,
        cachedCategories,
        cachedPaymentAccounts,
      ] = await Promise.all([
        mobileOfflineCache.getProducts(),
        mobileOfflineCache.getCustomers(),
        mobileOfflineCache.getSales(),
        mobileOfflineCache.getBranches(),
        mobileOfflineCache.getCategories(),
        mobileOfflineCache.getPaymentAccounts(),
      ]);

      setProducts(cachedProducts);
      setCustomers(cachedCustomers);
      setSales(cachedSales);
      setBranches(cachedBranches);
      setCategories(cachedCategories);
      setPaymentAccounts(cachedPaymentAccounts);

      console.log('✅ [useMobileOffline] Cached data loaded:', {
        products: cachedProducts.length,
        customers: cachedCustomers.length,
        sales: cachedSales.length,
        branches: cachedBranches.length,
        categories: cachedCategories.length,
        paymentAccounts: cachedPaymentAccounts.length,
      });
    } catch (error) {
      console.error('❌ [useMobileOffline] Error loading cached data:', error);
    } finally {
      setProductsLoading(false);
      setCustomersLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (isNativeApp()) {
      loadCachedData();
    }
  }, [loadCachedData]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('📶 [useMobileOffline] Device is online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('📵 [useMobileOffline] Device is offline');
      setIsOnline(false);
    };

    // Listen for sync events
    const handleDataSynced = () => {
      console.log('🔄 [useMobileOffline] Data synced, reloading cached data...');
      loadCachedData();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('dataSynced', handleDataSynced);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('dataSynced', handleDataSynced);
    };
  }, [loadCachedData]);

  // Sync now
  const syncNow = useCallback(async (): Promise<boolean> => {
    setIsSyncing(true);
    try {
      const result = await mobileDataSync.forceSyncNow();
      if (result) {
        await loadCachedData();
      }
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [loadCachedData]);

  // Get cache stats
  const getCacheStats = useCallback(async () => {
    return await mobileOfflineCache.getCacheStats();
  }, []);

  // Clear cache
  const clearCache = useCallback(async () => {
    await mobileOfflineCache.clearAll();
    setProducts([]);
    setCustomers([]);
    setSales([]);
    setBranches([]);
    setCategories([]);
    setPaymentAccounts([]);
  }, []);

  // Save pending sale
  const savePendingSale = useCallback(async (sale: any): Promise<number> => {
    return await mobileOfflineCache.savePendingSale(sale);
  }, []);

  // Refresh products
  const refreshProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const cachedProducts = await mobileOfflineCache.getProducts();
      setProducts(cachedProducts);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // Refresh customers
  const refreshCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const cachedCustomers = await mobileOfflineCache.getCustomers();
      setCustomers(cachedCustomers);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  return {
    isOnline,
    isSyncing,
    isNativeApp: isNativeApp(),
    products,
    customers,
    sales,
    branches,
    categories,
    paymentAccounts,
    productsLoading,
    customersLoading,
    syncNow,
    getCacheStats,
    clearCache,
    savePendingSale,
    refreshProducts,
    refreshCustomers,
  };
};

