/**
 * VirtualizedProductGrid Component
 * ⚡ High-performance virtual scrolling for large product datasets
 * Only renders visible items to maintain smooth scrolling
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import VariantProductCard from '../features/lats/components/pos/VariantProductCard';
import { ProductSearchResult } from '../features/lats/types/pos';

interface VirtualizedProductGridProps {
  products: ProductSearchResult[];
  onAddToCart: (product: ProductSearchResult, variant?: any, quantity?: number) => void;
  itemHeight?: number; // Height of each product card
  containerHeight?: number; // Height of the scrollable container
  overscan?: number; // Number of extra items to render outside visible area
  className?: string;
  realTimeStockData?: Map<string, number>;
}

const VirtualizedProductGrid: React.FC<VirtualizedProductGridProps> = ({
  products,
  onAddToCart,
  itemHeight = 320, // Default card height
  containerHeight = 600, // Default container height
  overscan = 5, // Render 5 extra items above and below
  className = '',
  realTimeStockData
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeightState, setContainerHeightState] = useState(containerHeight);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const itemCount = products.length;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeightState) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeightState, overscan, products.length]);

  // Handle scroll events with throttling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTopValue = e.currentTarget.scrollTop;
    setScrollTop(scrollTopValue);
  }, []);

  // Update container height when it changes
  useEffect(() => {
    if (containerRef.current) {
      const height = containerRef.current.clientHeight;
      if (height !== containerHeightState) {
        setContainerHeightState(height);
      }
    }
  }, [containerHeightState]);

  // Calculate total height for the virtual container
  const totalHeight = products.length * itemHeight;

  // Get visible items
  const visibleItems = useMemo(() => {
    return products.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [products, visibleRange.startIndex, visibleRange.endIndex]);

  // Calculate offset for the visible items container
  const offsetY = visibleRange.startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Virtual container with total height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((product, index) => {
            const actualIndex = visibleRange.startIndex + index;
            return (
              <div
                key={`${product.id}-${actualIndex}`}
                style={{
                  height: itemHeight,
                  marginBottom: '1rem', // Add spacing between cards
                }}
              >
                <VariantProductCard
                  product={product}
                  onAddToCart={onAddToCart}
                  realTimeStockData={realTimeStockData}
                  compact={true}
                  className="w-full h-full"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance info for development */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
          Rendering {visibleItems.length} of {products.length} products
          <br />
          Range: {visibleRange.startIndex} - {visibleRange.endIndex}
        </div>
      )}
    </div>
  );
};

export default VirtualizedProductGrid;
