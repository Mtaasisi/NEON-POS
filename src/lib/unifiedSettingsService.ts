import { supabase } from './supabaseClient';

export interface UnifiedSetting {
  id: string;
  scope: 'system' | 'user' | 'branch' | 'business';
  user_id?: string;
  branch_id?: string;
  business_id?: string;
  category: string;
  subcategory?: string;
  setting_key: string;
  setting_value_text?: string;
  setting_value_number?: number;
  setting_value_boolean?: boolean;
  setting_value_json?: any;
  setting_type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  description?: string;
  is_active: boolean;
  is_system_setting: boolean;
  validation_rules?: any;
  allowed_values?: string[];
  created_at: string;
  updated_at: string;
}

export interface SettingValue {
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
}

class UnifiedSettingsService {
  private cache: Map<string, UnifiedSetting[]> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get a setting value by scope, category, and key
   */
  async getSetting(
    scope: 'system' | 'user' | 'branch' | 'business',
    category: string,
    settingKey: string,
    userId?: string,
    branchId?: string,
    businessId?: string
  ): Promise<SettingValue | null> {
    const cacheKey = `${scope}-${category}-${settingKey}-${userId || ''}-${branchId || ''}-${businessId || ''}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && cached.length > 0) {
      return this.extractValue(cached[0]);
    }

    try {
      let query = supabase
        .from('settings')
        .select('*')
        .eq('scope', scope)
        .eq('category', category)
        .eq('setting_key', settingKey)
        .eq('is_active', true);

      // Add scope-specific filters
      if (scope === 'user' && userId) {
        query = query.eq('user_id', userId);
      } else if (scope === 'branch' && branchId) {
        query = query.eq('branch_id', branchId);
      } else if (scope === 'business' && businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query.limit(1).single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching setting:', error);
        return null;
      }

      if (data) {
        // Cache the result
        this.cache.set(cacheKey, [data]);
        return this.extractValue(data);
      }

      return null;
    } catch (error) {
      console.error('Error in getSetting:', error);
      return null;
    }
  }

  /**
   * Get all settings for a scope and category
   */
  async getSettingsByCategory(
    scope: 'system' | 'user' | 'branch' | 'business',
    category: string,
    userId?: string,
    branchId?: string,
    businessId?: string
  ): Promise<Record<string, SettingValue>> {
    const cacheKey = `category-${scope}-${category}-${userId || ''}-${branchId || ''}-${businessId || ''}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return this.convertSettingsArrayToObject(cached);
    }

    try {
      let query = supabase
        .from('settings')
        .select('*')
        .eq('scope', scope)
        .eq('category', category)
        .eq('is_active', true);

      // Add scope-specific filters
      if (scope === 'user' && userId) {
        query = query.eq('user_id', userId);
      } else if (scope === 'branch' && branchId) {
        query = query.eq('branch_id', branchId);
      } else if (scope === 'business' && businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching category settings:', error);
        return {};
      }

      if (data) {
        // Cache the results
        this.cache.set(cacheKey, data);
        return this.convertSettingsArrayToObject(data);
      }

      return {};
    } catch (error) {
      console.error('Error in getSettingsByCategory:', error);
      return {};
    }
  }

  /**
   * Set a setting value
   */
  async setSetting(
    scope: 'system' | 'user' | 'branch' | 'business',
    category: string,
    settingKey: string,
    value: any,
    valueType: 'string' | 'number' | 'boolean' | 'json' | 'array' = 'string',
    userId?: string,
    branchId?: string,
    businessId?: string,
    description?: string
  ): Promise<boolean> {
    try {
      // Prepare the data object
      const data: any = {
        scope,
        category,
        setting_key: settingKey,
        setting_type: valueType,
        description,
        updated_at: new Date().toISOString()
      };

      // Add scope-specific fields
      if (scope === 'user' && userId) {
        data.user_id = userId;
      } else if (scope === 'branch' && branchId) {
        data.branch_id = branchId;
      } else if (scope === 'business' && businessId) {
        data.business_id = businessId;
      }

      // Set the appropriate value field
      switch (valueType) {
        case 'string':
          data.setting_value_text = String(value);
          break;
        case 'number':
          data.setting_value_number = Number(value);
          break;
        case 'boolean':
          data.setting_value_boolean = Boolean(value);
          break;
        case 'json':
        case 'array':
          data.setting_value_json = value;
          break;
      }

      // First, check if the setting already exists
      let query = supabase
        .from('settings')
        .select('id')
        .eq('scope', scope)
        .eq('category', category)
        .eq('setting_key', settingKey)
        .eq('is_active', true);

      // Add scope-specific filters for the existence check
      if (scope === 'user' && userId) {
        query = query.eq('user_id', userId);
      } else if (scope === 'branch' && branchId) {
        query = query.eq('branch_id', branchId);
      } else if (scope === 'business' && businessId) {
        query = query.eq('business_id', businessId);
      } else {
        // For system scope, ensure user_id, branch_id, business_id are null
        query = query.is('user_id', null).is('branch_id', null).is('business_id', null);
      }

      const { data: existing, error: checkError } = await query.maybeSingle();

      let result;
      if (existing) {
        // Update existing setting
        result = await supabase
          .from('settings')
          .update(data)
          .eq('id', existing.id);
      } else {
        // Insert new setting
        result = await supabase
          .from('settings')
          .insert(data);
      }

      if (result.error) {
        console.error('Error setting value:', result.error);
        return false;
      }

      // Clear relevant caches
      this.clearCache();
      return true;
    } catch (error) {
      console.error('Error in setSetting:', error);
      return false;
    }
  }

  /**
   * Delete a setting
   */
  async deleteSetting(
    scope: 'system' | 'user' | 'branch' | 'business',
    category: string,
    settingKey: string,
    userId?: string,
    branchId?: string,
    businessId?: string
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('settings')
        .delete()
        .eq('scope', scope)
        .eq('category', category)
        .eq('setting_key', settingKey);

      // Add scope-specific filters
      if (scope === 'user' && userId) {
        query = query.eq('user_id', userId);
      } else if (scope === 'branch' && branchId) {
        query = query.eq('branch_id', branchId);
      } else if (scope === 'business' && businessId) {
        query = query.eq('business_id', businessId);
      }

      const { error } = await query;

      if (error) {
        console.error('Error deleting setting:', error);
        return false;
      }

      // Clear relevant caches
      this.clearCache();
      return true;
    } catch (error) {
      console.error('Error in deleteSetting:', error);
      return false;
    }
  }

  /**
   * Get business information (backward compatibility)
   */
  async getBusinessInfo(userId?: string, branchId?: string): Promise<any> {
    const businessSettings = await this.getSettingsByCategory('user', 'business_info', userId, branchId);

    return {
      name: businessSettings.business_name?.value || 'My Store',
      address: businessSettings.business_address?.value || '',
      phone: businessSettings.business_phone?.value || '',
      email: businessSettings.business_email?.value || '',
      website: businessSettings.business_website?.value || '',
      logo: businessSettings.business_logo?.value || null,
      instagram: businessSettings.business_instagram?.value || '',
      tiktok: businessSettings.business_tiktok?.value || '',
      whatsapp: businessSettings.business_whatsapp?.value || ''
    };
  }

  /**
   * Update business information (backward compatibility)
   */
  async updateBusinessInfo(info: any, userId?: string, branchId?: string): Promise<boolean> {
    const updates = [
      this.setSetting('user', 'business_info', 'business_name', info.name, 'string', userId, branchId),
      this.setSetting('user', 'business_info', 'business_address', info.address, 'string', userId, branchId),
      this.setSetting('user', 'business_info', 'business_phone', info.phone, 'string', userId, branchId),
      this.setSetting('user', 'business_info', 'business_email', info.email, 'string', userId, branchId),
      this.setSetting('user', 'business_info', 'business_website', info.website, 'string', userId, branchId),
      this.setSetting('user', 'business_info', 'business_logo', info.logo, 'string', userId, branchId),
      this.setSetting('user', 'business_info', 'business_instagram', info.instagram, 'string', userId, branchId),
      this.setSetting('user', 'business_info', 'business_tiktok', info.tiktok, 'string', userId, branchId),
      this.setSetting('user', 'business_info', 'business_whatsapp', info.whatsapp, 'string', userId, branchId)
    ];

    const results = await Promise.all(updates);
    return results.every(result => result);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Extract value from setting record
   */
  private extractValue(setting: UnifiedSetting): SettingValue {
    let value: any = null;

    switch (setting.setting_type) {
      case 'string':
        value = setting.setting_value_text;
        break;
      case 'number':
        value = setting.setting_value_number;
        break;
      case 'boolean':
        value = setting.setting_value_boolean;
        break;
      case 'json':
      case 'array':
        value = setting.setting_value_json;
        break;
    }

    return {
      value,
      type: setting.setting_type
    };
  }

  /**
   * Convert settings array to object
   */
  private convertSettingsArrayToObject(settings: UnifiedSetting[]): Record<string, SettingValue> {
    const result: Record<string, SettingValue> = {};

    settings.forEach(setting => {
      result[setting.setting_key] = this.extractValue(setting);
    });

    return result;
  }
}

export const unifiedSettingsService = new UnifiedSettingsService();
