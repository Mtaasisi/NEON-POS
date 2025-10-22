import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { PageErrorWrapper } from '../components/PageErrorWrapper';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import { useDashboardSettings } from '../../../hooks/useDashboardSettings';
import { useDateRange } from '../../../context/DateRangeContext';
import { DateRangeSelector } from '../../../components/DateRangeSelector';
import { DashboardBranchFilter } from '../../../components/DashboardBranchFilter';
import { DashboardBranchProvider, useDashboardBranch } from '../../../context/DashboardBranchContext';
import {
  Smartphone, Users, Package, Plus,
  DollarSign, Calendar,
  Zap, RefreshCw, FileText,
  BarChart3, MessageCircle, Settings,
  Search, Star, HardDrive,
  MessageSquare, Wrench, Download, Upload,
  UserCheck, Database, Target, Bot,
  Printer, Tag, Building, MapPin, Clock
} from 'lucide-react';
import {
  NotificationWidget,
  EmployeeWidget,
  AppointmentWidget,
  InventoryWidget,
  FinancialWidget,
  AnalyticsWidget,
  ServiceWidget,
  ReminderWidget,
  SystemHealthWidget,
  ActivityFeedWidget,
  CustomerInsightsWidget,
  PurchaseOrderWidget,
  ChatWidget,
  SalesWidget,
  TopProductsWidget,
  ExpensesWidget,
  StaffPerformanceWidget,
  RevenueTrendChart,
  DeviceStatusChart,
  AppointmentsTrendChart,
  StockLevelChart,
  CustomerActivityChart,
  PerformanceMetricsChart,
  SalesFunnelChart,
  PurchaseOrderChart,
  SalesChart,
  PaymentMethodsChart,
  SalesByCategoryChart,
  ProfitMarginChart
} from '../components/dashboard';
import { dashboardService, DashboardStats } from '../../../services/dashboardService';
import { getDashboardTitleForRole, getDashboardDescriptionForRole } from '../../../config/roleBasedWidgets';

const DashboardPageContent: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Dashboard settings hook
  const { 
    isQuickActionEnabled, 
    isWidgetEnabled, 
    loading: settingsLoading 
  } = useDashboardSettings();
  
  // Date range filter hook
  const { dateRange, setDateRange, getDateRangeForQuery } = useDateRange();
  
  // Branch filter hook
  const { dashboardBranchId, setDashboardBranchId } = useDashboardBranch();
  
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
          const dateRangeQuery = getDateRangeForQuery();
          
          // Temporarily store current branch and set dashboard branch for filtering
          const originalBranchId = localStorage.getItem('current_branch_id');
          if (dashboardBranchId !== null) {
            localStorage.setItem('current_branch_id', dashboardBranchId);
          } else {
            localStorage.removeItem('current_branch_id');
          }
          
          const stats = await dashboardService.getDashboardStats(
            currentUser.id, 
            dateRangeQuery.startDate, 
            dateRangeQuery.endDate
          );
          
          // Restore original branch
          if (originalBranchId) {
            localStorage.setItem('current_branch_id', originalBranchId);
          } else {
            localStorage.removeItem('current_branch_id');
          }
          
          setDashboardStats(stats);
        }
        
        setIsLoading(false);
      }, 'Loading dashboard data');
    };

    loadDashboardData();
  }, [currentUser?.id, withErrorHandling, dateRange, dashboardBranchId]); // Re-load when date range or branch changes

  // Auto refresh dashboard every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentUser?.id && !isLoading) {
        const dateRangeQuery = getDateRangeForQuery();
        
        // Temporarily store current branch and set dashboard branch for filtering
        const originalBranchId = localStorage.getItem('current_branch_id');
        if (dashboardBranchId !== null) {
          localStorage.setItem('current_branch_id', dashboardBranchId);
        } else {
          localStorage.removeItem('current_branch_id');
        }
        
        dashboardService.getDashboardStats(
          currentUser.id,
          dateRangeQuery.startDate,
          dateRangeQuery.endDate
        ).then(stats => {
          setDashboardStats(stats);
          
          // Restore original branch
          if (originalBranchId) {
            localStorage.setItem('current_branch_id', originalBranchId);
          } else {
            localStorage.removeItem('current_branch_id');
          }
        });
      }
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [currentUser?.id, isLoading, dateRange, dashboardBranchId, getDateRangeForQuery]);

  // Manual refresh handler
  const handleRefresh = async () => {
    if (currentUser?.id) {
      setIsLoading(true);
      try {
        const dateRangeQuery = getDateRangeForQuery();
        
        // Temporarily store current branch and set dashboard branch for filtering
        const originalBranchId = localStorage.getItem('current_branch_id');
        if (dashboardBranchId !== null) {
          localStorage.setItem('current_branch_id', dashboardBranchId);
        } else {
          localStorage.removeItem('current_branch_id');
        }
        
        const stats = await dashboardService.getDashboardStats(
          currentUser.id,
          dateRangeQuery.startDate,
          dateRangeQuery.endDate
        );
        setDashboardStats(stats);
        
        // Restore original branch
        if (originalBranchId) {
          localStorage.setItem('current_branch_id', originalBranchId);
        } else {
          localStorage.removeItem('current_branch_id');
        }
      } catch (error) {
        handleError(error as Error, 'Refreshing dashboard');
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Handle branch change
  const handleBranchChange = (branchId: string | null) => {
    console.log('📊 Dashboard branch changed to:', branchId || 'All Branches');
    setDashboardBranchId(branchId);
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
    // Core Business Features
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
      path: '/payments'
    },
    {
      id: 'adGenerator' as const,
      title: 'Ad Generator',
      description: 'Create product ads',
      icon: FileText,
      color: 'from-rose-500 to-rose-600',
      path: '/ad-generator'
    },
    {
      id: 'pos' as const,
      title: 'POS System',
      description: 'Point of sale',
      icon: DollarSign,
      color: 'from-cyan-500 to-cyan-600',
      path: '/pos'
    },
    {
      id: 'reports' as const,
      title: 'Sales Reports',
      description: 'View sales reports',
      icon: BarChart3,
      color: 'from-violet-500 to-violet-600',
      path: '/lats/sales-reports'
    },
    {
      id: 'employees' as const,
      title: 'Employees',
      description: 'Manage staff',
      icon: Users,
      color: 'from-teal-500 to-teal-600',
      path: '/employees'
    },
    {
      id: 'whatsapp' as const,
      title: 'WhatsApp',
      description: 'WhatsApp chat',
      icon: MessageCircle,
      color: 'from-green-500 to-green-600',
      path: '/lats/whatsapp-chat'
    },
    {
      id: 'settings' as const,
      title: 'Settings',
      description: 'System settings',
      icon: Settings,
      color: 'from-gray-500 to-gray-600',
      path: '/admin-settings'
    },
    {
      id: 'search' as const,
      title: 'Search',
      description: 'Global search',
      icon: Search,
      color: 'from-amber-500 to-amber-600',
      path: '/search'
    },
    {
      id: 'loyalty' as const,
      title: 'Loyalty Program',
      description: 'Customer loyalty',
      icon: Star,
      color: 'from-yellow-500 to-yellow-600',
      path: '/lats/loyalty'
    },
    {
      id: 'backup' as const,
      title: 'Backup',
      description: 'Data backup',
      icon: HardDrive,
      color: 'from-slate-500 to-slate-600',
      path: '/backup-management'
    },
    
    // SMS & Communication Features
    {
      id: 'sms' as const,
      title: 'SMS Center',
      description: 'SMS management',
      icon: MessageSquare,
      color: 'from-blue-500 to-blue-600',
      path: '/sms'
    },
    {
      id: 'bulkSms' as const,
      title: 'Bulk SMS',
      description: 'Mass messaging',
      icon: MessageSquare,
      color: 'from-indigo-500 to-indigo-600',
      path: '/sms/bulk'
    },
    {
      id: 'smsLogs' as const,
      title: 'SMS Logs',
      description: 'Message history',
      icon: MessageSquare,
      color: 'from-purple-500 to-purple-600',
      path: '/sms/logs'
    },
    {
      id: 'smsSettings' as const,
      title: 'SMS Settings',
      description: 'SMS configuration',
      icon: Settings,
      color: 'from-gray-500 to-gray-600',
      path: '/sms/settings'
    },
    
    // Import/Export & Data Management
    {
      id: 'excelImport' as const,
      title: 'Excel Import',
      description: 'Data import',
      icon: Upload,
      color: 'from-emerald-500 to-emerald-600',
      path: '/excel-import'
    },
    {
      id: 'excelTemplates' as const,
      title: 'Excel Templates',
      description: 'Template downloads',
      icon: Download,
      color: 'from-cyan-500 to-cyan-600',
      path: '/excel-templates'
    },
    {
      id: 'productExport' as const,
      title: 'Product Export',
      description: 'Export products',
      icon: Download,
      color: 'from-pink-500 to-pink-600',
      path: '/product-export'
    },
    {
      id: 'customerImport' as const,
      title: 'Customer Import',
      description: 'Import customers',
      icon: Upload,
      color: 'from-rose-500 to-rose-600',
      path: '/customers/import'
    },
    
    // Advanced System Features
    {
      id: 'userManagement' as const,
      title: 'User Management',
      description: 'User administration',
      icon: UserCheck,
      color: 'from-indigo-500 to-indigo-600',
      path: '/users'
    },
    {
      id: 'databaseSetup' as const,
      title: 'Database Setup',
      description: 'Database configuration',
      icon: Database,
      color: 'from-slate-500 to-slate-600',
      path: '/database-setup'
    },
    {
      id: 'integrationSettings' as const,
      title: 'Integration Settings',
      description: 'System integrations',
      icon: Settings,
      color: 'from-gray-500 to-gray-600',
      path: '/integration-settings'
    },
    {
      id: 'integrationsTest' as const,
      title: 'Integrations Test',
      description: 'Test integrations',
      icon: Target,
      color: 'from-orange-500 to-orange-600',
      path: '/integrations-test'
    },
    {
      id: 'aiTraining' as const,
      title: 'AI Training',
      description: 'AI training system',
      icon: Bot,
      color: 'from-purple-500 to-purple-600',
      path: '/ai-training'
    },
    {
      id: 'bluetoothPrinter' as const,
      title: 'Bluetooth Printer',
      description: 'Printer management',
      icon: Printer,
      color: 'from-blue-500 to-blue-600',
      path: '/bluetooth-printer'
    },
    
    // Business Management
    {
      id: 'categoryManagement' as const,
      title: 'Category Management',
      description: 'Product categories',
      icon: Tag,
      color: 'from-green-500 to-green-600',
      path: '/category-management'
    },
    {
      id: 'supplierManagement' as const,
      title: 'Supplier Management',
      description: 'Supplier management',
      icon: Building,
      color: 'from-indigo-500 to-indigo-600',
      path: '/supplier-management'
    },
    {
      id: 'storeLocations' as const,
      title: 'Store Locations',
      description: 'Location management',
      icon: MapPin,
      color: 'from-red-500 to-red-600',
      path: '/store-locations'
    },
    
    // Advanced Analytics & Reports
    {
      id: 'reminders' as const,
      title: 'Reminders',
      description: 'Reminder system',
      icon: Clock,
      color: 'from-yellow-500 to-yellow-600',
      path: '/reminders'
    },
    {
      id: 'mobile' as const,
      title: 'Mobile',
      description: 'Mobile features',
      icon: Smartphone,
      color: 'from-cyan-500 to-cyan-600',
      path: '/mobile'
    },
    {
      id: 'myAttendance' as const,
      title: 'My Attendance',
      description: 'Personal attendance',
      icon: Clock,
      color: 'from-blue-500 to-blue-600',
      path: '/my-attendance'
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
              <h1 className="text-3xl font-bold text-gray-900">
                {getDashboardTitleForRole(currentUser?.role || 'user')}
              </h1>
              <p className="text-gray-600 mt-1">
                {getDashboardDescriptionForRole(currentUser?.role || 'user', currentUser?.name || currentUser?.email)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Branch Filter - Admin only */}
              {currentUser?.role === 'admin' && (
                <DashboardBranchFilter
                  onBranchChange={handleBranchChange}
                  defaultToCurrent={true}
                />
              )}
              
              {/* Date Range Selector */}
              <DateRangeSelector
                value={dateRange}
                onChange={setDateRange}
              />
              
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
            {(isWidgetEnabled('revenueTrendChart') || isWidgetEnabled('deviceStatusChart') || isWidgetEnabled('appointmentsTrendChart') || isWidgetEnabled('purchaseOrderChart') || isWidgetEnabled('salesChart') || isWidgetEnabled('paymentMethodsChart') || isWidgetEnabled('salesByCategoryChart') || isWidgetEnabled('profitMarginChart')) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isWidgetEnabled('revenueTrendChart') && <RevenueTrendChart />}
                {isWidgetEnabled('salesChart') && <SalesChart />}
                {isWidgetEnabled('deviceStatusChart') && <DeviceStatusChart />}
                {isWidgetEnabled('appointmentsTrendChart') && <AppointmentsTrendChart />}
                {isWidgetEnabled('purchaseOrderChart') && <PurchaseOrderChart />}
                {isWidgetEnabled('paymentMethodsChart') && <PaymentMethodsChart />}
                {isWidgetEnabled('salesByCategoryChart') && <SalesByCategoryChart />}
                {isWidgetEnabled('profitMarginChart') && <div className="lg:col-span-2"><ProfitMarginChart /></div>}
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

            {/* Customer Insights & Service Row */}
            {(isWidgetEnabled('customerInsightsWidget') || isWidgetEnabled('serviceWidget') || isWidgetEnabled('reminderWidget')) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {isWidgetEnabled('customerInsightsWidget') && <CustomerInsightsWidget />}
                {isWidgetEnabled('serviceWidget') && <ServiceWidget />}
                {isWidgetEnabled('reminderWidget') && <ReminderWidget />}
              </div>
            )}

            {/* Sales & Business Row */}
            {(isWidgetEnabled('salesWidget') || isWidgetEnabled('topProductsWidget') || isWidgetEnabled('expensesWidget')) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {isWidgetEnabled('salesWidget') && <SalesWidget />}
                {isWidgetEnabled('topProductsWidget') && <TopProductsWidget />}
                {isWidgetEnabled('expensesWidget') && <ExpensesWidget />}
              </div>
            )}

            {/* Purchase Orders & Communication Row */}
            {(isWidgetEnabled('purchaseOrderWidget') || isWidgetEnabled('chatWidget') || isWidgetEnabled('staffPerformanceWidget')) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {isWidgetEnabled('purchaseOrderWidget') && <PurchaseOrderWidget />}
                {isWidgetEnabled('chatWidget') && <ChatWidget />}
                {isWidgetEnabled('staffPerformanceWidget') && <StaffPerformanceWidget />}
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

// Wrapper component with DashboardBranchProvider
const DashboardPage: React.FC = () => {
  return (
    <DashboardBranchProvider>
      <DashboardPageContent />
    </DashboardBranchProvider>
  );
};

export default DashboardPage;