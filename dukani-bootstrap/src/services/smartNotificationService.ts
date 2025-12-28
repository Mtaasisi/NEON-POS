// Smart Notification Service - Tries WhatsApp first, falls back to SMS
// This service intelligently routes notifications: WhatsApp if available, SMS as fallback

import whatsappService from './whatsappService';
import { smsService } from './smsService';
import { notificationSettingsService, InvoiceData } from './notificationSettingsService';
import toast from 'react-hot-toast';

export interface SmartNotificationOptions {
  skipWhatsAppCheck?: boolean; // Skip the WhatsApp existence check (faster but less accurate)
  forceSMS?: boolean; // Force SMS even if WhatsApp exists
  forceWhatsApp?: boolean; // Force WhatsApp even if not on WhatsApp
}

export interface SmartNotificationResult {
  success: boolean;
  method: 'whatsapp' | 'sms' | 'none';
  whatsappResult?: { success: boolean; error?: string };
  smsResult?: { success: boolean; error?: string };
  error?: string;
}

class SmartNotificationService {
  /**
   * Send notification intelligently: Try WhatsApp first, fall back to SMS
   * 
   * @param phone - Customer phone number
   * @param message - Message to send
   * @param options - Optional configuration
   * @returns Result indicating which method succeeded
   */
  async sendNotification(
    phone: string,
    message: string,
    options: SmartNotificationOptions = {}
  ): Promise<SmartNotificationResult> {
    try {
      // Validate phone number
      if (!phone || !phone.trim()) {
        return {
          success: false,
          method: 'none',
          error: 'Phone number is required'
        };
      }

      // Force SMS if requested
      if (options.forceSMS) {
        return await this.sendSMSOnly(phone, message);
      }

      // Check if WhatsApp is configured and enabled
      const { notificationSettingsService } = await import('./notificationSettingsService');
      const settings = notificationSettingsService.getSettings();
      
      if (!settings.whatsappEnabled && !options.forceWhatsApp) {
        // WhatsApp not enabled - go straight to SMS
        console.log('📱 WhatsApp not enabled, sending SMS directly');
        return await this.sendSMSOnly(phone, message);
      }

      // Try WhatsApp first
      let whatsappExists = false;
      
      // Check if number is on WhatsApp (unless skipped)
      if (!options.skipWhatsAppCheck && !options.forceWhatsApp) {
        const checkResult = await whatsappService.isOnWhatsApp(phone);
        
        if (checkResult.error && !checkResult.error.includes('not configured')) {
          // If check failed but it's not a config error, try anyway
          console.log('⚠️ WhatsApp check failed, will try WhatsApp anyway:', checkResult.error);
        }
        
        whatsappExists = checkResult.exists;
        
        if (!whatsappExists) {
          console.log(`📱 WhatsApp check says ${phone} is NOT on WhatsApp`);
          console.log('💡 Will try WhatsApp anyway - the actual send attempt is more reliable than the check');
          // Continue to try WhatsApp - don't return early
        } else {
          console.log(`✅ WhatsApp check confirms ${phone} IS on WhatsApp`);
        }
      }

      // Number is on WhatsApp (or we're skipping check) - try sending WhatsApp
      const whatsappResult = await whatsappService.sendMessage(phone, message);
      
      if (whatsappResult.success) {
        console.log('✅ WhatsApp sent successfully');
        return {
          success: true,
          method: 'whatsapp',
          whatsappResult
        };
      }

      // WhatsApp failed - check if it's because number doesn't exist
      const isNotOnWhatsApp = whatsappResult.error && (
        whatsappResult.error.includes('not_on_whatsapp') ||
        whatsappResult.error.includes('JID does not exist') ||
        whatsappResult.error.includes('Not on WhatsApp')
      );

      if (isNotOnWhatsApp) {
        console.log('📱 Number not on WhatsApp (send failed), falling back to SMS');
        return await this.sendSMSOnly(phone, message);
      }

      // WhatsApp failed for other reason (rate limit, config, etc.) - still try SMS
      console.log('⚠️ WhatsApp failed, falling back to SMS:', whatsappResult.error);
      const smsResult = await this.sendSMSOnly(phone, message);
      
      return {
        success: smsResult.success,
        method: smsResult.success ? 'sms' : 'none',
        whatsappResult,
        smsResult,
        error: smsResult.success ? undefined : `WhatsApp failed: ${whatsappResult.error}; SMS also failed: ${smsResult.error}`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Smart notification error:', errorMessage);
      
      // Last resort: try SMS
      try {
        const smsResult = await this.sendSMSOnly(phone, message);
        return {
          success: smsResult.success,
          method: smsResult.success ? 'sms' : 'none',
          smsResult,
          error: smsResult.success ? undefined : errorMessage
        };
      } catch (smsError) {
        return {
          success: false,
          method: 'none',
          error: errorMessage
        };
      }
    }
  }

  /**
   * Send invoice/receipt intelligently: Try WhatsApp first, fall back to SMS
   * 
   * @param invoice - Invoice data to send
   * @param options - Optional configuration
   * @returns Result indicating which method succeeded
   */
  async sendInvoice(
    invoice: InvoiceData,
    options: SmartNotificationOptions = {}
  ): Promise<SmartNotificationResult> {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 [DEBUG] SMART NOTIFICATION - INVOICE SENDING');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 [DEBUG] Invoice Details:', {
      invoice_no: invoice.invoice_no,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
      total: invoice.total,
      items_count: invoice.items.length,
      business_name: invoice.business_name
    });
    console.log('⚙️ [DEBUG] Options:', options);
    
    try {
      if (!invoice.customer_phone) {
        console.error('❌ [DEBUG] Error: Customer phone number is required');
        return {
          success: false,
          method: 'none',
          error: 'Customer phone number is required'
        };
      }

      console.log(`✅ [DEBUG] Customer phone number provided: ${invoice.customer_phone}`);

      // Force SMS if requested
      if (options.forceSMS) {
        const result = await notificationSettingsService.sendSMSInvoice(invoice);
        return {
          success: result.success,
          method: result.success ? 'sms' : 'none',
          smsResult: result,
          error: result.error
        };
      }

      // Check notification settings
      const settings = notificationSettingsService.getSettings();
      
      // Check if number is on WhatsApp (unless skipped)
      let whatsappExists = false;
      
      if (!options.skipWhatsAppCheck && !options.forceWhatsApp && settings.whatsappEnabled) {
        const checkResult = await whatsappService.isOnWhatsApp(invoice.customer_phone);
        
        if (checkResult.error && !checkResult.error.includes('not configured')) {
          console.log('⚠️ WhatsApp check failed, will try anyway:', checkResult.error);
        }
        
        whatsappExists = checkResult.exists;
        
        if (!whatsappExists) {
          console.log(`📱 WhatsApp check says ${invoice.customer_phone} is NOT on WhatsApp`);
          console.log('💡 Will try WhatsApp anyway - the actual send attempt is more reliable than the check');
          // Continue to try WhatsApp - don't return early
        } else {
          console.log(`✅ WhatsApp check confirms ${invoice.customer_phone} IS on WhatsApp`);
        }
      }

      // Always try WhatsApp invoice first (even if check said no)
      // The actual send attempt is more reliable than the pre-check
      if (settings.whatsappEnabled || options.forceWhatsApp) {
        console.log(`📱 Attempting to send WhatsApp invoice to ${invoice.customer_phone}...`);
        const whatsappResult = await notificationSettingsService.sendWhatsAppInvoice(invoice);
        
        if (whatsappResult.success) {
          console.log('✅ WhatsApp invoice sent successfully');
          return {
            success: true,
            method: 'whatsapp',
            whatsappResult
          };
        }

        // Check if WhatsApp failed because number doesn't exist
        const isNotOnWhatsApp = whatsappResult.error && (
          whatsappResult.error.includes('not_on_whatsapp') ||
          whatsappResult.error.includes('JID does not exist') ||
          whatsappResult.error.includes('Not on WhatsApp')
        );

        if (isNotOnWhatsApp) {
          console.log('─────────────────────────────────────────────────────');
          console.log('📱 [DEBUG] WHATSAPP SEND FAILED - Number not on WhatsApp');
          console.log('─────────────────────────────────────────────────────');
          console.log(`❌ [DEBUG] Error: ${whatsappResult.error}`);
          console.log(`📞 [DEBUG] Phone: ${invoice.customer_phone}`);
          console.log('📱 [DEBUG] Falling back to SMS invoice...');
          
          const smsStartTime = Date.now();
          const result = await notificationSettingsService.sendSMSInvoice(invoice);
          const smsDuration = Date.now() - smsStartTime;
          
          console.log(`⏱️ [DEBUG] SMS send completed in ${smsDuration}ms`);
          console.log('🔍 [DEBUG] SMS result:', {
            success: result.success,
            error: result.error,
            duration_ms: smsDuration
          });
          
          if (result.success) {
            console.log('═══════════════════════════════════════════════════════');
            console.log('✅ [SUCCESS] Customer will receive SMS receipt (WhatsApp not available)');
            console.log('═══════════════════════════════════════════════════════');
          }
          
          return {
            success: result.success,
            method: result.success ? 'sms' : 'none',
            whatsappResult,
            smsResult: result,
            error: result.error
          };
        } else {
          console.warn(`⚠️ [DEBUG] WhatsApp failed for other reason: ${whatsappResult.error}`);
        }
      }

      // WhatsApp not enabled or failed - try SMS
      if (settings.smsEnabled) {
        console.log('─────────────────────────────────────────────────────');
        console.log('📱 [DEBUG] FALLING BACK TO SMS');
        console.log('─────────────────────────────────────────────────────');
        console.log(`📞 [DEBUG] Phone: ${invoice.customer_phone}`);
        console.log(`📄 [DEBUG] Invoice: ${invoice.invoice_no}`);
        console.log('⚠️ [DEBUG] Reason: WhatsApp unavailable or failed');
        
        const smsStartTime = Date.now();
        console.log('📱 [DEBUG] Starting SMS send...');
        const result = await notificationSettingsService.sendSMSInvoice(invoice);
        const smsDuration = Date.now() - smsStartTime;
        
        console.log(`⏱️ [DEBUG] SMS send completed in ${smsDuration}ms`);
        console.log('🔍 [DEBUG] SMS result:', {
          success: result.success,
          error: result.error,
          duration_ms: smsDuration
        });
        return {
          success: result.success,
          method: result.success ? 'sms' : 'none',
          whatsappResult: settings.whatsappEnabled ? { success: false, error: 'WhatsApp not enabled or failed' } : undefined,
          smsResult: result,
          error: result.error
        };
      }

      // Both failed or disabled
      return {
        success: false,
        method: 'none',
        error: 'Both WhatsApp and SMS are disabled or unavailable'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Smart invoice sending error:', errorMessage);
      
      return {
        success: false,
        method: 'none',
        error: errorMessage
      };
    }
  }

  /**
   * Send SMS only (fallback method)
   */
  private async sendSMSOnly(
    phone: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await smsService.sendSMS(phone, message);
      
      if (result.success) {
        console.log('✅ SMS sent successfully');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'SMS sending failed';
      console.error('❌ SMS send error:', errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Check if a phone number is on WhatsApp (utility method)
   */
  async checkWhatsAppStatus(phone: string): Promise<{ exists: boolean; error?: string }> {
    return await whatsappService.isOnWhatsApp(phone);
  }
}

// Export singleton instance
export const smartNotificationService = new SmartNotificationService();
export default smartNotificationService;
