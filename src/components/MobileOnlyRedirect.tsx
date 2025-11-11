/**
 * MobileOnlyRedirect Component
 * Ensures APK users can ONLY access /mobile routes
 * Redirects any other routes to /mobile/dashboard
 */

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isNativeApp } from '../utils/platformDetection';

interface MobileOnlyRedirectProps {
  children: React.ReactNode;
}

const MobileOnlyRedirect: React.FC<MobileOnlyRedirectProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isNative = isNativeApp();

  useEffect(() => {
    // Only apply redirect logic for native apps
    if (isNative) {
      const currentPath = location.pathname;
      
      // If not on a /mobile route, redirect to /mobile/dashboard
      if (!currentPath.startsWith('/mobile')) {
        console.log('🔒 [MobileOnlyRedirect] APK detected, redirecting from', currentPath, 'to /mobile/dashboard');
        navigate('/mobile/dashboard', { replace: true });
      }
    }
  }, [isNative, location.pathname, navigate]);

  return <>{children}</>;
};

export default MobileOnlyRedirect;

