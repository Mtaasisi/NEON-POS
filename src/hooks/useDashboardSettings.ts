import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadUserSettings } from '../lib/userSettingsApi';

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

const defaultDashboardSettings: DashboardSettings = {
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

export function useDashboardSettings() {
  const { currentUser } = useAuth();
  const [dashboardSettings, setDashboardSettings] = useState<DashboardSettings>(defaultDashboardSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardSettings();
  }, [currentUser?.id]);

  const loadDashboardSettings = async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userSettings = await loadUserSettings(currentUser.id);
      
      if (userSettings?.dashboard) {
        setDashboardSettings(userSettings.dashboard);
      } else {
        // Use default settings if no custom settings exist
        setDashboardSettings(defaultDashboardSettings);
      }
    } catch (error) {
      console.error('Error loading dashboard settings:', error);
      // Fall back to default settings on error
      setDashboardSettings(defaultDashboardSettings);
    } finally {
      setLoading(false);
    }
  };

  const isQuickActionEnabled = (action: keyof DashboardSettings['quickActions']): boolean => {
    return dashboardSettings.quickActions[action];
  };

  const isWidgetEnabled = (widget: keyof DashboardSettings['widgets']): boolean => {
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

  return {
    dashboardSettings,
    loading,
    isQuickActionEnabled,
    isWidgetEnabled,
    getEnabledQuickActions,
    getEnabledWidgets,
    refreshSettings
  };
}

