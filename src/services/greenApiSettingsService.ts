import { supabase } from '../lib/supabaseClient';

export interface GreenApiSettings {
  webhookUrl?: string;
  webhookUrlToken?: string;
  delaySendMessagesMilliseconds?: number;
  markIncomingMessagesReaded?: string;
  markIncomingMessagesReadedOnReply?: string;
  outgoingWebhook?: string;
  outgoingMessageWebhook?: string;
  outgoingAPIMessageWebhook?: string;
  incomingWebhook?: string;
  stateWebhook?: string;
  incomingBlockWebhook?: string;
  pollMessageWebhook?: string;
  keepOnlineStatus?: string;
  [key: string]: any;
}

export interface InstanceState {
  stateInstance: string;
  deviceData?: {
    platform: string;
    deviceManufacturer: string;
    deviceModel: string;
    osVersion: string;
    waVersion: string;
    battery: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

class GreenApiSettingsService {
  private readonly BASE_URL = 'https://api.green-api.com';

  /**
   * Load settings from database
   */
  async loadSettingsFromDatabase(instanceId: string): Promise<GreenApiSettings | null> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('settings')
        .eq('instance_id', instanceId)
        .single();

      if (error) throw error;
      return data?.settings || null;
    } catch (error) {
      console.error('Error loading settings from database:', error);
      return null;
    }
  }

  /**
   * Save settings to database
   */
  async saveSettingsToDatabase(instanceId: string, settings: GreenApiSettings): Promise<void> {
    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ settings, updated_at: new Date().toISOString() })
        .eq('instance_id', instanceId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving settings to database:', error);
      throw error;
    }
  }

  /**
   * Get settings from Green API
   */
  async getSettings(instanceId: string, apiToken: string): Promise<GreenApiSettings> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/waInstance${instanceId}/getSettings/${apiToken}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get settings: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting settings from Green API:', error);
      throw error;
    }
  }

  /**
   * Set settings on Green API
   */
  async setSettings(instanceId: string, apiToken: string, settings: GreenApiSettings): Promise<void> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/waInstance${instanceId}/setSettings/${apiToken}`,
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
    } catch (error) {
      console.error('Error setting settings on Green API:', error);
      throw error;
    }
  }

  /**
   * Get instance state
   */
  async getStateInstance(instanceId: string, apiToken: string): Promise<InstanceState> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/waInstance${instanceId}/getStateInstance/${apiToken}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get state: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting instance state:', error);
      throw error;
    }
  }

  /**
   * Reboot instance
   */
  async rebootInstance(instanceId: string, apiToken: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/waInstance${instanceId}/reboot/${apiToken}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to reboot instance: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error rebooting instance:', error);
      throw error;
    }
  }

  /**
   * Logout instance
   */
  async logoutInstance(instanceId: string, apiToken: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/waInstance${instanceId}/logout/${apiToken}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to logout instance: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error logging out instance:', error);
      throw error;
    }
  }

  /**
   * Get QR code
   */
  async getQRCode(instanceId: string, apiToken: string): Promise<{ type: string; message: string }> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/waInstance${instanceId}/qr/${apiToken}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get QR code: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting QR code:', error);
      throw error;
    }
  }

  /**
   * Get authorization code
   */
  async getAuthorizationCode(instanceId: string, apiToken: string): Promise<{ type: string; code: string }> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/waInstance${instanceId}/getAuthorizationCode/${apiToken}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get authorization code: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting authorization code:', error);
      throw error;
    }
  }

  /**
   * Update API token in database
   */
  async updateApiToken(instanceId: string, oldApiToken: string, newApiToken: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ api_token: newApiToken, updated_at: new Date().toISOString() })
        .eq('instance_id', instanceId)
        .eq('api_token', oldApiToken);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating API token:', error);
      throw error;
    }
  }

  /**
   * Validate settings
   */
  validateSettings(settings: GreenApiSettings): ValidationResult {
    const errors: string[] = [];

    if (settings.webhookUrl && !this.isValidUrl(settings.webhookUrl)) {
      errors.push('Webhook URL is not valid');
    }

    if (settings.delaySendMessagesMilliseconds) {
      const delay = Number(settings.delaySendMessagesMilliseconds);
      if (isNaN(delay) || delay < 0 || delay > 60000) {
        errors.push('Delay must be between 0 and 60000 milliseconds');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get default settings
   */
  getDefaultSettings(): GreenApiSettings {
    return {
      webhookUrl: '',
      webhookUrlToken: '',
      delaySendMessagesMilliseconds: 1000,
      markIncomingMessagesReaded: 'no',
      markIncomingMessagesReadedOnReply: 'no',
      outgoingWebhook: 'yes',
      outgoingMessageWebhook: 'yes',
      outgoingAPIMessageWebhook: 'yes',
      incomingWebhook: 'yes',
      stateWebhook: 'yes',
      incomingBlockWebhook: 'yes',
      pollMessageWebhook: 'no',
      keepOnlineStatus: 'no',
    };
  }

  /**
   * Helper to validate URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

export const greenApiSettingsService = new GreenApiSettingsService();

