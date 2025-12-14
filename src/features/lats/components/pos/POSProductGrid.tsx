import React, { memo, useEffect, useState } from 'react';
import VariantProductCard from './VariantProductCard';
import { RealTimeStockService } from '../../lib/realTimeStock';

interface POSProductGridProps {
  products: any[];
  onAddToCart: (product: any, variant?: any, quantity?: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

const POSProductGrid: React.FC<POSProductGridProps> = memo(({
  products,
  onAddToCart,
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false
}) => {
  // Real-time stock data for all products (BATCH FETCH to avoid N+1 queries)
  const [realTimeStockData, setRealTimeStockData] = useState<Map<string, number>>(new Map());

  // 🚀 OPTIMIZED: Batch fetch stock data with debouncing and progress feedback
  useEffect(() => {
    let isMounted = true;
    const fetchAllStockData = async () => {
      if (!products || products.length === 0) return;

      try {
        const productIds = products.map(p => p.id);

        // Skip if already fetching or no products to fetch
        if (productIds.length === 0) return;

        if (import.meta.env.MODE === 'development') {
          console.log(`🔄 [POSProductGrid] Starting optimized stock fetch for ${productIds.length} products...`);
        }

        // Batch fetch stock for ALL products at once (optimized)
        const stockService = RealTimeStockService.getInstance();
        const stockLevels = await stockService.getStockLevels(productIds);

        if (!isMounted) return; // Component unmounted

        // Convert to Map for O(1) lookup performance
        const stockMap = new Map<string, number>();
        Object.entries(stockLevels).forEach(([productId, levels]) => {
          const totalStock = levels.reduce((sum, level) => sum + level.quantity, 0);
          stockMap.set(productId, totalStock);
        });

        setRealTimeStockData(stockMap);

        if (import.meta.env.MODE === 'development') {
          console.log(`✅ [POSProductGrid] Optimized stock fetch completed in ONE query for ${productIds.length} products`);
        }
      } catch (error) {
        if (isMounted) {
          console.error('❌ [POSProductGrid] Error in optimized stock fetch:', error);
          // Set empty map to prevent infinite loading states
          setRealTimeStockData(new Map());
        }
      }
    };

    fetchAllStockData();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [products]);

  const handleAddToCart = (product: any, variant?: any, quantity: number = 1) => {
    onAddToCart(product, variant, quantity);
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-full mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
              gap: 'clamp(1rem, 2vw, 1.5rem)',
              gridAutoRows: '1fr'
            }}
          >
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="animate-pulse w-full h-full">
                <div className="bg-gray-200 rounded-lg h-48 md:h-56 mb-3"></div>
                <div className="bg-gray-200 rounded h-4 mb-2"></div>
                <div className="bg-gray-200 rounded h-4 w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium mb-2">No products found</h3>
          <p className="text-sm">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Products Grid - Responsive auto-fill layout */}
      <div className="w-full max-w-full mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
        <div 
          className="pos-product-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
            gap: 'clamp(1rem, 2vw, 1.5rem)',
            gridAutoRows: '1fr'
          }}
        >
          {products.map((product, index) => (
            <VariantProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              compact={true}
              realTimeStockData={realTimeStockData}
              className="w-full h-full"
              isLastItem={index === products.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Product Count Display */}
      <div className="flex items-center justify-center px-4 py-3 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Showing {products.length} products
        </div>
      </div>
    </div>
  );
});

POSProductGrid.displayName = 'POSProductGrid';

export default POSProductGrid;
