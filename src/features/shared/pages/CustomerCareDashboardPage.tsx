import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useDevices } from '../../../context/DevicesContext';
import { useCustomers } from '../../../context/CustomersContext';
import { useUserGoals } from '../../../context/UserGoalsContext';
import { PageErrorWrapper } from '../components/PageErrorWrapper';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import CustomerCareDashboard from '../components/dashboards/CustomerCareDashboard';
import BarcodeScanner from '../../devices/components/BarcodeScanner';
import { DeviceStatus, Device } from '../../../types';
import { debugCustomerCareDashboard } from '../../../utils/customerCareDashboardDebug';

const CustomerCareDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { devices, loading: devicesLoading } = useDevices();
  const { customers, loading: customersLoading } = useCustomers();
  const { userGoals, loading: goalsLoading } = useUserGoals();
  
  // 🔍 DEBUG: Log component mount and expose debug utility
  useEffect(() => {
    console.log('🎯 CustomerCareDashboardPage mounted at:', new Date().toISOString());
    console.log('👤 Current User:', currentUser ? { id: currentUser.id, email: currentUser.email, role: currentUser.role } : 'Not authenticated');
    
    // Expose debug function to window for easy access
    if (typeof window !== 'undefined') {
      (window as any).debugCustomerCareDashboard = debugCustomerCareDashboard;
      console.log('');
      console.log('💡 Debug Tip: Run window.debugCustomerCareDashboard() in console for comprehensive diagnostics');
      console.log('');
    }
  }, []);
  
  // Error handling
  const { handleError, withErrorHandling } = useErrorHandler({
    maxRetries: 3,
    showToast: true,
    logToConsole: true
  });

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DeviceStatus>('all');
  const [showScanner, setShowScanner] = useState(false);

  // Filter devices for customer care focus
  const filteredDevices = useMemo(() => {
    let filtered = devices.filter(device => device.status !== 'done'); // Exclude done devices from main list

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(device => 
        device.brand?.toLowerCase().includes(query) ||
        device.model?.toLowerCase().includes(query) ||
        device.serialNumber?.toLowerCase().includes(query) ||
        device.customerName?.toLowerCase().includes(query) ||
        device.issueDescription?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(device => device.status === statusFilter);
    }
    
    return filtered;
  }, [devices, searchQuery, statusFilter]);

  // Loading state
  const loading = devicesLoading || customersLoading || goalsLoading;

  // 🔍 DEBUG: Track loading states
  useEffect(() => {
    console.log('📊 Loading States:', {
      devicesLoading,
      customersLoading,
      goalsLoading,
      overallLoading: loading,
      timestamp: new Date().toISOString()
    });
  }, [devicesLoading, customersLoading, goalsLoading, loading]);

  // 🔍 DEBUG: Track devices data
  useEffect(() => {
    console.log('📱 Devices Data Update:', {
      totalDevices: devices.length,
      devicesLoading,
      deviceStatuses: devices.reduce((acc, device) => {
        acc[device.status] = (acc[device.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      timestamp: new Date().toISOString()
    });
    
    if (devices.length === 0 && !devicesLoading) {
      console.warn('⚠️ No devices loaded for customer care dashboard');
    } else if (devices.length > 0) {
      console.log('✅ Devices loaded successfully:', devices.length);
    }
  }, [devices, devicesLoading]);

  // 🔍 DEBUG: Track customers data
  useEffect(() => {
    console.log('👥 Customers Data Update:', {
      totalCustomers: customers.length,
      customersLoading,
      timestamp: new Date().toISOString()
    });
    
    if (customers.length === 0 && !customersLoading) {
      console.warn('⚠️ No customers loaded for customer care dashboard');
    } else if (customers.length > 0) {
      console.log('✅ Customers loaded successfully:', customers.length);
    }
  }, [customers, customersLoading]);

  // 🔍 DEBUG: Track user goals data
  useEffect(() => {
    console.log('🎯 User Goals Data Update:', {
      goalsCount: userGoals?.length || 0,
      goalsLoading,
      timestamp: new Date().toISOString()
    });
  }, [userGoals, goalsLoading]);

  return (
    <PageErrorWrapper pageName="Customer Care Dashboard" showDetails={true}>
      <div className="h-full overflow-hidden">
        {/* Main Dashboard */}
        <CustomerCareDashboard
          devices={devices}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />

        {/* Barcode Scanner Modal */}
        {showScanner && (
          <BarcodeScanner
            isOpen={showScanner}
            onClose={() => setShowScanner(false)}
            onScan={(result) => {
              console.log('Barcode scanned:', result);
              // Handle barcode scan result
              setShowScanner(false);
            }}
          />
        )}
      </div>
    </PageErrorWrapper>
  );
};

export default CustomerCareDashboardPage;
