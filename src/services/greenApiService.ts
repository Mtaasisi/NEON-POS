import { supabase } from '../lib/supabaseClient';

export interface SendMessageParams {
  instanceId: string;
  apiToken?: string;
  phoneNumber: string;
  message: string;
  quotedMessageId?: string;
  linkPreview?: boolean;
  host?: string;
}

export interface SendMessageResponse {
  success: boolean;
  message?: string;
  error?: string;
  messageId?: string;
  idMessage?: string;
}

export interface WhatsAppInstance {
  id: string;
  instance_id: string;
  api_token: string;
  phone_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id?: string;
  host?: string;
  settings?: any;
}

class GreenApiService {
  private readonly BASE_URL = 'https://api.green-api.com';

  /**
   * Get all WhatsApp instances
   */
  async getInstances(): Promise<WhatsAppInstance[]> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting instances:', error);
      return [];
    }
  }

  /**
   * Get a specific instance
   */
  async getInstance(instanceId: string): Promise<WhatsAppInstance | null> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('instance_id', instanceId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting instance:', error);
      return null;
    }
  }

  /**
   * Create a test instance
   */
  async createTestInstance(): Promise<WhatsAppInstance> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .insert({
          instance_id: 'test-' + Date.now(),
          api_token: 'test-token',
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating test instance:', error);
      throw error;
    }
  }

  /**
   * Check instance connection status
   */
  async checkInstanceConnection(instanceId: string): Promise<boolean> {
    try {
      const instance = await this.getInstance(instanceId);
      if (!instance) return false;

      const response = await fetch(
        `${this.BASE_URL}/waInstance${instanceId}/getStateInstance/${instance.api_token}`
      );

      if (!response.ok) return false;

      const data = await response.json();
      return data.stateInstance === 'authorized';
    } catch (error) {
      console.error('Error checking instance connection:', error);
      return false;
    }
  }

  /**
   * Send message via Green API
   */
  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    try {
      const { instanceId, apiToken, phoneNumber, message, quotedMessageId, linkPreview = true, host } = params;
      
      // Get API token from database if not provided
      let token = apiToken;
      if (!token) {
        const instance = await this.getInstance(instanceId);
        if (!instance) {
          return {
            success: false,
            error: 'Instance not found',
          };
        }
        token = instance.api_token;
      }

      const baseUrl = host || this.BASE_URL;
      const url = `${baseUrl}/waInstance${instanceId}/sendMessage/${token}`;

      const body: any = {
        chatId: phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`,
        message: message,
        linkPreview: linkPreview,
      };

      if (quotedMessageId) {
        body.quotedMessageId = quotedMessageId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || response.statusText,
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.idMessage,
        idMessage: data.idMessage,
      };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message',
      };
    }
  }

  /**
   * Get WhatsApp settings
   */
  async getWaSettings(instanceId: string, apiToken: string, host?: string): Promise<any> {
    try {
      const baseUrl = host || this.BASE_URL;
      const response = await fetch(
        `${baseUrl}/waInstance${instanceId}/getWaSettings/${apiToken}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get settings: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting WA settings:', error);
      throw error;
    }
  }

  /**
   * Get settings
   */
  async getSettings(instanceId: string, apiToken: string, host?: string): Promise<any> {
    try {
      const baseUrl = host || this.BASE_URL;
      const response = await fetch(
        `${baseUrl}/waInstance${instanceId}/getSettings/${apiToken}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get settings: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  }

  /**
   * Set settings
   */
  async setSettings(instanceId: string, apiToken: string, settings: any, host?: string): Promise<any> {
    try {
      const baseUrl = host || this.BASE_URL;
      const response = await fetch(
        `${baseUrl}/waInstance${instanceId}/setSettings/${apiToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to set settings: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error setting settings:', error);
      throw error;
    }
  }

  /**
   * Logout instance
   */
  async logout(instanceId: string, apiToken: string, host?: string): Promise<any> {
    try {
      const baseUrl = host || this.BASE_URL;
      const response = await fetch(
        `${baseUrl}/waInstance${instanceId}/logout/${apiToken}`
      );

      if (!response.ok) {
        throw new Error(`Failed to logout: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  }

  /**
   * Reboot instance
   */
  async reboot(instanceId: string, apiToken: string, host?: string): Promise<any> {
    try {
      const baseUrl = host || this.BASE_URL;
      const response = await fetch(
        `${baseUrl}/waInstance${instanceId}/reboot/${apiToken}`
      );

      if (!response.ok) {
        throw new Error(`Failed to reboot: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error rebooting:', error);
      throw error;
    }
  }

  /**
   * Update API token
   */
  async updateApiToken(instanceId: string, currentApiToken: string, newApiToken: string, host?: string): Promise<any> {
    try {
      // Update in database
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ 
          api_token: newApiToken,
          updated_at: new Date().toISOString()
        })
        .eq('instance_id', instanceId)
        .eq('api_token', currentApiToken);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error updating API token:', error);
      throw error;
    }
  }

  /**
   * Set profile picture
   */
  async setProfilePicture(instanceId: string, apiToken: string, file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${this.BASE_URL}/waInstance${instanceId}/setProfilePicture/${apiToken}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to set profile picture: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error setting profile picture:', error);
      throw error;
    }
  }

  /**
   * Get authorization code
   */
  async getAuthorizationCode(instanceId: string, apiToken: string, phoneNumber: string, host?: string): Promise<any> {
    try {
      const baseUrl = host || this.BASE_URL;
      const response = await fetch(
        `${baseUrl}/waInstance${instanceId}/getAuthorizationCode/${apiToken}?phoneNumber=${phoneNumber}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get authorization code: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting authorization code:', error);
      throw error;
    }
  }

  /**
   * Diagnose RLS (Row Level Security) issues
   */
  async diagnoseRLSIssues(): Promise<{ hasIssues: boolean; issues: string[] }> {
    try {
      const issues: string[] = [];

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        issues.push('No authenticated user');
      }

      // Try to query instances
      const { error } = await supabase
        .from('whatsapp_instances')
        .select('count');

      if (error) {
        issues.push(`Database query error: ${error.message}`);
      }

      return {
        hasIssues: issues.length > 0,
        issues,
      };
    } catch (error: any) {
      return {
        hasIssues: true,
        issues: [error.message || 'Unknown error'],
      };
    }
  }
}

export const greenApiService = new GreenApiService();

