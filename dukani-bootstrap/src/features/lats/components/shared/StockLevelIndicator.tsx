import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface StockLevelIndicatorProps {
  quantity: number;
  minLevel: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'text' | 'icon';
}

export const StockLevelIndicator: React.FC<StockLevelIndicatorProps> = ({
  quantity,
  minLevel,
  showLabel = true,
  size = 'md',
  variant = 'badge'
}) => {
  const isLowStock = quantity > 0 && quantity <= minLevel;
  const isOutOfStock = quantity === 0;
  const isInStock = quantity > minLevel;
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const getStatusColor = () => {
    if (isOutOfStock) return 'text-red-600 bg-red-50 border-red-200';
    if (isLowStock) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusText = () => {
    if (isOutOfStock) return 'Out of Stock';
    if (isLowStock) return 'Low Stock';
    return 'In Stock';
  };

  const getIcon = () => {
    if (isOutOfStock) return <XCircle className="w-4 h-4" />;
    if (isLowStock) return <AlertTriangle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center ${getStatusColor()} rounded-full p-1`}>
        {getIcon()}
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <span className={`${sizeClasses[size]} ${getStatusColor().split(' ')[0]}`}>
        {quantity} {minLevel > 0 && `(${minLevel} min)`}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full border ${getStatusColor()} ${sizeClasses[size]}`}>
      <div className={`w-2 h-2 rounded-full ${
        isOutOfStock ? 'bg-red-600' : isLowStock ? 'bg-orange-600' : 'bg-green-600'
      }`} />
      {showLabel && (
        <span className="font-medium">{getStatusText()}</span>
      )}
      <span className="font-bold">{quantity}</span>
      {minLevel > 0 && (
        <span className="text-gray-500 text-xs">/ {minLevel} min</span>
      )}
    </div>
  );
};
