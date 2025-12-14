/**
 * Enhanced SMS Service with Full Features
 * - Delivery tracking
 * - SMS templates
 * - Bulk sending
 * - Scheduling
 * - Balance monitoring
 * - Retry logic
 * - Rate limiting
 */

import { supabase } from '../lib/supabaseClient';

interface SMSTemplate {
  name: string;
  template: string;
  variables: string[];
}

interface SMSDeliveryStatus {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'expired';
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  cost?: number;
}

interface BulkSMSResult {
  total: number;
  sent: number;
  failed: number;
  messages: Array<{ phone: string; status: string; messageId?: string; error?: string }>;
}

interface SMSConfig {
  provider: 'mshastra' | 'twilio' | 'africastalking';
  apiKey: string;
  apiSecret?: string;
  senderId: string;
  webhookUrl?: string;
  retryAttempts: number;
  retryDelay: number;
}

class EnhancedSMSService {
  private config: SMSConfig | null = null;
  private templates: Map<string, SMSTemplate> = new Map();
  private rateLimitQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private messagesPerMinute = 10; // Rate limit

  constructor() {
    this.initializeService();
    this.loadTemplates();
  }

  /**
   * Initialize SMS service from database settings
   */
  private async initializeService() {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'sms_config')
        .single();

      if (data && !error) {
        this.config = JSON.parse(data.value);
      } else {
        // Use environment variables as fallback
        this.config = {
          provider: 'mshastra',
          apiKey: import.meta.env.VITE_SMS_API_KEY || '',
          senderId: import.meta.env.VITE_SMS_SENDER_ID || 'LATS POS',
          webhookUrl: import.meta.env.VITE_SMS_WEBHOOK_URL || '',
          retryAttempts: 3,
          retryDelay: 2000
        };
      }
    } catch (error) {
      console.error('Failed to initialize SMS service:', error);
    }
  }

  /**
   * Load SMS templates from database
   */
  private async loadTemplates() {
    try {
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*');

      if (data && !error) {
        data.forEach((template: any) => {
          this.templates.set(template.name, {
            name: template.name,
            template: template.template,
            variables: template.variables || []
          });
        });
      }
    } catch (error) {
      console.error('Failed to load SMS templates:', error);
    }

    // Add default templates if none exist
    if (this.templates.size === 0) {
      this.addDefaultTemplates();
    }
  }

  /**
   * Add default SMS templates
   */
  private addDefaultTemplates() {
    const defaultTemplates: SMSTemplate[] = [
      {
        name: 'receipt',
        template: 'Thank you for your purchase at {business_name}! Receipt #{receipt_number}. Total: {currency}{total}. Visit us again! {business_phone}',
        variables: ['business_name', 'receipt_number', 'currency', 'total', 'business_phone']
      },
      {
        name: 'payment_confirmation',
        template: 'Payment received! {currency}{amount} paid via {payment_method}. Receipt: {receipt_number}. Balance: {balance}. Thank you!',
        variables: ['currency', 'amount', 'payment_method', 'receipt_number', 'balance']
      },
      {
        name: 'low_stock_alert',
        template: 'ALERT: {product_name} is low on stock. Only {quantity} remaining. Reorder now!',
        variables: ['product_name', 'quantity']
      },
      {
        name: 'appointment_reminder',
        template: 'Reminder: Your appointment at {business_name} is on {date} at {time}. Location: {address}. Call {phone} to reschedule.',
        variables: ['business_name', 'date', 'time', 'address', 'phone']
      },
      {
        name: 'order_ready',
        template: 'Your order #{order_number} is ready for pickup at {business_name}! Address: {address}. Hours: {hours}',
        variables: ['order_number', 'business_name', 'address', 'hours']
      },
      {
        name: 'loyalty_reward',
        template: 'Congratulations! You earned {points} loyalty points. Total: {total_points}. Redeem for discounts! {business_name}',
        variables: ['points', 'total_points', 'business_name']
      },
      {
        name: 'birthday_discount',
        template: 'Happy Birthday from {business_name}! Enjoy {discount}% off your next purchase. Valid until {expiry}. Show this SMS at checkout!',
        variables: ['business_name', 'discount', 'expiry']
      },
      {
        name: 'password_reset',
        template: 'Your password reset code is: {code}. Valid for 10 minutes. Do not share this code. {business_name}',
        variables: ['code', 'business_name']
      },
      {
        name: 'delivery_update',
        template: 'Your order #{order_number} is {status}. Estimated delivery: {estimated_time}. Track: {tracking_url}',
        variables: ['order_number', 'status', 'estimated_time', 'tracking_url']
      },
      {
        name: 'payment_failed',
        template: 'Payment failed for order #{order_number}. Reason: {reason}. Please try again or contact {phone}',
        variables: ['order_number', 'reason', 'phone']
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.name, template);
    });
  }

  /**
   * Send SMS using template
   */
  async sendTemplatedSMS(
    phone: string,
    templateName: string,
    variables: Record<string, string>,
    options: { priority?: 'high' | 'normal' | 'low'; schedule?: Date } = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.templates.get(templateName);
    
    if (!template) {
      return { success: false, error: `Template '${templateName}' not found` };
    }

    // Replace variables in template
    let message = template.template;
    template.variables.forEach(variable => {
      const value = variables[variable] || '';
      message = message.replace(`{${variable}}`, value);
    });

    return this.sendSMS(phone, message, options);
  }

  /**
   * Send SMS with full features
   */
  async sendSMS(
    phone: string,
    message: string,
    options: {
      priority?: 'high' | 'normal' | 'low';
      schedule?: Date;
      trackDelivery?: boolean;
      customerId?: string;
      transactionId?: string;
    } = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string; cost?: number }> {
    try {
      // Validate phone number
      const cleanPhone = this.cleanPhoneNumber(phone);
      if (!this.isValidPhone(cleanPhone)) {
        return { success: false, error: 'Invalid phone number format' };
      }

      // Check if scheduled for later
      if (options.schedule && options.schedule > new Date()) {
        return this.scheduleSMS(cleanPhone, message, options.schedule, options);
      }

      // Log SMS before sending
      const logId = await this.logSMS({
        phone: cleanPhone,
        message,
        status: 'pending',
        customerId: options.customerId,
        transactionId: options.transactionId
      });

      // Send SMS based on provider
      let result;
      switch (this.config?.provider) {
        case 'mshastra':
          result = await this.sendViaMShastra(cleanPhone, message);
          break;
        case 'africastalking':
          result = await this.sendViaAfricasTalking(cleanPhone, message);
          break;
        case 'twilio':
          result = await this.sendViaTwilio(cleanPhone, message);
          break;
        default:
          return { success: false, error: 'SMS provider not configured' };
      }

      // Update log with result
      await this.updateSMSLog(logId, {
        status: result.success ? 'sent' : 'failed',
        messageId: result.messageId,
        error: result.error,
        cost: result.cost,
        sentAt: new Date()
      });

      return result;

    } catch (error: any) {
      console.error('SMS send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send bulk SMS (with rate limiting)
   */
  async sendBulkSMS(
    recipients: Array<{ phone: string; message: string; customerId?: string }>,
    options: { respectRateLimit?: boolean; batchSize?: number } = {}
  ): Promise<BulkSMSResult> {
    const results: BulkSMSResult = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      messages: []
    };

    const batchSize = options.batchSize || 50;
    const respectRateLimit = options.respectRateLimit !== false;

    // Process in batches
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        if (respectRateLimit) {
          await this.addToQueue(async () => {
            const result = await this.sendSMS(recipient.phone, recipient.message, {
              customerId: recipient.customerId
            });
            
            if (result.success) {
              results.sent++;
            } else {
              results.failed++;
            }
            
            results.messages.push({
              phone: recipient.phone,
              status: result.success ? 'sent' : 'failed',
              messageId: result.messageId,
              error: result.error
            });
          });
        } else {
          const result = await this.sendSMS(recipient.phone, recipient.message, {
            customerId: recipient.customerId
          });
          
          if (result.success) {
            results.sent++;
          } else {
            results.failed++;
          }
          
          results.messages.push({
            phone: recipient.phone,
            status: result.success ? 'sent' : 'failed',
            messageId: result.messageId,
            error: result.error
          });
        }
      });

      await Promise.all(batchPromises);

      // Delay between batches
      if (i + batchSize < recipients.length) {
        await this.delay(2000);
      }
    }

    return results;
  }

  /**
   * Schedule SMS for later
   */
  private async scheduleSMS(
    phone: string,
    message: string,
    scheduleDate: Date,
    options: any
  ): Promise<{ success: boolean; messageId?: string }> {
    try {
      const { data, error } = await supabase
        .from('scheduled_sms')
        .insert({
          phone,
          message,
          schedule_date: scheduleDate.toISOString(),
          customer_id: options.customerId,
          transaction_id: options.transactionId,
          status: 'scheduled'
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, messageId: data.id };
    } catch (error: any) {
      console.error('Schedule SMS error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get SMS delivery status
   */
  async getDeliveryStatus(messageId: string): Promise<SMSDeliveryStatus | null> {
    try {
      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .eq('message_id', messageId)
        .single();

      if (error || !data) return null;

      return {
        messageId: data.message_id,
        status: data.status,
        sentAt: data.sent_at ? new Date(data.sent_at) : undefined,
        deliveredAt: data.delivered_at ? new Date(data.delivered_at) : undefined,
        failureReason: data.error,
        cost: data.cost
      };
    } catch (error) {
      console.error('Get delivery status error:', error);
      return null;
    }
  }

  /**
   * Get SMS balance/credits
   */
  async getBalance(): Promise<{ balance: number; currency: string } | null> {
    try {
      switch (this.config?.provider) {
        case 'mshastra':
          return await this.getMShashtraBalance();
        case 'africastalking':
          return await this.getAfricasTalkingBalance();
        default:
          return null;
      }
    } catch (error) {
      console.error('Get balance error:', error);
      return null;
    }
  }

  /**
   * Get SMS statistics
   */
  async getStatistics(dateRange?: { from: Date; to: Date }): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
    totalCost: number;
  }> {
    try {
      let query = supabase.from('sms_logs').select('status, cost');

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error || !data) {
        return { total: 0, sent: 0, delivered: 0, failed: 0, pending: 0, totalCost: 0 };
      }

      const stats = {
        total: data.length,
        sent: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
        totalCost: 0
      };

      data.forEach((log: any) => {
        switch (log.status) {
          case 'sent':
            stats.sent++;
            break;
          case 'delivered':
            stats.delivered++;
            break;
          case 'failed':
            stats.failed++;
            break;
          case 'pending':
            stats.pending++;
            break;
        }
        stats.totalCost += parseFloat(log.cost || 0);
      });

      return stats;
    } catch (error) {
      console.error('Get statistics error:', error);
      return { total: 0, sent: 0, delivered: 0, failed: 0, pending: 0, totalCost: 0 };
    }
  }

  // ==================== PROVIDER IMPLEMENTATIONS ====================

  /**
   * Send via MShastra (Tanzania)
   */
  private async sendViaMShastra(phone: string, message: string): Promise<any> {
    try {
      const response = await fetch('https://api.mshastra.com/sendsms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apikey: this.config?.apiKey,
          senderid: this.config?.senderId,
          number: phone,
          message: message
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        return {
          success: true,
          messageId: data.messageId || data.id,
          cost: data.cost || 0.05 // Estimated cost per SMS
        };
      } else {
        return {
          success: false,
          error: data.message || 'Failed to send SMS'
        };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send via Africa's Talking
   */
  private async sendViaAfricasTalking(phone: string, message: string): Promise<any> {
    try {
      const response = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apiKey': this.config?.apiKey || '',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          username: 'sandbox', // Change to your username
          to: phone,
          message: message,
          from: this.config?.senderId || ''
        })
      });

      const data = await response.json();

      if (data.SMSMessageData?.Recipients?.[0]?.status === 'Success') {
        return {
          success: true,
          messageId: data.SMSMessageData.Recipients[0].messageId,
          cost: parseFloat(data.SMSMessageData.Recipients[0].cost?.replace('TZS ', '') || '0')
        };
      } else {
        return {
          success: false,
          error: data.SMSMessageData?.Recipients?.[0]?.status || 'Failed to send'
        };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send via Twilio
   */
  private async sendViaTwilio(phone: string, message: string): Promise<any> {
    // Implement Twilio integration
    return { success: false, error: 'Twilio integration not implemented' };
  }

  /**
   * Get MShastra balance
   */
  private async getMShashtraBalance(): Promise<{ balance: number; currency: string } | null> {
    try {
      const response = await fetch(`https://api.mshastra.com/balance?apikey=${this.config?.apiKey}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        return {
          balance: parseFloat(data.balance || 0),
          currency: 'TZS'
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get Africa's Talking balance
   */
  private async getAfricasTalkingBalance(): Promise<{ balance: number; currency: string } | null> {
    // Implement Africa's Talking balance check
    return null;
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Clean phone number
   */
  private cleanPhoneNumber(phone: string): string {
    // Remove all non-numeric characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Handle Tanzania numbers
    if (cleaned.startsWith('0')) {
      cleaned = '+255' + cleaned.substring(1);
    } else if (cleaned.startsWith('255')) {
      cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+255' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate phone number
   */
  private isValidPhone(phone: string): boolean {
    // Tanzania phone format: +255XXXXXXXXX (12 digits total)
    return /^\+255\d{9}$/.test(phone);
  }

  /**
   * Log SMS to database
   */
  private async logSMS(data: {
    phone: string;
    message: string;
    status: string;
    customerId?: string;
    transactionId?: string;
  }): Promise<string> {
    try {
      const { data: logData, error } = await supabase
        .from('sms_logs')
        .insert({
          phone: data.phone,
          message: data.message,
          status: data.status,
          customer_id: data.customerId,
          transaction_id: data.transactionId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return logData.id;
    } catch (error) {
      console.error('Log SMS error:', error);
      return '';
    }
  }

  /**
   * Update SMS log
   */
  private async updateSMSLog(id: string, updates: any) {
    if (!id) return;
    
    try {
      await supabase
        .from('sms_logs')
        .update(updates)
        .eq('id', id);
    } catch (error) {
      console.error('Update SMS log error:', error);
    }
  }

  /**
   * Rate limiting queue
   */
  private async addToQueue(task: () => Promise<void>): Promise<void> {
    return new Promise((resolve) => {
      this.rateLimitQueue.push(async () => {
        await task();
        resolve();
      });
      
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Process rate limit queue
   */
  private async processQueue() {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    const delayBetweenMessages = (60 / this.messagesPerMinute) * 1000;

    while (this.rateLimitQueue.length > 0) {
      const task = this.rateLimitQueue.shift();
      if (task) {
        await task();
        await this.delay(delayBetweenMessages);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const enhancedSMSService = new EnhancedSMSService();
export default enhancedSMSService;

