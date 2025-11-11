// Features Toggle Tab - Simple Enable/Disable for Optional Features
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Package, Truck, Heart, Users, CreditCard, Zap, CheckCircle } from 'lucide-react';
import UniversalSettingsTab from './UniversalSettingsTab';
import { SettingsSection } from './UniversalFormComponents';
import { ToggleSwitch } from './UniversalFormComponents';
import toast from 'react-hot-toast';
import { useTranslation } from '../../lib/i18n/useTranslation';

export interface FeaturesTabRef {
  saveSettings: () => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
}

interface FeatureState {
  enableDelivery: boolean;
  enableLoyaltyProgram: boolean;
  enableCustomerProfiles: boolean;
  enablePaymentTracking: boolean;
  enableDynamicPricing: boolean;
}

const FeaturesTab = forwardRef<FeaturesTabRef>((_props, ref) => {
  const { t } = useTranslation(); // Add translation hook
  const [features, setFeatures] = useState<FeatureState>({
    enableDelivery: false,
    enableLoyaltyProgram: true,
    enableCustomerProfiles: true,
    enablePaymentTracking: true,
    enableDynamicPricing: true,
  });
  
  const [isLoading] = useState(false);

  // Load settings from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('lats-pos-features');
      if (saved) {
        setFeatures(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading features:', error);
    }
  }, []);

  const handleSave = async () => {
    try {
      localStorage.setItem('lats-pos-features', JSON.stringify(features));
      toast.success('Features saved successfully!');
      return true;
    } catch (error) {
      console.error('Error saving features:', error);
      toast.error('Failed to save features');
      return false;
    }
  };

  const handleReset = async () => {
    const defaultFeatures: FeatureState = {
      enableDelivery: false,
      enableLoyaltyProgram: true,
      enableCustomerProfiles: true,
      enablePaymentTracking: true,
      enableDynamicPricing: true,
    };
    setFeatures(defaultFeatures);
    localStorage.setItem('lats-pos-features', JSON.stringify(defaultFeatures));
    toast.success('Features reset to defaults');
    return true;
  };

  const handleFeatureToggle = (key: keyof FeatureState, value: boolean) => {
    setFeatures(prev => ({
      ...prev,
      [key]: value
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
      {/* Main Features */}
      <SettingsSection
        title="Optional Features"
        icon={<Package className="w-5 h-5" />}
        helpText="Chagua features unazotaka. Features ambazo haziko enabled hazitaonekana kwenye POS."
      >
        <div className="space-y-4">
          {/* Delivery Management */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Delivery Management</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Weka delivery orders, driver assignment, na tracking.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">Driver Tracking</span>
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">Delivery Areas</span>
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">Fee Management</span>
                  </div>
                </div>
              </div>
              <ToggleSwitch
                id="enable-delivery"
                label=""
                checked={features.enableDelivery}
                onChange={(checked) => handleFeatureToggle('enableDelivery', checked)}
              />
            </div>
            {features.enableDelivery && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Active</span>
                  <span className="text-gray-500">- Delivery options zitaonekana kwenye POS</span>
                </div>
              </div>
            )}
          </div>

          {/* Loyalty Program */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Heart className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Loyalty Program</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Wapa customers points, track loyalty tiers, na discounts.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded">Points System</span>
                    <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded">Member Discounts</span>
                    <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded">Rewards</span>
                  </div>
                </div>
              </div>
              <ToggleSwitch
                id="enable-loyalty"
                label=""
                checked={features.enableLoyaltyProgram}
                onChange={(checked) => handleFeatureToggle('enableLoyaltyProgram', checked)}
              />
            </div>
            {features.enableLoyaltyProgram && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Active</span>
                  <span className="text-gray-500">- Loyalty features ziko enabled kwenye POS</span>
                </div>
              </div>
            )}
          </div>

          {/* Customer Profiles */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Customer Profiles</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Save taarifa za customers, historia ya manunuzi, na preferences.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">Purchase History</span>
                    <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">Contact Info</span>
                    <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">Preferences</span>
                  </div>
                </div>
              </div>
              <ToggleSwitch
                id="enable-customer-profiles"
                label=""
                checked={features.enableCustomerProfiles}
                onChange={(checked) => handleFeatureToggle('enableCustomerProfiles', checked)}
              />
            </div>
            {features.enableCustomerProfiles && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Active</span>
                  <span className="text-gray-500">- Customer selection inapatikana kwenye POS</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Tracking */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <CreditCard className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Payment Tracking</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Track partial payments, payment plans, na deni za customers.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded">Partial Payments</span>
                    <span className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded">Payment Plans</span>
                    <span className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded">Balance Tracking</span>
                  </div>
                </div>
              </div>
              <ToggleSwitch
                id="enable-payment-tracking"
                label=""
                checked={features.enablePaymentTracking}
                onChange={(checked) => handleFeatureToggle('enablePaymentTracking', checked)}
              />
            </div>
            {features.enablePaymentTracking && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Active</span>
                  <span className="text-gray-500">- Payment tracking iko enabled</span>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Pricing */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-yellow-300 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <Zap className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Dynamic Pricing</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Weka bei special kwa wakati fulani, bulk discounts, na promotions.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded">Happy Hour</span>
                    <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded">Bulk Discounts</span>
                    <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded">Promotions</span>
                  </div>
                </div>
              </div>
              <ToggleSwitch
                id="enable-dynamic-pricing"
                label=""
                checked={features.enableDynamicPricing}
                onChange={(checked) => handleFeatureToggle('enableDynamicPricing', checked)}
              />
            </div>
            {features.enableDynamicPricing && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Active</span>
                  <span className="text-gray-500">- Dynamic pricing rules ziko applied</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </SettingsSection>
    </UniversalSettingsTab>
  );
});

FeaturesTab.displayName = 'FeaturesTab';

// Wrap with React.memo to prevent unnecessary re-renders
export default React.memo(FeaturesTab);

