import React, { lazy, Suspense } from 'react';
import { useDeviceDetection } from '../../../hooks/useDeviceDetection';

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
 * Automatically routes to the appropriate POS interface based on device type:
 * - iPad/Tablet: Specialized TabletPOS with two-column layout (optimized for touch)
 * - Mobile: Touch-optimized MobilePOS with mobile-first design (single-column, compact)
 * - Desktop: Full-featured POSPageOptimized (mouse/keyboard optimized)
 */
const ConditionalPOS: React.FC = () => {
  const { deviceType, screenWidth, isTouchDevice } = useDeviceDetection();

  // Also check for iPad-sized viewports (for browser testing)
  const isIPadViewport = screenWidth >= 768 && screenWidth <= 1366;

  // Check for forced tablet mode (for testing)
  const forceTabletMode = getForceTabletMode();

  console.log('🎯 [ConditionalPOS] Device type:', deviceType, 'Width:', screenWidth, 'Touch:', isTouchDevice, 'iPad Viewport:', isIPadViewport, 'Force Tablet:', forceTabletMode);

  // Force tablet mode for testing (overrides all other conditions)
  if (forceTabletMode) {
    console.log('🔧 [ConditionalPOS] FORCED TabletPOS mode enabled');
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

  // Route to appropriate POS based on device
  // iPad and tablet devices get the specialized TabletPOS
  if (deviceType === 'ipad' || isIPadViewport) {
    console.log('📱 [ConditionalPOS] Serving TabletPOS for iPad/tablet');
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

  if (deviceType === 'mobile') {
    console.log('📱 [ConditionalPOS] Serving MobilePOS for mobile device');
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      }>
        <MobilePOS />
      </Suspense>
    );
  }

  // Desktop and other devices get the full POS
  console.log('🖥️ [ConditionalPOS] Serving POSPageOptimized for desktop/tablet');
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