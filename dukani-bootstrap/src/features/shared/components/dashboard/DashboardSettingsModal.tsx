import React, { useState, useEffect } from 'react';
import { X, Save, Settings, Grid, Layout, Palette, Bell, Zap, BarChart3, Target } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

interface DashboardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: DashboardSettings) => void;
  currentSettings: DashboardSettings;
}

export interface DashboardSettings {
  // Widget visibility
  widgets: Record<string, boolean>;
  // Widget sizes
  widgetSizes: Record<string, 'small' | 'medium' | 'large'>;
  // Layout preferences
  layout: 'grid' | 'list' | 'compact';
  // Theme
  theme: 'light' | 'dark' | 'auto';
  // Real-time updates
  realTimeUpdates: boolean;
  // Auto refresh interval
  autoRefreshInterval: number;
  // Alert preferences
  alerts: {
    soundEnabled: boolean;
    showCritical: boolean;
    showWarnings: boolean;
    showInfo: boolean;
    autoDismiss: boolean;
  };
  // AI features
  aiFeatures: {
    insightsEnabled: boolean;
    predictionsEnabled: boolean;
    smartSuggestions: boolean;
  };
}

const AVAILABLE_WIDGETS = [
  { id: 'salesWidget', name: 'Sales Overview', category: 'Sales' },
  { id: 'topProductsWidget', name: 'Top Products', category: 'Sales' },
  { id: 'customerInsightsWidget', name: 'Customer Insights', category: 'Customers' },
  { id: 'inventoryWidget', name: 'Inventory Status', category: 'Inventory' },
  { id: 'employeeWidget', name: 'Employee Overview', category: 'HR' },
  { id: 'appointmentWidget', name: 'Appointments', category: 'Operations' },
  { id: 'financialWidget', name: 'Financial Summary', category: 'Finance' },
  { id: 'systemHealthWidget', name: 'System Health', category: 'System' },
  { id: 'notificationWidget', name: 'Notifications', category: 'Communication' },
  { id: 'reminderWidget', name: 'Reminders', category: 'Productivity' },
  { id: 'purchaseOrderWidget', name: 'Purchase Orders', category: 'Procurement' },
  { id: 'chatWidget', name: 'Chat Support', category: 'Communication' },
  { id: 'staffPerformanceWidget', name: 'Staff Performance', category: 'HR' },
  { id: 'activityFeedWidget', name: 'Activity Feed', category: 'System' },
  // New AI-powered widgets
  { id: 'aiInsightsWidget', name: 'AI Insights', category: 'Analytics' },
  { id: 'predictiveAnalyticsWidget', name: 'Predictive Analytics', category: 'Analytics' },
  { id: 'alertSystemWidget', name: 'Alert System', category: 'System' }
];

const DashboardSettingsModal: React.FC<DashboardSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSettings
}) => {
  const [settings, setSettings] = useState<DashboardSettings>(currentSettings);
  const [activeTab, setActiveTab] = useState<'widgets' | 'layout' | 'alerts' | 'ai'>('widgets');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(currentSettings);
    }
  }, [isOpen, currentSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(settings);
      onClose();
    } catch (error) {
      console.error('Failed to save dashboard settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateWidgetVisibility = (widgetId: string, visible: boolean) => {
    setSettings(prev => ({
      ...prev,
      widgets: {
        ...prev.widgets,
        [widgetId]: visible
      }
    }));
  };

  const updateWidgetSize = (widgetId: string, size: 'small' | 'medium' | 'large') => {
    setSettings(prev => ({
      ...prev,
      widgetSizes: {
        ...prev.widgetSizes,
        [widgetId]: size
      }
    }));
  };

  const widgetsByCategory = AVAILABLE_WIDGETS.reduce((acc, widget) => {
    if (!acc[widget.category]) {
      acc[widget.category] = [];
    }
    acc[widget.category].push(widget);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_WIDGETS>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Dashboard Settings</h2>
              <p className="text-blue-100 mt-1">Customize your dashboard experience</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {[
              { id: 'widgets', label: 'Widgets', icon: Grid },
              { id: 'layout', label: 'Layout', icon: Layout },
              { id: 'alerts', label: 'Alerts', icon: Bell },
              { id: 'ai', label: 'AI Features', icon: Zap }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'widgets' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Widget Visibility & Size</h3>
                <div className="space-y-4">
                  {Object.entries(widgetsByCategory).map(([category, widgets]) => (
                    <div key={category}>
                      <h4 className="font-medium text-gray-900 mb-3">{category}</h4>
                      <div className="space-y-3">
                        {widgets.map((widget) => (
                          <div key={widget.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={settings.widgets[widget.id] ?? false}
                                onChange={(e) => updateWidgetVisibility(widget.id, e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="font-medium">{widget.name}</span>
                            </div>
                            {settings.widgets[widget.id] && (
                              <select
                                value={settings.widgetSizes[widget.id] || 'medium'}
                                onChange={(e) => updateWidgetSize(widget.id, e.target.value as any)}
                                className="px-3 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-400"
                              >
                                <option value="small">Small</option>
                                <option value="medium">Medium</option>
                                <option value="large">Large</option>
                              </select>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Layout Preferences</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Layout Style</label>
                    <select
                      value={settings.layout}
                      onChange={(e) => setSettings(prev => ({ ...prev, layout: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-blue-400"
                    >
                      <option value="grid">Grid Layout</option>
                      <option value="list">List Layout</option>
                      <option value="compact">Compact Layout</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Theme</label>
                    <select
                      value={settings.theme}
                      onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-blue-400"
                    >
                      <option value="light">Light Theme</option>
                      <option value="dark">Dark Theme</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium">Real-time Updates</label>
                      <p className="text-sm text-gray-600">Automatically refresh dashboard data</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.realTimeUpdates}
                      onChange={(e) => setSettings(prev => ({ ...prev, realTimeUpdates: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>

                  {settings.realTimeUpdates && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Auto Refresh Interval (minutes)</label>
                      <select
                        value={settings.autoRefreshInterval}
                        onChange={(e) => setSettings(prev => ({ ...prev, autoRefreshInterval: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-blue-400"
                      >
                        <option value={1}>1 minute</option>
                        <option value={5}>5 minutes</option>
                        <option value={10}>10 minutes</option>
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Alert Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium">Sound Alerts</label>
                      <p className="text-sm text-gray-600">Play sound for critical alerts</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.alerts.soundEnabled}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        alerts: { ...prev.alerts, soundEnabled: e.target.checked }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium">Alert Types to Show</label>
                    {[
                      { key: 'showCritical', label: 'Critical Alerts', color: 'text-red-600' },
                      { key: 'showWarnings', label: 'Warning Alerts', color: 'text-yellow-600' },
                      { key: 'showInfo', label: 'Info Alerts', color: 'text-blue-600' }
                    ].map(({ key, label, color }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className={`text-sm ${color}`}>{label}</span>
                        <input
                          type="checkbox"
                          checked={settings.alerts[key as keyof typeof settings.alerts] as boolean}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            alerts: { ...prev.alerts, [key]: e.target.checked }
                          }))}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium">Auto-dismiss Alerts</label>
                      <p className="text-sm text-gray-600">Automatically dismiss non-critical alerts</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.alerts.autoDismiss}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        alerts: { ...prev.alerts, autoDismiss: e.target.checked }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">AI-Powered Features</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium">AI Insights Widget</label>
                      <p className="text-sm text-gray-600">Show intelligent analysis and recommendations</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.aiFeatures.insightsEnabled}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        aiFeatures: { ...prev.aiFeatures, insightsEnabled: e.target.checked }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium">Predictive Analytics</label>
                      <p className="text-sm text-gray-600">Show forecasts and trend predictions</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.aiFeatures.predictionsEnabled}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        aiFeatures: { ...prev.aiFeatures, predictionsEnabled: e.target.checked }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium">Smart Suggestions</label>
                      <p className="text-sm text-gray-600">AI-powered recommendations and suggestions</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.aiFeatures.smartSuggestions}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        aiFeatures: { ...prev.aiFeatures, smartSuggestions: e.target.checked }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 border-t">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
            >
              {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSettingsModal;

