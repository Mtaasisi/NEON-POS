/**
 * Product Preloader
 * Preloads products in the background when app is open
 * This ensures products are always available and up-to-date without blocking the UI
 * 
 * Features:
 * - Loads products immediately when app opens (even if cache exists)
 * - Refreshes products in background periodically
 * - Refreshes when app becomes visible (user switches back to tab)
 * - Uses cache for instant display, updates in background
 */

import { useEffect, useRef } from 'react';
import { useInventoryStore } from '../features/lats/stores/useInventoryStore';
import { productCacheService } from '../lib/productCacheService';
import { useAuth } from '../context/AuthContext';

const ProductPreloader: React.FC = () => {
  const { currentUser } = useAuth();
  const { products, loadProducts } = useInventoryStore();
  const hasPreloaded = useRef(false);
  const isBackgroundLoading = useRef(false);
  const lastLoadTime = useRef<number>(0);

  // Background load function - doesn't block UI
  const backgroundLoadProducts = async (force = false) => {
    // Prevent multiple simultaneous loads
    if (isBackgroundLoading.current) {
      console.log('⏳ [ProductPreloader] Background load already in progress, skipping');
      return;
    }

    // Throttle: Don't load more than once every 30 seconds
    const now = Date.now();
    if (!force && now - lastLoadTime.current < 30000) {
      console.log('⏱️ [ProductPreloader] Throttled - too soon since last load');
      return;
    }

    isBackgroundLoading.current = true;
    lastLoadTime.current = now;

    try {
      console.log('🔄 [ProductPreloader] Background loading products...');
      await loadProducts({ page: 1, limit: 500 }, force);
      
      // Get the updated products count from store
      const updatedProducts = useInventoryStore.getState().products;
      console.log(`✅ [ProductPreloader] Background load completed (${updatedProducts.length} products)`);
    } catch (error) {
      console.error('❌ [ProductPreloader] Background load failed:', error);
    } finally {
      isBackgroundLoading.current = false;
    }
  };

  // Initial load when app opens
  useEffect(() => {
    // Only preload if user is authenticated
    if (!currentUser) {
      console.log('🔒 [ProductPreloader] User not authenticated, skipping preload');
      return;
    }

    const initializeProducts = async () => {
      try {
        console.log('🚀 [ProductPreloader] Initializing product preload...');

        // First, check if we have cached products for instant display
        const cachedProducts = productCacheService.getProducts();
        
        if (cachedProducts && cachedProducts.length > 0) {
          console.log(`⚡ [ProductPreloader] Found ${cachedProducts.length} cached products - instant display ready`);
          // Mark as preloaded so we can use cache immediately
          hasPreloaded.current = true;
          
          // Still load fresh data in background (non-blocking)
          // Use a small delay to not interfere with initial render
          setTimeout(() => {
            backgroundLoadProducts(false);
          }, 2000); // Wait 2 seconds after app load to start background refresh
        } else {
          // No cache, load immediately but still non-blocking
          console.log('📡 [ProductPreloader] No cache found, loading from database...');
          await backgroundLoadProducts(false);
          hasPreloaded.current = true;
        }
      } catch (error) {
        console.error('❌ [ProductPreloader] Failed to initialize products:', error);
      }
    };

    // Start loading with a small delay to not block initial render
    const timeoutId = setTimeout(initializeProducts, 100);
    
    return () => clearTimeout(timeoutId);
  }, [currentUser]);

  // Persist products to localStorage whenever they change
  useEffect(() => {
    if (products && products.length > 0) {
      console.log(`💾 [ProductPreloader] Persisting ${products.length} products to cache`);
      productCacheService.saveProducts(products);
    }
  }, [products]);

  // Refresh products periodically in the background (every 15 minutes)
  useEffect(() => {
    if (!currentUser) return;

    const refreshInterval = setInterval(() => {
      console.log('🔄 [ProductPreloader] Periodic background refresh triggered');
      backgroundLoadProducts(true); // Force refresh
    }, 15 * 60 * 1000); // 15 minutes (reduced from 30 for fresher data)

    return () => clearInterval(refreshInterval);
  }, [currentUser]);

  // Refresh when app becomes visible (user switches back to tab/window)
  useEffect(() => {
    if (!currentUser) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App became visible - refresh products in background
        const timeSinceLastLoad = Date.now() - lastLoadTime.current;
        // Only refresh if it's been more than 1 minute since last load
        if (timeSinceLastLoad > 60000) {
          console.log('👁️ [ProductPreloader] App became visible - refreshing products in background');
          backgroundLoadProducts(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser]);

  // Refresh when window gains focus (user clicks back into the app)
  useEffect(() => {
    if (!currentUser) return;

    const handleFocus = () => {
      const timeSinceLastLoad = Date.now() - lastLoadTime.current;
      // Only refresh if it's been more than 2 minutes since last load
      if (timeSinceLastLoad > 120000) {
        console.log('🎯 [ProductPreloader] Window focused - refreshing products in background');
        backgroundLoadProducts(false);
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser]);

  return null; // This component doesn't render anything
};

export default ProductPreloader;

