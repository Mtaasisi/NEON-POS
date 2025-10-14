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
   * Get business information from lats_pos_general_settings
   * Single source of truth for all business information across the app
   */
  async getBusinessInfo(): Promise<BusinessInfo> {
    // Return cached info if still valid
    const now = Date.now();
    if (this.cachedInfo && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cachedInfo;
    }

    try {
      // @ts-ignore - Neon query builder implements thenable interface
      const { data, error } = await supabase
        .from('lats_pos_general_settings')
        .select('business_name, business_address, business_phone, business_email, business_website, business_logo')
        .limit(1)
        .single();

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
        
        console.log('📋 Business Info Loaded:', {
          name: this.cachedInfo.name,
          hasLogo: !!this.cachedInfo.logo,
          logoLength: this.cachedInfo.logo?.length || 0
        });
        
        return this.cachedInfo;
      }
    } catch (err) {
      console.warn('⚠️ Could not load business info from lats_pos_general_settings:', err);
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

    console.log('⚠️ Using default business info (database not configured)');
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
      const updateData = {
        business_name: info.name,
        business_address: info.address,
        business_phone: info.phone,
        business_email: info.email,
        business_website: info.website,
        business_logo: info.logo
      };

      // @ts-ignore - Neon query builder implements thenable interface
      // Get the first record from lats_pos_general_settings
      const { data: existing } = await supabase
        .from('lats_pos_general_settings')
        .select('id')
        .limit(1)
        .single();
      
      if (!existing) {
        console.error('No settings record found in lats_pos_general_settings');
        return false;
      }

      // @ts-ignore - Neon query builder implements thenable interface
      const { error } = await supabase
        .from('lats_pos_general_settings')
        .update(updateData)
        .eq('id', existing.id);

      if (error) throw error;

      // Clear cache to force refresh
      this.clearCache();
      
      console.log('✅ Business info updated successfully');
      return true;
    } catch (err) {
      console.error('Failed to update business info:', err);
      return false;
    }
  }
}

// Export singleton instance
export const businessInfoService = new BusinessInfoService();

