import React, { useEffect, useMemo, useState } from 'react';
import { X, Save, Settings as SettingsIcon, Bell, MessageCircle, Smartphone, Calculator, Receipt, Mail, AlertTriangle, DollarSign } from 'lucide-react';
import { useGeneralSettings } from '../../../hooks/usePOSSettings';
import { ToggleSwitch, TextInput, NumberInput } from '../../lats/components/pos/UniversalFormComponents';
import { notificationSettingsService } from '../../../services/notificationSettingsService';
import toast from 'react-hot-toast';

interface TabletSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LocalSettings = {
  show_product_images: boolean;
  show_stock_levels: boolean;
  show_prices: boolean;
  show_barcodes: boolean;
  currency: string;
  enable_tax: boolean;
  tax_rate: number;
};

type NotificationSettings = {
  whatsappEnabled: boolean;
  whatsappAutoSend: boolean;
  smsEnabled: boolean;
  smsAutoSend: boolean;
  emailEnabled: boolean;
  emailAutoSend: boolean;
  notifyOnPayment: boolean;
  notifyOnRefund: boolean;
  notifyLowStock: boolean;
  notifyNewCustomer: boolean;
};

/**
 * Simplified, tablet-friendly settings focusing only on key toggles.
 */
const TabletSettingsModal: React.FC<TabletSettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, saveSettings, setSettings, loading, error } = useGeneralSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    whatsappEnabled: true,
    whatsappAutoSend: false,
    smsEnabled: true,
    smsAutoSend: false,
    emailEnabled: true,
    emailAutoSend: false,
    notifyOnPayment: true,
    notifyOnRefund: true,
    notifyLowStock: true,
    notifyNewCustomer: false,
  });

  const [connectionIssue, setConnectionIssue] = useState(false);

  const defaults: LocalSettings = useMemo(
    () => ({
      show_product_images: true,
      show_stock_levels: true,
      show_prices: true,
      show_barcodes: false,
      currency: 'TZS',
      enable_tax: true,
      tax_rate: 18,
    }),
    []
  );

  // Load notification settings
  useEffect(() => {
    try {
      const saved = notificationSettingsService.getSettings();
      setNotificationSettings({
        whatsappEnabled: saved.whatsappEnabled,
        whatsappAutoSend: saved.whatsappAutoSend,
        smsEnabled: saved.smsEnabled,
        smsAutoSend: saved.smsAutoSend,
        emailEnabled: saved.emailEnabled,
        emailAutoSend: saved.emailAutoSend,
        notifyOnPayment: saved.notifyOnPayment,
        notifyOnRefund: saved.notifyOnRefund,
        notifyLowStock: saved.notifyLowStock,
        notifyNewCustomer: saved.notifyNewCustomer,
      });
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }, []);

  // Detect if settings are loading from database or using defaults
  useEffect(() => {
    if (!loading && settings) {
      // Check if settings appear to be defaults (not from database)
      const isUsingDefaults = settings.id === undefined && settings.user_id === undefined;
      setConnectionIssue(isUsingDefaults);

      console.log('🎯 [TabletSettingsModal] Settings status:', {
        loading,
        hasSettings: !!settings,
        isUsingDefaults,
        connectionIssue: isUsingDefaults,
        taxRate: settings?.tax_rate,
        enableTax: settings?.enable_tax,
        currency: settings?.currency
      });
    }
  }, [settings, loading]);

  // Normalize incoming settings to avoid undefined access
  useEffect(() => {
    if (!settings) return;
    setSettings((prev: any) => ({
      ...defaults,
      ...prev,
      ...settings,
      currency: settings.currency || defaults.currency,
    }));
  }, [settings, setSettings, defaults]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof LocalSettings, value: boolean | number | string) => {
    setSettings((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveSettings(settings);

      // Save notification settings
      const currentNotificationSettings = notificationSettingsService.getSettings();
      await notificationSettingsService.saveSettings({
        ...currentNotificationSettings,
        whatsappEnabled: notificationSettings.whatsappEnabled,
        whatsappAutoSend: notificationSettings.whatsappAutoSend,
        smsEnabled: notificationSettings.smsEnabled,
        smsAutoSend: notificationSettings.smsAutoSend,
        emailEnabled: notificationSettings.emailEnabled,
        emailAutoSend: notificationSettings.emailAutoSend,
        notifyOnPayment: notificationSettings.notifyOnPayment,
        notifyOnRefund: notificationSettings.notifyOnRefund,
        notifyLowStock: notificationSettings.notifyLowStock,
        notifyNewCustomer: notificationSettings.notifyNewCustomer,
      });

      toast.success('Settings saved');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">Customer Care Settings</div>
              <div className="text-xs text-gray-500">Essential display options</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || loading}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Connection Warning */}
          {connectionIssue && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Settings not synced</span>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs rounded transition"
                >
                  Refresh
                </button>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Database connection issue detected. Settings may not be saved.
              </p>
            </div>
          )}

          {/* Display Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Display Options
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ToggleSwitch
                label="Show product images"
                checked={!!settings?.show_product_images}
                onChange={(v) => handleToggle('show_product_images', v)}
              />
              <ToggleSwitch
                label="Show stock levels"
                checked={!!settings?.show_stock_levels}
                onChange={(v) => handleToggle('show_stock_levels', v)}
              />
              <ToggleSwitch
                label="Show prices"
                checked={!!settings?.show_prices}
                onChange={(v) => handleToggle('show_prices', v)}
              />
              <ToggleSwitch
                label="Show barcodes"
                checked={!!settings?.show_barcodes}
                onChange={(v) => handleToggle('show_barcodes', v)}
              />
              <TextInput
                label="Currency"
                value={settings?.currency || defaults.currency}
                onChange={(v) => handleToggle('currency', v || defaults.currency)}
              />
            </div>
          </div>

          {/* Tax Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Tax Settings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ToggleSwitch
                label="Enable tax calculation"
                checked={!!settings?.enable_tax}
                onChange={(v) => handleToggle('enable_tax', v)}
              />
              {settings?.enable_tax && (
                <NumberInput
                  label="Tax Rate (%)"
                  value={settings?.tax_rate || defaults.tax_rate}
                  onChange={(v) => handleToggle('tax_rate', Number(v) || defaults.tax_rate)}
                  min={0}
                  max={50}
                  step={0.1}
                />
              )}
            </div>
          </div>

          {/* Notification Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </h3>

            {/* Invoice Notifications */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-700 flex items-center gap-1">
                <Receipt className="w-3 h-3" />
                Invoice Sending
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-4">
                <div className="space-y-2">
                  <ToggleSwitch
                    label="WhatsApp enabled"
                    checked={notificationSettings.whatsappEnabled}
                    onChange={(v) => setNotificationSettings(prev => ({ ...prev, whatsappEnabled: v }))}
                  />
                  {notificationSettings.whatsappEnabled && (
                    <ToggleSwitch
                      label="Auto-send"
                      checked={notificationSettings.whatsappAutoSend}
                      onChange={(v) => setNotificationSettings(prev => ({ ...prev, whatsappAutoSend: v }))}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <ToggleSwitch
                    label="SMS enabled"
                    checked={notificationSettings.smsEnabled}
                    onChange={(v) => setNotificationSettings(prev => ({ ...prev, smsEnabled: v }))}
                  />
                  {notificationSettings.smsEnabled && (
                    <ToggleSwitch
                      label="Auto-send"
                      checked={notificationSettings.smsAutoSend}
                      onChange={(v) => setNotificationSettings(prev => ({ ...prev, smsAutoSend: v }))}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <ToggleSwitch
                    label="Email enabled"
                    checked={notificationSettings.emailEnabled}
                    onChange={(v) => setNotificationSettings(prev => ({ ...prev, emailEnabled: v }))}
                  />
                  {notificationSettings.emailEnabled && (
                    <ToggleSwitch
                      label="Auto-send"
                      checked={notificationSettings.emailAutoSend}
                      onChange={(v) => setNotificationSettings(prev => ({ ...prev, emailAutoSend: v }))}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* General Notifications */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                General Alerts
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4">
                <ToggleSwitch
                  label="Payment notifications"
                  checked={notificationSettings.notifyOnPayment}
                  onChange={(v) => setNotificationSettings(prev => ({ ...prev, notifyOnPayment: v }))}
                />
                <ToggleSwitch
                  label="Refund notifications"
                  checked={notificationSettings.notifyOnRefund}
                  onChange={(v) => setNotificationSettings(prev => ({ ...prev, notifyOnRefund: v }))}
                />
                <ToggleSwitch
                  label="Low stock alerts"
                  checked={notificationSettings.notifyLowStock}
                  onChange={(v) => setNotificationSettings(prev => ({ ...prev, notifyLowStock: v }))}
                />
                <ToggleSwitch
                  label="New customer alerts"
                  checked={notificationSettings.notifyNewCustomer}
                  onChange={(v) => setNotificationSettings(prev => ({ ...prev, notifyNewCustomer: v }))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabletSettingsModal;