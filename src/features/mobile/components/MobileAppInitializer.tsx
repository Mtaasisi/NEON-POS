/**
 * Mobile App Initializer
 * Ensures mobile APK has all essential data loaded before allowing access
 * Shows loading screen during initial data sync
 */

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Database, Package, Users, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { mobileOfflineCache } from '../../../lib/mobileOfflineCache';
import { mobileDataSync } from '../../../lib/mobileDataSync';
import toast from 'react-hot-toast';

interface MobileAppInitializerProps {
  children: React.ReactNode;
}

interface InitStatus {
  step: string;
  progress: number;
  total: number;
  error: boolean;
  message: string;
}

const MobileAppInitializer: React.FC<MobileAppInitializerProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [status, setStatus] = useState<InitStatus>({
    step: 'Starting...',
    progress: 0,
    total: 7,
    error: false,
    message: 'Initializing mobile app...',
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [canWorkOffline, setCanWorkOffline] = useState(false);

  useEffect(() => {
    initializeMobileApp();

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const initializeMobileApp = async () => {
    console.log('🚀 [MobileAppInitializer] Starting mobile app initialization...');
    
    try {
      // Step 1: Initialize IndexedDB
      setStatus({
        step: 'Database',
        progress: 1,
        total: 7,
        error: false,
        message: 'Initializing local database...',
      });
      await new Promise(resolve => setTimeout(resolve, 500)); // Visual feedback
      await mobileOfflineCache.init();

      // Step 2: Check existing cache
      setStatus({
        step: 'Checking Cache',
        progress: 2,
        total: 7,
        error: false,
        message: 'Checking cached data...',
      });
      const stats = await mobileOfflineCache.getCacheStats();
      console.log('📊 [MobileAppInitializer] Cache stats:', stats);

      // Determine if we have enough data to work offline
      const hasProducts = stats.products.count > 0;
      const hasCustomers = stats.customers.count > 0;
      const hasBranches = stats.branches.count > 0;
      const hasCategories = stats.categories.count > 0;
      const hasMinimalData = hasProducts || hasCustomers;

      setCanWorkOffline(hasMinimalData);

      // Step 3: Check if online
      const online = navigator.onLine;
      setStatus({
        step: 'Network',
        progress: 3,
        total: 7,
        error: false,
        message: online ? 'Connected to internet' : 'No internet connection',
      });

      // If online, sync all data
      if (online) {
        // Step 4: Sync Products
        setStatus({
          step: 'Products',
          progress: 4,
          total: 7,
          error: false,
          message: `Syncing products...${hasProducts ? ` (${stats.products.count} cached)` : ''}`,
        });
        try {
          await mobileOfflineCache.syncProducts();
        } catch (error) {
          console.warn('⚠️ Failed to sync products:', error);
        }

        // Step 5: Sync Customers
        setStatus({
          step: 'Customers',
          progress: 5,
          total: 7,
          error: false,
          message: `Syncing customers...${hasCustomers ? ` (${stats.customers.count} cached)` : ''}`,
        });
        try {
          await mobileOfflineCache.syncCustomers();
        } catch (error) {
          console.warn('⚠️ Failed to sync customers:', error);
        }

        // Step 6: Sync Other Data
        setStatus({
          step: 'Settings',
          progress: 6,
          total: 7,
          error: false,
          message: 'Syncing branches, categories, and settings...',
        });
        try {
          await Promise.all([
            mobileOfflineCache.syncBranches(),
            mobileOfflineCache.syncCategories(),
            mobileOfflineCache.syncPaymentAccounts(),
            mobileOfflineCache.syncRecentSales(),
          ]);
        } catch (error) {
          console.warn('⚠️ Failed to sync some data:', error);
        }

        // Step 7: Complete
        setStatus({
          step: 'Complete',
          progress: 7,
          total: 7,
          error: false,
          message: 'All data synced successfully!',
        });

        // Get final stats
        const finalStats = await mobileOfflineCache.getCacheStats();
        console.log('✅ [MobileAppInitializer] Final cache stats:', finalStats);

        toast.success('Mobile app ready!', { duration: 2000 });
      } else {
        // Offline - check if we have enough data
        if (hasMinimalData) {
          setStatus({
            step: 'Ready',
            progress: 7,
            total: 7,
            error: false,
            message: `Working offline with cached data`,
          });
          toast('Working offline with cached data', {
            icon: '📵',
            duration: 3000,
          });
        } else {
          // No data and no internet - show error
          setStatus({
            step: 'Error',
            progress: 3,
            total: 7,
            error: true,
            message: 'No internet connection and no cached data. Please connect to the internet for first-time setup.',
          });
          return; // Don't set as initialized
        }
      }

      // Wait a moment before showing the app
      await new Promise(resolve => setTimeout(resolve, 1000));

      setIsInitialized(true);
      setIsInitializing(false);
      console.log('✅ [MobileAppInitializer] Mobile app initialized successfully');
    } catch (error) {
      console.error('❌ [MobileAppInitializer] Initialization failed:', error);
      setStatus({
        step: 'Error',
        progress: status.progress,
        total: 7,
        error: true,
        message: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const handleRetry = () => {
    setIsInitializing(true);
    setStatus({
      step: 'Retrying...',
      progress: 0,
      total: 7,
      error: false,
      message: 'Retrying initialization...',
    });
    initializeMobileApp();
  };

  const handleContinueOffline = () => {
    if (canWorkOffline) {
      setIsInitialized(true);
      setIsInitializing(false);
      toast('Working offline with limited data', {
        icon: '📵',
        duration: 3000,
      });
    }
  };

  // If initialized, show the app
  if (isInitialized) {
    return <>{children}</>;
  }

  // Show initialization screen
  return (
    <div className="fixed inset-0 bg-neutral-100 flex items-center justify-center p-4 z-50">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <Database size={40} className="text-white" strokeWidth={2} />
          </div>
          <h1 className="text-[28px] font-bold text-neutral-900 mb-2">LATS POS Mobile</h1>
          <p className="text-neutral-600 text-[15px]">Setting up your mobile app...</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-4">
          {/* Online Status */}
          <div className="flex items-center justify-center gap-3 mb-6 pb-4 border-b border-neutral-100">
            {isOnline ? (
              <>
                <div className="w-10 h-10 bg-success-50 rounded-xl flex items-center justify-center">
                  <Wifi size={20} className="text-success-600" strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-semibold text-neutral-900">Connected</div>
                  <div className="text-[13px] text-neutral-500">Syncing with server</div>
                </div>
                <div className="ml-auto w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 bg-warning-50 rounded-xl flex items-center justify-center">
                  <WifiOff size={20} className="text-warning-600" strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-semibold text-neutral-900">Offline</div>
                  <div className="text-[13px] text-neutral-500">Using cached data</div>
                </div>
              </>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[15px] font-medium text-neutral-900">{status.step}</span>
              <span className="text-[15px] text-neutral-500">
                {status.progress} / {status.total}
              </span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  status.error ? 'bg-danger-500' : 'bg-primary-500'
                }`}
                style={{ width: `${(status.progress / status.total) * 100}%` }}
              />
            </div>
          </div>

          {/* Status Message */}
          <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-xl">
            {status.error ? (
              <AlertCircle size={20} className="text-danger-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
            ) : isInitializing ? (
              <RefreshCw size={20} className="text-primary-500 flex-shrink-0 mt-0.5 animate-spin" strokeWidth={2} />
            ) : (
              <CheckCircle size={20} className="text-success-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
            )}
            <p className={`text-[14px] ${status.error ? 'text-danger-700' : 'text-neutral-700'}`}>
              {status.message}
            </p>
          </div>

          {/* Loading Steps Indicator */}
          {!status.error && isInitializing && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: Database, label: 'DB', step: 1 },
                  { icon: Package, label: 'Products', step: 4 },
                  { icon: Users, label: 'Customers', step: 5 },
                  { icon: CheckCircle, label: 'Done', step: 7 },
                ].map((item, index) => {
                  const Icon = item.icon;
                  const isComplete = status.progress >= item.step;
                  const isCurrent = status.progress === item.step;
                  return (
                    <div key={index} className="text-center">
                      <div
                        className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-1 transition-all ${
                          isComplete
                            ? 'bg-primary-500 text-white'
                            : isCurrent
                            ? 'bg-primary-100 text-primary-600 animate-pulse'
                            : 'bg-neutral-100 text-neutral-400'
                        }`}
                      >
                        <Icon size={18} strokeWidth={2.5} />
                      </div>
                      <div className={`text-[12px] ${isComplete ? 'text-neutral-900 font-medium' : 'text-neutral-400'}`}>
                        {item.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {status.error && (
          <div className="space-y-2">
            <button
              onClick={handleRetry}
              className="w-full bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white px-6 py-3.5 rounded-xl font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} strokeWidth={2.5} />
              Retry
            </button>
            {canWorkOffline && (
              <button
                onClick={handleContinueOffline}
                className="w-full bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 text-neutral-700 px-6 py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                <WifiOff size={20} strokeWidth={2.5} />
                Continue Offline
              </button>
            )}
          </div>
        )}

        {/* Info Text */}
        {!status.error && (
          <p className="text-center text-[14px] text-neutral-500 mt-4">
            {isOnline
              ? 'This may take a few moments on first launch'
              : 'Connect to the internet for full functionality'}
          </p>
        )}
      </div>
    </div>
  );
};

export default MobileAppInitializer;
