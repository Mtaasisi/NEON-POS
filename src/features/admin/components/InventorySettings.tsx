import React, { useState, useEffect } from 'react';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassInput from '../../shared/components/ui/EnhancedInput';
import { 
  Package, 
  DollarSign, 
  Bell, 
  Scan,
  Building2,
  Shield,
  Database,
  BarChart3,
  Tag,
  Truck,
  TrendingUp,
  Share2,
  RotateCcw,
  Ruler,
  Save,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getInventorySettings,
  updateInventorySettings,
  resetInventorySettings,
  exportInventorySettings,
  importInventorySettings,
  type InventorySettings as IInventorySettings
} from '../../../lib/inventorySettingsApi';

interface ToggleSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, description, checked, onChange, icon }) => (
  <div className="flex items-start justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 transition-all">
    <div className="flex-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-gray-900">{label}</span>
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-1 ml-6">{description}</p>
      )}
    </div>
    <label className="relative inline-flex items-center cursor-pointer ml-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
    </label>
  </div>
);

const InventorySettings: React.FC = () => {
  const [settings, setSettings] = useState<IInventorySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('stock-management');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getInventorySettings();
      setSettings(data);
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading inventory settings:', error);
      toast.error('Failed to load inventory settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof IInventorySettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? '' : sectionId);
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      await updateInventorySettings(settings);
      setHasChanges(false);
      setLastSaved(new Date());
      toast.success('Inventory settings saved successfully!');
    } catch (error) {
      console.error('Error saving inventory settings:', error);
      toast.error('Failed to save inventory settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = async () => {
    if (!confirm('Are you sure you want to reset all inventory settings to defaults? This action cannot be undone.')) {
      return;
    }

    setSaving(true);
    try {
      await resetInventorySettings();
      await loadSettings();
      toast.success('Inventory settings reset to defaults');
    } catch (error) {
      console.error('Error resetting inventory settings:', error);
      toast.error('Failed to reset inventory settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportSettings = async () => {
    try {
      const jsonData = await exportInventorySettings();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Settings exported successfully');
    } catch (error) {
      console.error('Error exporting settings:', error);
      toast.error('Failed to export settings');
    }
  };

  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await importInventorySettings(text);
      await loadSettings();
      toast.success('Settings imported successfully');
    } catch (error) {
      console.error('Error importing settings:', error);
      toast.error('Failed to import settings');
    }
    event.target.value = ''; // Reset file input
  };

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Loading inventory settings...</p>
        </div>
      </GlassCard>
    );
  }

  if (!settings) {
    return (
      <GlassCard className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load inventory settings</p>
          <GlassButton onClick={loadSettings} className="mt-4">
            Retry
          </GlassButton>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassCard className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Inventory Settings</h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure how your inventory system operates across all branches
              </p>
              {lastSaved && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Last saved: {lastSaved.toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <GlassButton
              onClick={handleExportSettings}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </GlassButton>
            <label className="cursor-pointer">
              <GlassButton
                as="span"
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import
              </GlassButton>
              <input
                type="file"
                accept=".json"
                onChange={handleImportSettings}
                className="hidden"
              />
            </label>
            <GlassButton
              onClick={handleResetSettings}
              variant="outline"
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
              disabled={saving}
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </GlassButton>
          </div>
        </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-900">
                  You have unsaved changes
                </span>
              </div>
              <GlassButton
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save All Changes'}
              </GlassButton>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Stock Management */}
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('stock-management')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Stock Management</h3>
              <p className="text-sm text-gray-600">Control stock levels and reorder points</p>
            </div>
          </div>
          {expandedSection === 'stock-management' ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </div>
        {expandedSection === 'stock-management' && (
        <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassInput
            label="Low Stock Threshold"
            type="number"
            value={settings.low_stock_threshold}
            onChange={(e) => handleSettingChange('low_stock_threshold', parseInt(e.target.value) || 0)}
            description="Alert when stock falls below this number"
          />
          <GlassInput
            label="Critical Stock Threshold"
            type="number"
            value={settings.critical_stock_threshold}
            onChange={(e) => handleSettingChange('critical_stock_threshold', parseInt(e.target.value) || 0)}
            description="Critical alert threshold"
          />
          <GlassInput
            label="Reorder Point %"
            type="number"
            value={settings.reorder_point_percentage}
            onChange={(e) => handleSettingChange('reorder_point_percentage', parseInt(e.target.value) || 0)}
            description="Percentage to trigger reorder"
          />
          <GlassInput
            label="Maximum Stock Level"
            type="number"
            value={settings.maximum_stock_level}
            onChange={(e) => handleSettingChange('maximum_stock_level', parseInt(e.target.value) || 0)}
            description="Max stock allowed per item"
          />
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Stock Counting Frequency</label>
            <select
              value={settings.stock_counting_frequency}
              onChange={(e) => handleSettingChange('stock_counting_frequency', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <ToggleSwitch
            label="Enable Auto Reorder"
            description="Automatically create purchase orders when stock is low"
            checked={settings.auto_reorder_enabled}
            onChange={(checked) => handleSettingChange('auto_reorder_enabled', checked)}
          />
        </div>
        </div>
        )}
      </GlassCard>

      {/* Pricing & Valuation */}
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('pricing-valuation')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Pricing & Valuation</h3>
              <p className="text-sm text-gray-600">Configure pricing rules and cost calculations</p>
            </div>
          </div>
          {expandedSection === 'pricing-valuation' ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </div>
        {expandedSection === 'pricing-valuation' && (
        <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassInput
            label="Default Markup %"
            type="number"
            value={settings.default_markup_percentage}
            onChange={(e) => handleSettingChange('default_markup_percentage', parseInt(e.target.value) || 0)}
            description="Default markup for new products"
          />
          <GlassInput
            label="Price History (Days)"
            type="number"
            value={settings.price_history_days}
            onChange={(e) => handleSettingChange('price_history_days', parseInt(e.target.value) || 0)}
            description="Days to keep price history"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price Rounding</label>
            <select
              value={settings.price_rounding_method}
              onChange={(e) => handleSettingChange('price_rounding_method', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="nearest">Round to Nearest</option>
              <option value="up">Round Up</option>
              <option value="down">Round Down</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cost Calculation Method</label>
            <select
              value={settings.cost_calculation_method}
              onChange={(e) => handleSettingChange('cost_calculation_method', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="fifo">FIFO (First In, First Out)</option>
              <option value="lifo">LIFO (Last In, First Out)</option>
              <option value="average">Average Cost</option>
            </select>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <ToggleSwitch
            label="Enable Dynamic Pricing"
            description="Adjust prices based on demand and supply"
            checked={settings.enable_dynamic_pricing}
            onChange={(checked) => handleSettingChange('enable_dynamic_pricing', checked)}
          />
          <ToggleSwitch
            label="Auto Price Update"
            description="Automatically update prices when cost changes"
            checked={settings.auto_price_update}
            onChange={(checked) => handleSettingChange('auto_price_update', checked)}
          />
          <ToggleSwitch
            label="Enable Bulk Discounts"
            description="Allow bulk discount rules"
            checked={settings.enable_bulk_discount}
            onChange={(checked) => handleSettingChange('enable_bulk_discount', checked)}
          />
          <ToggleSwitch
            label="Enable Seasonal Pricing"
            description="Support seasonal price adjustments"
            checked={settings.enable_seasonal_pricing}
            onChange={(checked) => handleSettingChange('enable_seasonal_pricing', checked)}
          />
        </div>
        </div>
        )}
      </GlassCard>

      {/* Notifications & Alerts */}
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('notifications')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Bell className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Notifications & Alerts</h3>
              <p className="text-sm text-gray-600">Configure alert preferences and channels</p>
            </div>
          </div>
          {expandedSection === 'notifications' ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </div>
        {expandedSection === 'notifications' && (
        <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <GlassInput
            label="Expiry Alert (Days Before)"
            type="number"
            value={settings.expiry_alert_days}
            onChange={(e) => handleSettingChange('expiry_alert_days', parseInt(e.target.value) || 0)}
            description="Alert X days before expiry"
          />
          <GlassInput
            label="Slow Moving Alert (Days)"
            type="number"
            value={settings.slow_moving_alert_days}
            onChange={(e) => handleSettingChange('slow_moving_alert_days', parseInt(e.target.value) || 0)}
            description="Alert if no sales in X days"
          />
        </div>
        <div className="space-y-3">
          <ToggleSwitch
            label="Low Stock Alerts"
            description="Send alerts when stock is low"
            checked={settings.low_stock_alerts}
            onChange={(checked) => handleSettingChange('low_stock_alerts', checked)}
          />
          <ToggleSwitch
            label="Out of Stock Alerts"
            description="Send alerts when stock is depleted"
            checked={settings.out_of_stock_alerts}
            onChange={(checked) => handleSettingChange('out_of_stock_alerts', checked)}
          />
          <ToggleSwitch
            label="Price Change Alerts"
            description="Notify on price changes"
            checked={settings.price_change_alerts}
            onChange={(checked) => handleSettingChange('price_change_alerts', checked)}
          />
          <ToggleSwitch
            label="Overstock Alerts"
            description="Alert when stock exceeds maximum"
            checked={settings.overstock_alerts}
            onChange={(checked) => handleSettingChange('overstock_alerts', checked)}
          />
          <ToggleSwitch
            label="Stock Discrepancy Alerts"
            description="Alert on inventory count discrepancies"
            checked={settings.stock_discrepancy_alerts}
            onChange={(checked) => handleSettingChange('stock_discrepancy_alerts', checked)}
          />
        </div>
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Notification Channels</h4>
          <div className="space-y-3">
            <ToggleSwitch
              label="Email Notifications"
              description="Send notifications via email"
              checked={settings.email_notifications}
              onChange={(checked) => handleSettingChange('email_notifications', checked)}
            />
            <ToggleSwitch
              label="SMS Notifications"
              description="Send notifications via SMS"
              checked={settings.sms_notifications}
              onChange={(checked) => handleSettingChange('sms_notifications', checked)}
            />
            <ToggleSwitch
              label="WhatsApp Notifications"
              description="Send notifications via WhatsApp"
              checked={settings.whatsapp_notifications}
              onChange={(checked) => handleSettingChange('whatsapp_notifications', checked)}
            />
          </div>
        </div>
        </div>
        )}
      </GlassCard>

      {/* Tracking & Identification */}
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('tracking')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Scan className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Tracking & Identification</h3>
              <p className="text-sm text-gray-600">Configure product tracking methods</p>
            </div>
          </div>
          {expandedSection === 'tracking' ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </div>
        {expandedSection === 'tracking' && (
        <div className="mt-6">
        <div className="mb-4">
          <GlassInput
            label="Barcode Format"
            value={settings.barcode_format}
            onChange={(e) => handleSettingChange('barcode_format', e.target.value)}
            description="Default barcode format"
            placeholder="EAN-13, UPC-A, Code-128, QR"
          />
        </div>
        <div className="space-y-3">
          <ToggleSwitch
            label="Enable Barcode Tracking"
            description="Track products using barcodes"
            checked={settings.enable_barcode_tracking}
            onChange={(checked) => handleSettingChange('enable_barcode_tracking', checked)}
          />
          <ToggleSwitch
            label="Enable Serial Number Tracking"
            description="Track individual items by serial number"
            checked={settings.enable_serial_tracking}
            onChange={(checked) => handleSettingChange('enable_serial_tracking', checked)}
          />
          <ToggleSwitch
            label="Enable Batch Tracking"
            description="Track products by batch/lot number"
            checked={settings.enable_batch_tracking}
            onChange={(checked) => handleSettingChange('enable_batch_tracking', checked)}
          />
          <ToggleSwitch
            label="Enable Expiry Tracking"
            description="Track product expiration dates"
            checked={settings.enable_expiry_tracking}
            onChange={(checked) => handleSettingChange('enable_expiry_tracking', checked)}
          />
          <ToggleSwitch
            label="Enable Location Tracking"
            description="Track items by warehouse location/bin"
            checked={settings.enable_location_tracking}
            onChange={(checked) => handleSettingChange('enable_location_tracking', checked)}
          />
          <ToggleSwitch
            label="Auto-Generate SKU"
            description="Automatically generate SKU codes"
            checked={settings.enable_sku_auto_generation}
            onChange={(checked) => handleSettingChange('enable_sku_auto_generation', checked)}
          />
          <ToggleSwitch
            label="Enable QR Codes"
            description="Support QR code scanning"
            checked={settings.enable_qr_code}
            onChange={(checked) => handleSettingChange('enable_qr_code', checked)}
          />
        </div>
        </div>
        )}
      </GlassCard>

      {/* Multi-Branch Settings */}
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('multi-branch')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Building2 className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Multi-Branch / Multi-Location</h3>
              <p className="text-sm text-gray-600">Configure inventory across multiple branches</p>
            </div>
          </div>
          {expandedSection === 'multi-branch' ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </div>
        {expandedSection === 'multi-branch' && (
        <div className="mt-6">
        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stock Visibility</label>
              <select
                value={settings.stock_visibility_mode}
                onChange={(e) => handleSettingChange('stock_visibility_mode', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="own_branch">Own Branch Only</option>
                <option value="all_branches">All Branches</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sync Frequency</label>
              <select
                value={settings.sync_frequency}
                onChange={(e) => handleSettingChange('sync_frequency', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="realtime">Real-time</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <ToggleSwitch
            label="Enable Branch Isolation"
            description="Keep inventory separate per branch"
            checked={settings.enable_branch_isolation}
            onChange={(checked) => handleSettingChange('enable_branch_isolation', checked)}
          />
          <ToggleSwitch
            label="Allow Inter-Branch Transfers"
            description="Enable stock transfers between branches"
            checked={settings.allow_inter_branch_transfer}
            onChange={(checked) => handleSettingChange('allow_inter_branch_transfer', checked)}
          />
          <ToggleSwitch
            label="Transfer Approval Required"
            description="Require approval for branch transfers"
            checked={settings.transfer_approval_required}
            onChange={(checked) => handleSettingChange('transfer_approval_required', checked)}
          />
          <ToggleSwitch
            label="Auto Stock Sync"
            description="Automatically sync stock between branches"
            checked={settings.auto_stock_sync}
            onChange={(checked) => handleSettingChange('auto_stock_sync', checked)}
          />
        </div>
        </div>
        )}
      </GlassCard>

      {/* Security & Approvals */}
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('security')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Security & Approvals</h3>
              <p className="text-sm text-gray-600">Control access and approval workflows</p>
            </div>
          </div>
          {expandedSection === 'security' ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </div>
        {expandedSection === 'security' && (
        <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <GlassInput
            label="Approval Threshold Amount"
            type="number"
            value={settings.approval_threshold_amount}
            onChange={(e) => handleSettingChange('approval_threshold_amount', parseInt(e.target.value) || 0)}
            description="Amount above which approval is needed"
          />
          <GlassInput
            label="Max Adjustment %"
            type="number"
            value={settings.max_adjustment_percentage}
            onChange={(e) => handleSettingChange('max_adjustment_percentage', parseInt(e.target.value) || 0)}
            description="Maximum allowed adjustment percentage"
          />
        </div>
        <div className="space-y-3">
          <ToggleSwitch
            label="Require Approval for Stock Adjustments"
            description="Manager must approve stock adjustments"
            checked={settings.require_approval_stock_adjustment}
            onChange={(checked) => handleSettingChange('require_approval_stock_adjustment', checked)}
          />
          <ToggleSwitch
            label="Require Approval for Price Changes"
            description="Manager must approve price changes"
            checked={settings.require_approval_price_change}
            onChange={(checked) => handleSettingChange('require_approval_price_change', checked)}
          />
          <ToggleSwitch
            label="Enable Audit Logging"
            description="Log all inventory changes"
            checked={settings.enable_audit_logging}
            onChange={(checked) => handleSettingChange('enable_audit_logging', checked)}
          />
          <ToggleSwitch
            label="Require Manager PIN"
            description="Require PIN for sensitive operations"
            checked={settings.require_manager_pin}
            onChange={(checked) => handleSettingChange('require_manager_pin', checked)}
          />
          <ToggleSwitch
            label="Lock Historical Inventory"
            description="Prevent backdating inventory changes"
            checked={settings.lock_historical_inventory}
            onChange={(checked) => handleSettingChange('lock_historical_inventory', checked)}
          />
        </div>
        </div>
        )}
      </GlassCard>

      {/* Performance & Analytics */}
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('performance')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Performance & Analytics</h3>
              <p className="text-sm text-gray-600">Optimize performance and enable analytics</p>
            </div>
          </div>
          {expandedSection === 'performance' ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </div>
        {expandedSection === 'performance' && (
        <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <GlassInput
            label="Auto Refresh Interval (seconds)"
            type="number"
            value={settings.auto_refresh_interval}
            onChange={(e) => handleSettingChange('auto_refresh_interval', parseInt(e.target.value) || 0)}
            description="How often to refresh data"
          />
          <GlassInput
            label="Pagination Size"
            type="number"
            value={settings.pagination_size}
            onChange={(e) => handleSettingChange('pagination_size', parseInt(e.target.value) || 0)}
            description="Items per page"
          />
        </div>
        <div className="space-y-3">
          <ToggleSwitch
            label="Cache Inventory Data"
            description="Cache data for faster access"
            checked={settings.cache_inventory_data}
            onChange={(checked) => handleSettingChange('cache_inventory_data', checked)}
          />
          <ToggleSwitch
            label="Enable Analytics"
            description="Enable inventory analytics and reports"
            checked={settings.enable_analytics}
            onChange={(checked) => handleSettingChange('enable_analytics', checked)}
          />
          <ToggleSwitch
            label="Enable Lazy Loading"
            description="Load data as needed for large inventories"
            checked={settings.enable_lazy_loading}
            onChange={(checked) => handleSettingChange('enable_lazy_loading', checked)}
          />
          <ToggleSwitch
            label="Enable Search Indexing"
            description="Faster search performance"
            checked={settings.enable_search_indexing}
            onChange={(checked) => handleSettingChange('enable_search_indexing', checked)}
          />
          <ToggleSwitch
            label="Enable Image Optimization"
            description="Compress product images"
            checked={settings.enable_image_optimization}
            onChange={(checked) => handleSettingChange('enable_image_optimization', checked)}
          />
        </div>
        </div>
        )}
      </GlassCard>

      {/* Backup & Data Management */}
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('backup')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Database className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Backup & Data Management</h3>
              <p className="text-sm text-gray-600">Configure backup and archiving settings</p>
            </div>
          </div>
          {expandedSection === 'backup' ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </div>
        {expandedSection === 'backup' && (
        <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <GlassInput
            label="Backup Retention (Days)"
            type="number"
            value={settings.backup_retention_days}
            onChange={(e) => handleSettingChange('backup_retention_days', parseInt(e.target.value) || 0)}
            description="Days to keep backups"
          />
          <GlassInput
            label="Archive After (Months)"
            type="number"
            value={settings.archive_after_months}
            onChange={(e) => handleSettingChange('archive_after_months', parseInt(e.target.value) || 0)}
            description="Archive old data after X months"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
            <select
              value={settings.backup_frequency}
              onChange={(e) => handleSettingChange('backup_frequency', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
            <select
              value={settings.export_format}
              onChange={(e) => handleSettingChange('export_format', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
        </div>
        <div className="space-y-3">
          <ToggleSwitch
            label="Auto Backup Enabled"
            description="Automatically backup inventory data"
            checked={settings.auto_backup_enabled}
            onChange={(checked) => handleSettingChange('auto_backup_enabled', checked)}
          />
          <ToggleSwitch
            label="Enable Data Archiving"
            description="Archive old inventory data"
            checked={settings.enable_data_archiving}
            onChange={(checked) => handleSettingChange('enable_data_archiving', checked)}
          />
        </div>
        </div>
        )}
      </GlassCard>

      {/* Product Organization */}
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('product-org')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Tag className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Product Organization</h3>
              <p className="text-sm text-gray-600">Configure product categorization and organization</p>
            </div>
          </div>
          {expandedSection === 'product-org' ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </div>
        {expandedSection === 'product-org' && (
        <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <GlassInput
            label="Max Category Depth"
            type="number"
            value={settings.max_category_depth}
            onChange={(e) => handleSettingChange('max_category_depth', parseInt(e.target.value) || 0)}
            description="Maximum category nesting level"
          />
          <GlassInput
            label="Default Category ID"
            value={settings.default_category_id}
            onChange={(e) => handleSettingChange('default_category_id', e.target.value)}
            description="Default category for new products"
            placeholder="Leave empty for none"
          />
        </div>
        <div className="space-y-3">
          <ToggleSwitch
            label="Auto-Assign Categories"
            description="Automatically categorize products based on name"
            checked={settings.auto_assign_categories}
            onChange={(checked) => handleSettingChange('auto_assign_categories', checked)}
          />
          <ToggleSwitch
            label="Enable Subcategories"
            description="Allow nested product categories"
            checked={settings.enable_subcategories}
            onChange={(checked) => handleSettingChange('enable_subcategories', checked)}
          />
          <ToggleSwitch
            label="Enable Tags"
            description="Allow product tags and labels"
            checked={settings.enable_tags}
            onChange={(checked) => handleSettingChange('enable_tags', checked)}
          />
          <ToggleSwitch
            label="Enable Product Bundles"
            description="Create product bundles and kits"
            checked={settings.enable_product_bundles}
            onChange={(checked) => handleSettingChange('enable_product_bundles', checked)}
          />
          <ToggleSwitch
            label="Enable Product Variants"
            description="Support size, color, and other variants"
            checked={settings.enable_product_variants}
            onChange={(checked) => handleSettingChange('enable_product_variants', checked)}
          />
        </div>
        </div>
        )}
      </GlassCard>

      {/* Supplier Management */}
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('supplier')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Truck className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Supplier Management</h3>
              <p className="text-sm text-gray-600">Configure supplier tracking and purchase orders</p>
            </div>
          </div>
          {expandedSection === 'supplier' ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </div>
        {expandedSection === 'supplier' && (
        <div className="mt-6">
        <div className="mb-4">
          <GlassInput
            label="Default Lead Time (Days)"
            type="number"
            value={settings.default_lead_time_days}
            onChange={(e) => handleSettingChange('default_lead_time_days', parseInt(e.target.value) || 0)}
            description="Default supplier lead time in days"
          />
        </div>
        <div className="space-y-3">
          <ToggleSwitch
            label="Enable Supplier Tracking"
            description="Track suppliers for each product"
            checked={settings.enable_supplier_tracking}
            onChange={(checked) => handleSettingChange('enable_supplier_tracking', checked)}
          />
          <ToggleSwitch
            label="Preferred Supplier Auto-Select"
            description="Automatically select preferred supplier"
            checked={settings.preferred_supplier_auto_select}
            onChange={(checked) => handleSettingChange('preferred_supplier_auto_select', checked)}
          />
          <ToggleSwitch
            label="Track Supplier Performance"
            description="Monitor delivery times and quality"
            checked={settings.track_supplier_performance}
            onChange={(checked) => handleSettingChange('track_supplier_performance', checked)}
          />
          <ToggleSwitch
            label="Enable Purchase Orders"
            description="Create and manage purchase orders"
            checked={settings.enable_purchase_orders}
            onChange={(checked) => handleSettingChange('enable_purchase_orders', checked)}
          />
          <ToggleSwitch
            label="Auto-Create PO at Reorder"
            description="Automatically create PO when stock hits reorder point"
            checked={settings.auto_create_po_at_reorder}
            onChange={(checked) => handleSettingChange('auto_create_po_at_reorder', checked)}
          />
        </div>
        </div>
        )}
      </GlassCard>

      {/* Reporting & Analytics */}
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('reporting')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Reporting & Analytics</h3>
              <p className="text-sm text-gray-600">Configure inventory reporting and analysis</p>
            </div>
          </div>
          {expandedSection === 'reporting' ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </div>
        {expandedSection === 'reporting' && (
        <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <GlassInput
            label="Dead Stock Threshold (Days)"
            type="number"
            value={settings.dead_stock_threshold_days}
            onChange={(e) => handleSettingChange('dead_stock_threshold_days', parseInt(e.target.value) || 0)}
            description="Days without movement to flag as dead stock"
          />
          <GlassInput
            label="Dashboard Refresh Rate (Seconds)"
            type="number"
            value={settings.dashboard_refresh_rate}
            onChange={(e) => handleSettingChange('dashboard_refresh_rate', parseInt(e.target.value) || 0)}
            description="How often to refresh dashboard"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stock Valuation Report Frequency</label>
            <select
              value={settings.stock_valuation_report_frequency}
              onChange={(e) => handleSettingChange('stock_valuation_report_frequency', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
        <div className="space-y-3">
          <ToggleSwitch
            label="Enable Inventory Turnover"
            description="Calculate inventory turnover ratio"
            checked={settings.enable_inventory_turnover}
            onChange={(checked) => handleSettingChange('enable_inventory_turnover', checked)}
          />
          <ToggleSwitch
            label="Enable ABC Analysis"
            description="Classify items by value (A/B/C)"
            checked={settings.enable_abc_analysis}
            onChange={(checked) => handleSettingChange('enable_abc_analysis', checked)}
          />
          <ToggleSwitch
            label="Enable Real-time Reporting"
            description="Generate reports in real-time"
            checked={settings.enable_realtime_reporting}
            onChange={(checked) => handleSettingChange('enable_realtime_reporting', checked)}
          />
        </div>
        </div>
        )}
      </GlassCard>

      {/* Integration */}
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('integration')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Share2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Integration Settings</h3>
              <p className="text-sm text-gray-600">Configure external integrations and APIs</p>
            </div>
          </div>
          {expandedSection === 'integration' ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </div>
        {expandedSection === 'integration' && (
        <div className="mt-6">
        <div className="mb-4">
          <GlassInput
            label="Webhook URL for Stock Changes"
            value={settings.webhook_stock_changes}
            onChange={(e) => handleSettingChange('webhook_stock_changes', e.target.value)}
            description="Webhook endpoint for stock change notifications"
            placeholder="https://your-webhook-url.com"
          />
        </div>
        <div className="space-y-3">
          <ToggleSwitch
            label="Enable POS Integration"
            description="Integrate with POS system"
            checked={settings.enable_pos_integration}
            onChange={(checked) => handleSettingChange('enable_pos_integration', checked)}
          />
          <ToggleSwitch
            label="Enable E-commerce Sync"
            description="Sync with e-commerce platforms"
            checked={settings.enable_ecommerce_sync}
            onChange={(checked) => handleSettingChange('enable_ecommerce_sync', checked)}
          />
          <ToggleSwitch
            label="Enable Accounting Integration"
            description="Integrate with accounting software"
            checked={settings.enable_accounting_integration}
            onChange={(checked) => handleSettingChange('enable_accounting_integration', checked)}
          />
          <ToggleSwitch
            label="Enable API Access"
            description="Allow API access for inventory data"
            checked={settings.enable_api_access}
            onChange={(checked) => handleSettingChange('enable_api_access', checked)}
          />
        </div>
        </div>
        )}
      </GlassCard>

      {/* Returns & Adjustments */}
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('returns')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-lg">
              <RotateCcw className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Returns & Adjustments</h3>
              <p className="text-sm text-gray-600">Configure return and adjustment policies</p>
            </div>
          </div>
          {expandedSection === 'returns' ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </div>
        {expandedSection === 'returns' && (
        <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <GlassInput
            label="Max Return Period (Days)"
            type="number"
            value={settings.max_return_period_days}
            onChange={(e) => handleSettingChange('max_return_period_days', parseInt(e.target.value) || 0)}
            description="Maximum days to accept returns"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Damaged Stock Handling</label>
            <select
              value={settings.damaged_stock_handling}
              onChange={(e) => handleSettingChange('damaged_stock_handling', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="separate_bin">Move to Separate Bin</option>
              <option value="write_off">Write Off Immediately</option>
            </select>
          </div>
        </div>
        <div className="space-y-3">
          <ToggleSwitch
            label="Allow Returns to Inventory"
            description="Returned items can be added back to inventory"
            checked={settings.allow_returns_to_inventory}
            onChange={(checked) => handleSettingChange('allow_returns_to_inventory', checked)}
          />
          <ToggleSwitch
            label="Return Inspection Required"
            description="Require inspection before restocking returns"
            checked={settings.return_inspection_required}
            onChange={(checked) => handleSettingChange('return_inspection_required', checked)}
          />
          <ToggleSwitch
            label="Adjustment Reason Required"
            description="Require reason for all stock adjustments"
            checked={settings.adjustment_reason_required}
            onChange={(checked) => handleSettingChange('adjustment_reason_required', checked)}
          />
        </div>
        </div>
        )}
      </GlassCard>

      {/* Units of Measure */}
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('units')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Ruler className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Units of Measure</h3>
              <p className="text-sm text-gray-600">Configure units and measurement settings</p>
            </div>
          </div>
          {expandedSection === 'units' ? (
            <ChevronUp className="w-6 h-6 text-gray-600" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-600" />
          )}
        </div>
        {expandedSection === 'units' && (
        <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <GlassInput
            label="Default Unit of Measure"
            value={settings.default_uom}
            onChange={(e) => handleSettingChange('default_uom', e.target.value)}
            description="Default UOM for new products"
            placeholder="piece, kg, liter, etc."
          />
          <GlassInput
            label="Quantity Decimal Places"
            type="number"
            value={settings.quantity_decimal_places}
            onChange={(e) => handleSettingChange('quantity_decimal_places', parseInt(e.target.value) || 0)}
            description="Decimal precision for quantities"
          />
        </div>
        <div className="space-y-3">
          <ToggleSwitch
            label="Enable Multiple UOM"
            description="Support multiple units of measure per product"
            checked={settings.enable_multiple_uom}
            onChange={(checked) => handleSettingChange('enable_multiple_uom', checked)}
          />
          <ToggleSwitch
            label="Enable UOM Conversion"
            description="Allow conversion between different units"
            checked={settings.enable_uom_conversion}
            onChange={(checked) => handleSettingChange('enable_uom_conversion', checked)}
          />
        </div>
        </div>
        )}
      </GlassCard>

      {/* Save Button (Bottom) */}
      {hasChanges && (
        <GlassCard className="p-6 sticky bottom-4 shadow-2xl border-2 border-indigo-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-indigo-600" />
              <div>
                <p className="font-semibold text-gray-900">Unsaved Changes</p>
                <p className="text-sm text-gray-600">Don't forget to save your settings</p>
              </div>
            </div>
            <GlassButton
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 text-lg"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save All Changes'}
            </GlassButton>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default InventorySettings;

