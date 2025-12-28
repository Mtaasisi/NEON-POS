/**
 * MobileOnlyRedirect Component - Bootstrap Version
 * Simplified version for bootstrap that just passes through children
 */

import React from 'react';

interface MobileOnlyRedirectProps {
  children: React.ReactNode;
}

const MobileOnlyRedirect: React.FC<MobileOnlyRedirectProps> = ({ children }) => {
  // For bootstrap, just pass through children without redirecting
  return <>{children}</>;
};

export default MobileOnlyRedirect;
