/**
 * POSSettingsDatabaseSetup Component - Bootstrap Version
 * Simplified POS settings database setup for bootstrap
 */

import React from 'react';

interface POSSettingsDatabaseSetupProps {
  children: React.ReactNode;
}

export const POSSettingsDatabaseSetup: React.FC<POSSettingsDatabaseSetupProps> = ({ children }) => {
  // For bootstrap, just pass through children
  return <>{children}</>;
};
