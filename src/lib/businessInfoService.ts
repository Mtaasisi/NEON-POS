import { supabase } from './supabaseClient';

export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  logo?: string | null;
}

class BusinessInfoService {
  private cachedInfo: BusinessInfo | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get business information from general_settings or lats_pos_general_settings
   * Automatically detects which table naming convention is being used
   * Falls back to default values if not configured
   */
  async getBusinessInfo(): Promise<BusinessInfo> {
    // Return cached info if still valid
    const now = Date.now();
    if (this.cachedInfo && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cachedInfo;
    }

    try {
      // Try both possible table names
      let data = null;
      let error = null;
      
      // Try general_settings first
      const result1 = await supabase
        .from('general_settings')
        .select('business_name, business_address, business_phone, business_email, business_website, business_logo')
        .limit(1)
        .single();
      
      if (!result1.error && result1.data) {
        data = result1.data;
      } else {
        // Try lats_pos_general_settings
        const result2 = await supabase
          .from('lats_pos_general_settings')
          .select('business_name, business_address, business_phone, business_email, business_website, business_logo')
          .limit(1)
          .single();
        
        if (!result2.error && result2.data) {
          data = result2.data;
        } else {
          error = result2.error;
        }
      }

      if (!error && data) {
        this.cachedInfo = {
          name: data.business_name || 'My Store',
          address: data.business_address || 'Dar es Salaam, Tanzania',
          phone: data.business_phone || '+255 123 456 789',
          email: data.business_email || undefined,
          website: data.business_website || undefined,
          logo: data.business_logo || null
        };
        this.cacheTimestamp = now;
        return this.cachedInfo;
      }
    } catch (err) {
      console.warn('⚠️ Could not load business info from database:', err);
    }

    // Fallback to defaults
    const defaultInfo: BusinessInfo = {
      name: 'My Store',
      address: 'Dar es Salaam, Tanzania',
      phone: '+255 123 456 789',
      email: 'info@mystore.com',
      website: undefined,
      logo: null
    };

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
   * Update business information
   * Automatically detects which table to update
   */
  async updateBusinessInfo(info: Partial<BusinessInfo>): Promise<boolean> {
    try {
      const updateData = {
        business_name: info.name,
        business_address: info.address,
        business_phone: info.phone,
        business_email: info.email,
        business_website: info.website,
        business_logo: info.logo
      };

      // Try to find which table exists and has data
      const { tableName, id } = await this.getCurrentSettingsTable();
      
      if (!tableName || !id) {
        console.error('No settings table found');
        return false;
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Clear cache to force refresh
      this.clearCache();
      return true;
    } catch (err) {
      console.error('Failed to update business info:', err);
      return false;
    }
  }

  /**
   * Get current settings table name and ID (helper method)
   * Returns which table exists and has data
   */
  private async getCurrentSettingsTable(): Promise<{ tableName: string | null; id: string | null }> {
    try {
      // Try general_settings first
      const result1 = await supabase
        .from('general_settings')
        .select('id')
        .limit(1)
        .single();
      
      if (!result1.error && result1.data) {
        return { tableName: 'general_settings', id: result1.data.id };
      }

      // Try lats_pos_general_settings
      const result2 = await supabase
        .from('lats_pos_general_settings')
        .select('id')
        .limit(1)
        .single();
      
      if (!result2.error && result2.data) {
        return { tableName: 'lats_pos_general_settings', id: result2.data.id };
      }

      return { tableName: null, id: null };
    } catch {
      return { tableName: null, id: null };
    }
  }
}

// Export singleton instance
export const businessInfoService = new BusinessInfoService();

