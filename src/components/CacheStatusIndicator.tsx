/**
 * Cache Status Indicator
 * 
 * Shows cache status and allows manual refresh
 * Perfect for mobile apps to show users if they're using cached data
 */

import React, { useState } from 'react';
import { useCacheStats, useClearCache } from '../hooks/useSmartCache';
import { smartCache } from '../lib/enhancedCacheManager';
import toast from 'react-hot-toast';

interface CacheStatusIndicatorProps {
  compact?: boolean;
  showDetails?: boolean;
}

export const CacheStatusIndicator: React.FC<CacheStatusIndicatorProps> = ({ 
  compact = false,
  showDetails = false 
}) => {
  const { stats, isLoading } = useCacheStats();
  const { clearCache, isClearing } = useClearCache();
  const [showDetailsPanel, setShowDetailsPanel] = useState(showDetails);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    toast.loading('Refreshing all data...', { id: 'refresh-all' });
    
    try {
      // Invalidate all caches to force refresh
      await Promise.all([
        smartCache.invalidateCache('products'),
        smartCache.invalidateCache('customers'),
        smartCache.invalidateCache('categories'),
        smartCache.invalidateCache('suppliers'),
        smartCache.invalidateCache('branches'),
        smartCache.invalidateCache('payment_accounts'),
      ]);
      
      toast.success('Data refreshed successfully!', { id: 'refresh-all' });
      
      // Reload the page to fetch fresh data
      window.location.reload();
    } catch (error) {
      console.error('Failed to refresh data:', error);
      toast.error('Failed to refresh data', { id: 'refresh-all' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear all cached data? The app will reload.')) {
      await clearCache();
      window.location.reload();
    }
  };

  if (isLoading) {
    return compact ? null : (
      <div className="text-sm text-gray-500">Loading cache status...</div>
    );
  }

  const getCacheStatusColor = (item: any) => {
    if (!item.exists) return 'text-gray-400';
    if (item.isFresh) return 'text-green-600';
    if (item.isStale) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCacheStatusIcon = (item: any) => {
    if (!item.exists) return '⭕';
    if (item.isFresh) return '✅';
    if (item.isStale) return '⚠️';
    return '❌';
  };

  const getCacheStatusText = (item: any) => {
    if (!item.exists) return 'No cache';
    if (item.isFresh) return 'Fresh';
    if (item.isStale) return 'Stale';
    return 'Expired';
  };

  const formatAge = (age: number) => {
    const minutes = Math.floor(age / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const totalItems = Object.values(stats).reduce((sum: number, stat: any) => sum + (stat.itemCount || 0), 0);
  const freshCount = Object.values(stats).filter((stat: any) => stat.isFresh).length;
  const staleCount = Object.values(stats).filter((stat: any) => stat.isStale).length;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowDetailsPanel(!showDetailsPanel)}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
          title="View cache status"
        >
          <span className="text-base">💾</span>
          <span>{totalItems} items cached</span>
          {staleCount > 0 && <span className="text-yellow-600">({staleCount} stale)</span>}
        </button>
        
        <button
          onClick={handleRefreshAll}
          disabled={isRefreshing}
          className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
          title="Refresh all data"
        >
          <svg 
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💾</span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Cache Status</h3>
            <p className="text-xs text-gray-500">
              {totalItems} items • {freshCount} fresh • {staleCount} stale
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <svg 
              className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              />
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh All'}
          </button>
          
          <button
            onClick={handleClearCache}
            disabled={isClearing}
            className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isClearing ? 'Clearing...' : 'Clear Cache'}
          </button>
        </div>
      </div>

      {showDetailsPanel && (
        <div className="space-y-2">
          {Object.entries(stats).map(([key, item]: [string, any]) => (
            <div 
              key={key}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{getCacheStatusIcon(item)}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900 capitalize">{key}</div>
                  <div className={`text-xs ${getCacheStatusColor(item)}`}>
                    {getCacheStatusText(item)} • {item.itemCount || 0} items
                    {item.age > 0 && ` • ${formatAge(item.age)}`}
                  </div>
                </div>
              </div>
              
              {item.lastSynced && (
                <div className="text-xs text-gray-500">
                  {new Date(item.lastSynced).toLocaleTimeString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!showDetailsPanel && (
        <button
          onClick={() => setShowDetailsPanel(true)}
          className="w-full mt-2 text-xs text-blue-600 hover:text-blue-700 transition-colors"
        >
          Show details
        </button>
      )}

      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-start gap-2 text-xs text-gray-600">
          <span className="text-base">ℹ️</span>
          <p>
            Data is cached locally for faster performance. Fresh data is less than 1 hour old.
            Stale data triggers background refresh automatically.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Minimal cache indicator for navigation bar
 */
export const CacheIndicatorBadge: React.FC = () => {
  const { stats } = useCacheStats();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const staleCount = Object.values(stats).filter((stat: any) => stat.isStale).length;
  const expiredCount = Object.values(stats).filter((stat: any) => stat.isExpired).length;

  const handleQuickRefresh = async () => {
    setIsRefreshing(true);
    toast.loading('Refreshing...', { id: 'quick-refresh' });
    
    try {
      await Promise.all([
        smartCache.invalidateCache('products'),
        smartCache.invalidateCache('customers'),
      ]);
      
      toast.success('Refreshed!', { id: 'quick-refresh' });
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast.error('Failed to refresh', { id: 'quick-refresh' });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!navigator.onLine) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
        <span>📵</span>
        <span>Offline</span>
      </div>
    );
  }

  if (expiredCount > 0) {
    return (
      <button
        onClick={handleQuickRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full hover:bg-red-200 transition-colors disabled:opacity-50"
      >
        <span>❌</span>
        <span>Cache expired</span>
      </button>
    );
  }

  if (staleCount > 0) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
        <span>⚠️</span>
        <span>Refreshing...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
      <span>✅</span>
      <span>Up to date</span>
    </div>
  );
};

export default CacheStatusIndicator;

