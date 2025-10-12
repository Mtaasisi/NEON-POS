import React, { lazy, Suspense } from 'react';
import { useAuth } from '../../../context/AuthContext';

const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const TechnicianDashboardPage = lazy(() => import('../pages/TechnicianDashboardPage'));
const CustomerCareDashboardPage = lazy(() => import('../pages/CustomerCareDashboardPage'));

const ConditionalDashboard: React.FC = () => {
  const { currentUser } = useAuth();

  // Show technician dashboard for technicians
  if (currentUser?.role === 'technician') {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>}>
        <TechnicianDashboardPage />
      </Suspense>
    );
  }

  // Show customer care dashboard for customer-care users
  if (currentUser?.role === 'customer-care') {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>}>
        <CustomerCareDashboardPage />
      </Suspense>
    );
  }

  // Show general dashboard for admin
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>}>
      <DashboardPage />
    </Suspense>
  );
};

export default ConditionalDashboard;
