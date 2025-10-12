// Simplified Dynamic Pricing Tab with Quick Presets
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { TrendingUp, Clock, ShoppingCart, Star, Gift, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import UniversalSettingsTab from './UniversalSettingsTab';
import { SettingsSection } from './UniversalFormComponents';
import { ToggleSwitch, NumberInput, TextInput } from './UniversalFormComponents';
import toast from 'react-hot-toast';
import { POSSettingsService } from '../../../../lib/posSettingsApi';

export interface DynamicPricingSimplifiedTabRef {
  saveSettings: () => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
}

interface PricingPreset {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  startTime?: string;
  endTime?: string;
  discountPercent: number;
  minQuantity?: number;
}

interface PricingSettings {
  enableDynamicPricing: boolean;
  presets: {
    happyHour: PricingPreset;
    bulkDiscount: PricingPreset;
    loyaltyDiscount: PricingPreset;
  };
  showAdvanced: boolean;
}

const DynamicPricingSimplifiedTab = forwardRef<DynamicPricingSimplifiedTabRef>((props, ref) => {
  const [settings, setSettings] = useState<PricingSettings>({
    enableDynamicPricing: true,
    presets: {
      happyHour: {
        id: 'happy_hour',
        name: 'Happy Hour',
        description: 'Discount during specific hours',
        enabled: false,
        startTime: '18:00',
        endTime: '21:00',
        discountPercent: 15
      },
      bulkDiscount: {
        id: 'bulk_discount',
        name: 'Bulk Buy Discount',
        description: 'Discount for buying multiple items',
        enabled: true,
        minQuantity: 10,
        discountPercent: 10
      },
      loyaltyDiscount: {
        id: 'loyalty_discount',
        name: 'VIP Customer Discount',
        description: 'Automatic discount for loyal customers',
        enabled: true,
        discountPercent: 5
      }
    },
    showAdvanced: false
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load settings from database
  React.useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const dbSettings = await POSSettingsService.loadDynamicPricingSettings();
        if (dbSettings) {
          setSettings({
            enableDynamicPricing: dbSettings.enable_dynamic_pricing ?? true,
            presets: {
              happyHour: {
                id: 'happy_hour',
                name: 'Happy Hour',
                description: 'Discount during specific hours',
                enabled: dbSettings.enable_time_based_pricing ?? false,
                startTime: dbSettings.time_based_start_time ?? '18:00',
                endTime: dbSettings.time_based_end_time ?? '21:00',
                discountPercent: dbSettings.time_based_discount_percent ?? 15
              },
              bulkDiscount: {
                id: 'bulk_discount',
                name: 'Bulk Buy Discount',
                description: 'Discount for buying multiple items',
                enabled: dbSettings.enable_bulk_pricing ?? true,
                minQuantity: dbSettings.bulk_discount_threshold ?? 10,
                discountPercent: dbSettings.bulk_discount_percent ?? 10
              },
              loyaltyDiscount: {
                id: 'loyalty_discount',
                name: 'VIP Customer Discount',
                description: 'Automatic discount for loyal customers',
                enabled: dbSettings.enable_loyalty_pricing ?? true,
                discountPercent: dbSettings.loyalty_discount_percent ?? 5
              }
            },
            showAdvanced: false
          });
        }
      } catch (error) {
        console.error('Error loading pricing settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Map form settings to database fields
      const dbSettings = {
        enable_dynamic_pricing: settings.enableDynamicPricing,
        enable_loyalty_pricing: settings.presets.loyaltyDiscount.enabled,
        enable_bulk_pricing: settings.presets.bulkDiscount.enabled,
        enable_time_based_pricing: settings.presets.happyHour.enabled,
        enable_customer_pricing: false,
        enable_special_events: false,
        loyalty_discount_percent: settings.presets.loyaltyDiscount.discountPercent,
        loyalty_points_threshold: 1000,
        loyalty_max_discount: 20.00,
        bulk_discount_enabled: settings.presets.bulkDiscount.enabled,
        bulk_discount_threshold: settings.presets.bulkDiscount.minQuantity || 10,
        bulk_discount_percent: settings.presets.bulkDiscount.discountPercent,
        time_based_discount_enabled: settings.presets.happyHour.enabled,
        time_based_start_time: settings.presets.happyHour.startTime || '18:00',
        time_based_end_time: settings.presets.happyHour.endTime || '21:00',
        time_based_discount_percent: settings.presets.happyHour.discountPercent,
        customer_pricing_enabled: false,
        vip_customer_discount: 10.00,
        regular_customer_discount: 5.00,
        special_events_enabled: false,
        special_event_discount_percent: 20.00
      };

      await POSSettingsService.saveDynamicPricingSettings(dbSettings);
      toast.success('Pricing settings saved successfully!');
      return true;
    } catch (error) {
      console.error('Error saving pricing settings:', error);
      toast.error('Failed to save pricing settings');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    const defaultSettings: PricingSettings = {
      enableDynamicPricing: true,
      presets: {
        happyHour: {
          id: 'happy_hour',
          name: 'Happy Hour',
          description: 'Discount during specific hours',
          enabled: false,
          startTime: '18:00',
          endTime: '21:00',
          discountPercent: 15
        },
        bulkDiscount: {
          id: 'bulk_discount',
          name: 'Bulk Buy Discount',
          description: 'Discount for buying multiple items',
          enabled: true,
          minQuantity: 10,
          discountPercent: 10
        },
        loyaltyDiscount: {
          id: 'loyalty_discount',
          name: 'VIP Customer Discount',
          description: 'Automatic discount for loyal customers',
          enabled: true,
          discountPercent: 5
        }
      },
      showAdvanced: false
    };
    setSettings(defaultSettings);
    localStorage.setItem('lats-pos-pricing', JSON.stringify(defaultSettings));
    toast.success('Pricing settings reset to defaults');
    return true;
  };

  const handlePresetToggle = (presetKey: keyof PricingSettings['presets'], enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      presets: {
        ...prev.presets,
        [presetKey]: {
          ...prev.presets[presetKey],
          enabled
        }
      }
    }));
  };

  const handlePresetUpdate = (presetKey: keyof PricingSettings['presets'], field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      presets: {
        ...prev.presets,
        [presetKey]: {
          ...prev.presets[presetKey],
          [field]: value
        }
      }
    }));
  };

  // Expose save and reset functions through ref
  useImperativeHandle(ref, () => ({
    saveSettings: handleSave,
    resetSettings: handleReset
  }));

  return (
    <UniversalSettingsTab
      title="Pricing & Discounts"
      description="Simple pricing rules and discount presets for your business"
      onSave={handleSave}
      onReset={handleReset}
      onCancel={() => {}}
      isLoading={isLoading}
      isSaving={isSaving}
      isDirty={false}
    >
      {/* Master Toggle */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Dynamic Pricing</h3>
                <p className="text-sm text-gray-600">
                  {settings.enableDynamicPricing 
                    ? 'Automatic discounts are active'
                    : 'Pricing rules are disabled'}
                </p>
              </div>
            </div>
            <ToggleSwitch
              label=""
              checked={settings.enableDynamicPricing}
              onChange={(checked) => setSettings(prev => ({ ...prev, enableDynamicPricing: checked }))}
            />
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <SettingsSection
        title="Quick Presets"
        description="Pre-configured discount rules ready to use"
        icon={<Gift className="w-5 h-5" />}
      >
        <div className="space-y-4">
          {/* Happy Hour Preset */}
          <div className={`border-2 rounded-lg p-4 transition-all ${
            settings.presets.happyHour.enabled && settings.enableDynamicPricing
              ? 'border-orange-300 bg-orange-50'
              : 'border-gray-200 bg-white'
          }`}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {settings.presets.happyHour.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {settings.presets.happyHour.description}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                label=""
                checked={settings.presets.happyHour.enabled}
                onChange={(checked) => handlePresetToggle('happyHour', checked)}
                disabled={!settings.enableDynamicPricing}
              />
            </div>
            
            {settings.presets.happyHour.enabled && settings.enableDynamicPricing && (
              <div className="ml-11 space-y-3 pt-3 border-t border-orange-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={settings.presets.happyHour.startTime}
                      onChange={(e) => handlePresetUpdate('happyHour', 'startTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={settings.presets.happyHour.endTime}
                      onChange={(e) => handlePresetUpdate('happyHour', 'endTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <NumberInput
                    label="Discount %"
                    value={settings.presets.happyHour.discountPercent}
                    onChange={(value) => handlePresetUpdate('happyHour', 'discountPercent', value)}
                    min={1}
                    max={50}
                    step={1}
                  />
                </div>
                <p className="text-xs text-orange-700">
                  ⏰ Active from {settings.presets.happyHour.startTime} to {settings.presets.happyHour.endTime} daily
                </p>
              </div>
            )}
          </div>

          {/* Bulk Discount Preset */}
          <div className={`border-2 rounded-lg p-4 transition-all ${
            settings.presets.bulkDiscount.enabled && settings.enableDynamicPricing
              ? 'border-blue-300 bg-blue-50'
              : 'border-gray-200 bg-white'
          }`}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {settings.presets.bulkDiscount.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {settings.presets.bulkDiscount.description}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                label=""
                checked={settings.presets.bulkDiscount.enabled}
                onChange={(checked) => handlePresetToggle('bulkDiscount', checked)}
                disabled={!settings.enableDynamicPricing}
              />
            </div>
            
            {settings.presets.bulkDiscount.enabled && settings.enableDynamicPricing && (
              <div className="ml-11 space-y-3 pt-3 border-t border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <NumberInput
                    label="Minimum Quantity"
                    value={settings.presets.bulkDiscount.minQuantity || 10}
                    onChange={(value) => handlePresetUpdate('bulkDiscount', 'minQuantity', value)}
                    min={2}
                    max={100}
                    step={1}
                  />
                  <NumberInput
                    label="Discount %"
                    value={settings.presets.bulkDiscount.discountPercent}
                    onChange={(value) => handlePresetUpdate('bulkDiscount', 'discountPercent', value)}
                    min={1}
                    max={50}
                    step={1}
                  />
                </div>
                <p className="text-xs text-blue-700">
                  🛒 Buy {settings.presets.bulkDiscount.minQuantity}+ items, get {settings.presets.bulkDiscount.discountPercent}% off
                </p>
              </div>
            )}
          </div>

          {/* Loyalty Discount Preset */}
          <div className={`border-2 rounded-lg p-4 transition-all ${
            settings.presets.loyaltyDiscount.enabled && settings.enableDynamicPricing
              ? 'border-purple-300 bg-purple-50'
              : 'border-gray-200 bg-white'
          }`}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Star className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {settings.presets.loyaltyDiscount.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {settings.presets.loyaltyDiscount.description}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                label=""
                checked={settings.presets.loyaltyDiscount.enabled}
                onChange={(checked) => handlePresetToggle('loyaltyDiscount', checked)}
                disabled={!settings.enableDynamicPricing}
              />
            </div>
            
            {settings.presets.loyaltyDiscount.enabled && settings.enableDynamicPricing && (
              <div className="ml-11 space-y-3 pt-3 border-t border-purple-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <NumberInput
                    label="Discount %"
                    value={settings.presets.loyaltyDiscount.discountPercent}
                    onChange={(value) => handlePresetUpdate('loyaltyDiscount', 'discountPercent', value)}
                    min={1}
                    max={25}
                    step={1}
                  />
                </div>
                <p className="text-xs text-purple-700">
                  ⭐ VIP customers automatically get {settings.presets.loyaltyDiscount.discountPercent}% off
                </p>
              </div>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* Advanced Settings (Collapsed by default) */}
      <div className="mt-6">
        <button
          onClick={() => setSettings(prev => ({ ...prev, showAdvanced: !prev.showAdvanced }))}
          className="w-full flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Advanced Configuration</span>
          </div>
          {settings.showAdvanced ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </button>
        
        {settings.showAdvanced && (
          <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">
              Advanced pricing rules coming soon! For now, use the quick presets above for most common scenarios.
            </p>
            <div className="text-xs text-gray-500">
              💡 <strong>Need custom rules?</strong> Contact support for advanced pricing strategies like customer-specific pricing, category-based discounts, or event-based promotions.
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-green-900 mb-1">Dynamic Pricing Tips</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Start with one preset and test it before enabling multiple</li>
              <li>• Monitor sales during discount periods to optimize percentages</li>
              <li>• Discounts stack with manual POS discounts</li>
              <li>• All pricing rules apply automatically at checkout</li>
            </ul>
          </div>
        </div>
      </div>
    </UniversalSettingsTab>
  );
});

DynamicPricingSimplifiedTab.displayName = 'DynamicPricingSimplifiedTab';

// Wrap with React.memo to prevent unnecessary re-renders
export default React.memo(DynamicPricingSimplifiedTab);

