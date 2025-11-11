// Simplified Dynamic Pricing Tab with Quick Presets
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { TrendingUp, Clock, ShoppingCart, Star, Gift } from 'lucide-react';
import UniversalSettingsTab from './UniversalSettingsTab';
import { SettingsSection } from './UniversalFormComponents';
import { ToggleSwitch, NumberInput, TimeInput } from './UniversalFormComponents';
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

const DynamicPricingSimplifiedTab = forwardRef<DynamicPricingSimplifiedTabRef>((_props, ref) => {
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
      isLoading={isLoading}
    >
      {/* Master Toggle */}
      <SettingsSection
        title="Dynamic Pricing"
        icon={<TrendingUp className="w-5 h-5" />}
        helpText="Enable automatic pricing rules and discounts that apply during checkout."
      >
        <ToggleSwitch
          id="enable_dynamic_pricing"
          label="Enable Dynamic Pricing"
          checked={settings.enableDynamicPricing}
          onChange={(checked) => setSettings(prev => ({ ...prev, enableDynamicPricing: checked }))}
          helpText="Master switch to enable/disable all automatic pricing rules and discounts."
        />
      </SettingsSection>

      {/* Discount Presets */}
      <SettingsSection
        title="Discount Presets"
        icon={<Gift className="w-5 h-5" />}
        helpText="Pre-configured discount rules you can enable with one click."
      >
        <div className="space-y-4">
          {/* Happy Hour Preset */}
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Happy Hour</h4>
                  <p className="text-xs text-gray-500">Discount during specific hours</p>
                </div>
              </div>
              <ToggleSwitch
                id="preset_happy_hour"
                label=""
                checked={settings.presets.happyHour.enabled}
                onChange={(checked) => handlePresetToggle('happyHour', checked)}
                disabled={!settings.enableDynamicPricing}
                helpText="Apply discount automatically during specified time period each day."
              />
            </div>
            
            {settings.presets.happyHour.enabled && settings.enableDynamicPricing && (
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <TimeInput
                    id="happy_hour_start"
                    label="Start Time"
                    value={settings.presets.happyHour.startTime || '18:00'}
                    onChange={(value) => handlePresetUpdate('happyHour', 'startTime', value)}
                    helpText="When the discount period begins."
                  />
                  <TimeInput
                    id="happy_hour_end"
                    label="End Time"
                    value={settings.presets.happyHour.endTime || '21:00'}
                    onChange={(value) => handlePresetUpdate('happyHour', 'endTime', value)}
                    helpText="When the discount period ends."
                  />
                  <NumberInput
                    id="happy_hour_discount"
                    label="Discount %"
                    value={settings.presets.happyHour.discountPercent}
                    onChange={(value) => handlePresetUpdate('happyHour', 'discountPercent', value)}
                    min={1}
                    max={50}
                    step={1}
                    helpText="Percentage off during happy hour."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bulk Discount Preset */}
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Bulk Buy Discount</h4>
                  <p className="text-xs text-gray-500">Discount for buying multiple items</p>
                </div>
              </div>
              <ToggleSwitch
                id="preset_bulk_discount"
                label=""
                checked={settings.presets.bulkDiscount.enabled}
                onChange={(checked) => handlePresetToggle('bulkDiscount', checked)}
                disabled={!settings.enableDynamicPricing}
                helpText="Reward customers who buy in larger quantities with automatic discounts."
              />
            </div>
            
            {settings.presets.bulkDiscount.enabled && settings.enableDynamicPricing && (
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberInput
                    id="bulk_min_quantity"
                    label="Minimum Quantity"
                    value={settings.presets.bulkDiscount.minQuantity || 10}
                    onChange={(value) => handlePresetUpdate('bulkDiscount', 'minQuantity', value)}
                    min={2}
                    max={100}
                    step={1}
                    helpText="How many items needed to qualify for discount."
                  />
                  <NumberInput
                    id="bulk_discount_percent"
                    label="Discount %"
                    value={settings.presets.bulkDiscount.discountPercent}
                    onChange={(value) => handlePresetUpdate('bulkDiscount', 'discountPercent', value)}
                    min={1}
                    max={50}
                    step={1}
                    helpText="Discount percentage for bulk purchases."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Loyalty Discount Preset */}
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-purple-600" />
                <div>
                  <h4 className="font-medium text-gray-900">VIP Customer Discount</h4>
                  <p className="text-xs text-gray-500">Automatic discount for loyal customers</p>
                </div>
              </div>
              <ToggleSwitch
                id="preset_loyalty_discount"
                label=""
                checked={settings.presets.loyaltyDiscount.enabled}
                onChange={(checked) => handlePresetToggle('loyaltyDiscount', checked)}
                disabled={!settings.enableDynamicPricing}
                helpText="Apply automatic discount to VIP or loyalty program members."
              />
            </div>
            
            {settings.presets.loyaltyDiscount.enabled && settings.enableDynamicPricing && (
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberInput
                    id="loyalty_discount_percent"
                    label="Discount %"
                    value={settings.presets.loyaltyDiscount.discountPercent}
                    onChange={(value) => handlePresetUpdate('loyaltyDiscount', 'discountPercent', value)}
                    min={1}
                    max={25}
                    step={1}
                    helpText="Discount percentage for VIP customers."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </SettingsSection>
    </UniversalSettingsTab>
  );
});

DynamicPricingSimplifiedTab.displayName = 'DynamicPricingSimplifiedTab';

// Wrap with React.memo to prevent unnecessary re-renders
export default React.memo(DynamicPricingSimplifiedTab);

