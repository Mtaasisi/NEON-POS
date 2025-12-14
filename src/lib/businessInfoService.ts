import { supabase } from './supabaseClient';

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
      // Try to get current user first
      let user = null;
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        user = authUser;
      } catch (authErr) {
        // Not authenticated, continue with global settings
      }

      let data = null;
      let error = null;

      // First, try to get user-specific settings
      if (user) {
        const { data: userData, error: userError } = await supabase
          .from('lats_pos_general_settings')
          .select('business_name, business_address, business_phone, business_email, business_website, business_logo')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!userError && userData) {
          data = userData;
        } else {
          error = userError;
        }
      }

      // If no user-specific settings, try global settings (user_id = NULL)
      if (!data) {
        const { data: globalData, error: globalError } = await supabase
          .from('lats_pos_general_settings')
          .select('business_name, business_address, business_phone, business_email, business_website, business_logo')
          .is('user_id', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!globalError && globalData) {
          data = globalData;
        } else {
          error = globalError;
        }
      }

      // If still no data, try any record (fallback)
      if (!data) {
        const { data: anyData, error: anyError } = await supabase
          .from('lats_pos_general_settings')
          .select('business_name, business_address, business_phone, business_email, business_website, business_logo')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!anyError && anyData) {
          data = anyData;
        } else {
          error = anyError;
        }
      }

      if (data) {
        this.cachedInfo = {
          name: data.business_name || 'inauzwa',
          address: data.business_address || 'Dar es Salaam, Tanzania',
          phone: data.business_phone || '+255 123 456 789',
          email: data.business_email || undefined,
          website: data.business_website || undefined,
          logo: data.business_logo || null
        };
        this.cacheTimestamp = now;
        
        // Log successful fetch (development only)
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Business info loaded from database:', {
            name: this.cachedInfo.name,
            phone: this.cachedInfo.phone,
            email: this.cachedInfo.email,
            website: this.cachedInfo.website,
            address: this.cachedInfo.address,
            hasLogo: !!this.cachedInfo.logo,
            logoType: this.cachedInfo.logo ? (this.cachedInfo.logo.startsWith('data:') ? 'base64' : 'url') : 'none',
            logoLength: this.cachedInfo.logo ? this.cachedInfo.logo.length : 0
          });
        }
        
        return this.cachedInfo;
      } else if (error) {
        console.warn('⚠️ Error loading business info from lats_pos_general_settings:', error);
      }
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
      const updateData: any = {
        business_name: info.name,
        business_address: info.address,
        business_phone: info.phone,
        business_email: info.email,
        business_website: info.website,
        business_logo: info.logo
      };

      // Try to get current user first
      let user = null;
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        user = authUser;
      } catch (authErr) {
        // Not authenticated, continue with global settings
      }

      let existing = null;

      // First, try to get user-specific settings
      if (user) {
        const { data: userData } = await supabase
          .from('lats_pos_general_settings')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        
        if (userData) {
          existing = userData;
        }
      }

      // If no user-specific settings, try global settings (user_id = NULL)
      if (!existing) {
        const { data: globalData } = await supabase
          .from('lats_pos_general_settings')
          .select('id')
          .is('user_id', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (globalData) {
          existing = globalData;
        }
      }

      // If still no record, create one
      if (!existing) {
        const { data: newRecord, error: insertError } = await supabase
          .from('lats_pos_general_settings')
          .insert({
            ...updateData,
            user_id: user?.id || null
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error creating business info record:', insertError);
          return false;
        }

        // Clear cache to force refresh
        this.clearCache();
        return true;
      }

      // Update existing record
      const { error } = await supabase
        .from('lats_pos_general_settings')
        .update(updateData)
        .eq('id', existing.id);

      if (error) throw error;

      // Clear cache to force refresh
      this.clearCache();
      

      return true;
    } catch (err) {
      console.error('Failed to update business info:', err);
      return false;
    }
  }
}

// Export singleton instance
export const businessInfoService = new BusinessInfoService();

