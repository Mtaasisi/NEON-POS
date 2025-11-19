import { whatsappProxyApi } from '../lib/whatsappProxyApi';
import { toast } from 'react-hot-toast';
import { getCredentials, updateIntegrationUsage } from '../lib/integrationsApi';

// Interface for instance status response
export interface InstanceStatus {
  authorized: boolean;
  state: string;
  error?: string;
}

// Interface for send message response
export interface SendMessageResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

// WhatsApp Service class
class WhatsAppService {
  /**
   * Check WhatsApp instance status
   */
  async checkInstanceStatus(): Promise<InstanceStatus> {
    try {
      // For now, return a mock status since credentials are not available
      // In a real implementation, this would check actual WhatsApp instance status
      console.log('🔍 Checking WhatsApp instance status...');
      
      // Mock response - in production this would use actual credentials
      return {
        authorized: false,
        state: 'notAuthorized',
        error: 'WhatsApp credentials not configured'
      };
    } catch (error: any) {
      console.error('❌ Error checking WhatsApp status:', error);
      return {
        authorized: false,
        state: 'error',
        error: error.message || 'Failed to check WhatsApp status'
      };
    }
  }

  /**
   * Send WhatsApp message
   */
  async sendWhatsAppMessage(
    phoneNumber: string, 
    message: string, 
    customerId?: string
  ): Promise<SendMessageResult> {
    try {
      console.log(`📱 Sending WhatsApp message to ${phoneNumber}:`, message);
      
      // Get WhatsApp credentials from integrations
      const credentials = await getCredentials('WHATSAPP_GATEWAY');
      
      if (!credentials) {
        toast.error('WhatsApp not configured. Please set up in Admin Settings → Integrations');
        return {
          success: false,
          error: 'WhatsApp integration not configured. Please set up WhatsApp in Admin Settings → Integrations'
        };
      }

      // Format phone number for WhatsApp
      const chatId = phoneNumber.replace(/\D/g, '') + '@c.us';
      
      // Send via Green API
      const apiUrl = credentials.api_url || 'https://7105.api.greenapi.com';
      const url = `${apiUrl}/waInstance${credentials.instance_id}/sendMessage/${credentials.api_token}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chatId,
          message: message
        })
      });

      const result = await response.json();
      
      // Track usage (non-blocking)
      const success = response.ok && result.idMessage;
      updateIntegrationUsage('WHATSAPP_GATEWAY', success).catch(err => 
        console.warn('Could not update integration usage:', err)
      );
      
      if (success) {
        console.log('✅ WhatsApp message sent successfully');
        return {
          success: true,
          messageId: result.idMessage
        };
      } else {
        console.error('❌ WhatsApp send failed:', result);
        return {
          success: false,
          error: result.error || 'Failed to send WhatsApp message'
        };
      }
    } catch (error: any) {
      console.error('❌ Error sending WhatsApp message:', error);
      // Track failure (non-blocking)
      updateIntegrationUsage('WHATSAPP_GATEWAY', false).catch(err => 
        console.warn('Could not update integration usage:', err)
      );
      return {
        success: false,
        error: error.message || 'Failed to send WhatsApp message'
      };
    }
  }

  /**
   * Test WhatsApp connection (for future use when credentials are available)
   */
  async testConnection(instanceId: string): Promise<{ connected: boolean; state?: string; error?: string }> {
    try {
      const result = await whatsappProxyApi.testConnection(instanceId);
      return result;
    } catch (error: any) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Send message using proxy API (for future use when credentials are available)
   */
  async sendMessageViaProxy(instanceId: string, chatId: string, message: string): Promise<any> {
    try {
      const result = await whatsappProxyApi.sendTextMessage(instanceId, chatId, message);
      return result;
    } catch (error: any) {
      throw error;
    }
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();

// Export the class for direct instantiation if needed
export default WhatsAppService;