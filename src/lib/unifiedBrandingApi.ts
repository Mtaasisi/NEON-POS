import { supabase } from './supabaseClient';
import toast from 'react-hot-toast';

/**
 * Unified Branding Settings
 * This is the SINGLE SOURCE OF TRUTH for all branding across the app
 * Both Admin Settings and POS Settings will reference this
 */
export interface UnifiedBrandingSettings {
  id?: string;
  user_id?: string;
  
  // Logo & Visual Identity
  business_logo: string | null;
  app_logo: string | null; // Alternative logo for app header
  logo_size: 'small' | 'medium' | 'large';
  logo_position: 'left' | 'center' | 'right';
  
  // Company Information
  company_name: string;
  business_name: string; // Alternative name for receipts/invoices
  business_address: string;
  business_phone: string;
  business_email: string;
  business_website: string;
  
  // Color Scheme
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  
  // Additional Settings
  tagline?: string;
  tax_id?: string;
  registration_number?: string;
  
  created_at?: string;
  updated_at?: string;
}

const TABLE_NAME = 'unified_branding_settings';

// Cache for current user to prevent excessive auth calls
let currentUserCache: { user: any; timestamp: number } | null = null;
const USER_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

class UnifiedBrandingAPI {
  // Get current user from Supabase auth
  private static async getCurrentUser() {
    // Check cache first
    if (currentUserCache && (Date.now() - currentUserCache.timestamp) < USER_CACHE_DURATION) {
      return currentUserCache.user;
    }
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No active session');
      }
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Cache the user
      currentUserCache = { user, timestamp: Date.now() };
      return user;
    } catch (error) {
      console.error('Auth error:', error);
      throw new Error('Authentication failed');
    }
  }

  // Clear user cache (call this on logout)
  static clearUserCache() {
    currentUserCache = null;
  }

  // Get default branding settings
  private static getDefaultSettings(userId: string): UnifiedBrandingSettings {
    return {
      user_id: userId,
      business_logo: null,
      app_logo: null,
      logo_size: 'medium',
      logo_position: 'left',
      company_name: 'My Business',
      business_name: 'My Business',
      business_address: '',
      business_phone: '',
      business_email: '',
      business_website: '',
      primary_color: '#3B82F6',
      secondary_color: '#1E40AF',
      accent_color: '#10B981',
      tagline: '',
      tax_id: '',
      registration_number: ''
    };
  }

  /**
   * Load unified branding settings
   * This is the main function that all components should use
   */
  static async loadSettings(): Promise<UnifiedBrandingSettings | null> {
    try {
      const user = await this.getCurrentUser();

      // Try to get existing settings
      const { data: existingData, error: existingError } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingError) {
        // If table doesn't exist or RLS issues, return defaults
        if (existingError.code === '42P01' || existingError.code === 'PGRST116') {
          return this.getDefaultSettings(user.id);
        }
        console.error('Error loading branding settings:', existingError);
        return this.getDefaultSettings(user.id);
      }

      return existingData as UnifiedBrandingSettings;
    } catch (error) {
      console.error('Error loading branding settings:', error);
      try {
        const user = await this.getCurrentUser();
        return this.getDefaultSettings(user.id);
      } catch {
        return null;
      }
    }
  }

  /**
   * Save unified branding settings
   */
  static async saveSettings(
    settings: Omit<UnifiedBrandingSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<UnifiedBrandingSettings | null> {
    try {
      const user = await this.getCurrentUser();

      // Check if settings already exist
      const { data: existing } = await supabase
        .from(TABLE_NAME)
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Update existing settings
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .update({
            ...settings,
            user_id: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating branding settings:', error);
          toast.error('Failed to update branding settings');
          return null;
        }

        toast.success('Branding settings updated successfully');
        return data as UnifiedBrandingSettings;
      } else {
        // Insert new settings
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .insert({
            ...settings,
            user_id: user.id
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating branding settings:', error);
          toast.error('Failed to create branding settings');
          return null;
        }

        toast.success('Branding settings created successfully');
        return data as UnifiedBrandingSettings;
      }
    } catch (error) {
      console.error('Error saving branding settings:', error);
      toast.error('Failed to save branding settings');
      return null;
    }
  }

  /**
   * Update specific branding fields
   */
  static async updateSettings(
    updates: Partial<Omit<UnifiedBrandingSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<UnifiedBrandingSettings | null> {
    try {
      const user = await this.getCurrentUser();

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating branding settings:', error);
        return null;
      }

      return data as UnifiedBrandingSettings;
    } catch (error) {
      console.error('Error updating branding settings:', error);
      return null;
    }
  }

  /**
   * Migrate data from old POS settings to unified branding
   * This should be called once during upgrade
   */
  static async migrateFromPOSSettings(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();

      // Get existing POS general settings
      const { data: posSettings } = await supabase
        .from('lats_pos_general_settings')
        .select('business_name, business_address, business_phone, business_email, business_website, business_logo')
        .eq('user_id', user.id)
        .single();

      if (!posSettings) {
        return false; // No data to migrate
      }

      // Check if branding settings already exist
      const { data: existingBranding } = await supabase
        .from(TABLE_NAME)
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingBranding) {
        console.log('Branding settings already exist, skipping migration');
        return true; // Already migrated
      }

      // Create new branding settings from POS data
      const brandingSettings: Partial<UnifiedBrandingSettings> = {
        business_logo: posSettings.business_logo,
        app_logo: posSettings.business_logo,
        company_name: posSettings.business_name || 'My Business',
        business_name: posSettings.business_name || 'My Business',
        business_address: posSettings.business_address || '',
        business_phone: posSettings.business_phone || '',
        business_email: posSettings.business_email || '',
        business_website: posSettings.business_website || '',
        logo_size: 'medium',
        logo_position: 'left',
        primary_color: '#3B82F6',
        secondary_color: '#1E40AF',
        accent_color: '#10B981'
      };

      const result = await this.saveSettings(brandingSettings);
      
      if (result) {
        console.log('Successfully migrated branding settings from POS');
        toast.success('Branding settings migrated successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error migrating branding settings:', error);
      return false;
    }
  }

  /**
   * Migrate data from old Admin settings to unified branding
   */
  static async migrateFromAdminSettings(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();

      // Get existing admin branding settings (if stored in localStorage or database)
      const adminBranding = localStorage.getItem('adminSettings');
      if (!adminBranding) {
        return false;
      }

      const parsed = JSON.parse(adminBranding);
      const branding = parsed.branding;

      if (!branding) {
        return false;
      }

      // Check if branding settings already exist
      const { data: existingBranding } = await supabase
        .from(TABLE_NAME)
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingBranding) {
        console.log('Branding settings already exist, skipping admin migration');
        return true;
      }

      // Create new branding settings from admin data
      const brandingSettings: Partial<UnifiedBrandingSettings> = {
        app_logo: branding.appLogo,
        business_logo: branding.appLogo,
        company_name: branding.companyName || 'My Business',
        business_name: branding.companyName || 'My Business',
        primary_color: branding.primaryColor || '#3B82F6',
        secondary_color: branding.secondaryColor || '#1E40AF',
        logo_size: branding.logoSize || 'medium',
        logo_position: branding.logoPosition || 'left',
        accent_color: '#10B981',
        business_address: '',
        business_phone: '',
        business_email: '',
        business_website: ''
      };

      const result = await this.saveSettings(brandingSettings);
      
      if (result) {
        console.log('Successfully migrated branding settings from Admin');
        toast.success('Admin branding settings migrated successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error migrating admin branding settings:', error);
      return false;
    }
  }

  /**
   * Subscribe to branding settings changes
   */
  static subscribeToSettings(callback: (settings: UnifiedBrandingSettings) => void) {
    return supabase
      .channel(`${TABLE_NAME}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLE_NAME
        },
        (payload) => {
          callback(payload.new as UnifiedBrandingSettings);
        }
      )
      .subscribe();
  }

  /**
   * Unsubscribe from branding settings changes
   */
  static unsubscribeFromSettings() {
    supabase.removeChannel(`${TABLE_NAME}_changes`);
  }
}

export default UnifiedBrandingAPI;

