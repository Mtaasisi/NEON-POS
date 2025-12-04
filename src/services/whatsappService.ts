// WhatsApp Service using WasenderAPI
import { supabase } from '../lib/supabaseClient';
import { updateIntegrationUsage } from '../lib/integrationsApi';

export interface WhatsAppLog {
  id: string;
  recipient_phone: string;
  message: string;
  message_type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'location' | 'contact' | 'poll';
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  error_message?: string;
  sent_at?: string;
  sent_by?: string;
  created_at: string;
  device_id?: string;
  customer_id?: string;
  message_id?: string; // WasenderAPI message ID
  media_url?: string;
}

export interface WhatsAppMessageOptions {
  message_type?: 'text' | 'image' | 'video' | 'document' | 'audio' | 'location' | 'contact' | 'poll';
  media_url?: string;
  caption?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contact?: {
    name: string;
    phone: string;
  };
  pollName?: string;
  pollOptions?: string[];
  allowMultipleAnswers?: boolean;
  quoted_message_id?: string; // For replying to messages
  viewOnce?: boolean; // For images/videos
  session_id?: number; // Local DB session ID for tracking
  wasender_session_id?: number; // WasenderAPI session ID (override default)
}

class WhatsAppService {
  private apiKey: string | null = null;
  private apiUrl: string = 'https://wasenderapi.com/api';
  private sessionId: string | null = null;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private static hasWarnedAboutConfig: boolean = false;

  constructor() {
    this.initializationPromise = this.initializeService();
  }

  private async initializeService() {
    try {
      console.debug('🔧 Initializing WhatsApp service from integrations...');
      
      const timeoutMs = 15000;
      const { getIntegration } = await import('../lib/integrationsApi');
      const integrationPromise = getIntegration('WHATSAPP_WASENDER');
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('WhatsApp initialization timeout')), timeoutMs)
      );
      
      const integration = await Promise.race([integrationPromise, timeoutPromise]);
      
      if (!integration || !integration.is_enabled) {
        console.debug('ℹ️ WhatsApp integration not configured. WhatsApp features will be disabled until configured in Admin Settings → Integrations');
        this.initialized = true;
        return;
      }

      // Set credentials from integrations
      this.apiKey = integration.credentials?.api_key || integration.credentials?.bearer_token || null;
      this.sessionId = integration.credentials?.session_id || integration.credentials?.whatsapp_session || null;
      
      // Set API URL from config
      this.apiUrl = integration.config?.api_url || 'https://wasenderapi.com/api';
      
      console.debug('✅ WhatsApp credentials loaded from integrations');
      console.debug('🔑 API Key:', this.apiKey ? '✅ Configured' : '❌ Missing');
      console.debug('📱 Session ID:', this.sessionId ? '✅ Configured' : '❌ Missing');
      console.debug('🌐 API URL:', this.apiUrl ? '✅ Configured' : '❌ Missing');
      
      if (!this.apiKey || !this.sessionId) {
        console.debug('ℹ️ WhatsApp service not fully configured. WhatsApp sending will fail until configured in Admin Settings → Integrations');
      } else {
        console.debug('✅ WhatsApp service initialized successfully');
      }
      
      this.initialized = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMsg.includes('timeout')) {
        console.debug('ℹ️ WhatsApp service initialization timed out (normal during cold starts) - will retry on first use');
      } else {
        console.warn('❌ WhatsApp service configuration error:', errorMsg);
      }
      
      this.initialized = true;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized && this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  /**
   * Send WhatsApp text message
   */
  async sendMessage(
    phone: string, 
    message: string, 
    options?: WhatsAppMessageOptions
  ): Promise<{ success: boolean; error?: string; log_id?: string; message_id?: string }> {
    try {
      await this.ensureInitialized();
      
      if (!this.apiKey || !this.sessionId) {
        if (!WhatsAppService.hasWarnedAboutConfig && (import.meta.env.DEV || import.meta.env.MODE === 'development')) {
          console.warn('⚠️ WhatsApp provider not configured. Configure WhatsApp WasenderAPI in Admin Settings → Integrations.');
          WhatsAppService.hasWarnedAboutConfig = true;
        }
        return { 
          success: false, 
          error: 'WhatsApp provider not configured. Configure WhatsApp WasenderAPI in Admin Settings → Integrations.' 
        };
      }

      // Format phone number (remove + and ensure proper format)
      const formattedPhone = this.formatPhoneNumber(phone);
      
      // Determine message type
      const messageType = options?.message_type || 'text';
      
      let result;
      
      switch (messageType) {
        case 'text':
          result = await this.sendTextMessage(formattedPhone, message, options);
          break;
        case 'image':
          result = await this.sendImageMessage(formattedPhone, message, options);
          break;
        case 'video':
          result = await this.sendVideoMessage(formattedPhone, message, options);
          break;
        case 'document':
          result = await this.sendDocumentMessage(formattedPhone, message, options);
          break;
        case 'audio':
          result = await this.sendAudioMessage(formattedPhone, message, options);
          break;
        case 'location':
          result = await this.sendLocationMessage(formattedPhone, options);
          break;
        case 'contact':
          result = await this.sendContactMessage(formattedPhone, options);
          break;
        case 'poll':
          result = await this.sendPollMessage(formattedPhone, options);
          break;
        default:
          result = await this.sendTextMessage(formattedPhone, message, options);
      }
      
      // Track usage in integrations (non-blocking)
      updateIntegrationUsage('WHATSAPP_WASENDER', result.success).catch(err => 
        console.warn('Could not update integration usage:', err)
      );
      
      // Log the WhatsApp message
      const logData: any = {
        recipient_phone: formattedPhone,
        message: message || options?.caption || '',
        message_type: messageType,
        status: result.success ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        message_id: result.message_id,
        media_url: options?.media_url,
        session_id: options?.session_id || null // Track which session was used
      };

      if (result.error) {
        logData.error_message = result.error;
      }

      const { data: log, error: logError } = await supabase
        .from('whatsapp_logs')
        .insert(logData)
        .select()
        .single();

      if (logError) {
        console.error('Error logging WhatsApp message:', logError);
      }

      return {
        success: result.success,
        error: result.error,
        log_id: log?.id,
        message_id: result.message_id
      };
    } catch (error) {
      console.error('WhatsApp send error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send text message
   */
  private async sendTextMessage(
    phone: string, 
    message: string, 
    options?: WhatsAppMessageOptions
  ): Promise<{ success: boolean; error?: string; message_id?: string }> {
    try {
      // WasenderAPI uses /api/send-message endpoint
      const url = `${this.apiUrl}/send-message`;
      
      // Format phone number for WasenderAPI (needs to be in international format)
      // WasenderAPI expects phone in format: 255XXXXXXXXX (country code + number, no +)
      const formattedPhone = phone.startsWith('+') ? phone.substring(1) : phone;
      
      const payload: any = {
        session: this.sessionId,
        to: formattedPhone,
        text: message
      };

      // Add quoted message if replying (WasenderAPI format)
      if (options?.quoted_message_id) {
        payload.quotedMessageId = options.quoted_message_id;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      const data = await response.json();
      return { 
        success: true, 
        message_id: data.messageId || data.id 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send image message
   */
  private async sendImageMessage(
    phone: string, 
    caption: string, 
    options?: WhatsAppMessageOptions
  ): Promise<{ success: boolean; error?: string; message_id?: string }> {
    try {
      if (!options?.media_url) {
        return { success: false, error: 'Media URL is required for image messages' };
      }

      const url = `${this.apiUrl}/send-message`;
      
      const finalCaption = caption || options.caption || '';
      const payload: any = {
        session: this.sessionId,
        to: phone,
        imageUrl: options.media_url
      };
      
      // Add text/caption - at least one is required
      if (finalCaption) {
        payload.text = finalCaption;
      }
      
      // Add viewOnce option if specified
      if (options.viewOnce) {
        payload.viewOnce = true;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      const data = await response.json();
      return { 
        success: true, 
        message_id: data.messageId || data.id 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send video message
   */
  private async sendVideoMessage(
    phone: string, 
    caption: string, 
    options?: WhatsAppMessageOptions
  ): Promise<{ success: boolean; error?: string; message_id?: string }> {
    try {
      if (!options?.media_url) {
        return { success: false, error: 'Media URL is required for video messages' };
      }

      const url = `${this.apiUrl}/send-message`;
      
      const finalCaption = caption || options.caption || '';
      const payload: any = {
        session: this.sessionId,
        to: phone,
        videoUrl: options.media_url
      };
      
      // Add text/caption - at least one is required
      if (finalCaption) {
        payload.text = finalCaption;
      }
      
      // Add viewOnce option if specified
      if (options.viewOnce) {
        payload.viewOnce = true;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      const data = await response.json();
      return { 
        success: true, 
        message_id: data.messageId || data.id 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send document message
   */
  private async sendDocumentMessage(
    phone: string, 
    caption: string, 
    options?: WhatsAppMessageOptions
  ): Promise<{ success: boolean; error?: string; message_id?: string }> {
    try {
      if (!options?.media_url) {
        return { success: false, error: 'Media URL is required for document messages' };
      }

      const url = `${this.apiUrl}/send-message`;
      
      const finalCaption = caption || options.caption || '';
      const payload: any = {
        session: this.sessionId,
        to: phone,
        documentUrl: options.media_url
      };
      
      // Add text/caption - at least one is required
      if (finalCaption) {
        payload.text = finalCaption;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      const data = await response.json();
      return { 
        success: true, 
        message_id: data.messageId || data.id 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send audio message
   */
  private async sendAudioMessage(
    phone: string, 
    caption: string, 
    options?: WhatsAppMessageOptions
  ): Promise<{ success: boolean; error?: string; message_id?: string }> {
    try {
      if (!options?.media_url) {
        return { success: false, error: 'Media URL is required for audio messages' };
      }

      const url = `${this.apiUrl}/send-message`;
      
      const payload: any = {
        session: this.sessionId,
        to: phone,
        audioUrl: options.media_url
      };
      
      // Audio messages typically don't have captions, but we can add text if provided
      const finalCaption = caption || options.caption || '';
      if (finalCaption) {
        payload.text = finalCaption;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      const data = await response.json();
      return { 
        success: true, 
        message_id: data.messageId || data.id 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send location message
   */
  private async sendLocationMessage(
    phone: string, 
    options?: WhatsAppMessageOptions
  ): Promise<{ success: boolean; error?: string; message_id?: string }> {
    try {
      if (!options?.location) {
        return { success: false, error: 'Location data is required for location messages' };
      }

      const url = `${this.apiUrl}/send-message`;
      
      const payload: any = {
        session: this.sessionId,
        to: phone,
        location: {
          latitude: options.location.latitude,
          longitude: options.location.longitude,
          name: options.location.name || '',
          address: options.location.address || ''
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      const data = await response.json();
      return { 
        success: true, 
        message_id: data.messageId || data.id 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send contact card message
   */
  private async sendContactMessage(
    phone: string, 
    options?: WhatsAppMessageOptions
  ): Promise<{ success: boolean; error?: string; message_id?: string }> {
    try {
      if (!options?.contact) {
        return { success: false, error: 'Contact data is required for contact messages' };
      }

      const url = `${this.apiUrl}/send-message`;
      
      const payload: any = {
        session: this.sessionId,
        to: phone,
        contact: {
          name: options.contact.name,
          phone: options.contact.phone
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      const data = await response.json();
      return { 
        success: true, 
        message_id: data.messageId || data.id 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send poll message
   */
  private async sendPollMessage(
    phone: string, 
    options?: WhatsAppMessageOptions
  ): Promise<{ success: boolean; error?: string; message_id?: string }> {
    try {
      if (!options?.pollName || !options?.pollOptions || options.pollOptions.length < 2) {
        return { success: false, error: 'Poll name and at least 2 options are required for poll messages' };
      }

      const url = `${this.apiUrl}/send-message`;
      
      // WasenderAPI expects poll as a nested object with 'question' and 'multiSelect'
      const payload: any = {
        session: this.sessionId,
        to: phone,
        poll: {
          question: options.pollName,
          options: options.pollOptions,
          multiSelect: options.allowMultipleAnswers || false
        }
      };

      console.log('📤 Sending poll message with payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Poll message failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          sentPayload: payload
        });
        
        // More detailed error message
        let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        if (errorData.message) {
          errorMsg = errorData.message;
        }
        if (errorData.errors) {
          const errorDetails = JSON.stringify(errorData.errors);
          errorMsg += ` - ${errorDetails}`;
        }
        
        return { 
          success: false, 
          error: errorMsg
        };
      }

      const data = await response.json();
      console.log('✅ Poll message sent successfully:', data);
      return { 
        success: true, 
        message_id: data.messageId || data.id 
      };
    } catch (error) {
      console.error('❌ Poll message exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Format phone number for WhatsApp (remove + and ensure proper format)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Remove + if present
    cleaned = cleaned.replace(/^\+/, '');
    
    // If starts with 0, replace with country code (Tanzania: 255)
    if (cleaned.startsWith('0')) {
      cleaned = '255' + cleaned.substring(1);
    }
    
    // If doesn't start with country code, assume Tanzania (255)
    if (!cleaned.startsWith('255') && !cleaned.startsWith('1') && cleaned.length < 10) {
      cleaned = '255' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Get WhatsApp logs
   */
  async getWhatsAppLogs(filters?: { search?: string; status?: string }): Promise<WhatsAppLog[]> {
    try {
      let query = supabase
        .from('whatsapp_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`recipient_phone.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching WhatsApp logs:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching WhatsApp logs:', error);
      return [];
    }
  }

  /**
   * Get WhatsApp statistics
   */
  async getWhatsAppStats(): Promise<{ 
    total: number; 
    sent: number; 
    failed: number; 
    pending: number; 
    delivered: number; 
    read: number;
  }> {
    try {
      const { data } = await supabase
        .from('whatsapp_logs')
        .select('status');

      if (!data) return { total: 0, sent: 0, failed: 0, pending: 0, delivered: 0, read: 0 };

      return {
        total: data.length,
        sent: data.filter(log => log.status === 'sent').length,
        failed: data.filter(log => log.status === 'failed').length,
        pending: data.filter(log => log.status === 'pending').length,
        delivered: data.filter(log => log.status === 'delivered').length,
        read: data.filter(log => log.status === 'read').length,
      };
    } catch (error) {
      console.error('Error fetching WhatsApp stats:', error);
      return { total: 0, sent: 0, failed: 0, pending: 0, delivered: 0, read: 0 };
    }
  }

  /**
   * Configure webhook URL for receiving WhatsApp events
   * @param webhookUrl - Your server's webhook endpoint URL (e.g., https://yourdomain.com/api/whatsapp/webhook)
   * @param events - Array of events to subscribe to
   */
  async configureWebhook(
    webhookUrl: string,
    events: string[] = [
      'messages.received',
      'messages.upsert',
      'messages.update',
      'messages.reaction',
      'session.status',
      'call.received',
      'poll.results'
    ]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ensureInitialized();

      if (!this.sessionId) {
        return { success: false, error: 'Session ID not configured' };
      }

      // Update session with webhook configuration
      // This is done via PUT /api/whatsapp-sessions/{session}
      const url = `${this.apiUrl}/whatsapp-sessions/${this.sessionId}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          webhook_url: webhookUrl,
          webhook_events: events,
          webhook_enabled: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      console.log('✅ Webhook configured successfully:', webhookUrl);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to configure webhook';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get incoming messages (received from customers)
   */
  async getIncomingMessages(filters?: {
    customer_id?: string;
    unread_only?: boolean;
    limit?: number;
  }): Promise<any[]> {
    try {
      let query = supabase
        .from('whatsapp_incoming_messages')
        .select('*, customers(name, phone, whatsapp)')
        .order('created_at', { ascending: false });

      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }

      if (filters?.unread_only) {
        query = query.eq('is_read', false);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching incoming messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching incoming messages:', error);
      return [];
    }
  }

  /**
   * Mark incoming message as read
   */
  async markMessageAsRead(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('whatsapp_incoming_messages')
        .update({ is_read: true })
        .eq('id', messageId);

      return !error;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }

  /**
   * Send presence update (typing indicator)
   * @param phone - Phone number to send presence to
   * @param state - Presence state: 'composing' (typing), 'paused', 'available'
   */
  async sendPresenceUpdate(
    phone: string,
    state: 'composing' | 'paused' | 'available' = 'composing'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ensureInitialized();
      
      if (!this.apiKey || !this.sessionId) {
        return { success: false, error: 'WhatsApp not configured' };
      }

      const formattedPhone = phone.startsWith('+') ? phone.substring(1) : phone;
      
      const response = await fetch(`${this.apiUrl}/send-presence-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          session: this.sessionId,
          to: formattedPhone,
          state: state
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if a phone number is on WhatsApp
   */
  async isOnWhatsApp(phone: string): Promise<{ exists: boolean; error?: string }> {
    try {
      await this.ensureInitialized();

      if (!this.apiKey) {
        return { exists: false, error: 'API key not configured' };
      }

      const formattedPhone = this.formatPhoneNumber(phone);
      const url = `${this.apiUrl}/on-whatsapp/${formattedPhone}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        return { exists: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { exists: data.exists || false };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { exists: false, error: errorMessage };
    }
  }

  /**
   * Get message delivery status
   */
  async getMessageStatus(messageId: string): Promise<any> {
    try {
      await this.ensureInitialized();

      if (!this.apiKey) {
        return { error: 'API key not configured' };
      }

      const url = `${this.apiUrl}/messages/${messageId}/info`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        return { error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { error: errorMessage };
    }
  }
}

// Create singleton instance
const whatsappService = new WhatsAppService();

export default whatsappService;

