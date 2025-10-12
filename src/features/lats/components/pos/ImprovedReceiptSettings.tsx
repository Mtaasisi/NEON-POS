// Improved Receipt Settings with Live Preview
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { 
  Receipt, Printer, FileText, Settings, Image, Calendar,
  ChevronDown, ChevronUp, Save, RotateCcw
} from 'lucide-react';
import { ToggleSwitch, NumberInput, TextInput, Select } from './UniversalFormComponents';
import { useReceiptSettings } from '../../../../hooks/usePOSSettings';
import ReceiptPreview from './ReceiptPreview';
import { useBusinessInfo } from '../../../../hooks/useBusinessInfo';
import GlassButton from '../../../shared/components/ui/GlassButton';

export interface ReceiptSettingsTabRef {
  saveSettings: () => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
}

// Collapsible Section Component
const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 pt-0 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

const ImprovedReceiptSettings = forwardRef<ReceiptSettingsTabRef>((props, ref) => {
  const {
    settings,
    setSettings,
    loading: isLoading,
    saving: isSaving,
    error,
    saveSettings,
    resetSettings
  } = useReceiptSettings();

  const { businessInfo } = useBusinessInfo();

  const handleSave = async () => {
    const success = await saveSettings(settings);
    return success;
  };

  const handleReset = async () => {
    const success = await resetSettings();
    return success;
  };

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  useImperativeHandle(ref, () => ({
    saveSettings: handleSave,
    resetSettings: handleReset
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading settings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Receipt Settings</h2>
        <p className="text-gray-600">Customize your receipt template with live preview</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <GlassButton
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </GlassButton>
        <GlassButton
          onClick={handleReset}
          variant="secondary"
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </GlassButton>
      </div>

      {/* Split Layout: Settings + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Settings */}
        <div className="space-y-4 overflow-auto max-h-[calc(100vh-250px)]">
          
          {/* Template Settings */}
          <CollapsibleSection
            title="Template Settings"
            icon={<FileText className="w-5 h-5 text-blue-600" />}
          >
            <div className="space-y-4">
              <div>
                <Select
                  label="Receipt Template"
                  value={settings.receipt_template}
                  onChange={(value) => handleSettingChange('receipt_template', value)}
                  options={[
                    { value: 'standard', label: 'Standard - 80mm thermal (recommended)' },
                    { value: 'compact', label: 'Compact - 58mm thermal' },
                    { value: 'detailed', label: 'Detailed - 80mm with all info' },
                    { value: 'a4', label: 'A4 - Full page invoice' },
                    { value: 'custom', label: 'Custom - Your preferences' }
                  ]}
                />
                <div className="mt-2 text-xs text-gray-500">
                  {settings.receipt_template === 'compact' && '📋 Compact: Shows only essential info - great for 58mm thermal printers!'}
                  {settings.receipt_template === 'standard' && '📋 Standard: Balanced layout for 80mm thermal printers'}
                  {settings.receipt_template === 'detailed' && '📋 Detailed: All information on 80mm thermal paper'}
                  {settings.receipt_template === 'a4' && '📋 A4: Full-page invoice format (210mm) - professional look!'}
                  {settings.receipt_template === 'custom' && '📋 Custom: Use your own settings below'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <NumberInput
                  label="Receipt Width (mm)"
                  value={settings.receipt_width}
                  onChange={(value) => handleSettingChange('receipt_width', value)}
                  min={40}
                  max={120}
                  step={5}
                />
                <NumberInput
                  label="Font Size (px)"
                  value={settings.receipt_font_size}
                  onChange={(value) => handleSettingChange('receipt_font_size', value)}
                  min={8}
                  max={16}
                  step={1}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Business Information */}
          <CollapsibleSection
            title="Business Information"
            icon={<Image className="w-5 h-5 text-green-600" />}
          >
            <div className="grid grid-cols-2 gap-3">
              <ToggleSwitch
                label="Show Logo"
                checked={settings.show_business_logo}
                onChange={(checked) => handleSettingChange('show_business_logo', checked)}
              />
              <ToggleSwitch
                label="Show Name"
                checked={settings.show_business_name}
                onChange={(checked) => handleSettingChange('show_business_name', checked)}
              />
              <ToggleSwitch
                label="Show Address"
                checked={settings.show_business_address}
                onChange={(checked) => handleSettingChange('show_business_address', checked)}
              />
              <ToggleSwitch
                label="Show Phone"
                checked={settings.show_business_phone}
                onChange={(checked) => handleSettingChange('show_business_phone', checked)}
              />
              <ToggleSwitch
                label="Show Email"
                checked={settings.show_business_email}
                onChange={(checked) => handleSettingChange('show_business_email', checked)}
              />
              <ToggleSwitch
                label="Show Website"
                checked={settings.show_business_website}
                onChange={(checked) => handleSettingChange('show_business_website', checked)}
              />
            </div>
          </CollapsibleSection>

          {/* Transaction Details */}
          <CollapsibleSection
            title="Transaction Details"
            icon={<Calendar className="w-5 h-5 text-purple-600" />}
          >
            <div className="grid grid-cols-2 gap-3">
              <ToggleSwitch
                label="Transaction ID"
                checked={settings.show_transaction_id}
                onChange={(checked) => handleSettingChange('show_transaction_id', checked)}
              />
              <ToggleSwitch
                label="Date & Time"
                checked={settings.show_date_time}
                onChange={(checked) => handleSettingChange('show_date_time', checked)}
              />
              <ToggleSwitch
                label="Cashier Name"
                checked={settings.show_cashier_name}
                onChange={(checked) => handleSettingChange('show_cashier_name', checked)}
              />
              <ToggleSwitch
                label="Customer Name"
                checked={settings.show_customer_name}
                onChange={(checked) => handleSettingChange('show_customer_name', checked)}
              />
              <ToggleSwitch
                label="Customer Phone"
                checked={settings.show_customer_phone}
                onChange={(checked) => handleSettingChange('show_customer_phone', checked)}
              />
            </div>
          </CollapsibleSection>

          {/* Product Details */}
          <CollapsibleSection
            title="Product Details"
            icon={<Receipt className="w-5 h-5 text-orange-600" />}
          >
            <div className="grid grid-cols-2 gap-3">
              <ToggleSwitch
                label="Product Names"
                checked={settings.show_product_names}
                onChange={(checked) => handleSettingChange('show_product_names', checked)}
              />
              <ToggleSwitch
                label="Product SKUs"
                checked={settings.show_product_skus}
                onChange={(checked) => handleSettingChange('show_product_skus', checked)}
              />
              <ToggleSwitch
                label="Barcodes"
                checked={settings.show_product_barcodes}
                onChange={(checked) => handleSettingChange('show_product_barcodes', checked)}
              />
              <ToggleSwitch
                label="Quantities"
                checked={settings.show_quantities}
                onChange={(checked) => handleSettingChange('show_quantities', checked)}
              />
              <ToggleSwitch
                label="Unit Prices"
                checked={settings.show_unit_prices}
                onChange={(checked) => handleSettingChange('show_unit_prices', checked)}
              />
              <ToggleSwitch
                label="Discounts"
                checked={settings.show_discounts}
                onChange={(checked) => handleSettingChange('show_discounts', checked)}
              />
            </div>
          </CollapsibleSection>

          {/* Totals & Summary */}
          <CollapsibleSection
            title="Totals & Summary"
            icon={<Settings className="w-5 h-5 text-indigo-600" />}
          >
            <div className="grid grid-cols-2 gap-3">
              <ToggleSwitch
                label="Subtotal"
                checked={settings.show_subtotal}
                onChange={(checked) => handleSettingChange('show_subtotal', checked)}
              />
              <ToggleSwitch
                label="Tax"
                checked={settings.show_tax}
                onChange={(checked) => handleSettingChange('show_tax', checked)}
              />
              <ToggleSwitch
                label="Discount Total"
                checked={settings.show_discount_total}
                onChange={(checked) => handleSettingChange('show_discount_total', checked)}
              />
              <ToggleSwitch
                label="Grand Total"
                checked={settings.show_grand_total}
                onChange={(checked) => handleSettingChange('show_grand_total', checked)}
              />
              <ToggleSwitch
                label="Payment Method"
                checked={settings.show_payment_method}
                onChange={(checked) => handleSettingChange('show_payment_method', checked)}
              />
              <ToggleSwitch
                label="Change Amount"
                checked={settings.show_change_amount}
                onChange={(checked) => handleSettingChange('show_change_amount', checked)}
              />
            </div>
          </CollapsibleSection>

          {/* Print Settings */}
          <CollapsibleSection
            title="Print Settings"
            icon={<Printer className="w-5 h-5 text-red-600" />}
          >
            <div className="grid grid-cols-2 gap-3">
              <ToggleSwitch
                label="Auto Print"
                checked={settings.auto_print_receipt}
                onChange={(checked) => handleSettingChange('auto_print_receipt', checked)}
              />
              <ToggleSwitch
                label="Print Duplicate"
                checked={settings.print_duplicate_receipt}
                onChange={(checked) => handleSettingChange('print_duplicate_receipt', checked)}
              />
              <ToggleSwitch
                label="Email Receipt"
                checked={settings.enable_email_receipt}
                onChange={(checked) => handleSettingChange('enable_email_receipt', checked)}
              />
              <ToggleSwitch
                label="SMS Receipt"
                checked={settings.enable_sms_receipt}
                onChange={(checked) => handleSettingChange('enable_sms_receipt', checked)}
              />
            </div>
          </CollapsibleSection>

          {/* Receipt Numbering */}
          <CollapsibleSection
            title="Receipt Numbering"
            icon={<FileText className="w-5 h-5 text-teal-600" />}
          >
            <div className="space-y-4">
              <ToggleSwitch
                label="Enable Receipt Numbering"
                checked={settings.enable_receipt_numbering}
                onChange={(checked) => handleSettingChange('enable_receipt_numbering', checked)}
              />
              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Receipt Prefix"
                  value={settings.receipt_number_prefix}
                  onChange={(value) => handleSettingChange('receipt_number_prefix', value)}
                  placeholder="RCP"
                />
                <NumberInput
                  label="Start Number"
                  value={settings.receipt_number_start}
                  onChange={(value) => handleSettingChange('receipt_number_start', value)}
                  min={1}
                  max={999999}
                  step={1}
                />
              </div>
              <TextInput
                label="Number Format"
                value={settings.receipt_number_format}
                onChange={(value) => handleSettingChange('receipt_number_format', value)}
                placeholder="RCP-{YEAR}-{NUMBER}"
                helperText="Use {YEAR} for year, {NUMBER} for auto-increment number"
              />
            </div>
          </CollapsibleSection>

          {/* Footer Settings */}
          <CollapsibleSection
            title="Footer Settings"
            icon={<FileText className="w-5 h-5 text-gray-600" />}
          >
            <div className="space-y-4">
              <ToggleSwitch
                label="Show Footer Message"
                checked={settings.show_footer_message}
                onChange={(checked) => handleSettingChange('show_footer_message', checked)}
              />
              <TextInput
                label="Footer Message"
                value={settings.footer_message}
                onChange={(value) => handleSettingChange('footer_message', value)}
                placeholder="Thank you for your business!"
              />
              <ToggleSwitch
                label="Show Return Policy"
                checked={settings.show_return_policy}
                onChange={(checked) => handleSettingChange('show_return_policy', checked)}
              />
              <TextInput
                label="Return Policy Text"
                value={settings.return_policy_text}
                onChange={(value) => handleSettingChange('return_policy_text', value)}
                placeholder="Returns accepted within 7 days with receipt"
              />
            </div>
          </CollapsibleSection>
        </div>

        {/* Right: Live Preview */}
        <div>
          <ReceiptPreview settings={settings} businessInfo={businessInfo} />
        </div>
      </div>
    </div>
  );
});

ImprovedReceiptSettings.displayName = 'ImprovedReceiptSettings';

export default React.memo(ImprovedReceiptSettings);

