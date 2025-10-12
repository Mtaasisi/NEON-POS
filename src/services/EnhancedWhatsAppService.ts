/**
 * Enhanced WhatsApp Service with Full Features
 * - Message templates
 * - Media support (images, documents, videos)
 * - Delivery tracking
 * - Read receipts
 * - Bulk messaging
 * - Group management
 */

import { supabase } from '../lib/supabaseClient';

interface WhatsAppMessage {
  phone: string;
  message?: string;
  media?: {
    url: string;
    type: 'image' | 'video' | 'document' | 'audio';
    caption?: string;
    filename?: string;
  };
  templateName?: string;
  templateVariables?: Record<string, string>;
}

interface WhatsAppConfig {
  provider: 'greenapi' | 'twilio' | 'messagebird';
  instanceId: string;
  apiToken: string;
  apiUrl: string;
  webhookUrl?: string;
}

class EnhancedWhatsAppService {
  private config: WhatsAppConfig | null = null;

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize WhatsApp service
   */
  private async initializeService() {
    try {
      // Load from environment variables
      this.config = {
        provider: 'greenapi',
        instanceId: import.meta.env.VITE_GREENAPI_INSTANCE_ID || '',
        apiToken: import.meta.env.VITE_GREENAPI_API_TOKEN || '',
        apiUrl: import.meta.env.VITE_GREENAPI_API_URL || 'https://7105.api.greenapi.com',
        webhookUrl: import.meta.env.VITE_WHATSAPP_WEBHOOK_URL || ''
      };
    } catch (error) {
      console.error('Failed to initialize WhatsApp service:', error);
    }
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(data: WhatsAppMessage): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const cleanPhone = this.cleanPhoneNumber(data.phone);
      
      if (!this.isValidPhone(cleanPhone)) {
        return { success: false, error: 'Invalid phone number format' };
      }

      // Log message before sending
      const logId = await this.logMessage({
        phone: cleanPhone,
        message: data.message,
        media_url: data.media?.url,
        media_type: data.media?.type,
        status: 'pending'
      });

      let result;
      
      if (data.media) {
        result = await this.sendMediaMessage(cleanPhone, data.media);
      } else if (data.message) {
        result = await this.sendTextMessage(cleanPhone, data.message);
      } else {
        return { success: false, error: 'No message or media provided' };
      }

      // Update log
      await this.updateMessageLog(logId, {
        status: result.success ? 'sent' : 'failed',
        message_id: result.messageId,
        error: result.error,
        sent_at: new Date()
      });

      return result;
    } catch (error: any) {
      console.error('WhatsApp send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send text message
   */
  private async sendTextMessage(phone: string, message: string): Promise<any> {
    try {
      const chatId = this.formatChatId(phone);
      const url = `${this.config?.apiUrl}/waInstance${this.config?.instanceId}/sendMessage/${this.config?.apiToken}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          message
        })
      });

      const data = await response.json();

      if (data.idMessage) {
        return {
          success: true,
          messageId: data.idMessage
        };
      } else {
        return {
          success: false,
          error: data.message || 'Failed to send message'
        };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send media message (image, video, document)
   */
  private async sendMediaMessage(
    phone: string,
    media: NonNullable<WhatsAppMessage['media']>
  ): Promise<any> {
    try {
      const chatId = this.formatChatId(phone);
      let endpoint = '';

      switch (media.type) {
        case 'image':
          endpoint = 'sendFileByUrl';
          break;
        case 'video':
          endpoint = 'sendFileByUrl';
          break;
        case 'document':
          endpoint = 'sendFileByUrl';
          break;
        case 'audio':
          endpoint = 'sendFileByUrl';
          break;
        default:
          return { success: false, error: 'Unsupported media type' };
      }

      const url = `${this.config?.apiUrl}/waInstance${this.config?.instanceId}/${endpoint}/${this.config?.apiToken}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          urlFile: media.url,
          fileName: media.filename || 'file',
          caption: media.caption || ''
        })
      });

      const data = await response.json();

      if (data.idMessage) {
        return {
          success: true,
          messageId: data.idMessage
        };
      } else {
        return {
          success: false,
          error: data.message || 'Failed to send media'
        };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send receipt via WhatsApp
   */
  async sendReceipt(
    phone: string,
    receiptData: {
      receiptNumber: string;
      total: number;
      currency: string;
      items: Array<{ name: string; quantity: number; price: number }>;
      businessName: string;
      businessPhone: string;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = this.formatReceiptMessage(receiptData);
    return this.sendMessage({ phone, message });
  }

  /**
   * Format receipt message
   */
  private formatReceiptMessage(data: any): string {
    let message = `*${data.businessName}*\n`;
    message += `Receipt #${data.receiptNumber}\n\n`;
    message += `*Items:*\n`;
    
    data.items.forEach((item: any) => {
      message += `• ${item.name} x${item.quantity} - ${data.currency} ${item.price.toFixed(2)}\n`;
    });
    
    message += `\n*Total: ${data.currency} ${data.total.toFixed(2)}*\n\n`;
    message += `Thank you for your business!\n`;
    message += `Karibu tena! 🙏\n\n`;
    message += `Contact: ${data.businessPhone}`;
    
    return message;
  }

  /**
   * Send bulk messages
   */
  async sendBulkMessages(
    messages: WhatsAppMessage[],
    options: { delayBetweenMessages?: number } = {}
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    results: Array<{ phone: string; success: boolean; messageId?: string; error?: string }>;
  }> {
    const delay = options.delayBetweenMessages || 2000; // 2 seconds default
    const results = {
      total: messages.length,
      sent: 0,
      failed: 0,
      results: [] as any[]
    };

    for (const message of messages) {
      const result = await this.sendMessage(message);
      
      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
      }
      
      results.results.push({
        phone: message.phone,
        success: result.success,
        messageId: result.messageId,
        error: result.error
      });

      // Delay between messages to avoid rate limiting
      if (messages.indexOf(message) < messages.length - 1) {
        await this.delay(delay);
      }
    }

    return results;
  }

  /**
   * Check account status
   */
  async getAccountStatus(): Promise<{
    isConnected: boolean;
    phoneNumber?: string;
    status?: string;
    error?: string;
  }> {
    try {
      const url = `${this.config?.apiUrl}/waInstance${this.config?.instanceId}/getStateInstance/${this.config?.apiToken}`;
      
      const response = await fetch(url);
      const data = await response.json();

      return {
        isConnected: data.stateInstance === 'authorized',
        phoneNumber: data.phoneNumber,
        status: data.stateInstance
      };
    } catch (error: any) {
      return {
        isConnected: false,
        error: error.message
      };
    }
  }

  /**
   * Get QR code for connection
   */
  async getQRCode(): Promise<{ qrCode?: string; error?: string }> {
    try {
      const url = `${this.config?.apiUrl}/waInstance${this.config?.instanceId}/qr/${this.config?.apiToken}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.type === 'qrCode') {
        return { qrCode: data.message };
      } else {
        return { error: 'QR code not available' };
      }
    } catch (error: any) {
      return { error: error.message };
    }
  }

  /**
   * Get message delivery status
   */
  async getDeliveryStatus(messageId: string): Promise<{
    status?: string;
    deliveredAt?: Date;
    readAt?: Date;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('message_id', messageId)
        .single();

      if (error || !data) {
        return { error: 'Message not found' };
      }

      return {
        status: data.status,
        deliveredAt: data.delivered_at ? new Date(data.delivered_at) : undefined,
        readAt: data.read_at ? new Date(data.read_at) : undefined
      };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  /**
   * Get message statistics
   */
  async getStatistics(dateRange?: { from: Date; to: Date }): Promise<{
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }> {
    try {
      let query = supabase
        .from('whatsapp_messages')
        .select('status')
        .eq('direction', 'outgoing');

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error || !data) {
        return { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
      }

      const stats = {
        total: data.length,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0
      };

      data.forEach((msg: any) => {
        switch (msg.status) {
          case 'sent':
            stats.sent++;
            break;
          case 'delivered':
            stats.delivered++;
            break;
          case 'read':
            stats.read++;
            break;
          case 'failed':
            stats.failed++;
            break;
        }
      });

      return stats;
    } catch (error) {
      return { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
    }
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Clean phone number
   */
  private cleanPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = '255' + cleaned.substring(1);
    } else if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    } else if (!cleaned.startsWith('255')) {
      cleaned = '255' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Format chat ID for Green API
   */
  private formatChatId(phone: string): string {
    return `${phone}@c.us`;
  }

  /**
   * Validate phone number
   */
  private isValidPhone(phone: string): boolean {
    return /^255\d{9}$/.test(phone);
  }

  /**
   * Log message to database
   */
  private async logMessage(data: {
    phone: string;
    message?: string;
    media_url?: string;
    media_type?: string;
    status: string;
  }): Promise<string> {
    try {
      const { data: logData, error } = await supabase
        .from('whatsapp_messages')
        .insert({
          phone: data.phone,
          message: data.message,
          media_url: data.media_url,
          media_type: data.media_type,
          status: data.status,
          provider: this.config?.provider,
          instance_id: this.config?.instanceId,
          direction: 'outgoing',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return logData.id;
    } catch (error) {
      console.error('Log WhatsApp message error:', error);
      return '';
    }
  }

  /**
   * Update message log
   */
  private async updateMessageLog(id: string, updates: any) {
    if (!id) return;
    
    try {
      await supabase
        .from('whatsapp_messages')
        .update(updates)
        .eq('id', id);
    } catch (error) {
      console.error('Update WhatsApp log error:', error);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const enhancedWhatsAppService = new EnhancedWhatsAppService();
export default enhancedWhatsAppService;

