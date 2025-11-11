/**
 * Product Preloader
 * Preloads products once on app startup and keeps them cached
 * This ensures products are always available without repeated loading
 */

import { useEffect, useRef } from 'react';
import { useInventoryStore } from '../features/lats/stores/useInventoryStore';
import { productCacheService } from '../lib/productCacheService';
import { useAuth } from '../context/AuthContext';

const ProductPreloader: React.FC = () => {
  const { currentUser } = useAuth();
  const { products, loadProducts } = useInventoryStore();
  const hasPreloaded = useRef(false);

  useEffect(() => {
    // Only preload if user is authenticated
    if (!currentUser) {
      console.log('🔒 [ProductPreloader] User not authenticated, skipping preload');
      return;
    }

    // Only run once per session
    if (hasPreloaded.current) {
      console.log('⏭️ [ProductPreloader] Already preloaded, skipping');
      return;
    }

    const preloadProducts = async () => {
      try {
        console.log('🚀 [ProductPreloader] Starting product preload...');

        // Check if we have cached products in localStorage
        const cachedProducts = productCacheService.getProducts();
        
        if (cachedProducts && cachedProducts.length > 0) {
          console.log(`⚡ [ProductPreloader] Found ${cachedProducts.length} cached products, using cache`);
          hasPreloaded.current = true;
          return;
        }

        // No cache, load from database
        console.log('📡 [ProductPreloader] No cache found, loading from database...');
        await loadProducts({ page: 1, limit: 500 }, false);
        
        hasPreloaded.current = true;
        console.log(`✅ [ProductPreloader] Successfully preloaded ${products.length} products`);
      } catch (error) {
        console.error('❌ [ProductPreloader] Failed to preload products:', error);
      }
    };

    // Preload with a small delay to not block initial render
    const timeoutId = setTimeout(preloadProducts, 100);
    
    return () => clearTimeout(timeoutId);
  }, [currentUser]);

  // Persist products to localStorage whenever they change
  useEffect(() => {
    if (products && products.length > 0 && hasPreloaded.current) {
      console.log(`💾 [ProductPreloader] Persisting ${products.length} products to cache`);
      productCacheService.saveProducts(products);
    }
  }, [products]);

  // Refresh products every 30 minutes in the background
  useEffect(() => {
    if (!currentUser || !hasPreloaded.current) return;

    const refreshInterval = setInterval(() => {
      console.log('🔄 [ProductPreloader] Background refresh triggered');
      loadProducts({ page: 1, limit: 500 }, true); // Force refresh
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(refreshInterval);
  }, [currentUser, loadProducts]);

  return null; // This component doesn't render anything
};

export default ProductPreloader;

