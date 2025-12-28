import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Package, Loader2 } from 'lucide-react';
import { ProductSearchResult } from '../../types/pos';
import DynamicMobileProductCard from './DynamicMobileProductCard';
import DynamicProductText from './DynamicProductText';
import { RESPONSIVE_OPTIMIZATIONS } from '../../../shared/constants/theme';
import { useDynamicGrid } from '../../hooks/useDynamicGrid';
import { RealTimeStockService } from '../../lib/realTimeStock';

interface DynamicMobileProductGridProps {
  products: ProductSearchResult[];
  onAddToCart: (product: ProductSearchResult, variant?: any, quantity?: number) => void;
  isLoading: boolean;
  batchSize?: number;
  enableVirtualization?: boolean;
  enableDynamicGrid?: boolean;
  minCardWidth?: number;
  maxColumns?: number;
}

const DynamicMobileProductGrid: React.FC<DynamicMobileProductGridProps> = ({
  products,
  onAddToCart,
  isLoading,
  batchSize = 10,
  enableVirtualization = true,
  enableDynamicGrid = true,
  minCardWidth = 200, // Optimized for 3-column layout on small screens
  maxColumns = 3, // Perfect for small screens
}) => {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  
  // Real-time stock data
  const [realTimeStockData, setRealTimeStockData] = useState<Map<string, number>>(new Map());
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  
  // Dynamic grid container ref
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Batch fetch stock data for all products
  useEffect(() => {
    const fetchAllStockData = async () => {
      if (!products || products.length === 0) return;
      
      try {
        setIsLoadingStock(true);
        const productIds = products.map(p => p.id);
        
        // Batch fetch stock for ALL products at once
        const stockService = RealTimeStockService.getInstance();
        const stockLevels = await stockService.getStockLevels(productIds);
        
        // Convert to Map for easy lookup
        const stockMap = new Map<string, number>();
        Object.entries(stockLevels).forEach(([productId, levels]) => {
          const totalStock = levels.reduce((sum, level) => sum + level.quantity, 0);
          stockMap.set(productId, totalStock);
        });
        
        setRealTimeStockData(stockMap);
      } catch (error) {
        console.error('❌ [DynamicMobileProductGrid] Error fetching batch stock:', error);
      } finally {
        setIsLoadingStock(false);
      }
    };

    fetchAllStockData();
  }, [products]);
  
  // Dynamic grid calculation
  const { 
    columns, 
    containerWidth, 
    getGridClasses, 
    getOptimalCardWidth 
  } = useDynamicGrid({
    containerRef: gridContainerRef,
    minCardWidth,
    maxColumns,
    gap: 12, // Reduced gap for mobile
    containerPadding: 16 // Reduced padding for mobile
  });

  // Use all products (filtering is handled by parent component)
  const filteredProducts = products;

  // Get visible products for virtualization
  const visibleProducts = useMemo(() => {
    if (!enableVirtualization) return filteredProducts;
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount, enableVirtualization]);

  // Load more products
  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + batchSize, filteredProducts.length));
  }, [batchSize, filteredProducts.length]);

  // Reset visible count when products change
  React.useEffect(() => {
    setVisibleCount(batchSize);
  }, [products, batchSize]);

  // Check if there are more products to load
  const hasMore = visibleCount < filteredProducts.length;

  return (
    <div className="h-full flex flex-col">
      {/* Products Grid/List */}
      <div className={`flex-1 overflow-y-auto ${RESPONSIVE_OPTIMIZATIONS.spacing.padding.mobile} ${RESPONSIVE_OPTIMIZATIONS.spacing.padding.tablet} ${RESPONSIVE_OPTIMIZATIONS.spacing.padding.desktop} ${RESPONSIVE_OPTIMIZATIONS.spacing.padding.hd}`}>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <DynamicProductText priority={true}>
              <p className="text-gray-500 font-medium">No products found</p>
              <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
            </DynamicProductText>
          </div>
        ) : (
          <>
            <div 
              ref={gridContainerRef}
              className={
                enableDynamicGrid 
                  ? `${getGridClasses()} ${RESPONSIVE_OPTIMIZATIONS.spacing.gap.mobile} ${RESPONSIVE_OPTIMIZATIONS.spacing.gap.tablet} ${RESPONSIVE_OPTIMIZATIONS.spacing.gap.desktop} ${RESPONSIVE_OPTIMIZATIONS.spacing.gap.hd}`
                  : `grid ${RESPONSIVE_OPTIMIZATIONS.gridLayout.mobile} ${RESPONSIVE_OPTIMIZATIONS.gridLayout.tablet} ${RESPONSIVE_OPTIMIZATIONS.gridLayout.desktop} ${RESPONSIVE_OPTIMIZATIONS.gridLayout.hd} ${RESPONSIVE_OPTIMIZATIONS.gridLayout.ultraHd} ${RESPONSIVE_OPTIMIZATIONS.spacing.gap.mobile} ${RESPONSIVE_OPTIMIZATIONS.spacing.gap.tablet} ${RESPONSIVE_OPTIMIZATIONS.spacing.gap.desktop} ${RESPONSIVE_OPTIMIZATIONS.spacing.gap.hd}`
              }
            >
              {visibleProducts.map((product, index) => (
                <DynamicMobileProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={onAddToCart}
                  priority={index < 4} // Prioritize first 4 products
                  realTimeStockData={realTimeStockData}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={loadMore}
                  className={`${RESPONSIVE_OPTIMIZATIONS.buttonSizes.mobile} ${RESPONSIVE_OPTIMIZATIONS.buttonSizes.tablet} ${RESPONSIVE_OPTIMIZATIONS.buttonSizes.desktop} ${RESPONSIVE_OPTIMIZATIONS.buttonSizes.hd} bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors text-xs`}
                >
                  Load More ({filteredProducts.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};

export default DynamicMobileProductGrid;
