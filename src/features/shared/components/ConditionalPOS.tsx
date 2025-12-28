import React, { lazy, Suspense } from 'react';

// Check for force tablet mode (for testing)
const getForceTabletMode = () => {
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('forceTablet') === 'true') return true;

  // Check localStorage
  if (localStorage.getItem('forceTabletMode') === 'true') return true;

  return false;
};

const POSPage = lazy(() => import('../../lats/pages/POSPageOptimized'));
const MobilePOS = lazy(() => import('../../mobile/pages/MobilePOS'));
const TabletPOS = lazy(() => import('../../tablet/pages/TabletPOS'));

/**
 * Conditional POS Component
 *
 * Routes to POS interfaces based on user selection from sidebar:
 * - POS System (default): Desktop POS with full features
 * - Tablet POS (forced): Specialized tablet interface
 */
const ConditionalPOS: React.FC = () => {
  // Check for forced tablet mode (set by sidebar navigation)
  const forceTabletMode = getForceTabletMode();

  console.log('🎯 [ConditionalPOS] Force Tablet Mode:', forceTabletMode);

  // If tablet mode is forced, serve tablet POS
  if (forceTabletMode) {
    console.log('📱 [ConditionalPOS] Serving TabletPOS (forced by sidebar)');
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      }>
        <TabletPOS />
      </Suspense>
    );
  }

  // Default to desktop POS for "POS System" selection
  console.log('🖥️ [ConditionalPOS] Serving POSPageOptimized (desktop POS)');
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    }>
      <POSPage />
    </Suspense>
  );
};

export default ConditionalPOS;