import { supabase } from './supabaseClient';
import { unifiedSettingsService } from './unifiedSettingsService';
import { formatTanzaniaPhoneNumber } from './phoneUtils';

export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  logo?: string | null;
  instagram?: string;
  tiktok?: string;
  whatsapp?: string;
}

class BusinessInfoService {
  private cachedInfo: BusinessInfo | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Convert legacy phone string to new array format for MultiPhoneInput
   */
  private convertPhoneToArrayFormat(phone: string): string {
    if (!phone || phone.trim() === '') return '';

    // Check if it's already in array format
    try {
      const parsed = JSON.parse(phone);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure all entries have proper format
        const formatted = parsed.map((item: any) => {
          if (typeof item === 'string') {
            // Convert old single string format to array
            return {
              phone: formatTanzaniaPhoneNumber(item),
              whatsapp: false
            };
          } else if (typeof item === 'object' && item.phone) {
            // Already in correct format, just format the phone
            return {
              phone: formatTanzaniaPhoneNumber(item.phone),
              whatsapp: item.whatsapp || false
            };
          }
          return null;
        }).filter(Boolean);

        return JSON.stringify(formatted);
      }
    } catch {
      // Not JSON, treat as legacy single phone string
    }

    // Legacy single phone string - convert to array format
    const formattedPhone = formatTanzaniaPhoneNumber(phone);
    if (formattedPhone) {
      return JSON.stringify([{ phone: formattedPhone, whatsapp: false }]);
    }

    return '';
  }

  /**
   * Get business information from unified_app_settings
   * Single source of truth for all business information across the app
   */
  async getBusinessInfo(): Promise<BusinessInfo> {
    // Return cached info if still valid
    const now = Date.now();
    if (this.cachedInfo && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cachedInfo;
    }

    try {
      // Try to get current user first
      let userId = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      } catch (authErr) {
        // Not authenticated, continue with global settings
      }

      // Get business info from unified settings
      const businessInfo = await unifiedSettingsService.getBusinessInfo(userId);

      // Convert phone to new array format if needed
      if (businessInfo.phone) {
        businessInfo.phone = this.convertPhoneToArrayFormat(businessInfo.phone);
      }

      this.cachedInfo = businessInfo;
      this.cacheTimestamp = Date.now();

      return businessInfo;
    } catch (err) {
      console.warn('⚠️ Could not load business info from lats_pos_general_settings:', err);
    }

    // Fallback to defaults
    const defaultInfo: BusinessInfo = {
      name: 'inauzwa',
      address: 'Dar es Salaam, Tanzania',
      phone: '+255 123 456 789',
      email: 'info@mystore.com',
      website: undefined,
      logo: null
    };

    // console.log removed');
    return defaultInfo;
  }

  /**
   * Clear the cache - useful after settings are updated
   */
  clearCache(): void {
    this.cachedInfo = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Update business information in lats_pos_general_settings
   */
  async updateBusinessInfo(info: Partial<BusinessInfo>): Promise<boolean> {
    try {
      // Try to get current user first
      let userId = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      } catch (authErr) {
        // Not authenticated, continue with global settings
      }

      // Convert phone to new array format if provided
      const updateInfo = { ...info };
      if (updateInfo.phone) {
        updateInfo.phone = this.convertPhoneToArrayFormat(updateInfo.phone);
      }

      // Use unified settings service to update business info
      const success = await unifiedSettingsService.updateBusinessInfo(updateInfo, userId);

      if (success) {
        // Clear local cache
        this.clearCache();
      }

      return success;
    } catch (err) {
      console.error('Failed to update business info:', err);
      return false;
    }
  }
}

// Export singleton instance
export const businessInfoService = new BusinessInfoService();

