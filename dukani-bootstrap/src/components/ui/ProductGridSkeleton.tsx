/**
 * ProductGridSkeleton Component
 * Reusable skeleton loader for product grids
 * Shows a preview of the actual product layout while loading
 */

import React from 'react';

interface ProductGridSkeletonProps {
  itemCount?: number;
  columns?: 1 | 2 | 3 | 4;
  showSearchBar?: boolean;
  showCategories?: boolean;
}

const ProductGridSkeleton: React.FC<ProductGridSkeletonProps> = ({
  itemCount = 8,
  columns = 4,
  showSearchBar = true,
  showCategories = true
}) => {
  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="animate-pulse">
        {/* Search Bar Skeleton */}
        {showSearchBar && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex gap-3">
              <div className="h-10 flex-1 bg-gray-200 rounded"></div>
              <div className="h-10 w-24 bg-gray-200 rounded"></div>
              <div className="h-10 w-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        )}

        {/* Category Filter Skeleton */}
        {showCategories && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-8 w-24 bg-gray-200 rounded-full flex-shrink-0"></div>
            ))}
          </div>
        )}

        {/* Products Grid Skeleton */}
        <div className={`grid ${gridColsClass[columns]} gap-4`}>
          {Array.from({ length: itemCount }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
              {/* Product Image Skeleton */}
              <div className="h-40 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg mb-3"></div>
              
              {/* Product Name Skeleton */}
              <div className="h-5 w-3/4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-1/2 bg-gray-200 rounded mb-3"></div>
              
              {/* Price Skeleton */}
              <div className="flex justify-between items-center mb-3">
                <div className="h-6 w-20 bg-gray-200 rounded"></div>
                <div className="h-4 w-16 bg-gray-200 rounded"></div>
              </div>
              
              {/* Button Skeleton */}
              <div className="h-10 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductGridSkeleton;

