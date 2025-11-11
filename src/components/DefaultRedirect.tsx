/**
 * DefaultRedirect Component
 * Redirects to appropriate default route based on platform
 * - APK: /mobile/dashboard
 * - Web: /dashboard (can manually access /mobile in development)
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { isNativeApp } from '../utils/platformDetection';

const DefaultRedirect: React.FC = () => {
  const isNative = isNativeApp();
  
  // APK users go to mobile dashboard
  // Web users go to regular dashboard (but can manually navigate to /mobile in dev)
  const destination = isNative ? '/mobile/dashboard' : '/dashboard';
  
  console.log('🔀 [DefaultRedirect] Platform:', isNative ? 'Native APK' : 'Web Browser', '→ Redirecting to:', destination);
  console.log('💡 [DefaultRedirect] In development, you can manually access /mobile routes');
  
  return <Navigate to={destination} replace />;
};

export default DefaultRedirect;

