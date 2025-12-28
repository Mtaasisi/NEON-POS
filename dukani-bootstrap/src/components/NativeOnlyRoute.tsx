/**
 * NativeOnlyRoute Component - Bootstrap Version
 * Simplified version for bootstrap that just passes through children
 */

import React from 'react';

interface NativeOnlyRouteProps {
  children: React.ReactNode;
}

const NativeOnlyRoute: React.FC<NativeOnlyRouteProps> = ({ children }) => {
  // For bootstrap, just pass through children without restrictions
  return <>{children}</>;
};

export default NativeOnlyRoute;
