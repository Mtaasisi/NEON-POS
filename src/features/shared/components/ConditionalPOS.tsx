import React, { lazy, Suspense } from 'react';
import { useDeviceDetection } from '../../../hooks/useDeviceDetection';

const POSPage = lazy(() => import('../../lats/pages/POSPageOptimized'));
const MobilePOS = lazy(() => import('../../mobile/pages/MobilePOS'));
const TabletPOS = lazy(() => import('../../tablet/pages/TabletPOS'));

/**
 * Conditional POS Component
 *
 * Automatically routes to the appropriate POS interface based on device type:
 * - Desktop/Tablet: Full-featured POSPageOptimized
 * - iPad: Specialized TabletPOS with two-column layout
 * - Mobile: Touch-optimized MobilePOS
 */
const ConditionalPOS: React.FC = () => {
  const { deviceType, screenWidth, isTouchDevice } = useDeviceDetection();

  // Also check for iPad-sized viewports (for browser testing)
  const isIPadViewport = screenWidth >= 768 && screenWidth <= 1366;

  console.log('🎯 [ConditionalPOS] Device type:', deviceType, 'Width:', screenWidth, 'Touch:', isTouchDevice, 'iPad Viewport:', isIPadViewport);

  // Route to appropriate POS based on device
  // TEMPORARY: Force tablet POS for testing
  if (true) {
    console.log('📱 [ConditionalPOS] Serving TabletPOS for iPad');
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