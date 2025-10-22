import React, { createContext, useContext, useState, ReactNode } from 'react';
import { getCurrentBranchId } from '../lib/branchAwareApi';

interface DashboardBranchContextType {
  dashboardBranchId: string | null;
  setDashboardBranchId: (branchId: string | null) => void;
  isViewingAllBranches: boolean;
}

const DashboardBranchContext = createContext<DashboardBranchContextType | undefined>(undefined);

export const DashboardBranchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize with current branch (default behavior)
  const [dashboardBranchId, setDashboardBranchIdState] = useState<string | null>(() => {
    return getCurrentBranchId();
  });

  const setDashboardBranchId = (branchId: string | null) => {
    console.log('📊 Dashboard branch filter changed:', branchId || 'All Branches');
    setDashboardBranchIdState(branchId);
  };

  const isViewingAllBranches = dashboardBranchId === null;

  return (
    <DashboardBranchContext.Provider
      value={{
        dashboardBranchId,
        setDashboardBranchId,
        isViewingAllBranches
      }}
    >
      {children}
    </DashboardBranchContext.Provider>
  );
};

export const useDashboardBranch = () => {
  const context = useContext(DashboardBranchContext);
  if (context === undefined) {
    throw new Error('useDashboardBranch must be used within a DashboardBranchProvider');
  }
  return context;
};

