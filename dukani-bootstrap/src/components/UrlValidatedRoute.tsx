/**
 * URL Validated Route Component - Bootstrap Version
 *
 * Simplified version for bootstrap that just passes through children
 */

import React from 'react';

interface UrlValidatedRouteProps {
  children: React.ReactNode;
  fallbackPath?: string;
  enableImageUrlValidation?: boolean;
  enableUrlLogging?: boolean;
}

const UrlValidatedRoute: React.FC<UrlValidatedRouteProps> = ({
  children,
}) => {
  // For bootstrap, just pass through children without validation
  return <>{children}</>;
};

export default UrlValidatedRoute;
