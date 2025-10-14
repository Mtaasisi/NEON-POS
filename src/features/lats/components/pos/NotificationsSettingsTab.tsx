// Notifications Settings Tab - WhatsApp, SMS, Email invoice sending
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { 
  Bell, MessageCircle, Mail, Send, Smartphone, 
  Eye, Settings, CheckCircle, Zap, FileText 
} from 'lucide-react';
import UniversalSettingsTab from './UniversalSettingsTab';
import { SettingsSection } from './UniversalFormComponents';
import { ToggleSwitch, TextInput, Select } from './UniversalFormComponents';
import toast from 'react-hot-toast';
import GlassCard from '../../../shared/components/ui/GlassCard';
import { format } from '../../lib/format';

export interface NotificationsSettingsTabRef {
  saveSettings: () => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
}

interface NotificationSettings {
  // WhatsApp Invoice Settings
  whatsappEnabled: boolean;
  whatsappAutoSend: boolean;
  whatsappShowPreview: boolean;
  whatsappIncludeLogo: boolean;
  whatsappIncludeItems: boolean;
  whatsappMessage: string;
  
  // SMS Invoice Settings
  smsEnabled: boolean;
  smsAutoSend: boolean;
  smsTemplate: string;
  smsIncludeTotal: boolean;
  smsIncludeBalance: boolean;
  
  // Email Invoice Settings
  emailEnabled: boolean;
  emailAutoSend: boolean;
  emailSubject: string;
  emailTemplate: string;
  emailAttachPDF: boolean;
  
  // General Notification Settings
  notifyOnPayment: boolean;
  notifyOnRefund: boolean;
  notifyLowStock: boolean;
  notifyNewCustomer: boolean;
}

const NotificationsSettingsTab = forwardRef<NotificationsSettingsTabRef>((props, ref) => {
  const [settings, setSettings] = useState<NotificationSettings>({
    // WhatsApp defaults
    whatsappEnabled: true,
    whatsappAutoSend: false,
    whatsappShowPreview: true,
    whatsappIncludeLogo: true,
    whatsappIncludeItems: true,
    whatsappMessage: 'Thank you for your purchase! Here\'s your invoice:',
    
    // SMS defaults
    smsEnabled: true,
    smsAutoSend: false,
    smsTemplate: 'Thank you! Total: {total}. Balance: {balance}. Ref: {invoice_no}',
    smsIncludeTotal: true,
    smsIncludeBalance: true,
    
    // Email defaults
    emailEnabled: true,
    emailAutoSend: false,
    emailSubject: 'Your Invoice from {business_name}',
    emailTemplate: 'Thank you for your purchase. Please find your invoice attached.',
    emailAttachPDF: true,
    
    // General defaults
    notifyOnPayment: true,
    notifyOnRefund: true,
    notifyLowStock: true,
    notifyNewCustomer: false,
  });
  
  const [showWhatsAppPreview, setShowWhatsAppPreview] = useState(false);
  const [showSMSPreview, setShowSMSPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load settings from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('lats-pos-notifications');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('lats-pos-notifications', JSON.stringify(settings));
      toast.success('Notification settings saved successfully!');
      return true;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save notification settings');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    const defaultSettings: NotificationSettings = {
      whatsappEnabled: true,
      whatsappAutoSend: false,
      whatsappShowPreview: true,
      whatsappIncludeLogo: true,
      whatsappIncludeItems: true,
      whatsappMessage: 'Thank you for your purchase! Here\'s your invoice:',
      smsEnabled: true,
      smsAutoSend: false,
      smsTemplate: 'Thank you! Total: {total}. Balance: {balance}. Ref: {invoice_no}',
      smsIncludeTotal: true,
      smsIncludeBalance: true,
      emailEnabled: true,
      emailAutoSend: false,
      emailSubject: 'Your Invoice from {business_name}',
      emailTemplate: 'Thank you for your purchase. Please find your invoice attached.',
      emailAttachPDF: true,
      notifyOnPayment: true,
      notifyOnRefund: true,
      notifyLowStock: true,
      notifyNewCustomer: false,
    };
    setSettings(defaultSettings);
    localStorage.setItem('lats-pos-notifications', JSON.stringify(defaultSettings));
    toast.success('Notification settings reset to defaults');
    return true;
  };

  const handleSettingChange = (key: keyof NotificationSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Expose save and reset functions through ref
  useImperativeHandle(ref, () => ({
    saveSettings: handleSave,
    resetSettings: handleReset
  }));

  // Sample invoice data for preview
  const sampleInvoice = {
    invoice_no: 'INV-2024-001',
    business_name: 'My Store',
    business_phone: '+255 123 456 789',
    customer_name: 'John Doe',
    items: [
      { name: 'Product 1', quantity: 2, price: 10000 },
      { name: 'Product 2', quantity: 1, price: 25000 },
    ],
    subtotal: 45000,
    tax: 4500,
    total: 49500,
    paid: 30000,
    balance: 19500,
    date: new Date().toLocaleDateString(),
  };

  // Generate WhatsApp preview message
  const generateWhatsAppPreview = () => {
    let message = settings.whatsappMessage + '\n\n';
    message += `📄 Invoice: ${sampleInvoice.invoice_no}\n`;
    message += `📅 Date: ${sampleInvoice.date}\n`;
    message += `👤 Customer: ${sampleInvoice.customer_name}\n\n`;
    
    if (settings.whatsappIncludeItems) {
      message += '🛒 Items:\n';
      sampleInvoice.items.forEach(item => {
        message += `  • ${item.name} x${item.quantity} - ${format.money(item.price)}\n`;
      });
      message += '\n';
    }
    
    message += `💰 Total: ${format.money(sampleInvoice.total)}\n`;
    message += `✅ Paid: ${format.money(sampleInvoice.paid)}\n`;
    message += `📊 Balance: ${format.money(sampleInvoice.balance)}\n\n`;
    message += `📞 Contact: ${sampleInvoice.business_phone}\n`;
    message += `\nThank you for your business! 🙏`;
    
    return message;
  };

  // Generate SMS preview
  const generateSMSPreview = () => {
    let message = settings.smsTemplate;
    message = message.replace('{total}', format.money(sampleInvoice.total));
    message = message.replace('{balance}', format.money(sampleInvoice.balance));
    message = message.replace('{invoice_no}', sampleInvoice.invoice_no);
    message = message.replace('{business_name}', sampleInvoice.business_name);
    message = message.replace('{customer_name}', sampleInvoice.customer_name);
    return message;
  };

  return (
    <UniversalSettingsTab
      title="Notifications & Invoices"
      description="Configure how invoices and notifications are sent to customers"
      onSave={handleSave}
      onReset={handleReset}
      onCancel={() => {}}
      isLoading={isLoading}
      isSaving={isSaving}
      isDirty={false}
    >
      {/* WhatsApp Settings */}
      <SettingsSection
        title="WhatsApp Invoice"
        description="Send invoices via WhatsApp with rich preview"
        icon={<MessageCircle className="w-5 h-5" />}
      >
        <div className="space-y-6">
          {/* Main WhatsApp Toggle */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="w-6 h-6 text-green-600 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">WhatsApp Integration</h4>
                  <p className="text-sm text-gray-600">
                    Send detailed invoices with items, totals, and payment info directly to customers' WhatsApp
                  </p>
                </div>
              </div>
              <ToggleSwitch
                label=""
                checked={settings.whatsappEnabled}
                onChange={(checked) => handleSettingChange('whatsappEnabled', checked)}
              />
            </div>

            {settings.whatsappEnabled && (
              <div className="space-y-4 mt-4 pt-4 border-t border-green-300">
                {/* Auto Send */}
                <div>
                  <ToggleSwitch
                    label="Auto-send after payment completion"
                    checked={settings.whatsappAutoSend}
                    onChange={(checked) => handleSettingChange('whatsappAutoSend', checked)}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    {settings.whatsappAutoSend 
                      ? "✅ Invoices will be sent automatically" 
                      : "Manual: Staff will need to click 'Send' button"
                    }
                  </p>
                </div>

                {/* Show Preview */}
                <div>
                  <ToggleSwitch
                    label="Show preview before sending"
                    checked={settings.whatsappShowPreview}
                    onChange={(checked) => handleSettingChange('whatsappShowPreview', checked)}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Allow staff to review message before sending
                  </p>
                </div>

                {/* Include Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ToggleSwitch
                    label="Include business logo"
                    checked={settings.whatsappIncludeLogo}
                    onChange={(checked) => handleSettingChange('whatsappIncludeLogo', checked)}
                  />
                  
                  <ToggleSwitch
                    label="Include item details"
                    checked={settings.whatsappIncludeItems}
                    onChange={(checked) => handleSettingChange('whatsappIncludeItems', checked)}
                  />
                </div>

                {/* Template Customization */}
                <div className="border-t border-green-200 pt-4">
                  <h5 className="font-medium text-gray-900 mb-3">📝 Template Customization</h5>
                  
                  {/* Opening Message */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opening Message
                    </label>
                    <textarea
                      value={settings.whatsappMessage}
                      onChange={(e) => handleSettingChange('whatsappMessage', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Thank you for your purchase! Here's your invoice:"
                    />
                  </div>

                  {/* Available Variables */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Available Variables:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <span>• {'{invoice_no}'} - Invoice number</span>
                      <span>• {'{customer_name}'} - Customer name</span>
                      <span>• {'{total}'} - Total amount</span>
                      <span>• {'{paid}'} - Amount paid</span>
                      <span>• {'{balance}'} - Balance due</span>
                      <span>• {'{date}'} - Transaction date</span>
                      <span>• {'{business_name}'} - Your business</span>
                      <span>• {'{business_phone}'} - Your phone</span>
                    </div>
                  </div>

                  {/* Closing Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Closing Message (Optional)
                    </label>
                    <textarea
                      value={settings.whatsappClosingMessage || ''}
                      onChange={(e) => handleSettingChange('whatsappClosingMessage', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Thank you for your business! Visit us again soon."
                    />
                  </div>
                </div>

                {/* Preview Button */}
                <button
                  onClick={() => setShowWhatsAppPreview(!showWhatsAppPreview)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  {showWhatsAppPreview ? 'Hide Preview' : 'Show Preview'}
                </button>

                {/* WhatsApp Preview */}
                {showWhatsAppPreview && (
                  <div className="bg-white border-2 border-green-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                      <h5 className="font-semibold text-gray-900">WhatsApp Preview</h5>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                        {generateWhatsAppPreview()}
                      </pre>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 This is how your invoice will appear on WhatsApp
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* SMS Settings */}
      <SettingsSection
        title="SMS Invoice"
        description="Send short invoice notifications via SMS"
        icon={<Smartphone className="w-5 h-5" />}
      >
        <div className="space-y-6">
          {/* Main SMS Toggle */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3">
                <Smartphone className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">SMS Integration</h4>
                  <p className="text-sm text-gray-600">
                    Send concise invoice summaries via SMS for quick customer reference
                  </p>
                </div>
              </div>
              <ToggleSwitch
                label=""
                checked={settings.smsEnabled}
                onChange={(checked) => handleSettingChange('smsEnabled', checked)}
              />
            </div>

            {settings.smsEnabled && (
              <div className="space-y-4 mt-4 pt-4 border-t border-blue-300">
                {/* Auto Send */}
                <div>
                  <ToggleSwitch
                    label="Auto-send after payment completion"
                    checked={settings.smsAutoSend}
                    onChange={(checked) => handleSettingChange('smsAutoSend', checked)}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    {settings.smsAutoSend 
                      ? "✅ SMS will be sent automatically" 
                      : "Manual: Staff will need to click 'Send' button"
                    }
                  </p>
                </div>

                {/* Include Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ToggleSwitch
                    label="Include total amount"
                    checked={settings.smsIncludeTotal}
                    onChange={(checked) => handleSettingChange('smsIncludeTotal', checked)}
                  />
                  
                  <ToggleSwitch
                    label="Include balance due"
                    checked={settings.smsIncludeBalance}
                    onChange={(checked) => handleSettingChange('smsIncludeBalance', checked)}
                  />
                </div>

                {/* SMS Template Customization */}
                <div className="border-t border-blue-200 pt-4">
                  <h5 className="font-medium text-gray-900 mb-3">📝 Template Customization</h5>
                  
                  {/* Main SMS Template */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMS Template
                    </label>
                    <textarea
                      value={settings.smsTemplate}
                      onChange={(e) => handleSettingChange('smsTemplate', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Thank you! Total: {total}. Balance: {balance}. Ref: {invoice_no}"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Keep under 160 characters to save costs!
                    </p>
                  </div>

                  {/* Available Variables */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Available Variables:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <span>• {'{total}'} - Total amount</span>
                      <span>• {'{balance}'} - Balance due</span>
                      <span>• {'{paid}'} - Amount paid</span>
                      <span>• {'{invoice_no}'} - Invoice number</span>
                      <span>• {'{business_name}'} - Your business</span>
                      <span>• {'{customer_name}'} - Customer name</span>
                      <span>• {'{date}'} - Transaction date</span>
                      <span>• {'{business_phone}'} - Your phone</span>
                    </div>
                  </div>

                  {/* Quick Templates */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quick Templates (Click to use)
                    </label>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleSettingChange('smsTemplate', 'Thank you! Total: {total}. Paid: {paid}. Balance: {balance}. Ref: {invoice_no}')}
                        className="w-full text-left px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 text-xs"
                      >
                        💰 Full Details: "Thank you! Total: {'{total}'}. Paid: {'{paid}'}. Balance: {'{balance}'}. Ref: {'{invoice_no}'}"
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSettingChange('smsTemplate', 'Payment received! {total} paid. Balance: {balance}. Thank you!')}
                        className="w-full text-left px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 text-xs"
                      >
                        ✅ Simple: "Payment received! {'{total}'} paid. Balance: {'{balance}'}. Thank you!"
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSettingChange('smsTemplate', '{business_name}: Invoice {invoice_no}. Total: {total}. Visit us again!')}
                        className="w-full text-left px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 text-xs"
                      >
                        🏪 Business Focus: "{'{business_name}'}: Invoice {'{invoice_no}'}. Total: {'{total}'}. Visit us again!"
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview Button */}
                <button
                  onClick={() => setShowSMSPreview(!showSMSPreview)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  {showSMSPreview ? 'Hide Preview' : 'Show Preview'}
                </button>

                {/* SMS Preview */}
                {showSMSPreview && (
                  <div className="bg-white border-2 border-blue-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Smartphone className="w-5 h-5 text-blue-600" />
                      <h5 className="font-semibold text-gray-900">SMS Preview</h5>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-gray-800">
                        {generateSMSPreview()}
                      </p>
                      <div className="mt-2 pt-2 border-t border-blue-200 text-xs text-gray-500">
                        Character count: {generateSMSPreview().length} / 160
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 SMS messages over 160 characters may be split into multiple messages
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* Email Settings */}
      <SettingsSection
        title="Email Invoice"
        description="Send professional invoices via email"
        icon={<Mail className="w-5 h-5" />}
      >
        <div className="space-y-6">
          {/* Main Email Toggle */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3">
                <Mail className="w-6 h-6 text-purple-600 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Email Integration</h4>
                  <p className="text-sm text-gray-600">
                    Send professional PDF invoices via email with custom templates
                  </p>
                </div>
              </div>
              <ToggleSwitch
                label=""
                checked={settings.emailEnabled}
                onChange={(checked) => handleSettingChange('emailEnabled', checked)}
              />
            </div>

            {settings.emailEnabled && (
              <div className="space-y-4 mt-4 pt-4 border-t border-purple-300">
                {/* Auto Send */}
                <div>
                  <ToggleSwitch
                    label="Auto-send after payment completion"
                    checked={settings.emailAutoSend}
                    onChange={(checked) => handleSettingChange('emailAutoSend', checked)}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    {settings.emailAutoSend 
                      ? "✅ Emails will be sent automatically" 
                      : "Manual: Staff will need to click 'Send' button"
                    }
                  </p>
                </div>

                {/* Attach PDF */}
                <div>
                  <ToggleSwitch
                    label="Attach PDF invoice"
                    checked={settings.emailAttachPDF}
                    onChange={(checked) => handleSettingChange('emailAttachPDF', checked)}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Include a professionally formatted PDF invoice
                  </p>
                </div>

                {/* Email Template Customization */}
                <div className="border-t border-purple-200 pt-4">
                  <h5 className="font-medium text-gray-900 mb-3">📝 Template Customization</h5>
                  
                  {/* Email Subject */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={settings.emailSubject}
                      onChange={(e) => handleSettingChange('emailSubject', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Your Invoice from {business_name}"
                    />
                  </div>

                  {/* Email Body Template */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Body
                    </label>
                    <textarea
                      value={settings.emailTemplate}
                      onChange={(e) => handleSettingChange('emailTemplate', e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Dear {customer_name},&#10;&#10;Thank you for your purchase!&#10;&#10;Please find your invoice #{invoice_no} attached.&#10;&#10;Total: {total}&#10;&#10;Best regards,&#10;{business_name}"
                    />
                  </div>

                  {/* Available Variables */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Available Variables:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <span>• {'{business_name}'} - Your business</span>
                      <span>• {'{customer_name}'} - Customer name</span>
                      <span>• {'{invoice_no}'} - Invoice number</span>
                      <span>• {'{total}'} - Total amount</span>
                      <span>• {'{paid}'} - Amount paid</span>
                      <span>• {'{balance}'} - Balance due</span>
                      <span>• {'{date}'} - Transaction date</span>
                      <span>• {'{business_phone}'} - Your phone</span>
                    </div>
                  </div>

                  {/* Quick Email Templates */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quick Templates (Click to use)
                    </label>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleSettingChange('emailSubject', 'Invoice #{invoice_no} from {business_name}');
                          handleSettingChange('emailTemplate', 'Dear {customer_name},\n\nThank you for your purchase!\n\nInvoice Details:\n- Invoice #: {invoice_no}\n- Total: {total}\n- Paid: {paid}\n- Balance: {balance}\n\nPlease find your detailed invoice attached as a PDF.\n\nBest regards,\n{business_name}\n{business_phone}');
                        }}
                        className="w-full text-left px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-purple-50 text-xs"
                      >
                        📧 Professional: Full invoice details with PDF attachment
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSettingChange('emailSubject', 'Thank you for your purchase! - {business_name}');
                          handleSettingChange('emailTemplate', 'Hi {customer_name},\n\nThanks for shopping with us! Your invoice #{invoice_no} is attached.\n\nTotal: {total}\n\nSee you soon!\n{business_name}');
                        }}
                        className="w-full text-left px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-purple-50 text-xs"
                      >
                        😊 Friendly: Casual tone with essential details
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSettingChange('emailSubject', 'Receipt - {invoice_no}');
                          handleSettingChange('emailTemplate', 'Dear Customer,\n\nPlease find your receipt attached.\n\nInvoice: {invoice_no}\nAmount: {total}\nDate: {date}\n\nThank you.');
                        }}
                        className="w-full text-left px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-purple-50 text-xs"
                      >
                        📄 Minimal: Simple receipt confirmation
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* General Notifications */}
      <SettingsSection
        title="General Notifications"
        description="System-wide notification preferences"
        icon={<Bell className="w-5 h-5" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ToggleSwitch
            label="Notify on successful payment"
            checked={settings.notifyOnPayment}
            onChange={(checked) => handleSettingChange('notifyOnPayment', checked)}
          />
          
          <ToggleSwitch
            label="Notify on refund"
            checked={settings.notifyOnRefund}
            onChange={(checked) => handleSettingChange('notifyOnRefund', checked)}
          />
          
          <ToggleSwitch
            label="Low stock alerts"
            checked={settings.notifyLowStock}
            onChange={(checked) => handleSettingChange('notifyLowStock', checked)}
          />
          
          <ToggleSwitch
            label="New customer registration"
            checked={settings.notifyNewCustomer}
            onChange={(checked) => handleSettingChange('notifyNewCustomer', checked)}
          />
        </div>
      </SettingsSection>

      {/* Info Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Zap className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-2">Notification Tips</h4>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span><strong>Auto-send:</strong> Invoices sent immediately after payment</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span><strong>Manual send:</strong> Staff reviews and sends when ready</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span><strong>Multiple channels:</strong> You can enable all channels simultaneously</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span><strong>Preview:</strong> Always test your templates before going live</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span><strong>Cost:</strong> SMS charges apply per message, WhatsApp/Email may have lower costs</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </UniversalSettingsTab>
  );
});

NotificationsSettingsTab.displayName = 'NotificationsSettingsTab';

// Wrap with React.memo to prevent unnecessary re-renders
export default React.memo(NotificationsSettingsTab);

