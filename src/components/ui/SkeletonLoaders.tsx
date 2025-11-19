/**
 * Skeleton Loaders Library
 * Reusable skeleton components for all pages
 * Provides loading previews that match actual content structure
 */

import React from 'react';

// Base Skeleton Component
export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
);

// Page Header Skeleton
export const PageHeaderSkeleton: React.FC = () => (
  <div className="animate-pulse mb-6">
    <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
    <div className="h-4 w-64 bg-gray-200 rounded"></div>
  </div>
);

// Stats Card Skeleton
export const StatsCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="h-4 w-20 bg-gray-200 rounded mb-3"></div>
    <div className="h-8 w-24 bg-gray-200 rounded mb-2"></div>
    <div className="h-3 w-16 bg-gray-200 rounded"></div>
  </div>
);

// Table Row Skeleton
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
  <div className="px-6 py-4 flex gap-4 animate-pulse">
    {Array.from({ length: columns }).map((_, i) => (
      <div key={i} className="h-4 flex-1 bg-gray-200 rounded"></div>
    ))}
  </div>
);

// Table Skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 animate-pulse">
      <div className="h-6 w-32 bg-gray-200 rounded"></div>
    </div>
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  </div>
);

// Product Card Skeleton
export const ProductCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
    <div className="h-40 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg mb-3"></div>
    <div className="h-5 w-3/4 bg-gray-200 rounded mb-2"></div>
    <div className="h-4 w-1/2 bg-gray-200 rounded mb-3"></div>
    <div className="flex justify-between items-center mb-3">
      <div className="h-6 w-20 bg-gray-200 rounded"></div>
      <div className="h-4 w-16 bg-gray-200 rounded"></div>
    </div>
    <div className="h-10 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
  </div>
);

// Product Grid Skeleton
export const ProductGridSkeleton: React.FC<{ 
  itemCount?: number;
  columns?: 1 | 2 | 3 | 4;
  showSearchBar?: boolean;
  showCategories?: boolean;
}> = ({
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
        {showSearchBar && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex gap-3">
              <div className="h-10 flex-1 bg-gray-200 rounded"></div>
              <div className="h-10 w-24 bg-gray-200 rounded"></div>
              <div className="h-10 w-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        )}

        {showCategories && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-8 w-24 bg-gray-200 rounded-full flex-shrink-0"></div>
            ))}
          </div>
        )}

        <div className={`grid ${gridColsClass[columns]} gap-4`}>
          {Array.from({ length: itemCount }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Customer List Skeleton
export const CustomerListSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 animate-pulse">
      <div className="flex gap-3">
        <div className="h-10 flex-1 bg-gray-200 rounded"></div>
        <div className="h-10 w-32 bg-gray-200 rounded"></div>
      </div>
    </div>
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
          <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 bg-gray-200 rounded"></div>
            <div className="h-3 w-32 bg-gray-200 rounded"></div>
          </div>
          <div className="h-8 w-20 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

// Dashboard Skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div className="animate-pulse">
      <PageHeaderSkeleton />
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts/Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  </div>
);

// Form Skeleton
export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 5 }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="h-6 w-40 bg-gray-200 rounded mb-6"></div>
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
          <div className="h-10 w-full bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
    <div className="flex gap-3 mt-6">
      <div className="h-10 w-24 bg-gray-200 rounded"></div>
      <div className="h-10 w-24 bg-gray-200 rounded"></div>
    </div>
  </div>
);

// Search Results Skeleton
export const SearchResultsSkeleton: React.FC<{ results?: number }> = ({ results = 5 }) => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="h-10 w-full bg-gray-200 rounded"></div>
    </div>
    <div className="divide-y divide-gray-200">
      {Array.from({ length: results }).map((_, i) => (
        <div key={i} className="px-6 py-4 flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-200 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
            <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Full Page Skeleton with Header
export const FullPageSkeleton: React.FC<{
  showHeader?: boolean;
  showStats?: boolean;
  showTable?: boolean;
  showGrid?: boolean;
}> = ({
  showHeader = true,
  showStats = true,
  showTable = false,
  showGrid = false
}) => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <div className="animate-pulse">
      {/* Header Bar */}
      {showHeader && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                <div className="h-8 w-32 bg-gray-200 rounded"></div>
                <div className="h-6 w-24 bg-gray-200 rounded"></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="h-8 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeaderSkeleton />
        
        {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
        )}

        {showTable && <TableSkeleton rows={8} columns={5} />}
        
        {showGrid && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default {
  Skeleton,
  PageHeaderSkeleton,
  StatsCardSkeleton,
  TableRowSkeleton,
  TableSkeleton,
  ProductCardSkeleton,
  ProductGridSkeleton,
  CustomerListSkeleton,
  DashboardSkeleton,
  FormSkeleton,
  SearchResultsSkeleton,
  FullPageSkeleton
};

