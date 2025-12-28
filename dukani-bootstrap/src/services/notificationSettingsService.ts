// Notification Settings Service - Access notification settings from anywhere in the app
import { smsService } from './smsService';
import toast from 'react-hot-toast';
import { format } from '../features/lats/lib/format';
import { formatContactForMessage } from '../utils/formatPhoneForInvoice';

export interface NotificationSettings {
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

export interface InvoiceData {
  invoice_no: string;
  business_name: string;
  business_phone: string;
  business_logo?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  paid: number;
  balance: number;
  date: string;
  payment_method?: string;
}

class NotificationSettingsService {
  private readonly STORAGE_KEY = 'lats-pos-notifications';

  /**
   * Get notification settings from localStorage
   */
  getSettings(): NotificationSettings {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }

    // Return default settings if none exist
    return this.getDefaultSettings();
  }

  /**
   * Get default notification settings
   */
  getDefaultSettings(): NotificationSettings {
    return {
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
  }

  /**
   * Save notification settings to localStorage
   */
  saveSettings(settings: NotificationSettings): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
      throw error;
    }
  }

  /**
   * Generate WhatsApp message from invoice data
   */
  generateWhatsAppMessage(invoice: InvoiceData, settings: NotificationSettings): string {
    let message = settings.whatsappMessage + '\n\n';
    message += `📄 Invoice: ${invoice.invoice_no}\n`;
    message += `📅 Date: ${invoice.date}\n`;
    message += `👤 Customer: ${invoice.customer_name}\n\n`;
    
    if (settings.whatsappIncludeItems && invoice.items.length > 0) {
      message += '🛒 Items:\n';
      invoice.items.forEach(item => {
        message += `  • ${item.name} x${item.quantity} - ${format.money(item.price)}\n`;
      });
      message += '\n';
    }
    
    if (invoice.discount && invoice.discount > 0) {
      message += `💵 Subtotal: ${format.money(invoice.subtotal)}\n`;
      message += `🎁 Discount: -${format.money(invoice.discount)}\n`;
    }
    
    if (invoice.tax && invoice.tax > 0) {
      message += `📊 Tax: ${format.money(invoice.tax)}\n`;
    }
    
    message += `💰 Total: ${format.money(invoice.total)}\n`;
    message += `✅ Paid: ${format.money(invoice.paid)}\n`;
    
    if (invoice.balance > 0) {
      message += `📊 Balance: ${format.money(invoice.balance)}\n`;
    }
    
    if (invoice.payment_method) {
      message += `💳 Payment: ${invoice.payment_method}\n`;
    }
    
    // Format contact phone numbers properly
    const formattedContact = formatContactForMessage(invoice.business_phone);
    
    if (formattedContact) {
      message += `\n📞 Contact: ${formattedContact}\n`;
    }
    
    message += `\nThank you for your business! 🙏`;
    
    return message;
  }

  /**
   * Generate SMS message from invoice data
   */
  generateSMSMessage(invoice: InvoiceData, settings: NotificationSettings): string {
    let message = settings.smsTemplate;
    
    // Replace variables
    message = message.replace('{total}', format.money(invoice.total));
    message = message.replace('{balance}', format.money(invoice.balance));
    message = message.replace('{paid}', format.money(invoice.paid));
    message = message.replace('{invoice_no}', invoice.invoice_no);
    message = message.replace('{business_name}', invoice.business_name);
    message = message.replace('{customer_name}', invoice.customer_name);
    message = message.replace('{date}', invoice.date);
    // Format business phone number properly
    const formattedBusinessPhone = formatContactForMessage(invoice.business_phone);
    message = message.replace('{business_phone}', formattedBusinessPhone || invoice.business_phone);
    
    return message;
  }

  /**
   * Send invoice via WhatsApp
   */
  async sendWhatsAppInvoice(invoice: InvoiceData): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = this.getSettings();
      
      if (!settings.whatsappEnabled) {
        return { success: false, error: 'WhatsApp notifications are disabled in settings' };
      }

      if (!invoice.customer_phone) {
        return { success: false, error: 'Customer phone number is required' };
      }

      const message = this.generateWhatsAppMessage(invoice, settings);
      
      console.log('📱 Sending WhatsApp invoice:', {
        to: invoice.customer_phone,
        invoice_no: invoice.invoice_no
      });

      // Dynamically import whatsappService to avoid circular dependencies
      const { default: whatsappService } = await import('./whatsappService');
      const result = await whatsappService.sendMessage(invoice.customer_phone, message);

      if (result.success) {
        toast.success('WhatsApp invoice sent successfully! ✅');
      } else {
        toast.error(`WhatsApp failed: ${result.error}`);
      }

      return result;
    } catch (error: any) {
      console.error('Error sending WhatsApp invoice:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send invoice via SMS
   */
  async sendSMSInvoice(invoice: InvoiceData): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = this.getSettings();
      
      if (!settings.smsEnabled) {
        return { success: false, error: 'SMS notifications are disabled in settings' };
      }

      if (!invoice.customer_phone) {
        return { success: false, error: 'Customer phone number is required' };
      }

      const message = this.generateSMSMessage(invoice, settings);
      
      console.log('📱 Sending SMS invoice:', {
        to: invoice.customer_phone,
        invoice_no: invoice.invoice_no
      });

      const result = await smsService.sendSMS(invoice.customer_phone, message);

      if (result.success) {
        toast.success('SMS invoice sent successfully! ✅');
      }

      return result;
    } catch (error: any) {
      console.error('Error sending SMS invoice:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send invoice via email
   */
  async sendEmailInvoice(invoice: InvoiceData): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = this.getSettings();
      
      if (!settings.emailEnabled) {
        return { success: false, error: 'Email notifications are disabled in settings' };
      }

      if (!invoice.customer_email) {
        return { success: false, error: 'Customer email is required' };
      }

      // TODO: Implement email sending
      console.log('📧 Email invoice not yet implemented:', {
        to: invoice.customer_email,
        invoice_no: invoice.invoice_no
      });

      toast('Email sending coming soon! 📧', { icon: 'ℹ️' });
      
      return { success: false, error: 'Email sending not yet implemented' };
    } catch (error: any) {
      console.error('Error sending email invoice:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Smart send invoice: Try WhatsApp first, fall back to SMS if number not on WhatsApp
   * This is the recommended method for automatic sending
   */
  async smartSendInvoice(invoice: InvoiceData): Promise<{
    success: boolean;
    method: 'whatsapp' | 'sms' | 'none';
    whatsapp?: { success: boolean; error?: string };
    sms?: { success: boolean; error?: string };
    error?: string;
  }> {
    try {
      const { smartNotificationService } = await import('./smartNotificationService');
      const result = await smartNotificationService.sendInvoice(invoice);
      
      return {
        success: result.success,
        method: result.method,
        whatsapp: result.whatsappResult,
        sms: result.smsResult,
        error: result.error
      };
    } catch (error: any) {
      console.error('Error in smart send invoice:', error);
      return {
        success: false,
        method: 'none',
        error: error.message
      };
    }
  }

  /**
   * Auto-send invoice based on settings
   * Uses smart routing: WhatsApp first, SMS fallback if not on WhatsApp
   * This should be called after a successful payment
   */
  async autoSendInvoice(invoice: InvoiceData): Promise<{
    whatsapp?: { success: boolean; error?: string };
    sms?: { success: boolean; error?: string };
    email?: { success: boolean; error?: string };
  }> {
    const settings = this.getSettings();
    const results: any = {};

    // Check if any auto-send is enabled
    const shouldAutoSend = (settings.whatsappEnabled && settings.whatsappAutoSend) || 
                          (settings.smsEnabled && settings.smsAutoSend);
    
    if (!shouldAutoSend) {
      return results;
    }

    // Use smart sending: WhatsApp first, SMS fallback
    console.log('📱 Auto-sending invoice using smart routing (WhatsApp first, SMS fallback)...');
    const smartResult = await this.smartSendInvoice(invoice);
    
    if (smartResult.success) {
      if (smartResult.method === 'whatsapp') {
        results.whatsapp = smartResult.whatsapp || { success: true };
      } else if (smartResult.method === 'sms') {
        results.sms = smartResult.sms || { success: true };
      }
    } else {
      // If smart send failed, record the error
      if (smartResult.whatsapp) {
        results.whatsapp = smartResult.whatsapp;
      }
      if (smartResult.sms) {
        results.sms = smartResult.sms;
      }
    }

    // Send Email if auto-send is enabled (independent of WhatsApp/SMS)
    if (settings.emailEnabled && settings.emailAutoSend) {
      console.log('📧 Auto-sending Email invoice...');
      results.email = await this.sendEmailInvoice(invoice);
    }

    return results;
  }

  /**
   * Check if any auto-send is enabled
   */
  hasAutoSendEnabled(): boolean {
    const settings = this.getSettings();
    return (
      (settings.whatsappEnabled && settings.whatsappAutoSend) ||
      (settings.smsEnabled && settings.smsAutoSend) ||
      (settings.emailEnabled && settings.emailAutoSend)
    );
  }

  /**
   * Check if manual sending is available
   */
  hasManualSendEnabled(): boolean {
    const settings = this.getSettings();
    return (
      (settings.whatsappEnabled && !settings.whatsappAutoSend) ||
      (settings.smsEnabled && !settings.smsAutoSend) ||
      (settings.emailEnabled && !settings.emailAutoSend)
    );
  }
}

// Export singleton instance
export const notificationSettingsService = new NotificationSettingsService();

// Export class for testing
export default NotificationSettingsService;

