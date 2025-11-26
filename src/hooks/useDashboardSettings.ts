import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadUserSettings } from '../lib/userSettingsApi';
import { 
  getRoleWidgetPermissions, 
  getRoleQuickActionPermissions,
  isWidgetAllowedForRole,
  isQuickActionAllowedForRole
} from '../config/roleBasedWidgets';

export type WidgetSize = 'small' | 'medium' | 'large'; // 1, 2, or 3 columns

export interface DashboardSettings {
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
    salesChart: boolean;
    paymentMethodsChart: boolean;
    salesByCategoryChart: boolean;
    profitMarginChart: boolean;
  };
  widgetSizes?: {
    [key: string]: WidgetSize;
  };
  autoArrange?: boolean;
}

const defaultDashboardSettings: DashboardSettings = {
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
    salesChart: true,
    paymentMethodsChart: true,
    salesByCategoryChart: true,
    profitMarginChart: true,
    // New feature widgets
    tradeInWidget: true,
    installmentsWidget: true,
    loyaltyWidget: true,
    smsWidget: true,
    sparePartsWidget: true,
    storageRoomsWidget: true,
    stockTransfersWidget: true,
    specialOrdersWidget: true,
    backupWidget: true,
    repairWidget: true,
    // AI-powered widgets
    aiInsightsWidget: true,
    predictiveAnalyticsWidget: true,
    alertSystemWidget: true
  },
  autoArrange: false
};

export function useDashboardSettings() {
  const { currentUser } = useAuth();
  const [dashboardSettings, setDashboardSettings] = useState<DashboardSettings>(defaultDashboardSettings);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadDashboardSettings = async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userSettings = await loadUserSettings(currentUser.id);
      
      // Get role-based default settings
      const roleWidgetPermissions = getRoleWidgetPermissions(currentUser.role);
      const roleQuickActionPermissions = getRoleQuickActionPermissions(currentUser.role);
      
      // Merge role permissions with user settings
      const roleBasedDefaults: DashboardSettings = {
        quickActions: {
          ...defaultDashboardSettings.quickActions,
          ...roleQuickActionPermissions,
        },
        widgets: {
          ...defaultDashboardSettings.widgets,
          ...roleWidgetPermissions,
        },
      };
      
      if (userSettings?.dashboard) {
        // Merge user settings with role-based permissions
        // User settings can only disable widgets that are allowed by role
        const mergedSettings: DashboardSettings = {
          quickActions: Object.keys(roleBasedDefaults.quickActions).reduce((acc, key) => {
            const actionKey = key as keyof DashboardSettings['quickActions'];
            // Widget is enabled only if role allows it AND user hasn't disabled it
            acc[actionKey] = roleBasedDefaults.quickActions[actionKey] && 
                            (userSettings.dashboard.quickActions[actionKey] ?? true);
            return acc;
          }, {} as DashboardSettings['quickActions']),
          widgets: Object.keys(roleBasedDefaults.widgets).reduce((acc, key) => {
            const widgetKey = key as keyof DashboardSettings['widgets'];
            // Widget is enabled only if role allows it AND user hasn't disabled it
            acc[widgetKey] = roleBasedDefaults.widgets[widgetKey] && 
                            (userSettings.dashboard.widgets[widgetKey] ?? true);
            return acc;
          }, {} as DashboardSettings['widgets']),
          // Include widget sizes from user settings
          widgetSizes: userSettings.dashboard.widgetSizes || {},
          // Include auto arrange setting from user settings
          autoArrange: userSettings.dashboard.autoArrange ?? false
        };
        setDashboardSettings(mergedSettings);
      } else {
        // Use role-based default settings if no custom settings exist
        setDashboardSettings(roleBasedDefaults);
      }
    } catch (error) {
      console.error('Error loading dashboard settings:', error);
      // Fall back to role-based default settings on error
      if (currentUser?.role) {
        const roleWidgetPermissions = getRoleWidgetPermissions(currentUser.role);
        const roleQuickActionPermissions = getRoleQuickActionPermissions(currentUser.role);
        setDashboardSettings({
          quickActions: {
            ...defaultDashboardSettings.quickActions,
            ...roleQuickActionPermissions,
          },
          widgets: {
            ...defaultDashboardSettings.widgets,
            ...roleWidgetPermissions,
          },
        });
      } else {
        setDashboardSettings(defaultDashboardSettings);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardSettings();
  }, [currentUser?.id, refreshTrigger]);

  // Listen for settings changes from other components
  useEffect(() => {
    const handleSettingsChange = () => {
      console.log('Dashboard settings changed, reloading...');
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('dashboardSettingsChanged', handleSettingsChange);
    
    return () => {
      window.removeEventListener('dashboardSettingsChanged', handleSettingsChange);
    };
  }, []);

  const isQuickActionEnabled = (action: keyof DashboardSettings['quickActions']): boolean => {
    // Check role-based permissions first
    if (!currentUser?.role) return false;
    
    const roleAllowed = isQuickActionAllowedForRole(action, currentUser.role);
    if (!roleAllowed) return false;
    
    // Then check user's custom settings
    return dashboardSettings.quickActions[action];
  };

  const isWidgetEnabled = (widget: keyof DashboardSettings['widgets']): boolean => {
    // Check role-based permissions first
    if (!currentUser?.role) return false;
    
    const roleAllowed = isWidgetAllowedForRole(widget, currentUser.role);
    if (!roleAllowed) return false;
    
    // Then check user's custom settings
    return dashboardSettings.widgets[widget];
  };

  const getEnabledQuickActions = () => {
    return Object.entries(dashboardSettings.quickActions)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key);
  };

  const getEnabledWidgets = () => {
    return Object.entries(dashboardSettings.widgets)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key);
  };

  const refreshSettings = () => {
    loadDashboardSettings();
  };

  const getWidgetSize = (widget: string): WidgetSize => {
    return dashboardSettings.widgetSizes?.[widget] || 'small';
  };

  const getWidgetColumnSpan = (widget: string): number => {
    const size = getWidgetSize(widget);
    switch (size) {
      case 'small': return 1;
      case 'medium': return 2;
      case 'large': return 3;
      default: return 2;
    }
  };

  const getAutoArrange = (): boolean => {
    return dashboardSettings.autoArrange ?? false;
  };

  return {
    dashboardSettings,
    loading,
    isQuickActionEnabled,
    isWidgetEnabled,
    getEnabledQuickActions,
    getEnabledWidgets,
    refreshSettings,
    getWidgetSize,
    getWidgetColumnSpan,
    getAutoArrange
  };
}

