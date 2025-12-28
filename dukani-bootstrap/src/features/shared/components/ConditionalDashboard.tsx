import React, { lazy, Suspense } from 'react';
import { useAuth } from '../../../context/AuthContext';

const DashboardPage = lazy(() => import('../pages/DashboardPage'));

/**
 * Unified Dashboard Component
 * 
 * All user roles (admin, technician, customer-care, etc.) now use the same DashboardPage.
 * The dashboard automatically adjusts widgets and quick actions based on the user's role
 * using role-based permissions defined in src/config/roleBasedWidgets.ts
 * 
 * Benefits:
 * - Single source of truth for dashboard layout
 * - Consistent UI/UX across all roles
 * - Role-based widget and action filtering
 * - Easier maintenance and updates
 */
const ConditionalDashboard: React.FC = () => {
  const { currentUser } = useAuth();

  // All roles now use the unified dashboard
  // Role-based filtering is handled by useDashboardSettings hook
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    }>
      <DashboardPage />
    </Suspense>
  );
};

export default ConditionalDashboard;
