import React, { memo, useEffect, useState } from 'react';
import VariantProductCard from './VariantProductCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import GlassButton from '../../../shared/components/ui/GlassButton';
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

  // Batch fetch stock data for all products when products change
  useEffect(() => {
    const fetchAllStockData = async () => {
      if (!products || products.length === 0) return;
      
      try {
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
        
        if (import.meta.env.MODE === 'development') {
          console.log(`✅ [POSProductGrid] Batch fetched stock for ${productIds.length} products in ONE query`);
        }
      } catch (error) {
        console.error('❌ [POSProductGrid] Error fetching batch stock:', error);
      }
    };

    fetchAllStockData();
  }, [products]);

  const handleAddToCart = (product: any, variant?: any, quantity: number = 1) => {
    onAddToCart(product, variant, quantity);
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 p-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-48 mb-2"></div>
              <div className="bg-gray-200 rounded h-4 mb-2"></div>
              <div className="bg-gray-200 rounded h-4 w-2/3"></div>
            </div>
          ))}
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
      {/* Products Grid */}
      <div className="pos-product-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 p-4">
        {products.map((product) => (
          <VariantProductCard
            key={product.id}
            product={product}
            onAddToCart={handleAddToCart}
            compact={true}
            realTimeStockData={realTimeStockData}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          
          <div className="flex items-center gap-2">
            <GlassButton
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </GlassButton>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                const isActive = page === currentPage;
                
                return (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            <GlassButton
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              variant="outline"
              size="sm"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </GlassButton>
          </div>
        </div>
      )}
    </div>
  );
});

POSProductGrid.displayName = 'POSProductGrid';

export default POSProductGrid;
