/**
 * BackgroundDataLoader Component
 * Monitors background data loading and uses unified loading system
 * Now non-blocking - uses GlobalLoadingProgress!
 */

import React, { useEffect, useRef } from 'react';
import { useInventoryStore } from '../features/lats/stores/useInventoryStore';
import { useLoadingJob } from '../hooks/useLoadingJob';
import { useDataStore } from '../stores/useDataStore';

const BackgroundDataLoader: React.FC = () => {
  const { isLoading: storeLoading, products } = useInventoryStore();
  const { startLoading, completeLoading } = useLoadingJob();
  const dataStore = useDataStore();
  const jobIdRef = useRef<string | null>(null);
  const cacheInitializedRef = useRef<boolean>(false);
  const customersLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    if (storeLoading && !jobIdRef.current) {
      // Start loading job when store is loading
      jobIdRef.current = startLoading('Loading inventory data...');
    }

    if (!storeLoading && jobIdRef.current) {
      // Complete when store is done loading
      completeLoading(jobIdRef.current);
      jobIdRef.current = null;
    }
  }, [storeLoading, startLoading, completeLoading]);

  // Initialize global cache when products are loaded or updated
  useEffect(() => {
    if (products && products.length > 0) {
      // Initialize child variants cache in background
      // ✅ FIX: Always try to preload, even if cache was initialized before
      // This ensures cache is updated when products change
      const initializeGlobalCache = async () => {
        try {
          console.log('🚀 [BackgroundDataLoader] Initializing/updating global cache service...');
          const { childVariantsCacheService } = await import('../services/childVariantsCacheService');

          // Check if we have products with variants
          const productsWithVariants = products.filter(p => p.variants && Array.isArray(p.variants) && p.variants.length > 0);
          
          if (productsWithVariants.length === 0) {
            console.log('ℹ️ [BackgroundDataLoader] No products with variants found, skipping child variants preload');
            return;
          }

          console.log(`📊 [BackgroundDataLoader] Found ${productsWithVariants.length} products with variants, preloading child variants...`);

          // Preload all child variants for instant variant selection
          // ✅ FIX: Force refresh if cache is invalid or too old
          const cacheStats = childVariantsCacheService.getCacheStats();
          const shouldForceRefresh = !cacheStats.isValid || parseFloat(cacheStats.ageMinutes || '0') > 10;
          
          if (shouldForceRefresh) {
            console.log('🔄 [BackgroundDataLoader] Cache invalid or stale, forcing refresh...');
            childVariantsCacheService.clearCache();
          }

          await childVariantsCacheService.preloadAllChildVariants(products);
          console.log('✅ [BackgroundDataLoader] Global cache service initialized/updated successfully');
          cacheInitializedRef.current = true;
        } catch (error) {
          console.warn('⚠️ [BackgroundDataLoader] Failed to initialize global cache service:', error);
          // Don't set cacheInitializedRef to false on error - allow retry on next product update
        }
      };

      // Initialize cache in background (non-blocking)
      initializeGlobalCache();
    } else if (products && products.length === 0) {
      // Reset cache initialization flag when products are cleared
      cacheInitializedRef.current = false;
    }
  }, [products]);

  // Preload all essential data when component mounts
  useEffect(() => {
    const preloadData = async () => {
      const tasks = [];

      // Preload customers
      if (!customersLoadedRef.current && (!dataStore.customers || dataStore.customers.length === 0)) {
        tasks.push(
          (async () => {
            try {
              if (import.meta.env.DEV) console.log('🚀 Preloading customers data...');
              const { dataPreloadService } = await import('../services/dataPreloadService');
              await dataPreloadService.refreshData('customers');
              customersLoadedRef.current = true;
              if (import.meta.env.DEV) console.log('✅ Customers data preloaded successfully');
            } catch (error) {
              console.warn('⚠️ Failed to preload customers:', error);
            }
          })()
        );
      }

      // Preload settings - HIGH PRIORITY for fast settings access
      if (!dataStore.settings) {
        tasks.push(
          (async () => {
            try {
              if (import.meta.env.DEV) console.log('🚀 Preloading settings data...');
              const { dataPreloadService } = await import('../services/dataPreloadService');
              await dataPreloadService.refreshData('settings');
              if (import.meta.env.DEV) console.log('✅ Settings data preloaded successfully');
            } catch (error) {
              console.warn('⚠️ Failed to preload settings:', error);
            }
          })()
        );
      }

      // Preload admin settings - HIGH PRIORITY for fast admin access
      if (!dataStore.adminSettings || dataStore.adminSettings.length === 0) {
        tasks.push(
          (async () => {
            try {
              if (import.meta.env.DEV) console.log('🚀 Preloading admin settings data...');
              const { dataPreloadService } = await import('../services/dataPreloadService');
              await dataPreloadService.refreshData('admin_settings');
              if (import.meta.env.DEV) console.log('✅ Admin settings data preloaded successfully');
            } catch (error) {
              console.warn('⚠️ Failed to preload admin settings:', error);
            }
          })()
        );
      }

      // Preload purchase orders - HIGH PRIORITY for fast PO page access
      if (!dataStore.purchaseOrders || dataStore.purchaseOrders.length === 0) {
        tasks.push(
          (async () => {
            try {
              if (import.meta.env.DEV) console.log('🚀 Preloading purchase orders data...');
              const { dataPreloadService } = await import('../services/dataPreloadService');
              await dataPreloadService.refreshData('purchase_orders');
              if (import.meta.env.DEV) console.log('✅ Purchase orders data preloaded successfully');
            } catch (error) {
              console.warn('⚠️ Failed to preload purchase orders:', error);
            }
          })()
        );
      }

      // Preload stock movements - MEDIUM PRIORITY for inventory tracking
      if (!dataStore.stockMovements || dataStore.stockMovements.length === 0) {
        tasks.push(
          (async () => {
            try {
              if (import.meta.env.DEV) console.log('🚀 Preloading stock movements data...');
              const { dataPreloadService } = await import('../services/dataPreloadService');
              await dataPreloadService.refreshData('stock_movements');
              if (import.meta.env.DEV) console.log('✅ Stock movements data preloaded successfully');
            } catch (error) {
              console.warn('⚠️ Failed to preload stock movements:', error);
            }
          })()
        );
      }

      // Preload sales data - MEDIUM PRIORITY for analytics and history
      if (!dataStore.sales || dataStore.sales.length === 0) {
        tasks.push(
          (async () => {
            try {
              if (import.meta.env.DEV) console.log('🚀 Preloading sales data...');
              const { dataPreloadService } = await import('../services/dataPreloadService');
              await dataPreloadService.refreshData('sales');
              if (import.meta.env.DEV) console.log('✅ Sales data preloaded successfully');
            } catch (error) {
              console.warn('⚠️ Failed to preload sales:', error);
            }
          })()
        );
      }

      // Preload parent variants
      if (!dataStore.parentVariants || dataStore.parentVariants.length === 0) {
        tasks.push(
          (async () => {
            try {
              if (import.meta.env.DEV) console.log('🚀 Preloading parent variants data...');
              const { dataPreloadService } = await import('../services/dataPreloadService');
              await dataPreloadService.refreshData('parent_variants');
              if (import.meta.env.DEV) console.log('✅ Parent variants data preloaded successfully');
            } catch (error) {
              console.warn('⚠️ Failed to preload parent variants:', error);
            }
          })()
        );
      }

      // Preload employees
      if (!dataStore.employees || dataStore.employees.length === 0) {
        tasks.push(
          (async () => {
            try {
              if (import.meta.env.DEV) console.log('🚀 Preloading employees data...');
              const { dataPreloadService } = await import('../services/dataPreloadService');
              await dataPreloadService.refreshData('employees');
              if (import.meta.env.DEV) console.log('✅ Employees data preloaded successfully');
            } catch (error) {
              console.warn('⚠️ Failed to preload employees:', error);
            }
          })()
        );
      }

      // Preload payment methods
      if (!dataStore.paymentMethods || dataStore.paymentMethods.length === 0) {
        tasks.push(
          (async () => {
            try {
              if (import.meta.env.DEV) console.log('🚀 Preloading payment methods data...');
              const { dataPreloadService } = await import('../services/dataPreloadService');
              await dataPreloadService.refreshData('payment_methods');
              if (import.meta.env.DEV) console.log('✅ Payment methods data preloaded successfully');
            } catch (error) {
              console.warn('⚠️ Failed to preload payment methods:', error);
            }
          })()
        );
      }

      // Preload attendance records
      if (!dataStore.attendanceRecords || dataStore.attendanceRecords.length === 0) {
        tasks.push(
          (async () => {
            try {
              if (import.meta.env.DEV) console.log('🚀 Preloading attendance records data...');
              const { dataPreloadService } = await import('../services/dataPreloadService');
              await dataPreloadService.refreshData('attendance_records');
              if (import.meta.env.DEV) console.log('✅ Attendance records data preloaded successfully');
            } catch (error) {
              console.warn('⚠️ Failed to preload attendance records:', error);
            }
          })()
        );
      }

      // Execute all tasks in parallel
      await Promise.all(tasks);
    };

    // Preload data immediately (non-blocking)
    preloadData();
  }, [
    dataStore.customers?.length || 0,
    dataStore.settings,
    dataStore.adminSettings?.length || 0,
    dataStore.purchaseOrders?.length || 0,
    dataStore.stockMovements?.length || 0,
    dataStore.sales?.length || 0,
    dataStore.parentVariants?.length || 0,
    dataStore.employees?.length || 0,
    dataStore.paymentMethods?.length || 0,
    dataStore.attendanceRecords?.length || 0
  ]);

  // No visible component needed - GlobalLoadingProgress handles it!
  return null;
};

export default BackgroundDataLoader;
