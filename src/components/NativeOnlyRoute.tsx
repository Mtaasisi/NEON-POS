/**
 * NativeOnlyRoute Component
 * Restricts access to routes that should only be accessible in native mobile apps (APK)
 * Allows web access in development mode for testing
 * Redirects to main dashboard in production web
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { isNativeApp } from '../utils/platformDetection';

interface NativeOnlyRouteProps {
  children: React.ReactNode;
}

const NativeOnlyRoute: React.FC<NativeOnlyRouteProps> = ({ children }) => {
  const isNative = isNativeApp();
  const isDevelopment = import.meta.env.DEV;
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.includes('localhost');

  // Allow access in development mode for testing
  const allowAccess = isNative || isDevelopment || isLocalhost;

  // Log platform detection for debugging
  React.useEffect(() => {
    console.log('🔐 [NativeOnlyRoute] Access check:', {
      isNative,
      isDevelopment,
      isLocalhost,
      allowAccess,
      hostname: window.location.hostname,
      currentPath: window.location.pathname,
    });
  }, [isNative, isDevelopment, isLocalhost, allowAccess]);

  // If not running in native app and not in development, redirect to main dashboard
  if (!allowAccess) {
    console.warn('⚠️ [NativeOnlyRoute] Access denied: Not in native app or development. Redirecting to dashboard.');
    return <Navigate to="/dashboard" replace />;
  }

  // Development notice banner hidden
  // const showDevBanner = !isNative && (isDevelopment || isLocalhost);

  return <>{children}</>;
};

export default NativeOnlyRoute;

