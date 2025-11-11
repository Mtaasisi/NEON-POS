// Improved Receipt Settings with Live Preview
import React, { forwardRef, useImperativeHandle } from 'react';
import { 
  Receipt, Printer, FileText, Settings, Image, Calendar,
  MessageCircle, Eye
} from 'lucide-react';
import UniversalSettingsTab from './UniversalSettingsTab';
import { SettingsSection } from './UniversalFormComponents';
import { ToggleSwitch, NumberInput, TextInput, Select } from './UniversalFormComponents';
import { useReceiptSettings } from '../../../../hooks/usePOSSettings';
import ReceiptPreview from './ReceiptPreview';
import { useBusinessInfo } from '../../../../hooks/useBusinessInfo';
import { useTranslation } from '../../lib/i18n/useTranslation';

export interface ReceiptSettingsTabRef {
  saveSettings: () => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
}

const ImprovedReceiptSettings = forwardRef<ReceiptSettingsTabRef>((_props, ref) => {
  const { t } = useTranslation(); // Add translation hook
  const {
    settings,
    setSettings,
    loading: isLoading,
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
    <UniversalSettingsTab
      isLoading={isLoading}
    >
      {/* Two-column layout: Settings on left, Fixed preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Settings (scrollable) */}
        <div className="space-y-6">

      {/* Template Settings */}
      <SettingsSection
        title="Receipt Template"
        icon={<FileText className="w-5 h-5" />}
        helpText="Chagua receipt template na customize size kwa printer yako."
      >
        <div className="space-y-4">
          <div>
            <Select
              id="receipt_template"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberInput
              id="receipt_width"
              label="Receipt Width (mm)"
              value={settings.receipt_width}
              onChange={(value) => handleSettingChange('receipt_width', value)}
              min={40}
              max={120}
              step={5}
            />
            <NumberInput
              id="receipt_font_size"
              label="Font Size (px)"
              value={settings.receipt_font_size}
              onChange={(value) => handleSettingChange('receipt_font_size', value)}
              min={8}
              max={16}
              step={1}
            />
          </div>
        </div>
      </SettingsSection>

      {/* Business Information */}
      <SettingsSection
        title="Taarifa za Duka"
        icon={<Image className="w-5 h-5" />}
        helpText="Chagua ni taarifa gani za duka zinaonekana kwenye receipt."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ToggleSwitch
            id="show_business_logo"
            label="Show Logo"
            checked={settings.show_business_logo}
            onChange={(checked) => handleSettingChange('show_business_logo', checked)}
          />
          <ToggleSwitch
            id="show_business_name"
            label="Show Name"
            checked={settings.show_business_name}
            onChange={(checked) => handleSettingChange('show_business_name', checked)}
          />
          <ToggleSwitch
            id="show_business_address"
            label="Show Address"
            checked={settings.show_business_address}
            onChange={(checked) => handleSettingChange('show_business_address', checked)}
          />
          <ToggleSwitch
            id="show_business_phone"
            label="Show Phone"
            checked={settings.show_business_phone}
            onChange={(checked) => handleSettingChange('show_business_phone', checked)}
          />
          <ToggleSwitch
            id="show_business_email"
            label="Show Email"
            checked={settings.show_business_email}
            onChange={(checked) => handleSettingChange('show_business_email', checked)}
          />
          <ToggleSwitch
            id="show_business_website"
            label="Show Website"
            checked={settings.show_business_website}
            onChange={(checked) => handleSettingChange('show_business_website', checked)}
          />
        </div>
      </SettingsSection>

      {/* Transaction Details */}
      <SettingsSection
        title="Transaction Details"
        icon={<Calendar className="w-5 h-5" />}
        helpText="Choose which transaction information to display on receipts."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ToggleSwitch
            id="show_transaction_id"
            label="Transaction ID"
            checked={settings.show_transaction_id}
            onChange={(checked) => handleSettingChange('show_transaction_id', checked)}
          />
          <ToggleSwitch
            id="show_date_time"
            label="Date & Time"
            checked={settings.show_date_time}
            onChange={(checked) => handleSettingChange('show_date_time', checked)}
          />
          <ToggleSwitch
            id="show_cashier_name"
            label="Cashier Name"
            checked={settings.show_cashier_name}
            onChange={(checked) => handleSettingChange('show_cashier_name', checked)}
          />
          <ToggleSwitch
            id="show_customer_name"
            label="Customer Name"
            checked={settings.show_customer_name}
            onChange={(checked) => handleSettingChange('show_customer_name', checked)}
          />
          <ToggleSwitch
            id="show_customer_phone"
            label="Customer Phone"
            checked={settings.show_customer_phone}
            onChange={(checked) => handleSettingChange('show_customer_phone', checked)}
          />
        </div>
      </SettingsSection>

      {/* Product Details */}
      <SettingsSection
        title="Product Details"
        icon={<Receipt className="w-5 h-5" />}
        helpText="Control which product information appears in the receipt line items."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ToggleSwitch
            id="show_product_names"
            label="Product Names"
            checked={settings.show_product_names}
            onChange={(checked) => handleSettingChange('show_product_names', checked)}
          />
          <ToggleSwitch
            id="show_product_skus"
            label="Product SKUs"
            checked={settings.show_product_skus}
            onChange={(checked) => handleSettingChange('show_product_skus', checked)}
          />
          <ToggleSwitch
            id="show_product_barcodes"
            label="Barcodes"
            checked={settings.show_product_barcodes}
            onChange={(checked) => handleSettingChange('show_product_barcodes', checked)}
          />
          <ToggleSwitch
            id="show_quantities"
            label="Quantities"
            checked={settings.show_quantities}
            onChange={(checked) => handleSettingChange('show_quantities', checked)}
          />
          <ToggleSwitch
            id="show_unit_prices"
            label="Item Prices"
            checked={settings.show_unit_prices}
            onChange={(checked) => handleSettingChange('show_unit_prices', checked)}
          />
          <ToggleSwitch
            id="show_discounts"
            label="Discounts"
            checked={settings.show_discounts}
            onChange={(checked) => handleSettingChange('show_discounts', checked)}
          />
        </div>
      </SettingsSection>

      {/* Totals & Summary */}
      <SettingsSection
        title="Totals & Summary"
        icon={<Settings className="w-5 h-5" />}
        helpText="Choose which summary totals to show at the bottom of receipts."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ToggleSwitch
            id="show_subtotal"
            label="Subtotal"
            checked={settings.show_subtotal}
            onChange={(checked) => handleSettingChange('show_subtotal', checked)}
          />
          <ToggleSwitch
            id="show_tax"
            label="Tax"
            checked={settings.show_tax}
            onChange={(checked) => handleSettingChange('show_tax', checked)}
          />
          <ToggleSwitch
            id="show_discount_total"
            label="Discount Total"
            checked={settings.show_discount_total}
            onChange={(checked) => handleSettingChange('show_discount_total', checked)}
          />
          <ToggleSwitch
            id="show_grand_total"
            label="Grand Total"
            checked={settings.show_grand_total}
            onChange={(checked) => handleSettingChange('show_grand_total', checked)}
          />
          <ToggleSwitch
            id="show_payment_method"
            label="Payment Method"
            checked={settings.show_payment_method}
            onChange={(checked) => handleSettingChange('show_payment_method', checked)}
          />
          <ToggleSwitch
            id="show_change_amount"
            label="Change Amount"
            checked={settings.show_change_amount}
            onChange={(checked) => handleSettingChange('show_change_amount', checked)}
          />
        </div>
      </SettingsSection>

      {/* Print Settings */}
      <SettingsSection
        title="Print Settings"
        icon={<Printer className="w-5 h-5" />}
        helpText="Weka automatic printing na options za duplicate receipt."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ToggleSwitch
            id="auto_print_receipt"
            label="Auto Print"
            checked={settings.auto_print_receipt}
            onChange={(checked) => handleSettingChange('auto_print_receipt', checked)}
          />
          <ToggleSwitch
            id="print_duplicate_receipt"
            label="Print Duplicate"
            checked={settings.print_duplicate_receipt}
            onChange={(checked) => handleSettingChange('print_duplicate_receipt', checked)}
          />
          <ToggleSwitch
            id="enable_email_receipt"
            label="Email Receipt"
            checked={settings.enable_email_receipt}
            onChange={(checked) => handleSettingChange('enable_email_receipt', checked)}
          />
          <ToggleSwitch
            id="enable_sms_receipt"
            label="SMS Receipt"
            checked={settings.enable_sms_receipt}
            onChange={(checked) => handleSettingChange('enable_sms_receipt', checked)}
          />
        </div>
      </SettingsSection>

      {/* WhatsApp PDF & Receipt Sharing */}
      <SettingsSection
        title="WhatsApp PDF & Receipt Sharing"
        icon={<MessageCircle className="w-5 h-5" />}
        helpText="Send beautifully formatted PDF receipts directly to customers' WhatsApp."
      >
        <div className="space-y-4">
          <ToggleSwitch
            id="enable_whatsapp_pdf"
            label="Enable WhatsApp PDF Receipts"
            checked={settings.enable_whatsapp_pdf ?? false}
            onChange={(checked) => handleSettingChange('enable_whatsapp_pdf', checked)}
            helpText="Allow sending receipts as PDF via WhatsApp"
          />

          {settings.enable_whatsapp_pdf && (
            <div className="pl-4 space-y-4 border-l-2 border-green-300">
              <ToggleSwitch
                id="whatsapp_pdf_auto_send"
                label="Auto-send PDF after payment"
                checked={settings.whatsapp_pdf_auto_send ?? false}
                onChange={(checked) => handleSettingChange('whatsapp_pdf_auto_send', checked)}
                helpText={settings.whatsapp_pdf_auto_send 
                  ? "✅ PDF will be sent automatically" 
                  : "Manual: Staff clicks 'Send PDF' button"}
              />

              <ToggleSwitch
                id="whatsapp_pdf_show_preview"
                label="Show preview before sending"
                checked={settings.whatsapp_pdf_show_preview ?? false}
                onChange={(checked) => handleSettingChange('whatsapp_pdf_show_preview', checked)}
                helpText="Allow staff to review PDF before sending"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  id="whatsapp_pdf_format"
                  label="PDF Format"
                  value={settings.whatsapp_pdf_format || 'a4'}
                  onChange={(value) => handleSettingChange('whatsapp_pdf_format', value)}
                  options={[
                    { value: 'a4', label: 'A4 (210 x 297 mm) - Standard' },
                    { value: 'letter', label: 'Letter (216 x 279 mm) - US Standard' },
                    { value: 'thermal', label: 'Thermal (80mm width)' },
                  ]}
                />
                
                <Select
                  id="whatsapp_pdf_quality"
                  label="PDF Quality"
                  value={settings.whatsapp_pdf_quality || 'standard'}
                  onChange={(value) => handleSettingChange('whatsapp_pdf_quality', value)}
                  options={[
                    { value: 'high', label: 'High Quality (larger file)' },
                    { value: 'standard', label: 'Standard Quality (recommended)' },
                    { value: 'compressed', label: 'Compressed (smaller file)' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Include in PDF
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ToggleSwitch
                    id="whatsapp_pdf_include_logo"
                    label="Business Logo"
                    checked={settings.whatsapp_pdf_include_logo ?? true}
                    onChange={(checked) => handleSettingChange('whatsapp_pdf_include_logo', checked)}
                  />
                  <ToggleSwitch
                    id="whatsapp_pdf_include_images"
                    label="Item Images"
                    checked={settings.whatsapp_pdf_include_images ?? false}
                    onChange={(checked) => handleSettingChange('whatsapp_pdf_include_images', checked)}
                  />
                  <ToggleSwitch
                    id="whatsapp_pdf_include_qr"
                    label="QR Code"
                    checked={settings.whatsapp_pdf_include_qr ?? true}
                    onChange={(checked) => handleSettingChange('whatsapp_pdf_include_qr', checked)}
                  />
                  <ToggleSwitch
                    id="whatsapp_pdf_include_barcode"
                    label="Barcode"
                    checked={settings.whatsapp_pdf_include_barcode ?? false}
                    onChange={(checked) => handleSettingChange('whatsapp_pdf_include_barcode', checked)}
                  />
                </div>
              </div>

              <TextInput
                id="whatsapp_pdf_message"
                label="WhatsApp Message (sent with PDF)"
                value={settings.whatsapp_pdf_message || 'Thank you for your purchase! Please find your receipt attached.'}
                onChange={(value) => handleSettingChange('whatsapp_pdf_message', value)}
                placeholder="Message sent with PDF..."
                helpText="This message will be sent along with the PDF receipt"
              />

              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                onClick={() => {
                  alert('PDF Preview coming soon!');
                }}
              >
                <Eye className="w-4 h-4" />
                Preview PDF Receipt
              </button>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Other Sharing Options
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ToggleSwitch
                id="enable_email_pdf"
                label="Enable Email PDF"
                checked={settings.enable_email_pdf ?? true}
                onChange={(checked) => handleSettingChange('enable_email_pdf', checked)}
              />
              <ToggleSwitch
                id="enable_print_pdf"
                label="Enable Print PDF"
                checked={settings.enable_print_pdf ?? true}
                onChange={(checked) => handleSettingChange('enable_print_pdf', checked)}
              />
              <ToggleSwitch
                id="enable_download_pdf"
                label="Enable Download PDF"
                checked={settings.enable_download_pdf ?? true}
                onChange={(checked) => handleSettingChange('enable_download_pdf', checked)}
              />
              <ToggleSwitch
                id="show_share_button"
                label="Show Share Button"
                checked={settings.show_share_button ?? true}
                onChange={(checked) => handleSettingChange('show_share_button', checked)}
              />
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Receipt Numbering */}
      <SettingsSection
        title="Receipt Numbering"
        icon={<FileText className="w-5 h-5" />}
        helpText="Configure automatic receipt numbering with custom prefixes and formats."
      >
        <div className="space-y-4">
          <ToggleSwitch
            id="enable_receipt_numbering"
            label="Enable Receipt Numbering"
            checked={settings.enable_receipt_numbering}
            onChange={(checked) => handleSettingChange('enable_receipt_numbering', checked)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              id="receipt_number_prefix"
              label="Receipt Prefix"
              value={settings.receipt_number_prefix}
              onChange={(value) => handleSettingChange('receipt_number_prefix', value)}
              placeholder="RCP"
            />
            <NumberInput
              id="receipt_number_start"
              label="Start Number"
              value={settings.receipt_number_start}
              onChange={(value) => handleSettingChange('receipt_number_start', value)}
              min={1}
              max={999999}
              step={1}
            />
          </div>
          <TextInput
            id="receipt_number_format"
            label="Number Format"
            value={settings.receipt_number_format}
            onChange={(value) => handleSettingChange('receipt_number_format', value)}
            placeholder="RCP-{YEAR}-{NUMBER}"
            helpText="Use {YEAR} for year, {NUMBER} for auto-increment number"
          />
        </div>
      </SettingsSection>

      {/* Footer Settings */}
      <SettingsSection
        title="Footer Message"
        icon={<FileText className="w-5 h-5" />}
        helpText="Weka message ya mwisho kwenye receipt yako."
      >
        <div className="space-y-4">
          <ToggleSwitch
            id="show_footer_message"
            label="Show Footer Message"
            checked={settings.show_footer_message}
            onChange={(checked) => handleSettingChange('show_footer_message', checked)}
          />
          <TextInput
            id="footer_message"
            label="Footer Message"
            value={settings.footer_message}
            onChange={(value) => handleSettingChange('footer_message', value)}
            placeholder="Asante kwa kununua!"
          />
          <ToggleSwitch
            id="show_return_policy"
            label="Show Return Policy"
            checked={settings.show_return_policy}
            onChange={(checked) => handleSettingChange('show_return_policy', checked)}
          />
          <TextInput
            id="return_policy_text"
            label="Return Policy Text"
            value={settings.return_policy_text}
            onChange={(value) => handleSettingChange('return_policy_text', value)}
            placeholder="Returns accepted within 7 days with receipt"
          />
        </div>
      </SettingsSection>
        </div>

        {/* Right column: Fixed/Sticky Preview */}
        <div className="lg:block hidden">
          <div className="sticky top-6">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <Eye className="w-6 h-6 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Live Preview</h3>
                  <p className="text-sm text-gray-600">Real-time preview</p>
                </div>
              </div>
              <div className="mt-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                <ReceiptPreview 
                  settings={settings} 
                  businessInfo={{
                    name: businessInfo?.name || '',
                    address: businessInfo?.address || '',
                    phone: businessInfo?.phone || '',
                    email: businessInfo?.email || '',
                    website: businessInfo?.website || '',
                    logo: businessInfo?.logo || undefined
                  }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </UniversalSettingsTab>
  );
});

ImprovedReceiptSettings.displayName = 'ImprovedReceiptSettings';

export default React.memo(ImprovedReceiptSettings);

