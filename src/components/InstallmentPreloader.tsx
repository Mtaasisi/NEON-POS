/**
 * Installment Preloader
 * Preloads installment plans in the background when app is open
 * This ensures installment plans are always available and up-to-date without blocking the UI
 * 
 * Features:
 * - Loads installment plans immediately when app opens (even if cache exists)
 * - Refreshes installment plans in background periodically
 * - Refreshes when app becomes visible (user switches back to tab)
 * - Uses cache for instant display, updates in background
 */

import { useEffect, useRef } from 'react';
import { installmentService } from '../lib/installmentService';
import { installmentCacheService } from '../lib/installmentCacheService';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';

const InstallmentPreloader: React.FC = () => {
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const hasPreloaded = useRef(false);
  const isBackgroundLoading = useRef(false);
  const lastLoadTime = useRef<number>(0);
  const cachedPlansRef = useRef<any[]>([]);

  // Background load function - doesn't block UI
  const backgroundLoadInstallments = async (force = false) => {
    // Prevent multiple simultaneous loads
    if (isBackgroundLoading.current) {
      console.log('⏳ [InstallmentPreloader] Background load already in progress, skipping');
      return;
    }

    // Need branch to load installments
    if (!currentBranch?.id) {
      console.log('⏭️ [InstallmentPreloader] No branch selected, skipping');
      return;
    }

    // Throttle: Don't load more than once every 30 seconds
    const now = Date.now();
    if (!force && now - lastLoadTime.current < 30000) {
      console.log('⏱️ [InstallmentPreloader] Throttled - too soon since last load');
      return;
    }

    isBackgroundLoading.current = true;
    lastLoadTime.current = now;

    try {
      console.log('🔄 [InstallmentPreloader] Background loading installment plans...');
      const plans = await installmentService.getAllInstallmentPlans(currentBranch.id);
      cachedPlansRef.current = plans;
      console.log(`✅ [InstallmentPreloader] Background load completed (${plans.length} plans)`);
      
      // Save to cache
      installmentCacheService.saveInstallments(plans, currentBranch.id);
    } catch (error) {
      console.error('❌ [InstallmentPreloader] Background load failed:', error);
    } finally {
      isBackgroundLoading.current = false;
    }
  };

  // Initial load when app opens
  useEffect(() => {
    // Only preload if user is authenticated
    if (!currentUser) {
      console.log('🔒 [InstallmentPreloader] User not authenticated, skipping preload');
      return;
    }

    // Need branch to load installments
    if (!currentBranch?.id) {
      console.log('⏭️ [InstallmentPreloader] No branch selected, skipping preload');
      return;
    }

    const initializeInstallments = async () => {
      try {
        console.log('🚀 [InstallmentPreloader] Initializing installment preload...');

        // First, check if we have cached installment plans for instant display
        const cachedInstallments = installmentCacheService.getInstallments(currentBranch.id);
        
        if (cachedInstallments && cachedInstallments.length > 0) {
          console.log(`⚡ [InstallmentPreloader] Found ${cachedInstallments.length} cached installment plans - instant display ready`);
          cachedPlansRef.current = cachedInstallments;
          // Mark as preloaded so we can use cache immediately
          hasPreloaded.current = true;
          
          // Still load fresh data in background (non-blocking)
          // Use a small delay to not interfere with initial render
          setTimeout(() => {
            backgroundLoadInstallments(false);
          }, 2000); // Wait 2 seconds after app load to start background refresh
        } else {
          // No cache, load immediately but still non-blocking
          console.log('📡 [InstallmentPreloader] No cache found, loading from database...');
          await backgroundLoadInstallments(false);
          hasPreloaded.current = true;
        }
      } catch (error) {
        console.error('❌ [InstallmentPreloader] Failed to initialize installments:', error);
      }
    };

    // Start loading with a small delay to not block initial render
    const timeoutId = setTimeout(initializeInstallments, 100);
    
    return () => clearTimeout(timeoutId);
  }, [currentUser, currentBranch?.id]);

  // Reload when branch changes
  useEffect(() => {
    if (!currentUser || !currentBranch?.id) return;

    // Reset preload state when branch changes
    hasPreloaded.current = false;
    cachedPlansRef.current = [];

    const loadForBranch = async () => {
      console.log(`🔄 [InstallmentPreloader] Branch changed to ${currentBranch.id}, loading installments...`);
      await backgroundLoadInstallments(false);
      hasPreloaded.current = true;
    };

    // Small delay to ensure branch context is fully updated
    const timeoutId = setTimeout(loadForBranch, 500);
    
    return () => clearTimeout(timeoutId);
  }, [currentBranch?.id, currentUser]);

  // Refresh installment plans periodically in the background (every 15 minutes)
  useEffect(() => {
    if (!currentUser || !currentBranch?.id) return;

    const refreshInterval = setInterval(() => {
      console.log('🔄 [InstallmentPreloader] Periodic background refresh triggered');
      backgroundLoadInstallments(true); // Force refresh
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(refreshInterval);
  }, [currentUser, currentBranch?.id]);

  // Refresh when app becomes visible (user switches back to tab/window)
  useEffect(() => {
    if (!currentUser || !currentBranch?.id) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App became visible - refresh installments in background
        const timeSinceLastLoad = Date.now() - lastLoadTime.current;
        // Only refresh if it's been more than 1 minute since last load
        if (timeSinceLastLoad > 60000) {
          console.log('👁️ [InstallmentPreloader] App became visible - refreshing installments in background');
          backgroundLoadInstallments(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, currentBranch?.id]);

  // Refresh when window gains focus (user clicks back into the app)
  useEffect(() => {
    if (!currentUser || !currentBranch?.id) return;

    const handleFocus = () => {
      const timeSinceLastLoad = Date.now() - lastLoadTime.current;
      // Only refresh if it's been more than 2 minutes since last load
      if (timeSinceLastLoad > 120000) {
        console.log('🎯 [InstallmentPreloader] Window focused - refreshing installments in background');
        backgroundLoadInstallments(false);
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser, currentBranch?.id]);

  return null; // This component doesn't render anything
};

export default InstallmentPreloader;

