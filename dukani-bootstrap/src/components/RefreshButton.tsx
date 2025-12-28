import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface RefreshButtonProps {
  variant?: 'icon' | 'button';
  className?: string;
  showConfirmation?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Refresh Button Component
 * Clears all caches and refreshes the application for optimal performance
 */
const RefreshButton: React.FC<RefreshButtonProps> = ({
  variant = 'icon',
  className = '',
  showConfirmation = true,
  size = 'md',
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;

    if (showConfirmation) {
      const confirmed = window.confirm(
        '🔄 Refresh Application?\n\nThis will reload the page. Continue?'
      );
      if (!confirmed) return;
    }

    setIsRefreshing(true);

    // Simple page reload for bootstrap
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  const sizeClasses = {
    sm: variant === 'icon' ? 'w-4 h-4' : 'px-2 py-1 text-xs',
    md: variant === 'icon' ? 'w-5 h-5' : 'px-3 py-1.5 text-sm',
    lg: variant === 'icon' ? 'w-6 h-6' : 'px-4 py-2 text-base',
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`
          p-2 rounded-xl transition-all duration-200 backdrop-blur-sm border shadow-sm
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        title="Refresh Application"
      >
        <RefreshCw
          className={`${sizeClasses[size]} ${isRefreshing ? 'animate-spin' : ''} transition-transform`}
        />
      </button>
    );
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`
        flex items-center gap-2 rounded-xl transition-all duration-200 backdrop-blur-sm border shadow-sm
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${className}
      `}
      title="Refresh Application"
    >
      <RefreshCw
        className={`${sizeClasses[size]} ${isRefreshing ? 'animate-spin' : ''} transition-transform`}
      />
      <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
    </button>
  );
};

export default RefreshButton;
