import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { loadUserSettings, saveUserSettings, UserSettings } from '../../../lib/userSettingsApi';
import { 
  getRoleWidgetPermissions, 
  getRoleQuickActionPermissions,
  RoleWidgetPermissions,
  RoleQuickActionPermissions 
} from '../../../config/roleBasedWidgets';
import toast from 'react-hot-toast';
import { WidgetOrderSettings } from './WidgetOrderSettings';
import { useSmartGridLayout } from '../../../hooks/useSmartGridLayout';
import { 
  LayoutDashboard, 
  Zap, 
  Save,
  RotateCcw,
  Smartphone,
  Users,
  Package,
  Plus,
  DollarSign,
  Calendar,
  FileText,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  Bell,
  UserCog,
  Briefcase,
  LineChart,
  Box,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MousePointerClick,
  MessageCircle,
  Settings,
  Search,
  Star,
  HardDrive,
  MessageSquare,
  Wrench,
  Database,
  Download,
  Upload,
  UserCheck,
  Building,
  MapPin,
  Bot,
  Printer,
  Clock,
  Target,
  Tag,
  Info,
  Shield,
  Maximize2,
  Minimize2,
  Square,
  Rows,
  ArrowUpDown
} from 'lucide-react';

type WidgetSize = 'small' | 'medium' | 'large';
type WidgetRowSpan = 'single' | 'double';

interface DashboardSettings {
  quickActions: {
    // Core Business Features
    devices: boolean;
    addDevice: boolean;
    customers: boolean;
    inventory: boolean;
    appointments: boolean;
    purchaseOrders: boolean;
    payments: boolean;
    adGenerator: boolean;
    pos: boolean;
    reports: boolean;
    employees: boolean;
    whatsapp: boolean;
    settings: boolean;
    search: boolean;
    loyalty: boolean;
    backup: boolean;
    
    // SMS & Communication Features
    sms: boolean;
    bulkSms: boolean;
    smsLogs: boolean;
    smsSettings: boolean;
    
    // Import/Export & Data Management
    excelImport: boolean;
    excelTemplates: boolean;
    productExport: boolean;
    customerImport: boolean;
    
    // Advanced System Features
    userManagement: boolean;
    databaseSetup: boolean;
    integrationSettings: boolean;
    integrationsTest: boolean;
    aiTraining: boolean;
    bluetoothPrinter: boolean;
    
    // Business Management
    categoryManagement: boolean;
    supplierManagement: boolean;
    storeLocations: boolean;
    
    // Advanced Analytics & Reports
    reminders: boolean;
    mobile: boolean;
    myAttendance: boolean;
  };
  widgets: {
    revenueTrendChart: boolean;
    deviceStatusChart: boolean;
    appointmentsTrendChart: boolean;
    stockLevelChart: boolean;
    performanceMetricsChart: boolean;
    customerActivityChart: boolean;
    salesFunnelChart: boolean;
    purchaseOrderChart: boolean;
    appointmentWidget: boolean;
    employeeWidget: boolean;
    notificationWidget: boolean;
    financialWidget: boolean;
    analyticsWidget: boolean;
    serviceWidget: boolean;
    reminderWidget: boolean;
    customerInsightsWidget: boolean;
    systemHealthWidget: boolean;
    inventoryWidget: boolean;
    activityFeedWidget: boolean;
    purchaseOrderWidget: boolean;
    chatWidget: boolean;
    salesWidget: boolean;
    topProductsWidget: boolean;
    expensesWidget: boolean;
    staffPerformanceWidget: boolean;
    paymentMethodsChart: boolean;
    salesByCategoryChart: boolean;
    profitMarginChart: boolean;
  };
  widgetSizes?: {
    [key: string]: WidgetSize;
  };
  widgetRowSpans?: {
    [key: string]: WidgetRowSpan;
  };
}

const DashboardCustomizationSettings: React.FC = () => {
  const { currentUser } = useAuth();
  const { autoArrangeWidgets } = useSmartGridLayout();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<{
    widgets: RoleWidgetPermissions;
    quickActions: RoleQuickActionPermissions;
  } | null>(null);

  const [dashboardSettings, setDashboardSettings] = useState<DashboardSettings>({
    quickActions: {
      // Core Business Features - Only 6 enabled by default
      devices: true,
      addDevice: true,
      customers: true,
      inventory: true,
      appointments: true,
      purchaseOrders: true,
      payments: false,
      adGenerator: false,
      pos: false,
      reports: false,
      employees: false,
      whatsapp: false,
      settings: false,
      search: false,
      loyalty: false,
      backup: false,
      
      // SMS & Communication Features
      sms: false,
      bulkSms: false,
      smsLogs: false,
      smsSettings: false,
      
      // Import/Export & Data Management
      excelImport: false,
      excelTemplates: false,
      productExport: false,
      customerImport: false,
      
      // Advanced System Features
      userManagement: false,
      databaseSetup: false,
      integrationSettings: false,
      integrationsTest: false,
      aiTraining: false,
      bluetoothPrinter: false,
      
      // Business Management
      categoryManagement: false,
      supplierManagement: false,
      storeLocations: false,
      
      // Advanced Analytics & Reports
      reminders: false,
      mobile: false,
      myAttendance: false
    },
    widgets: {
      revenueTrendChart: true,
      deviceStatusChart: true,
      appointmentsTrendChart: true,
      stockLevelChart: true,
      performanceMetricsChart: true,
      customerActivityChart: true,
      salesFunnelChart: true,
      purchaseOrderChart: true,
      appointmentWidget: true,
      employeeWidget: true,
      notificationWidget: true,
      financialWidget: true,
      analyticsWidget: true,
      serviceWidget: true,
      reminderWidget: true,
      customerInsightsWidget: true,
      systemHealthWidget: true,
      inventoryWidget: true,
      activityFeedWidget: true,
      purchaseOrderWidget: true,
      chatWidget: true,
      salesWidget: true,
      topProductsWidget: true,
      expensesWidget: true,
      staffPerformanceWidget: true,
      paymentMethodsChart: true,
      salesByCategoryChart: true,
      profitMarginChart: true
    }
  });

  // Load role permissions and settings on mount
  useEffect(() => {
    if (currentUser) {
      loadRolePermissions();
      loadSettings();
    }
  }, [currentUser?.id, currentUser?.role]);

  const loadRolePermissions = () => {
    if (!currentUser) return;
    
    const widgetPerms = getRoleWidgetPermissions(currentUser.role);
    const quickActionPerms = getRoleQuickActionPermissions(currentUser.role);
    
    setRolePermissions({
      widgets: widgetPerms,
      quickActions: quickActionPerms
    });
  };

  const loadSettings = async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);
      const settings = await loadUserSettings(currentUser.id);
      
      if (settings?.dashboard) {
        setDashboardSettings(settings.dashboard);
      }
    } catch (error) {
      console.error('Error loading dashboard settings:', error);
      toast.error('Failed to load dashboard settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setSaving(true);
      
      // Load current settings
      const currentSettings = await loadUserSettings(currentUser.id);
      
      // Update with new dashboard settings
      const updatedSettings: UserSettings = {
        ...currentSettings,
        dashboard: dashboardSettings
      };

      const success = await saveUserSettings(currentUser.id, updatedSettings, 'Dashboard');
      
      if (success) {
        toast.success('Dashboard settings saved! Refresh your dashboard to see changes.', {
          duration: 4000,
          icon: '✅'
        });
        
        // Trigger a storage event to notify other components
        window.dispatchEvent(new CustomEvent('dashboardSettingsChanged'));
      } else {
        toast.error('Failed to save dashboard settings');
      }
    } catch (error) {
      console.error('Error saving dashboard settings:', error);
      toast.error('Failed to save dashboard settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!rolePermissions) return;

    // Reset to role-based defaults
    const defaultSettings: DashboardSettings = {
      quickActions: rolePermissions.quickActions as any,
      widgets: rolePermissions.widgets as any
    };
    
    setDashboardSettings(defaultSettings);
    toast.success('Dashboard settings reset to your role defaults');
  };

  const toggleQuickAction = (action: keyof DashboardSettings['quickActions']) => {
    // Only allow toggle if user has permission for this action
    if (!rolePermissions?.quickActions[action as keyof RoleQuickActionPermissions]) {
      return;
    }

    setDashboardSettings(prev => ({
      ...prev,
      quickActions: {
        ...prev.quickActions,
        [action]: !prev.quickActions[action]
      }
    }));
  };

  const toggleWidget = (widget: keyof DashboardSettings['widgets']) => {
    // Only allow toggle if user has permission for this widget
    if (!rolePermissions?.widgets[widget as keyof RoleWidgetPermissions]) {
      return;
    }

    setDashboardSettings(prev => ({
      ...prev,
      widgets: {
        ...prev.widgets,
        [widget]: !prev.widgets[widget]
      }
    }));
  };

  const toggleAllQuickActions = (value: boolean) => {
    if (!rolePermissions) return;

    setDashboardSettings(prev => ({
      ...prev,
      quickActions: Object.keys(prev.quickActions).reduce((acc, key) => {
        const actionKey = key as keyof RoleQuickActionPermissions;
        // Only set value if user has permission
        acc[key as keyof DashboardSettings['quickActions']] = 
          rolePermissions.quickActions[actionKey] ? value : false;
        return acc;
      }, {} as DashboardSettings['quickActions'])
    }));
  };

  const toggleAllWidgets = (value: boolean) => {
    if (!rolePermissions) return;

    setDashboardSettings(prev => ({
      ...prev,
      widgets: Object.keys(prev.widgets).reduce((acc, key) => {
        const widgetKey = key as keyof RoleWidgetPermissions;
        // Only set value if user has permission
        acc[key as keyof DashboardSettings['widgets']] = 
          rolePermissions.widgets[widgetKey] ? value : false;
        return acc;
      }, {} as DashboardSettings['widgets'])
    }));
  };

  const setWidgetSize = (widgetKey: string, size: WidgetSize) => {
    setDashboardSettings(prev => ({
      ...prev,
      widgetSizes: {
        ...(prev.widgetSizes || {}),
        [widgetKey]: size
      }
    }));
  };

  const getWidgetSize = (widgetKey: string): WidgetSize => {
    return dashboardSettings.widgetSizes?.[widgetKey] || 'small';
  };

  const setWidgetRowSpan = (widgetKey: string, rowSpan: WidgetRowSpan) => {
    setDashboardSettings(prev => ({
      ...prev,
      widgetRowSpans: {
        ...prev.widgetRowSpans,
        [widgetKey]: rowSpan
      }
    }));
  };

  const getWidgetRowSpan = (widgetKey: string): WidgetRowSpan => {
    return dashboardSettings.widgetRowSpans?.[widgetKey] || 'single';
  };

  const quickActionItems = [
    // Core Business Features
    { key: 'devices' as const, label: 'Devices', icon: Smartphone, description: 'Manage devices' },
    { key: 'addDevice' as const, label: 'Add Device', icon: Plus, description: 'Add new device' },
    { key: 'customers' as const, label: 'Customers', icon: Users, description: 'View customers' },
    { key: 'inventory' as const, label: 'Inventory', icon: Package, description: 'Stock & parts' },
    { key: 'appointments' as const, label: 'Appointments', icon: Calendar, description: 'Schedule appointments' },
    { key: 'purchaseOrders' as const, label: 'Purchase Orders', icon: Box, description: 'Manage orders' },
    { key: 'payments' as const, label: 'Payments', icon: DollarSign, description: 'Payment management' },
    { key: 'adGenerator' as const, label: 'Ad Generator', icon: FileText, description: 'Create product ads' },
    { key: 'pos' as const, label: 'POS System', icon: DollarSign, description: 'Point of sale' },
    { key: 'reports' as const, label: 'Sales Reports', icon: BarChart3, description: 'View sales reports' },
    { key: 'employees' as const, label: 'Employees', icon: Users, description: 'Manage staff' },
    { key: 'whatsapp' as const, label: 'WhatsApp', icon: MessageCircle, description: 'WhatsApp chat' },
    { key: 'settings' as const, label: 'Settings', icon: Settings, description: 'System settings' },
    { key: 'search' as const, label: 'Search', icon: Search, description: 'Global search' },
    { key: 'loyalty' as const, label: 'Loyalty Program', icon: Star, description: 'Customer loyalty' },
    { key: 'backup' as const, label: 'Backup', icon: HardDrive, description: 'Data backup' },
    
    // SMS & Communication Features
    { key: 'sms' as const, label: 'SMS Center', icon: MessageSquare, description: 'SMS management' },
    { key: 'bulkSms' as const, label: 'Bulk SMS', icon: MessageSquare, description: 'Mass messaging' },
    { key: 'smsLogs' as const, label: 'SMS Logs', icon: MessageSquare, description: 'Message history' },
    { key: 'smsSettings' as const, label: 'SMS Settings', icon: Settings, description: 'SMS configuration' },
    
    // Import/Export & Data Management
    { key: 'excelImport' as const, label: 'Excel Import', icon: Upload, description: 'Data import' },
    { key: 'excelTemplates' as const, label: 'Excel Templates', icon: Download, description: 'Template downloads' },
    { key: 'productExport' as const, label: 'Product Export', icon: Download, description: 'Export products' },
    { key: 'customerImport' as const, label: 'Customer Import', icon: Upload, description: 'Import customers' },
    
    // Advanced System Features
    { key: 'userManagement' as const, label: 'User Management', icon: UserCheck, description: 'User administration' },
    { key: 'databaseSetup' as const, label: 'Database Setup', icon: Database, description: 'Database configuration' },
    { key: 'integrationSettings' as const, label: 'Integration Settings', icon: Settings, description: 'System integrations' },
    { key: 'integrationsTest' as const, label: 'Integrations Test', icon: Target, description: 'Test integrations' },
    { key: 'aiTraining' as const, label: 'AI Training', icon: Bot, description: 'AI training system' },
    { key: 'bluetoothPrinter' as const, label: 'Bluetooth Printer', icon: Printer, description: 'Printer management' },
    
    // Business Management
    { key: 'categoryManagement' as const, label: 'Category Management', icon: Tag, description: 'Product categories' },
    { key: 'supplierManagement' as const, label: 'Supplier Management', icon: Building, description: 'Supplier management' },
    { key: 'storeLocations' as const, label: 'Store Locations', icon: MapPin, description: 'Location management' },
    
    // Advanced Analytics & Reports
    { key: 'reminders' as const, label: 'Reminders', icon: Clock, description: 'Reminder system' },
    { key: 'mobile' as const, label: 'Mobile', icon: Smartphone, description: 'Mobile features' },
    { key: 'myAttendance' as const, label: 'My Attendance', icon: Clock, description: 'Personal attendance' }
  ];

  const widgetItems = [
    // Charts
    { key: 'revenueTrendChart' as const, label: 'Revenue Trend Chart', icon: TrendingUp, category: 'Charts' },
    { key: 'deviceStatusChart' as const, label: 'Device Status Chart', icon: Smartphone, category: 'Charts' },
    { key: 'appointmentsTrendChart' as const, label: 'Appointments Trend Chart', icon: Calendar, category: 'Charts' },
    { key: 'stockLevelChart' as const, label: 'Stock Level Chart', icon: Package, category: 'Charts' },
    { key: 'performanceMetricsChart' as const, label: 'Performance Metrics Chart', icon: Activity, category: 'Charts' },
    { key: 'customerActivityChart' as const, label: 'Customer Activity Chart', icon: Users, category: 'Charts' },
    { key: 'salesFunnelChart' as const, label: 'Sales Funnel Chart', icon: PieChart, category: 'Charts' },
    { key: 'purchaseOrderChart' as const, label: 'Purchase Order Chart', icon: Box, category: 'Charts' },
    { key: 'paymentMethodsChart' as const, label: 'Payment Methods Chart', icon: Briefcase, category: 'Charts' },
    { key: 'salesByCategoryChart' as const, label: 'Sales by Category Chart', icon: Tag, category: 'Charts' },
    { key: 'profitMarginChart' as const, label: 'Profit Margin Chart', icon: TrendingUp, category: 'Charts' },
    
    // Widgets
    { key: 'appointmentWidget' as const, label: 'Appointment Widget', icon: Calendar, category: 'Widgets' },
    { key: 'employeeWidget' as const, label: 'Employee Widget', icon: UserCog, category: 'Widgets' },
    { key: 'notificationWidget' as const, label: 'Notification Widget', icon: Bell, category: 'Widgets' },
    { key: 'financialWidget' as const, label: 'Financial Widget', icon: DollarSign, category: 'Widgets' },
    { key: 'analyticsWidget' as const, label: 'Analytics Widget', icon: BarChart3, category: 'Widgets' },
    { key: 'serviceWidget' as const, label: 'Service Widget', icon: Wrench, category: 'Widgets' },
    { key: 'reminderWidget' as const, label: 'Reminder Widget', icon: Bell, category: 'Widgets' },
    { key: 'customerInsightsWidget' as const, label: 'Customer Insights Widget', icon: Users, category: 'Widgets' },
    { key: 'systemHealthWidget' as const, label: 'System Health Widget', icon: Activity, category: 'Widgets' },
    { key: 'inventoryWidget' as const, label: 'Inventory Widget', icon: Package, category: 'Widgets' },
    { key: 'activityFeedWidget' as const, label: 'Activity Feed Widget', icon: LineChart, category: 'Widgets' },
    { key: 'purchaseOrderWidget' as const, label: 'Purchase Order Widget', icon: Box, category: 'Widgets' },
    { key: 'chatWidget' as const, label: 'Chat Widget', icon: MessageCircle, category: 'Widgets' },
    { key: 'salesWidget' as const, label: 'Sales Widget', icon: DollarSign, category: 'Widgets' },
    { key: 'topProductsWidget' as const, label: 'Top Products Widget', icon: TrendingUp, category: 'Widgets' },
    { key: 'expensesWidget' as const, label: 'Expenses Widget', icon: Briefcase, category: 'Widgets' },
    { key: 'staffPerformanceWidget' as const, label: 'Staff Performance Widget', icon: Users, category: 'Widgets' }
  ];

  if (loading || !rolePermissions) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading dashboard settings...</span>
      </div>
    );
  }

  // Filter items based on role permissions
  const allowedQuickActions = quickActionItems.filter(item => 
    rolePermissions.quickActions[item.key as keyof RoleQuickActionPermissions]
  );
  
  const allowedWidgets = widgetItems.filter(item => 
    rolePermissions.widgets[item.key as keyof RoleWidgetPermissions]
  );

  const chartWidgets = allowedWidgets.filter(w => w.category === 'Charts');
  const otherWidgets = allowedWidgets.filter(w => w.category === 'Widgets');

  // Get saved widget order from localStorage for unified preview
  const getSavedWidgetOrder = (): string[] => {
    try {
      const savedOrder = localStorage.getItem('dashboard_widget_order');
      if (savedOrder) {
        return JSON.parse(savedOrder);
      }
    } catch (error) {
      console.error('Error loading widget order:', error);
    }
    // Default order if no saved order exists
    return [
      'revenueTrendChart', 'deviceStatusChart', 'appointmentsTrendChart',
      'purchaseOrderChart', 'paymentMethodsChart', 'analyticsWidget', 'salesByCategoryChart', 'profitMarginChart',
      'stockLevelChart', 'performanceMetricsChart', 'customerActivityChart',
      'appointmentWidget', 'employeeWidget', 'notificationWidget',
      'financialWidget', 'salesFunnelChart',
      'customerInsightsWidget', 'serviceWidget', 'reminderWidget',
      'systemHealthWidget', 'inventoryWidget', 'activityFeedWidget',
      'purchaseOrderWidget', 'chatWidget', 'salesWidget', 'topProductsWidget', 
      'expensesWidget', 'staffPerformanceWidget'
    ];
  };

  // Combine all widgets and sort by saved order for unified preview
  const allWidgets = [...chartWidgets, ...otherWidgets];
  const savedOrder = getSavedWidgetOrder();
  const orderedWidgets = [...allWidgets].sort((a, b) => {
    const indexA = savedOrder.indexOf(a.key);
    const indexB = savedOrder.indexOf(b.key);
    // If not in saved order, put at end
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Calculate enabled counts
  const enabledQuickActionsCount = allowedQuickActions.filter(item => 
    dashboardSettings.quickActions[item.key]
  ).length;
  const enabledChartsCount = chartWidgets.filter(w => dashboardSettings.widgets[w.key]).length;
  const enabledWidgetsCount = otherWidgets.filter(w => dashboardSettings.widgets[w.key]).length;
  const totalEnabledWidgets = enabledChartsCount + enabledWidgetsCount;

  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      'admin': 'Administrator',
      'customer-care': 'Customer Care',
      'technician': 'Technician',
      'manager': 'Manager',
      'sales': 'Sales',
      'user': 'User'
    };
    return roleNames[role] || role;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Dashboard Settings</h2>
              <p className="text-sm text-gray-600">Customize your dashboard</p>
            </div>
          </div>
          
          {/* Summary Badge */}
          <div className="flex gap-2">
            <div className="px-3 py-1.5 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600 font-medium">
                {enabledQuickActionsCount + enabledChartsCount + enabledWidgetsCount} items enabled
              </p>
            </div>
          </div>
        </div>

        {/* Role Info Banner */}
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Your Role: {getRoleDisplayName(currentUser?.role || '')}</span> - 
              You can customize {allowedQuickActions.length} quick actions and {allowedWidgets.length} widgets
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <RotateCcw size={18} />
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Quick Actions Section */}
      {allowedQuickActions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-blue-600">{enabledQuickActionsCount} of {allowedQuickActions.length}</span> enabled
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAllQuickActions(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium"
              >
                <CheckCircle2 size={16} />
                Enable All
              </button>
              <button
                onClick={() => toggleAllQuickActions(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium"
              >
                <XCircle size={16} />
                Disable All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {allowedQuickActions.map(item => {
              const Icon = item.icon;
              const isEnabled = dashboardSettings.quickActions[item.key];

              return (
                <button
                  key={item.key}
                  onClick={() => toggleQuickAction(item.key)}
                  className={`group p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                    isEnabled
                      ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-sm hover:shadow-md'
                      : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
                  }`}
                >
                  {/* Status Badge */}
                  <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    isEnabled 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </div>

                  <div className="flex items-start gap-3 mb-2 mt-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isEnabled 
                        ? 'bg-indigo-600 shadow-lg shadow-indigo-200' 
                        : 'bg-gray-300 group-hover:bg-indigo-400'
                    }`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  
                  <h4 className={`font-semibold text-sm mb-1 ${
                    isEnabled ? 'text-indigo-900' : 'text-gray-700'
                  }`}>
                    {item.label}
                  </h4>
                  <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>

                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dashboard Preview - Only Enabled Widgets */}
      {orderedWidgets.filter(w => dashboardSettings.widgets[w.key]).length > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border-2 border-green-300 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  Dashboard Preview
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-600 text-white shadow-sm">
                    {totalEnabledWidgets} Active
                  </span>
                </h3>
                <p className="text-sm text-gray-700 font-medium mt-1">
                  This shows EXACTLY how your dashboard looks with real gaps - Resize widgets to fill empty spaces
                </p>
              </div>
            </div>
          </div>

          {/* Show widgets using the SAME autoArrangeWidgets logic as the actual dashboard */}
          {(() => {
            // Get widget order from localStorage (same as dashboard)
            const getSavedWidgetOrder = (): string[] | null => {
              try {
                const savedOrder = localStorage.getItem('dashboard_widget_order');
                if (savedOrder) {
                  return JSON.parse(savedOrder);
                }
              } catch (error) {
                console.error('Error loading widget order:', error);
              }
              // Return null if no saved order
              return null;
            };

            // Get enabled widgets in the same order as dashboard
            const savedOrder = getSavedWidgetOrder();
            const enabledWidgetKeys = savedOrder 
              ? savedOrder.filter(key => dashboardSettings.widgets[key as keyof DashboardSettings['widgets']])
              : orderedWidgets.filter(w => dashboardSettings.widgets[w.key]).map(w => w.key);

            // Use autoArrangeWidgets to get the EXACT same layout as dashboard
            const smartLayout = autoArrangeWidgets(enabledWidgetKeys);

            // Create a map of widget keys to widget items for easy lookup
            const widgetMap = new Map(orderedWidgets.map(w => [w.key, w]));

            // Place widgets row by row (3 columns per row) to show real gaps
            const rows: Array<Array<{
              type: 'widget' | 'empty';
              item?: typeof orderedWidgets[0];
              gridColumn?: string;
              span?: number;
            }>> = [];
            let currentRow: Array<{
              type: 'widget' | 'empty';
              item?: typeof orderedWidgets[0];
              gridColumn?: string;
              span?: number;
            }> = [];
            let currentRowCols = 0;

            smartLayout.widgets.forEach((widget) => {
              const colSpan = parseInt(widget.gridColumn.split(' ')[1]);
              
              // If adding this widget exceeds 3 columns, start a new row
              if (currentRowCols + colSpan > 3) {
                // Fill remaining columns with empty spaces
                const remainingCols = 3 - currentRowCols;
                if (remainingCols > 0) {
                  currentRow.push({ type: 'empty', span: remainingCols });
                }
                rows.push(currentRow);
                currentRow = [];
                currentRowCols = 0;
              }
              
              // Add widget to current row
              currentRow.push({
                type: 'widget',
                item: widgetMap.get(widget.key),
                gridColumn: widget.gridColumn,
                span: colSpan
              });
              currentRowCols += colSpan;
              
              // If row is complete (3 columns), start new row
              if (currentRowCols >= 3) {
                rows.push(currentRow);
                currentRow = [];
                currentRowCols = 0;
              }
            });
            
            // Add the last incomplete row with empty spaces
            if (currentRow.length > 0) {
              const remainingCols = 3 - currentRowCols;
              if (remainingCols > 0) {
                currentRow.push({ type: 'empty', span: remainingCols });
              }
              rows.push(currentRow);
            }

            // Render rows with gaps (same structure as dashboard)
            return rows.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {row.map((cell, cellIndex) => {
                  if (cell.type === 'empty') {
                    // Render empty space placeholder
                    const getEmptySpanClass = () => {
                      if (cell.span === 1) return 'md:col-span-1';
                      if (cell.span === 2) return 'md:col-span-2 lg:col-span-2';
                      return 'md:col-span-2 lg:col-span-3';
                    };
                    
                    return (
                      <div 
                        key={`empty-${rowIndex}-${cellIndex}`}
                        className={`rounded-xl border-2 border-dashed border-red-300 bg-red-50/30 p-4 flex items-center justify-center min-h-[200px] ${getEmptySpanClass()}`}
                      >
                        <div className="text-center">
                          <div className="text-4xl mb-2">📏</div>
                          <p className="text-sm font-semibold text-red-600">Empty Space</p>
                          <p className="text-xs text-red-500 mt-1">
                            {cell.span === 1 ? '1 column gap' : cell.span === 2 ? '2 column gap' : '3 column gap'}
                          </p>
                          <p className="text-xs text-gray-600 mt-2">
                            Resize widgets above to fill this gap
                          </p>
                        </div>
                      </div>
                    );
                  }
                  
                  // Render widget
                  const item = cell.item!;
                  if (!item) return null;
                  
                  const Icon = item.icon;
                  const isEnabled = dashboardSettings.widgets[item.key];
                  const currentSize = getWidgetSize(item.key);
                  const currentRowSpan = getWidgetRowSpan(item.key);
                  const isChart = item.category === 'Charts';

                  // Get responsive class based on gridColumn from autoArrangeWidgets (same as dashboard)
                  const getResponsiveClass = () => {
                    const colSpan = cell.span || 1;
                    if (colSpan === 3) return 'md:col-span-2 lg:col-span-3';
                    if (colSpan === 2) return 'md:col-span-2 lg:col-span-2';
                    return 'md:col-span-1'; // colSpan === 1
                  };

                  // Color scheme based on category
                  const colorScheme = isChart ? {
                    border: 'border-purple-500',
                    bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
                    iconBg: 'bg-purple-600 shadow-lg shadow-purple-200',
                    iconHover: 'group-hover:bg-purple-400',
                    text: 'text-purple-900',
                    hoverText: 'text-purple-600',
                    sizeBg: 'bg-purple-600',
                    sizeButtons: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
                    sizeActive: 'bg-purple-600 text-white',
                    borderBottom: 'border-purple-200',
                    sizeLabel: 'text-purple-700'
                  } : {
                    border: 'border-blue-500',
                    bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
                    iconBg: 'bg-blue-600 shadow-lg shadow-blue-200',
                    iconHover: 'group-hover:bg-blue-400',
                    text: 'text-blue-900',
                    hoverText: 'text-blue-600',
                    sizeBg: 'bg-blue-600',
                    sizeButtons: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
                    sizeActive: 'bg-blue-600 text-white',
                    borderBottom: 'border-blue-200',
                    sizeLabel: 'text-blue-700'
                  };

                  return (
                    <div
                      key={item.key}
                      className={`rounded-xl border-2 transition-all relative overflow-hidden ${
                        isEnabled
                          ? `${colorScheme.border} ${colorScheme.bg} shadow-sm`
                          : 'border-gray-200 bg-white'
                      } ${getResponsiveClass()}`}
                    >
                    {/* Main Card - Click to toggle */}
                    <button
                      onClick={() => toggleWidget(item.key)}
                      className="w-full p-4 text-left group"
                    >
                      {/* Status Badge */}
                      <div className="absolute top-2 right-2 flex gap-1 flex-wrap justify-end max-w-[70%]">
                        <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isEnabled 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </div>
                        {isEnabled && (
                          <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorScheme.sizeBg} text-white`}>
                            {currentSize === 'small' ? 'Small' : currentSize === 'large' ? 'Large' : 'Medium'}
                          </div>
                        )}
                        <div className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-600 text-white">
                          {isChart ? '📊 Chart' : '📦 Widget'}
                        </div>
                      </div>

                      <div className="flex items-start gap-3 mb-2 mt-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          isEnabled 
                            ? colorScheme.iconBg
                            : `bg-gray-300 ${colorScheme.iconHover}`
                        }`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      
                      <h4 className={`font-semibold text-sm mb-1 ${
                        isEnabled ? colorScheme.text : 'text-gray-700'
                      }`}>
                        {item.label}
                      </h4>

                    </button>

                    {/* Size Selector - Only show if enabled */}
                    {isEnabled && (
                      <div className={`px-4 pb-4 pt-2 border-t ${colorScheme.borderBottom}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${colorScheme.sizeLabel}`}>Widget Size:</span>
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setWidgetSize(item.key, 'small');
                              }}
                              className={`p-1.5 rounded ${
                                currentSize === 'small'
                                  ? colorScheme.sizeActive
                                  : colorScheme.sizeButtons
                              } transition-colors`}
                              title="Small (1 column)"
                            >
                              <Minimize2 size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setWidgetSize(item.key, 'medium');
                              }}
                              className={`p-1.5 rounded ${
                                currentSize === 'medium'
                                  ? colorScheme.sizeActive
                                  : colorScheme.sizeButtons
                              } transition-colors`}
                              title="Medium (2 columns)"
                            >
                              <Square size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setWidgetSize(item.key, 'large');
                              }}
                              className={`p-1.5 rounded ${
                                currentSize === 'large'
                                  ? colorScheme.sizeActive
                                  : colorScheme.sizeButtons
                              } transition-colors`}
                              title="Large (3 columns)"
                            >
                              <Maximize2 size={14} />
                            </button>
                          </div>
                        </div>
                        {/* Row Span Controls */}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                          <span className={`text-xs font-medium ${colorScheme.sizeLabel}`}>Height:</span>
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setWidgetRowSpan(item.key, 'single');
                              }}
                              className={`p-1.5 rounded ${
                                currentRowSpan === 'single'
                                  ? colorScheme.sizeActive
                                  : colorScheme.sizeButtons
                              } transition-colors`}
                              title="Single Row Height"
                            >
                              <Rows size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setWidgetRowSpan(item.key, 'double');
                              }}
                              className={`p-1.5 rounded ${
                                currentRowSpan === 'double'
                                  ? colorScheme.sizeActive
                                  : colorScheme.sizeButtons
                              } transition-colors`}
                              title="Double Row Height (2x height)"
                            >
                              <ArrowUpDown size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </div>
      )}

      {/* Available Widgets - Disabled Widgets */}
      {orderedWidgets.filter(w => !dashboardSettings.widgets[w.key]).length > 0 && (
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl shadow-sm border-2 border-gray-300 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gray-500 to-slate-500 flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  Available Widgets
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-600 text-white shadow-sm">
                    {orderedWidgets.filter(w => !dashboardSettings.widgets[w.key]).length} Available
                  </span>
                </h3>
              </div>
            </div>
            <button
              onClick={() => {
                allWidgets.forEach(widget => {
                  setDashboardSettings(prev => ({
                    ...prev,
                    widgets: {
                      ...prev.widgets,
                      [widget.key]: true
                    }
                  }));
                });
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm"
            >
              <Plus size={18} />
              Add All to Dashboard
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {orderedWidgets.filter(w => !dashboardSettings.widgets[w.key]).map(item => {
              const Icon = item.icon;
              const isEnabled = dashboardSettings.widgets[item.key];
              const isChart = item.category === 'Charts';

              // Color scheme based on category
              const colorScheme = isChart ? {
                border: 'border-purple-300',
                bg: 'bg-white',
                iconBg: 'bg-purple-500',
                text: 'text-gray-700',
                badge: 'bg-purple-100 text-purple-700'
              } : {
                border: 'border-blue-300',
                bg: 'bg-white',
                iconBg: 'bg-blue-500',
                text: 'text-gray-700',
                badge: 'bg-blue-100 text-blue-700'
              };

              return (
                <button
                  key={item.key}
                  onClick={() => toggleWidget(item.key)}
                  className={`rounded-xl border-2 transition-all relative overflow-hidden hover:shadow-md hover:scale-105 p-4 text-left group ${colorScheme.border} ${colorScheme.bg}`}
                >
                  {/* Type Badge */}
                  <div className="absolute top-2 right-2">
                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorScheme.badge}`}>
                      {isChart ? '📊 Chart' : '📦 Widget'}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 mb-2 mt-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${colorScheme.iconBg} shadow-md`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  
                  <h4 className={`font-semibold text-sm mb-1 ${colorScheme.text}`}>
                    {item.label}
                  </h4>

                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Widget Order Section */}
      <WidgetOrderSettings className="mt-8" />

    </div>
  );
};

export default DashboardCustomizationSettings;

