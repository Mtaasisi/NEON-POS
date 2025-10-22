/**
 * Network Status Banner Component
 * Shows a banner when network connection is lost and updates when restored
 */

import React from 'react';
import { useNetworkStatus } from '@/utils/networkMonitor';

export function NetworkStatusBanner() {
  const networkStatus = useNetworkStatus();
  const [wasOffline, setWasOffline] = React.useState(false);
  const [showReconnected, setShowReconnected] = React.useState(false);

  React.useEffect(() => {
    if (!networkStatus.online) {
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline && networkStatus.online) {
      // Just reconnected
      setShowReconnected(true);
      setWasOffline(false);
      
      // Hide the "reconnected" message after 5 seconds
      const timeout = setTimeout(() => {
        setShowReconnected(false);
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [networkStatus.online, wasOffline]);

  // Don't show anything if online and wasn't offline
  if (networkStatus.online && !showReconnected) {
    return null;
  }

  // Show reconnected message
  if (showReconnected) {
    return (
      <div className="bg-green-500 text-white px-4 py-3 shadow-lg fixed top-0 left-0 right-0 z-50 animate-fade-in">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Connection Restored</span>
          </div>
          <button
            onClick={() => setShowReconnected(false)}
            className="text-white hover:text-green-100"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Show offline message
  return (
    <div className="bg-red-500 text-white px-4 py-3 shadow-lg fixed top-0 left-0 right-0 z-50 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-semibold">No Internet Connection</p>
            <p className="text-sm text-red-100">
              Waiting for connection to be restored... Some features may not work.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Network Status Indicator (Compact)
 * Shows a small indicator in the corner
 */
export function NetworkStatusIndicator() {
  const networkStatus = useNetworkStatus();
  const [showTooltip, setShowTooltip] = React.useState(false);

  if (networkStatus.online) {
    return null; // Don't show anything when online
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="bg-red-500 text-white p-2 rounded-full shadow-lg animate-pulse">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
      
      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-2 bg-gray-900 text-white text-sm px-3 py-2 rounded shadow-lg whitespace-nowrap">
          No internet connection
        </div>
      )}
    </div>
  );
}

/**
 * Connection Quality Badge
 * Shows current connection quality
 */
export function ConnectionQualityBadge() {
  const networkStatus = useNetworkStatus();
  
  if (!networkStatus.online) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
        Offline
      </span>
    );
  }

  const quality = networkStatus.effectiveType;
  
  if (!quality) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
        Online
      </span>
    );
  }

  // Map connection quality to colors
  const qualityConfig = {
    '4g': { color: 'green', label: 'Excellent' },
    '3g': { color: 'blue', label: 'Good' },
    '2g': { color: 'yellow', label: 'Poor' },
    'slow-2g': { color: 'orange', label: 'Very Poor' },
  };

  const config = qualityConfig[quality as keyof typeof qualityConfig] || { color: 'green', label: 'Online' };

  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-500',
    blue: 'bg-blue-100 text-blue-800 border-blue-500',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-500',
    orange: 'bg-orange-100 text-orange-800 border-orange-500',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorClasses[config.color as keyof typeof colorClasses]}`}>
      <span className={`w-2 h-2 bg-${config.color}-500 rounded-full`}></span>
      {config.label}
    </span>
  );
}

// Example usage in your layout:
// 
// import { NetworkStatusBanner } from '@/components/NetworkStatusBanner';
// 
// function Layout({ children }) {
//   return (
//     <>
//       <NetworkStatusBanner />
//       {children}
//     </>
//   );
// }

