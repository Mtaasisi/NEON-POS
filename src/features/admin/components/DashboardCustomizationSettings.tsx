import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { loadUserSettings, saveUserSettings, UserSettings } from '../../../lib/userSettingsApi';
import toast from 'react-hot-toast';
import { 
  LayoutDashboard, 
  Zap, 
  Eye, 
  EyeOff,
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
  DollarSignIcon,
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
  TrendingDown,
  Shield,
  FileSpreadsheet,
  Layers,
  Store,
  Tag,
  Truck,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Zap as ZapIcon,
  Globe,
  Smartphone as PhoneIcon,
  Monitor,
  ClipboardList,
  BarChart,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Activity as ActivityIcon,
  TrendingUp as TrendingUpIcon,
  Users as UsersIcon,
  Package as PackageIcon,
  Calendar as CalendarIcon,
  Bell as BellIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Star as StarIcon,
  HardDrive as HardDriveIcon,
  MessageSquare as MessageSquareIcon,
  Wrench as WrenchIcon,
  Database as DatabaseIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  UserCheck as UserCheckIcon,
  Building as BuildingIcon,
  MapPin as MapPinIcon,
  Bot as BotIcon,
  Printer as PrinterIcon,
  Clock as ClockIcon,
  Target as TargetIcon,
  TrendingDown as TrendingDownIcon,
  Shield as ShieldIcon,
  FileSpreadsheet as FileSpreadsheetIcon,
  Layers as LayersIcon,
  Store as StoreIcon,
  Tag as TagIcon,
  Truck as TruckIcon,
  AlertTriangle as AlertTriangleIcon,
  CheckCircle as CheckCircleIcon,
  RefreshCw as RefreshCwIcon
} from 'lucide-react';

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
    
    // Diagnostic & Repair Features
    diagnostics: boolean;
    newDiagnostic: boolean;
    diagnosticReports: boolean;
    diagnosticTemplates: boolean;
    
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
    salesChart: boolean;
    paymentMethodsChart: boolean;
    salesByCategoryChart: boolean;
    profitMarginChart: boolean;
  };
}

const DashboardCustomizationSettings: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dashboardSettings, setDashboardSettings] = useState<DashboardSettings>({
    quickActions: {
      // Core Business Features
      devices: true,
      addDevice: true,
      customers: true,
      inventory: true,
      appointments: true,
      purchaseOrders: true,
      payments: true,
      adGenerator: true,
      pos: true,
      reports: true,
      employees: true,
      whatsapp: true,
      settings: true,
      search: true,
      loyalty: true,
      backup: true,
      
      // SMS & Communication Features
      sms: true,
      bulkSms: true,
      smsLogs: true,
      smsSettings: true,
      
      // Diagnostic & Repair Features
      diagnostics: true,
      newDiagnostic: true,
      diagnosticReports: true,
      diagnosticTemplates: true,
      
      // Import/Export & Data Management
      excelImport: true,
      excelTemplates: true,
      productExport: true,
      customerImport: true,
      
      // Advanced System Features
      userManagement: true,
      databaseSetup: true,
      integrationSettings: true,
      integrationsTest: true,
      aiTraining: true,
      bluetoothPrinter: true,
      
      // Business Management
      categoryManagement: true,
      supplierManagement: true,
      storeLocations: true,
      
      // Advanced Analytics & Reports
      reminders: true,
      mobile: true,
      myAttendance: true
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
      chatWidget: true
    }
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [currentUser?.id]);

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
        toast.success('Dashboard settings saved successfully');
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
    const defaultSettings: DashboardSettings = {
      quickActions: {
        // Core Business Features
        devices: true,
        addDevice: true,
        customers: true,
        inventory: true,
        appointments: true,
        purchaseOrders: true,
        payments: true,
        adGenerator: true,
        pos: true,
        reports: true,
        employees: true,
        whatsapp: true,
        settings: true,
        search: true,
        loyalty: true,
        backup: true,
        
        // SMS & Communication Features
        sms: true,
        bulkSms: true,
        smsLogs: true,
        smsSettings: true,
        
        // Diagnostic & Repair Features
        diagnostics: true,
        newDiagnostic: true,
        diagnosticReports: true,
        diagnosticTemplates: true,
        
        // Import/Export & Data Management
        excelImport: true,
        excelTemplates: true,
        productExport: true,
        customerImport: true,
        
        // Advanced System Features
        userManagement: true,
        databaseSetup: true,
        integrationSettings: true,
        integrationsTest: true,
        aiTraining: true,
        bluetoothPrinter: true,
        
        // Business Management
        categoryManagement: true,
        supplierManagement: true,
        storeLocations: true,
        
        // Advanced Analytics & Reports
        reminders: true,
        mobile: true,
        myAttendance: true
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
        salesChart: true,
        paymentMethodsChart: true,
        salesByCategoryChart: true,
        profitMarginChart: true
      }
    };
    setDashboardSettings(defaultSettings);
    toast.success('Dashboard settings reset to default');
  };

  const toggleQuickAction = (action: keyof DashboardSettings['quickActions']) => {
    setDashboardSettings(prev => ({
      ...prev,
      quickActions: {
        ...prev.quickActions,
        [action]: !prev.quickActions[action]
      }
    }));
  };

  const toggleWidget = (widget: keyof DashboardSettings['widgets']) => {
    setDashboardSettings(prev => ({
      ...prev,
      widgets: {
        ...prev.widgets,
        [widget]: !prev.widgets[widget]
      }
    }));
  };

  const toggleAllQuickActions = (value: boolean) => {
    setDashboardSettings(prev => ({
      ...prev,
      quickActions: Object.keys(prev.quickActions).reduce((acc, key) => ({
        ...acc,
        [key]: value
      }), {} as DashboardSettings['quickActions'])
    }));
  };

  const toggleAllWidgets = (value: boolean) => {
    setDashboardSettings(prev => ({
      ...prev,
      widgets: Object.keys(prev.widgets).reduce((acc, key) => ({
        ...acc,
        [key]: value
      }), {} as DashboardSettings['widgets'])
    }));
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
    
    // Diagnostic & Repair Features
    { key: 'diagnostics' as const, label: 'Diagnostics', icon: Wrench, description: 'Device diagnostics' },
    { key: 'newDiagnostic' as const, label: 'New Diagnostic', icon: Plus, description: 'Create diagnostic request' },
    { key: 'diagnosticReports' as const, label: 'Diagnostic Reports', icon: BarChart3, description: 'Diagnostic analytics' },
    { key: 'diagnosticTemplates' as const, label: 'Diagnostic Templates', icon: FileText, description: 'Template management' },
    
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
    { key: 'salesChart' as const, label: 'Sales Chart', icon: DollarSign, category: 'Charts' },
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading dashboard settings...</span>
      </div>
    );
  }

  const chartWidgets = widgetItems.filter(w => w.category === 'Charts');
  const otherWidgets = widgetItems.filter(w => w.category === 'Widgets');

  // Calculate enabled counts
  const enabledQuickActionsCount = Object.values(dashboardSettings.quickActions).filter(Boolean).length;
  const enabledChartsCount = chartWidgets.filter(w => dashboardSettings.widgets[w.key]).length;
  const enabledWidgetsCount = otherWidgets.filter(w => dashboardSettings.widgets[w.key]).length;

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
              <p className="text-sm text-gray-600">Click items to add or remove from your dashboard</p>
            </div>
          </div>
          
          {/* Summary Badge */}
          <div className="flex gap-2">
            <div className="px-3 py-1.5 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600 font-medium">
                {enabledQuickActionsCount + enabledChartsCount + enabledWidgetsCount} items selected
              </p>
            </div>
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
            Reset to Default
          </button>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-blue-600">{enabledQuickActionsCount} of 39</span> selected
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toggleAllQuickActions(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium"
            >
              <CheckCircle2 size={16} />
              Add All
            </button>
            <button
              onClick={() => toggleAllQuickActions(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium"
            >
              <XCircle size={16} />
              Remove All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActionItems.map(item => {
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
                  {isEnabled ? 'Added' : 'Click to Add'}
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

                {/* Click Instruction */}
                <div className={`mt-3 flex items-center gap-1 text-xs font-medium transition-opacity ${
                  isEnabled 
                    ? 'text-red-600 opacity-0 group-hover:opacity-100' 
                    : 'text-indigo-600 opacity-0 group-hover:opacity-100'
                }`}>
                  <MousePointerClick size={12} />
                  {isEnabled ? 'Click to remove' : 'Click to add'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Charts Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Dashboard Charts</h3>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-purple-600">{enabledChartsCount} of 7</span> selected
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                chartWidgets.forEach(widget => {
                  setDashboardSettings(prev => ({
                    ...prev,
                    widgets: {
                      ...prev.widgets,
                      [widget.key]: true
                    }
                  }));
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium"
            >
              <CheckCircle2 size={16} />
              Add All
            </button>
            <button
              onClick={() => {
                chartWidgets.forEach(widget => {
                  setDashboardSettings(prev => ({
                    ...prev,
                    widgets: {
                      ...prev.widgets,
                      [widget.key]: false
                    }
                  }));
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium"
            >
              <XCircle size={16} />
              Remove All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chartWidgets.map(item => {
            const Icon = item.icon;
            const isEnabled = dashboardSettings.widgets[item.key];

            return (
              <button
                key={item.key}
                onClick={() => toggleWidget(item.key)}
                className={`group p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                  isEnabled
                    ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-sm hover:shadow-md'
                    : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/30'
                }`}
              >
                {/* Status Badge */}
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isEnabled 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {isEnabled ? 'Added' : 'Click to Add'}
                </div>

                <div className="flex items-start gap-3 mb-2 mt-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    isEnabled 
                      ? 'bg-purple-600 shadow-lg shadow-purple-200' 
                      : 'bg-gray-300 group-hover:bg-purple-400'
                  }`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                
                <h4 className={`font-semibold text-sm mb-1 ${
                  isEnabled ? 'text-purple-900' : 'text-gray-700'
                }`}>
                  {item.label}
                </h4>

                {/* Click Instruction */}
                <div className={`mt-3 flex items-center gap-1 text-xs font-medium transition-opacity ${
                  isEnabled 
                    ? 'text-red-600 opacity-0 group-hover:opacity-100' 
                    : 'text-purple-600 opacity-0 group-hover:opacity-100'
                }`}>
                  <MousePointerClick size={12} />
                  {isEnabled ? 'Click to remove' : 'Click to add'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Widgets Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Dashboard Widgets</h3>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-green-600">{enabledWidgetsCount} of 10</span> selected
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                otherWidgets.forEach(widget => {
                  setDashboardSettings(prev => ({
                    ...prev,
                    widgets: {
                      ...prev.widgets,
                      [widget.key]: true
                    }
                  }));
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium"
            >
              <CheckCircle2 size={16} />
              Add All
            </button>
            <button
              onClick={() => {
                otherWidgets.forEach(widget => {
                  setDashboardSettings(prev => ({
                    ...prev,
                    widgets: {
                      ...prev.widgets,
                      [widget.key]: false
                    }
                  }));
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium"
            >
              <XCircle size={16} />
              Remove All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {otherWidgets.map(item => {
            const Icon = item.icon;
            const isEnabled = dashboardSettings.widgets[item.key];

            return (
              <button
                key={item.key}
                onClick={() => toggleWidget(item.key)}
                className={`group p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                  isEnabled
                    ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm hover:shadow-md'
                    : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/30'
                }`}
              >
                {/* Status Badge */}
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isEnabled 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {isEnabled ? 'Added' : 'Click to Add'}
                </div>

                <div className="flex items-start gap-3 mb-2 mt-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    isEnabled 
                      ? 'bg-green-600 shadow-lg shadow-green-200' 
                      : 'bg-gray-300 group-hover:bg-green-400'
                  }`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                
                <h4 className={`font-semibold text-sm mb-1 ${
                  isEnabled ? 'text-green-900' : 'text-gray-700'
                }`}>
                  {item.label}
                </h4>

                {/* Click Instruction */}
                <div className={`mt-3 flex items-center gap-1 text-xs font-medium transition-opacity ${
                  isEnabled 
                    ? 'text-red-600 opacity-0 group-hover:opacity-100' 
                    : 'text-green-600 opacity-0 group-hover:opacity-100'
                }`}>
                  <MousePointerClick size={12} />
                  {isEnabled ? 'Click to remove' : 'Click to add'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-2 text-base">💡 How to Use</h4>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">→</span>
                <span><strong>Click any card</strong> to add it to your dashboard (green badge = added)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">→</span>
                <span><strong>Click again</strong> to remove it from your dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">→</span>
                <span>Use <strong>"Add All"</strong> or <strong>"Remove All"</strong> buttons for quick selection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">→</span>
                <span>Don't forget to click <strong>"Save Changes"</strong> when done!</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCustomizationSettings;

