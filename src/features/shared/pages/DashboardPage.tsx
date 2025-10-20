import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { PageErrorWrapper } from '../components/PageErrorWrapper';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import { useDashboardSettings } from '../../../hooks/useDashboardSettings';
import {
  Smartphone, Users, Package, Plus,
  DollarSign, Calendar,
  Zap, RefreshCw, FileText
} from 'lucide-react';
import {
  NotificationWidget,
  EmployeeWidget,
  AppointmentWidget,
  InventoryWidget,
  FinancialWidget,
  AnalyticsWidget,
  SystemHealthWidget,
  ActivityFeedWidget,
  CustomerInsightsWidget,
  ServiceWidget,
  RevenueTrendChart,
  DeviceStatusChart,
  AppointmentsTrendChart,
  StockLevelChart,
  CustomerActivityChart,
  PerformanceMetricsChart,
  SalesFunnelChart
} from '../components/dashboard';
import { dashboardService, DashboardStats } from '../../../services/dashboardService';

const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Dashboard settings hook
  const { 
    isQuickActionEnabled, 
    isWidgetEnabled, 
    loading: settingsLoading 
  } = useDashboardSettings();
  
  // Error handling
  const { handleError, withErrorHandling } = useErrorHandler({
    maxRetries: 3,
    showToast: true,
    logToConsole: true
  });

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // Load comprehensive dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      await withErrorHandling(async () => {
        setIsLoading(true);
        
        if (currentUser?.id) {
          const stats = await dashboardService.getDashboardStats(currentUser.id);
          setDashboardStats(stats);
        }
        
        setIsLoading(false);
      }, 'Loading dashboard data');
    };

    loadDashboardData();
  }, [currentUser?.id, withErrorHandling]);

  // Auto refresh dashboard every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentUser?.id && !isLoading) {
        dashboardService.getDashboardStats(currentUser.id).then(stats => {
          setDashboardStats(stats);
        });
      }
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [currentUser?.id, isLoading]);

  // Manual refresh handler
  const handleRefresh = async () => {
    if (currentUser?.id) {
      setIsLoading(true);
      try {
        const stats = await dashboardService.getDashboardStats(currentUser.id);
        setDashboardStats(stats);
      } catch (error) {
        handleError(error as Error, 'Refreshing dashboard');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle navigation with error handling
  const handleNavigation = (path: string) => {
    try {
      navigate(path);
    } catch (error) {
      handleError(error as Error, 'Navigation');
    }
  };


  // Quick action cards - streamlined for comprehensive dashboard
  const allQuickActions = [
    {
      id: 'devices' as const,
      title: 'Devices',
      description: 'Manage devices',
      icon: Smartphone,
      color: 'from-indigo-500 to-indigo-600',
      path: '/devices'
    },
    {
      id: 'addDevice' as const,
      title: 'Add Device',
      description: 'New device',
      icon: Plus,
      color: 'from-blue-500 to-blue-600',
      path: '/devices/new'
    },
    {
      id: 'customers' as const,
      title: 'Customers',
      description: 'Customer data',
      icon: Users,
      color: 'from-green-500 to-green-600',
      path: '/customers'
    },
    {
      id: 'inventory' as const,
      title: 'Inventory',
      description: 'Stock & parts',
      icon: Package,
      color: 'from-purple-500 to-purple-600',
      path: '/lats/unified-inventory'
    },
    {
      id: 'appointments' as const,
      title: 'Appointments',
      description: 'Scheduling',
      icon: Calendar,
      color: 'from-pink-500 to-pink-500',
      path: '/appointments'
    },
    {
      id: 'purchaseOrders' as const,
      title: 'Purchase Orders',
      description: 'Manage orders',
      icon: Package,
      color: 'from-orange-500 to-orange-600',
      path: '/lats/purchase-orders'
    },
    {
      id: 'payments' as const,
      title: 'Payments',
      description: 'Payment management',
      icon: DollarSign,
      color: 'from-emerald-500 to-emerald-600',
      path: '/finance/payments'
    },
    {
      id: 'adGenerator' as const,
      title: 'Ad Generator',
      description: 'Create product ads',
      icon: FileText,
      color: 'from-rose-500 to-rose-600',
      path: '/ad-generator'
    }
  ];

  // Filter quick actions based on user settings
  const quickActions = allQuickActions.filter(action => isQuickActionEnabled(action.id));

  return (
    <PageErrorWrapper pageName="Dashboard" showDetails={true}>
      <div className="p-4 sm:p-6 h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
                  {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {currentUser?.name || currentUser?.email || 'User'}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleNavigation('/devices/new')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus size={18} />
                Add Device
              </button>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
              >
                <RefreshCw size={18} />
              </button>
            </div>
        </div>

        {/* Quick Actions */}
        {!isLoading && !settingsLoading && quickActions.length > 0 && (
          <div className="bg-white rounded-2xl p-7">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Quick Actions</h3>
                <p className="text-xs text-gray-400 mt-0.5">Access frequently used features</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleNavigation(action.path)}
                    className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-center group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-medium text-sm text-gray-900 mb-1">{action.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2">{action.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3498db]"></div>
            <span className="ml-3 text-gray-600 font-medium">Loading dashboard...</span>
          </div>
        )}

        {/* Statistics & Charts - Enhanced with Visualizations */}
        {!isLoading && !settingsLoading && dashboardStats && (
          <>
            {/* Top Row - Chart Cards */}
            {(isWidgetEnabled('revenueTrendChart') || isWidgetEnabled('deviceStatusChart') || isWidgetEnabled('appointmentsTrendChart')) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isWidgetEnabled('revenueTrendChart') && <RevenueTrendChart />}
                {isWidgetEnabled('deviceStatusChart') && <DeviceStatusChart />}
                {isWidgetEnabled('appointmentsTrendChart') && <AppointmentsTrendChart />}
              </div>
            )}

            {/* Second Row - Stock Level Chart */}
            {isWidgetEnabled('stockLevelChart') && (
              <div className="grid grid-cols-1">
                <StockLevelChart />
              </div>
            )}

            {/* Third Row - Performance & Analytics */}
            {(isWidgetEnabled('performanceMetricsChart') || isWidgetEnabled('customerActivityChart')) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {isWidgetEnabled('performanceMetricsChart') && <PerformanceMetricsChart />}
                {isWidgetEnabled('customerActivityChart') && <CustomerActivityChart />}
              </div>
            )}

          </>
        )}

        {/* Comprehensive Widgets Layout */}
        {!isLoading && !settingsLoading && dashboardStats && (
          <div className="space-y-6">
            {/* Top Priority Row - Operations */}
            {(isWidgetEnabled('appointmentWidget') || isWidgetEnabled('employeeWidget') || isWidgetEnabled('notificationWidget')) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {isWidgetEnabled('appointmentWidget') && <AppointmentWidget />}
                {isWidgetEnabled('employeeWidget') && <EmployeeWidget />}
                {isWidgetEnabled('notificationWidget') && <NotificationWidget />}
              </div>
            )}

            {/* Financial & Analytics Row */}
            {(isWidgetEnabled('financialWidget') || isWidgetEnabled('analyticsWidget') || isWidgetEnabled('salesFunnelChart')) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {isWidgetEnabled('financialWidget') && <FinancialWidget />}
                {isWidgetEnabled('analyticsWidget') && <AnalyticsWidget />}
                {isWidgetEnabled('salesFunnelChart') && <SalesFunnelChart />}
              </div>
            )}

            {/* Service & Customer Insights Row */}
            {(isWidgetEnabled('serviceWidget') || isWidgetEnabled('customerInsightsWidget')) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {isWidgetEnabled('serviceWidget') && (
                  <div className={isWidgetEnabled('customerInsightsWidget') ? 'lg:col-span-2' : 'lg:col-span-3'}>
                    <ServiceWidget />
                  </div>
                )}
                {isWidgetEnabled('customerInsightsWidget') && <CustomerInsightsWidget />}
              </div>
            )}

            {/* System Monitoring Row */}
            {(isWidgetEnabled('systemHealthWidget') || isWidgetEnabled('inventoryWidget') || isWidgetEnabled('activityFeedWidget')) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {isWidgetEnabled('systemHealthWidget') && <SystemHealthWidget />}
                {isWidgetEnabled('inventoryWidget') && <InventoryWidget />}
                {isWidgetEnabled('activityFeedWidget') && <ActivityFeedWidget />}
              </div>
            )}
          </div>
        )}

        </div>
      </div>
    </PageErrorWrapper>
  );
};

export default DashboardPage;