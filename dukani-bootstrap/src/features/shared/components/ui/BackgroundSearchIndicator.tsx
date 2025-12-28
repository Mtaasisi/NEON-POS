import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, X } from 'lucide-react';

interface BackgroundSearchIndicatorProps {
  isSearching: boolean;
  searchStatus?: string;
  searchProgress?: number;
  resultCount?: number;
  onCancel?: () => void;
  className?: string;
}

const BackgroundSearchIndicator: React.FC<BackgroundSearchIndicatorProps> = ({
  isSearching,
  searchStatus = 'pending',
  searchProgress = 0,
  resultCount,
  onCancel,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // Reset visibility when search starts
  useEffect(() => {
    if (isSearching) {
      setIsVisible(true);
    }
  }, [isSearching]);

  // Auto-hide on completion after 2 seconds
  useEffect(() => {
    if (searchStatus === 'completed') {
      const timer = setTimeout(() => setIsVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [searchStatus]);

  if (!isSearching || !isVisible) return null;

  const getProgressColor = () => {
    switch (searchStatus) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getStatusText = () => {
    switch (searchStatus) {
      case 'processing':
        return 'Searching...';
      case 'completed':
        return resultCount !== undefined ? `Found ${resultCount.toLocaleString()} customers` : 'Complete';
      case 'failed':
        return 'Search failed';
      default:
        return 'Searching...';
    }
  };

  const getBgColor = () => {
    switch (searchStatus) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = () => {
    switch (searchStatus) {
      case 'completed':
        return 'text-green-700';
      case 'failed':
        return 'text-red-700';
      default:
        return 'text-blue-700';
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-lg border ${getBgColor()} ${className}`}>
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-200/50">
        <div 
          className={`h-full ${getProgressColor()} transition-all duration-300 ease-out`}
          style={{ width: `${searchProgress}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Icon */}
          <div className="flex-shrink-0">
            {searchStatus === 'completed' ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : searchStatus === 'failed' ? (
              <XCircle className="w-4 h-4 text-red-600" />
            ) : (
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            )}
          </div>

          {/* Text */}
          <p className={`text-sm font-medium ${getTextColor()} truncate`}>
            {getStatusText()}
          </p>

          {/* Progress % */}
          {searchStatus === 'processing' && searchProgress > 0 && (
            <span className="text-xs text-gray-600 tabular-nums">
              {searchProgress}%
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {searchStatus === 'processing' && onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-gray-600 hover:text-red-600 transition-colors px-2 py-0.5"
              title="Cancel"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackgroundSearchIndicator;
