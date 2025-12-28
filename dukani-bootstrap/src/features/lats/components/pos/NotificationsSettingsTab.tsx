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
import { useTranslation } from '../../lib/i18n/useTranslation';

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
  const { t } = useTranslation(); // Add translation hook
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
      whatsappMessage: 'Asante kwa kununua! Hii hapa invoice yako:',
      smsEnabled: true,
      smsAutoSend: false,
      smsTemplate: 'Asante! Jumla: {total}. Deni: {balance}. Ref: {invoice_no}',
      smsIncludeTotal: true,
      smsIncludeBalance: true,
      emailEnabled: true,
      emailAutoSend: false,
      emailSubject: 'Your Invoice from {business_name}',
      emailTemplate: 'Asante kwa kununua. Invoice iko attached.',
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
      isLoading={isLoading}
    >
      {/* WhatsApp Settings */}
      <SettingsSection
        title="WhatsApp Invoice"
        icon={<MessageCircle className="w-5 h-5" />}
        helpText="Tuma invoice kwenye WhatsApp ya customer na items, totals, na payment info."
      >
        <div className="space-y-4">
          {/* Main WhatsApp Toggle */}
          <ToggleSwitch
            id="whatsapp_enabled"
            label="Enable WhatsApp Integration"
            checked={settings.whatsappEnabled}
            onChange={(checked) => handleSettingChange('whatsappEnabled', checked)}
            helpText="Send detailed invoices with items, totals, and payment info directly to customers' WhatsApp."
          />

          {settings.whatsappEnabled && (
            <div className="space-y-4 pl-6 border-l-4 border-green-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ToggleSwitch
                  id="whatsapp_auto_send"
                  label="Auto-send after payment"
                  checked={settings.whatsappAutoSend}
                  onChange={(checked) => handleSettingChange('whatsappAutoSend', checked)}
                  helpText="Automatically send invoice to customer's WhatsApp after payment completion."
                />

                <ToggleSwitch
                  id="whatsapp_show_preview"
                  label="Show preview before sending"
                  checked={settings.whatsappShowPreview}
                  onChange={(checked) => handleSettingChange('whatsappShowPreview', checked)}
                  helpText="Allow staff to review the message before sending it."
                />

                <ToggleSwitch
                  id="whatsapp_include_logo"
                  label="Include business logo"
                  checked={settings.whatsappIncludeLogo}
                  onChange={(checked) => handleSettingChange('whatsappIncludeLogo', checked)}
                  helpText="Add your business logo to the WhatsApp message."
                />
                
                <ToggleSwitch
                  id="whatsapp_include_items"
                  label="Include item details"
                  checked={settings.whatsappIncludeItems}
                  onChange={(checked) => handleSettingChange('whatsappIncludeItems', checked)}
                  helpText="Show individual items and quantities in the message."
                />
              </div>

              <div className="space-y-4">
                <TextInput
                  id="whatsapp_opening"
                  label="Opening Message"
                  value={settings.whatsappMessage}
                  onChange={(value) => handleSettingChange('whatsappMessage', value)}
                  placeholder="Thank you for your purchase! Here's your invoice:"
                  multiline
                  rows={2}
                  helpText={
                    <div>
                      <p className="mb-2"><strong>Available Variables:</strong></p>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <span>{'{invoice_no}'}</span>
                        <span>{'{customer_name}'}</span>
                        <span>{'{total}'}</span>
                        <span>{'{paid}'}</span>
                        <span>{'{balance}'}</span>
                        <span>{'{date}'}</span>
                        <span>{'{business_name}'}</span>
                        <span>{'{business_phone}'}</span>
                      </div>
                    </div>
                  }
                />

                <TextInput
                  id="whatsapp_closing"
                  label="Closing Message (Optional)"
                  value={settings.whatsappClosingMessage || ''}
                  onChange={(value) => handleSettingChange('whatsappClosingMessage', value)}
                  placeholder="Thank you for your business!"
                  multiline
                  rows={2}
                  helpText="Optional message shown at the end of the invoice."
                />
              </div>

              <button
                onClick={() => setShowWhatsAppPreview(!showWhatsAppPreview)}
                className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                {showWhatsAppPreview ? 'Hide Preview' : 'Show Preview'}
              </button>

              {showWhatsAppPreview && (
                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                    {generateWhatsAppPreview()}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </SettingsSection>

      {/* SMS Settings */}
      <SettingsSection
        title="SMS Invoice"
        icon={<Smartphone className="w-5 h-5" />}
        helpText="Tuma invoice summary kwa SMS kwa customer."
      >
        <div className="space-y-4">
          <ToggleSwitch
            id="sms_enabled"
            label="Enable SMS Integration"
            checked={settings.smsEnabled}
            onChange={(checked) => handleSettingChange('smsEnabled', checked)}
            helpText="Send short invoice notifications to customers via SMS."
          />

          {settings.smsEnabled && (
            <div className="space-y-4 pl-6 border-l-4 border-blue-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ToggleSwitch
                  id="sms_auto_send"
                  label="Auto-send after payment"
                  checked={settings.smsAutoSend}
                  onChange={(checked) => handleSettingChange('smsAutoSend', checked)}
                  helpText="Automatically send SMS after payment completion."
                />

                <ToggleSwitch
                  id="sms_include_total"
                  label="Include total amount"
                  checked={settings.smsIncludeTotal}
                  onChange={(checked) => handleSettingChange('smsIncludeTotal', checked)}
                  helpText="Show total amount in the SMS message."
                />
                
                <ToggleSwitch
                  id="sms_include_balance"
                  label="Include balance due"
                  checked={settings.smsIncludeBalance}
                  onChange={(checked) => handleSettingChange('smsIncludeBalance', checked)}
                  helpText="Show remaining balance in the SMS message."
                />
              </div>

                <TextInput
                  id="sms_template"
                  label="SMS Template"
                  value={settings.smsTemplate}
                  onChange={(value) => handleSettingChange('smsTemplate', value)}
                  placeholder="Thank you! Total: {total}. Balance: {balance}. Ref: {invoice_no}"
                  multiline
                  rows={3}
                  helpText={
                    <div>
                      <p className="mb-2"><strong>Variables:</strong></p>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <span>{'{total}'}</span>
                        <span>{'{balance}'}</span>
                        <span>{'{paid}'}</span>
                        <span>{'{invoice_no}'}</span>
                        <span>{'{business_name}'}</span>
                        <span>{'{customer_name}'}</span>
                      </div>
                      <p className="mt-2 text-xs">Keep under 160 chars to avoid splitting.</p>
                    </div>
                  }
                />

                <button
                  onClick={() => setShowSMSPreview(!showSMSPreview)}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  {showSMSPreview ? 'Hide Preview' : 'Show Preview'}
                </button>

                {showSMSPreview && (
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-800 mb-2">
                      {generateSMSPreview()}
                    </p>
                    <div className="text-xs text-gray-500">
                      Character count: {generateSMSPreview().length} / 160
                    </div>
                  </div>
                )}
              </div>
          )}
        </div>
      </SettingsSection>

      {/* Email Settings */}
      <SettingsSection
        title="Email Invoice"
        icon={<Mail className="w-5 h-5" />}
        helpText="Tuma invoice PDF kwa email ya customer."
      >
        <div className="space-y-4">
          <ToggleSwitch
            id="email_enabled"
            label="Enable Email Integration"
            checked={settings.emailEnabled}
            onChange={(checked) => handleSettingChange('emailEnabled', checked)}
            helpText="Send professional invoices to customers via email."
          />

          {settings.emailEnabled && (
            <div className="space-y-4 pl-6 border-l-4 border-purple-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ToggleSwitch
                  id="email_auto_send"
                  label="Auto-send after payment"
                  checked={settings.emailAutoSend}
                  onChange={(checked) => handleSettingChange('emailAutoSend', checked)}
                  helpText="Automatically send email after payment completion."
                />

                <ToggleSwitch
                  id="email_attach_pdf"
                  label="Attach PDF invoice"
                  checked={settings.emailAttachPDF}
                  onChange={(checked) => handleSettingChange('emailAttachPDF', checked)}
                  helpText="Include formatted PDF as email attachment."
                />
              </div>

              <div className="space-y-4">
                <TextInput
                  id="email_subject"
                  label="Email Subject"
                  value={settings.emailSubject}
                  onChange={(value) => handleSettingChange('emailSubject', value)}
                  placeholder="Your Invoice from {business_name}"
                  helpText="Subject line for the email. Use variables like {business_name}, {invoice_no}."
                />

                <TextInput
                  id="email_body"
                  label="Email Body"
                  value={settings.emailTemplate}
                  onChange={(value) => handleSettingChange('emailTemplate', value)}
                  placeholder="Dear {customer_name}, Thank you for your purchase!"
                  multiline
                  rows={6}
                  helpText={
                    <div>
                      <p className="mb-2"><strong>Variables:</strong></p>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <span>{'{business_name}'}</span>
                        <span>{'{customer_name}'}</span>
                        <span>{'{invoice_no}'}</span>
                        <span>{'{total}'}</span>
                        <span>{'{paid}'}</span>
                        <span>{'{balance}'}</span>
                      </div>
                    </div>
                  }
                />
              </div>
            </div>
          )}
        </div>
      </SettingsSection>

      {/* General Notifications */}
      <SettingsSection
        title="General Notifications"
        icon={<Bell className="w-5 h-5" />}
        helpText="Control which system events trigger notifications to staff and customers."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ToggleSwitch
            id="notify_on_payment"
            label="Notify on successful payment"
            checked={settings.notifyOnPayment}
            onChange={(checked) => handleSettingChange('notifyOnPayment', checked)}
            helpText="Show notification when a payment is completed successfully."
          />
          
          <ToggleSwitch
            id="notify_on_refund"
            label="Notify on refund"
            checked={settings.notifyOnRefund}
            onChange={(checked) => handleSettingChange('notifyOnRefund', checked)}
            helpText="Alert when a refund is processed."
          />
          
          <ToggleSwitch
            id="notify_low_stock"
            label="Low stock alerts"
            checked={settings.notifyLowStock}
            onChange={(checked) => handleSettingChange('notifyLowStock', checked)}
            helpText="Get alerted when products are running low on inventory."
          />
          
          <ToggleSwitch
            id="notify_new_customer"
            label="New customer registration"
            checked={settings.notifyNewCustomer}
            onChange={(checked) => handleSettingChange('notifyNewCustomer', checked)}
            helpText="Receive notification when a new customer is added."
          />
        </div>
      </SettingsSection>
    </UniversalSettingsTab>
  );
});

NotificationsSettingsTab.displayName = 'NotificationsSettingsTab';

// Wrap with React.memo to prevent unnecessary re-renders
export default React.memo(NotificationsSettingsTab);

