/**
 * WhatsApp Session Management Service
 * Handles all WhatsApp session operations via WasenderAPI
 * 
 * API Documentation: https://wasenderapi.com/api-docs
 */

import { getIntegration } from '../lib/integrationsApi';

export interface WhatsAppSession {
  id: number;
  name: string;
  phone_number: string;
  status: 'connected' | 'DISCONNECTED' | 'connecting' | 'qr_ready';
  account_protection: boolean;
  log_messages: boolean;
  webhook_url: string | null;
  webhook_enabled: boolean;
  webhook_events: string[] | null;
  api_key?: string;
  webhook_secret?: string;
  created_at: string;
  updated_at: string;
  qr_code?: string;
  user_info?: {
    id: string;
    name: string;
    phone: string;
    profile_picture?: string;
  };
}

export interface CreateSessionPayload {
  name: string;
  phone_number: string;
  account_protection: boolean;
  log_messages: boolean;
  webhook_url?: string;
  webhook_enabled?: boolean;
  webhook_events?: string[];
  read_incoming_messages?: boolean;
  auto_reject_calls?: boolean;
}

export interface UpdateSessionPayload {
  name?: string;
  phone_number?: string;
  account_protection?: boolean;
  log_messages?: boolean;
  webhook_url?: string;
  webhook_enabled?: boolean;
  webhook_events?: string[];
  read_incoming_messages?: boolean;
  auto_reject_calls?: boolean;
}

class WhatsAppSessionService {
  private baseUrl = 'https://www.wasenderapi.com/api';
  private bearerToken: string | null = null;

  /**
   * Initialize service with bearer token from integration
   */
  private async getHeaders(): Promise<HeadersInit> {
    if (!this.bearerToken) {
      try {
        const integration = await getIntegration('WHATSAPP_WASENDER');
        
        if (!integration) {
          throw new Error('WhatsApp integration not configured. Please configure WaSender API in Admin Settings > Integrations.');
        }

        if (!integration.is_enabled) {
          throw new Error('WhatsApp integration is disabled. Please enable it in Admin Settings > Integrations.');
        }

        // Parse credentials if they're a string
        let credentials = integration.credentials;
        if (typeof credentials === 'string') {
          try {
            credentials = JSON.parse(credentials);
          } catch (e) {
            console.error('⚠️ [WhatsApp] Failed to parse credentials:', e);
            throw new Error('Invalid integration credentials format. Please reconfigure the integration.');
          }
        }

        this.bearerToken = credentials?.bearer_token || credentials?.api_key || '';
        
        // Debug logging (only in development)
        if (process.env.NODE_ENV === 'development') {
          console.debug('🔑 [WhatsApp] Token retrieved:', this.bearerToken ? `${this.bearerToken.substring(0, 10)}...` : 'EMPTY');
          console.debug('🔑 [WhatsApp] Credentials keys:', credentials ? Object.keys(credentials) : 'null');
        }
        
        if (!this.bearerToken || this.bearerToken.trim() === '') {
          throw new Error('WhatsApp API token is missing. Please configure your WaSender API Bearer Token in Admin Settings > Integrations.');
        }
      } catch (error) {
        console.error('⚠️ [WhatsApp] Integration not configured:', error);
        // Clear cached token on error so it can be retried
        this.bearerToken = null;
        throw error;
      }
    }

    return {
      'Authorization': `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Clear cached bearer token (useful when credentials are updated)
   */
  public clearTokenCache(): void {
    this.bearerToken = null;
  }

  /**
   * Get all WhatsApp sessions
   * GET /api/whatsapp-sessions
   */
  async getAllSessions(): Promise<{ success: boolean; data: WhatsAppSession[]; error?: string }> {
    try {
      const headers = await this.getHeaders();
      
      // Debug: Verify token is present (only log first few chars for security)
      if (process.env.NODE_ENV === 'development') {
        const authHeader = headers['Authorization'] as string;
        console.debug('🔑 [WhatsApp] Making request with token:', authHeader ? `${authHeader.substring(0, 20)}...` : 'MISSING');
      }
      
      const response = await fetch(`${this.baseUrl}/whatsapp-sessions`, {
        method: 'GET',
        headers,
      });

      // Handle non-JSON responses
      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text || `HTTP ${response.status}: ${response.statusText}` };
      }

      if (!response.ok) {
        // Clear token cache on authentication errors to allow retry with fresh credentials
        if (response.status === 401) {
          this.bearerToken = null;
          const apiMessage = data.message || data.error || '';
          const errorMessage = apiMessage.includes('personal access token') || apiMessage.includes('valid') || apiMessage.includes('token')
            ? 'Invalid or expired API token. Please verify your WaSender API Bearer Token in Admin Settings > Integrations and ensure it is correct and active.'
            : apiMessage || 'Authentication failed. Please check your API token in Admin Settings > Integrations.';
          throw new Error(errorMessage);
        }
        throw new Error(data.message || data.error || `Failed to fetch sessions: ${response.status} ${response.statusText}`);
      }

      return { success: true, data: data.data || [] };
    } catch (error: any) {
      // Only log error if it's not about missing configuration
      if (!error.message?.includes('not configured') && !error.message?.includes('disabled')) {
        console.error('❌ [WhatsApp] Error fetching sessions:', error);
      }
      return { success: false, data: [], error: error.message };
    }
  }

  /**
   * Create a new WhatsApp session
   * POST /api/whatsapp-sessions
   */
  async createSession(payload: CreateSessionPayload): Promise<{ success: boolean; data?: WhatsAppSession; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/whatsapp-sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create session');
      }

      return { success: true, data: data.data };
    } catch (error: any) {
      console.error('Error creating WhatsApp session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get session details by ID
   * GET /api/whatsapp-sessions/{id}
   */
  async getSessionDetails(sessionId: number): Promise<{ success: boolean; data?: WhatsAppSession; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/whatsapp-sessions/${sessionId}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch session details');
      }

      return { success: true, data: data.data };
    } catch (error: any) {
      console.error('Error fetching session details:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update session settings
   * PUT /api/whatsapp-sessions/{id}
   */
  async updateSession(sessionId: number, payload: UpdateSessionPayload): Promise<{ success: boolean; data?: WhatsAppSession; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/whatsapp-sessions/${sessionId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update session');
      }

      return { success: true, data: data.data };
    } catch (error: any) {
      console.error('Error updating session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a WhatsApp session
   * DELETE /api/whatsapp-sessions/{id}
   */
  async deleteSession(sessionId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/whatsapp-sessions/${sessionId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete session');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get session status
   * GET /api/whatsapp-sessions/{id}/status
   */
  async getSessionStatus(sessionId: number): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/whatsapp-sessions/${sessionId}/status`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch session status');
      }

      return { success: true, status: data.status };
    } catch (error: any) {
      console.error('Error fetching session status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Connect WhatsApp session (initiate QR code scan)
   * POST /api/whatsapp-sessions/{id}/connect
   */
  async connectSession(sessionId: number): Promise<{ success: boolean; qr_code?: string; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/whatsapp-sessions/${sessionId}/connect`, {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to connect session');
      }

      return { success: true, qr_code: data.qr_code };
    } catch (error: any) {
      console.error('Error connecting session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restart WhatsApp session
   * POST /api/whatsapp-sessions/{id}/restart
   */
  async restartSession(sessionId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/whatsapp-sessions/${sessionId}/restart`, {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to restart session');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error restarting session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get QR code for session
   * GET /api/whatsapp-sessions/{id}/qr-code
   */
  async getQRCode(sessionId: number): Promise<{ success: boolean; qr_code?: string; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/whatsapp-sessions/${sessionId}/qr-code`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch QR code');
      }

      return { success: true, qr_code: data.qr_code };
    } catch (error: any) {
      console.error('Error fetching QR code:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disconnect WhatsApp session
   * POST /api/whatsapp-sessions/{id}/disconnect
   */
  async disconnectSession(sessionId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/whatsapp-sessions/${sessionId}/disconnect`, {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to disconnect session');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error disconnecting session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get session user info (WhatsApp account details)
   * GET /api/whatsapp-sessions/{id}/user-info
   */
  async getSessionUserInfo(sessionId: number): Promise<{ success: boolean; user_info?: any; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/whatsapp-sessions/${sessionId}/user-info`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch user info');
      }

      return { success: true, user_info: data.data };
    } catch (error: any) {
      console.error('Error fetching user info:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if a number is on WhatsApp
   * POST /api/whatsapp-sessions/{id}/check-number
   */
  async checkNumberOnWhatsApp(sessionId: number, phoneNumber: string): Promise<{ success: boolean; exists?: boolean; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/whatsapp-sessions/${sessionId}/check-number`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone_number: phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to check number');
      }

      return { success: true, exists: data.exists };
    } catch (error: any) {
      console.error('Error checking number:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Regenerate API key for session
   * POST /api/whatsapp-sessions/{id}/regenerate-api-key
   */
  async regenerateApiKey(sessionId: number): Promise<{ success: boolean; api_key?: string; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/whatsapp-sessions/${sessionId}/regenerate-api-key`, {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to regenerate API key');
      }

      return { success: true, api_key: data.api_key };
    } catch (error: any) {
      console.error('Error regenerating API key:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send presence update (typing, recording, etc.)
   * POST /api/whatsapp-sessions/{id}/presence
   */
  async sendPresence(sessionId: number, jid: string, type: 'composing' | 'recording' | 'paused'): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/whatsapp-sessions/${sessionId}/presence`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jid, type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send presence');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error sending presence:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get message logs for session
   * GET /api/whatsapp-sessions/{id}/message-logs
   */
  async getMessageLogs(sessionId: number, limit = 100): Promise<{ success: boolean; logs?: any[]; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/whatsapp-sessions/${sessionId}/message-logs?limit=${limit}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch message logs');
      }

      return { success: true, logs: data.data || [] };
    } catch (error: any) {
      console.error('Error fetching message logs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get session logs (connection logs, errors, etc.)
   * GET /api/whatsapp-sessions/{id}/logs
   */
  async getSessionLogs(sessionId: number, limit = 100): Promise<{ success: boolean; logs?: any[]; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/whatsapp-sessions/${sessionId}/logs?limit=${limit}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch session logs');
      }

      return { success: true, logs: data.data || [] };
    } catch (error: any) {
      console.error('Error fetching session logs:', error);
      return { success: false, error: error.message };
    }
  }
}

export const whatsappSessionService = new WhatsAppSessionService();
export default whatsappSessionService;

