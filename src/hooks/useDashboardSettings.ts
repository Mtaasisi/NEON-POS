import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { loadUserSettings } from '../lib/userSettingsApi';

export interface DashboardSettings {
  quickActions: {
    devices: boolean;
    addDevice: boolean;
    customers: boolean;
    inventory: boolean;
    appointments: boolean;
    purchaseOrders: boolean;
    payments: boolean;
    adGenerator: boolean;
  };
  widgets: {
    revenueTrendChart: boolean;
    deviceStatusChart: boolean;
    appointmentsTrendChart: boolean;
    stockLevelChart: boolean;
    performanceMetricsChart: boolean;
    customerActivityChart: boolean;
    salesFunnelChart: boolean;
    appointmentWidget: boolean;
    employeeWidget: boolean;
    notificationWidget: boolean;
    financialWidget: boolean;
    analyticsWidget: boolean;
    serviceWidget: boolean;
    customerInsightsWidget: boolean;
    systemHealthWidget: boolean;
    inventoryWidget: boolean;
    activityFeedWidget: boolean;
  };
}

const defaultDashboardSettings: DashboardSettings = {
  quickActions: {
    devices: true,
    addDevice: true,
    customers: true,
    inventory: true,
    appointments: true,
    purchaseOrders: true,
    payments: true,
    adGenerator: true
  },
  widgets: {
    revenueTrendChart: true,
    deviceStatusChart: true,
    appointmentsTrendChart: true,
    stockLevelChart: true,
    performanceMetricsChart: true,
    customerActivityChart: true,
    salesFunnelChart: true,
    appointmentWidget: true,
    employeeWidget: true,
    notificationWidget: true,
    financialWidget: true,
    analyticsWidget: true,
    serviceWidget: true,
    customerInsightsWidget: true,
    systemHealthWidget: true,
    inventoryWidget: true,
    activityFeedWidget: true
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

