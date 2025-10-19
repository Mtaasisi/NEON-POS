import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { PageErrorWrapper } from '../components/PageErrorWrapper';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
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
  ServiceWidget
} from '../components/dashboard';
import { dashboardService, DashboardStats } from '../../../services/dashboardService';

const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
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

  // Format currency with error handling
  const formatMoney = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-TZ', {
        style: 'currency',
        currency: 'TZS'
      }).format(amount);
    } catch (error) {
      handleError(error as Error, 'Currency formatting');
      return `TZS ${amount}`;
    }
  };

  // Quick action cards - streamlined for comprehensive dashboard
  const quickActions = [
    {
      title: 'Devices',
      description: 'Manage devices',
      icon: Smartphone,
      color: 'from-indigo-500 to-indigo-600',
      path: '/devices'
    },
    {
      title: 'Add Device',
      description: 'New device',
      icon: Plus,
      color: 'from-blue-500 to-blue-600',
      path: '/devices/new'
    },
    {
      title: 'Customers',
      description: 'Customer data',
      icon: Users,
      color: 'from-green-500 to-green-600',
      path: '/customers'
    },
    {
      title: 'Inventory',
      description: 'Stock & parts',
      icon: Package,
      color: 'from-purple-500 to-purple-600',
      path: '/lats/unified-inventory'
    },
    {
      title: 'Appointments',
      description: 'Scheduling',
      icon: Calendar,
      color: 'from-pink-500 to-pink-500',
      path: '/appointments'
    },
    {
      title: 'Purchase Orders',
      description: 'Manage orders',
      icon: Package,
      color: 'from-orange-500 to-orange-600',
      path: '/lats/purchase-orders'
    },
    {
      title: 'Payments',
      description: 'Payment management',
      icon: DollarSign,
      color: 'from-emerald-500 to-emerald-600',
      path: '/finance/payments'
    },
    {
      title: 'Ad Generator',
      description: 'Create product ads',
      icon: FileText,
      color: 'from-rose-500 to-rose-600',
      path: '/ad-generator'
    }
  ];

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
        {!isLoading && (
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

        {/* Statistics */}
        {!isLoading && dashboardStats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <div className="bg-white rounded-xl p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Total Devices</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalDevices}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.activeCustomers}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Staff Present</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.presentToday}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Appointments</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.todayAppointments}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Stock Alerts</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.lowStockItems}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Revenue Today</p>
                    <p className="text-2xl font-bold text-gray-900">{formatMoney(dashboardStats.revenueToday)}</p>
                  </div>
                </div>
              </div>
            </div>

          </>
        )}

        {/* Comprehensive Widgets Layout */}
        {!isLoading && dashboardStats && (
          <div className="space-y-6">
            {/* Top Priority Row - Operations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <AppointmentWidget />
              <EmployeeWidget />
              <NotificationWidget />
            </div>

            {/* Financial & Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FinancialWidget />
              <AnalyticsWidget />
            </div>

            {/* Service & Customer Insights Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ServiceWidget />
              </div>
              <CustomerInsightsWidget />
            </div>

            {/* System Monitoring Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <SystemHealthWidget />
              <InventoryWidget />
              <ActivityFeedWidget />
            </div>
          </div>
        )}

        </div>
      </div>
    </PageErrorWrapper>
  );
};

export default DashboardPage;