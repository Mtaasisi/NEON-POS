/**
 * DefaultRedirect Component - Bootstrap Version
 * Simplified version for bootstrap that redirects to dashboard
 */

import React from 'react';
import { Navigate } from 'react-router-dom';

const DefaultRedirect: React.FC = () => {
  // For bootstrap, redirect to dashboard
  return <Navigate to="/dashboard" replace />;
};

export default DefaultRedirect;
