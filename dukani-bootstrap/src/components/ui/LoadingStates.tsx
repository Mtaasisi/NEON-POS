/**
 * Loading States Components
 * Provides consistent loading UI across the application
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

// Full Screen Loading Overlay
export const LoadingOverlay: React.FC<{
  message?: string;
  transparent?: boolean;
}> = ({ message = 'Loading...', transparent = false }) => (
  <div 
    className={`fixed inset-0 flex items-center justify-center z-50 ${
      transparent ? 'bg-black/30' : 'bg-black/50'
    }`}
  >
    <div className="bg-white rounded-lg shadow-xl p-6 flex flex-col items-center min-w-[200px]">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
      <p className="text-gray-700 font-medium">{message}</p>
    </div>
  </div>
);

// Inline Spinner
export const Spinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <Loader2 
      className={`animate-spin text-blue-600 ${sizeClasses[size]} ${className}`} 
    />
  );
};

// Loading Button
export const LoadingButton: React.FC<{
  isLoading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}> = ({ isLoading, children, onClick, disabled, className = '', type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={isLoading || disabled}
    className={`flex items-center gap-2 justify-center ${className} ${
      (isLoading || disabled) ? 'opacity-50 cursor-not-allowed' : ''
    }`}
  >
    {isLoading && <Spinner size="sm" />}
    {children}
  </button>
);

// Skeleton Loader
export const Skeleton: React.FC<{
  className?: string;
  count?: number;
}> = ({ className = 'h-4 w-full', count = 1 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className={`animate-pulse bg-gray-200 rounded ${className}`}
      />
    ))}
  </>
);

// Product Card Skeleton
export const ProductCardSkeleton: React.FC = () => (
  <div className="border rounded-lg p-4 space-y-3">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-8 w-full" />
  </div>
);

// Table Skeleton
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
}> = ({ rows = 5, columns = 4 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        {Array.from({ length: columns }).map((_, j) => (
          <Skeleton key={j} className="h-8 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

// Loading State Container
export const LoadingState: React.FC<{
  isLoading: boolean;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  message?: string;
}> = ({ isLoading, children, skeleton, message }) => {
  if (isLoading) {
    if (skeleton) return <>{skeleton}</>;
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Spinner size="lg" />
        {message && <p className="mt-4 text-gray-600">{message}</p>}
      </div>
    );
  }

  return <>{children}</>;
};

// Progress Bar
export const ProgressBar: React.FC<{
  progress: number;
  className?: string;
  showPercentage?: boolean;
}> = ({ progress, className = '', showPercentage = false }) => (
  <div className="w-full">
    <div className={`h-2 bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-blue-600 transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
    {showPercentage && (
      <p className="text-sm text-gray-600 mt-1 text-right">
        {Math.round(progress)}%
      </p>
    )}
  </div>
);

// Pulse Loader (for content that's updating)
export const PulseLoader: React.FC<{
  children: React.ReactNode;
  isUpdating: boolean;
}> = ({ children, isUpdating }) => (
  <div className={isUpdating ? 'animate-pulse' : ''}>
    {children}
  </div>
);

