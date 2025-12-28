import { unifiedSettingsService } from './unifiedSettingsService';

export interface AdminSetting {
  id: string;
  category: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  branch_id?: string;
}

export interface AdminSettingsLog {
  id: string;
  setting_id: string;
  category: string;
  setting_key: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  change_reason: string | null;
  created_at: string;
}

/**
 * Get all admin settings from unified settings table
 */
export const getAdminSettings = async (): Promise<AdminSetting[]> => {
  try {
    // Get all system-scoped settings (admin settings)
    const allSystemSettings = await unifiedSettingsService.getSettingsByCategory('system', 'system');

    // Convert to AdminSetting format
    const adminSettings: AdminSetting[] = Object.entries(allSystemSettings).map(([key, value]) => ({
      id: `system-${key}`, // Generate ID
      category: 'system',
      setting_key: key,
      setting_value: value.value?.toString() || '',
      setting_type: value.type,
      description: undefined, // Not stored in unified format
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      branch_id: undefined
    }));

    return adminSettings;
  } catch (error) {
    console.error('Error fetching admin settings from unified table:', error);
    throw error;
  }
};

/**
 * Get admin settings by category
 */
export const getAdminSettingsByCategory = async (category: string): Promise<AdminSetting[]> => {
  try {
    // Get settings by category from unified table
    const categorySettings = await unifiedSettingsService.getSettingsByCategory('system', category);

    // Convert to AdminSetting format
    const adminSettings: AdminSetting[] = Object.entries(categorySettings).map(([key, value]) => ({
      id: `system-${category}-${key}`, // Generate ID
      category: category,
      setting_key: key,
      setting_value: value.value?.toString() || '',
      setting_type: value.type,
      description: undefined,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      branch_id: undefined
    }));

    return adminSettings;
  } catch (error) {
    console.error(`Error fetching admin settings for category ${category} from unified table:`, error);
    throw error;
  }
};

/**
 * Get a specific admin setting
 */
export const getAdminSetting = async (category: string, key: string): Promise<AdminSetting | null> => {
  try {
    // ✅ FIX: admin_settings table was consolidated, use unified settings service
    const { unifiedSettingsService } = await import('./unifiedSettingsService');
    const settingValue = await unifiedSettingsService.getSetting('system', category, key);

    if (settingValue === null || settingValue === undefined) {
      return null;
    }

    // Convert unified setting format to AdminSetting format
    return {
      id: `unified-${category}-${key}`,
      category,
      setting_key: key,
      setting_value: settingValue,
      setting_type: typeof settingValue,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error fetching admin setting ${category}.${key}:`, error);
    throw error;
  }
};

/**
 * Update an admin setting
 */
export const updateAdminSetting = async (
  category: string,
  key: string,
  value: string,
  reason?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .rpc('update_admin_setting', {
        category_name: category,
        key_name: key,
        new_value: value,
        reason: reason || null
      });

    if (error) {
      console.error(`Error updating admin setting ${category}.${key}:`, error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error(`Error updating admin setting ${category}.${key}:`, error);
    throw error;
  }
};

/**
 * Update multiple admin settings
 */
export const updateAdminSettings = async (
  settings: Array<{ category: string; key: string; value: string; reason?: string }>
): Promise<boolean> => {
  try {
    const updates = settings.map(setting => ({
      category: setting.category,
      setting_key: setting.key,
      setting_value: setting.value,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('admin_settings')
      .upsert(updates, { onConflict: 'category,setting_key' });

    if (error) {
      console.error('Error updating admin settings:', error);
      throw error;
    }

    // Log the changes
    for (const setting of settings) {
      if (setting.reason) {
        try {
          await updateAdminSetting(setting.category, setting.key, setting.value, setting.reason);
        } catch (logError) {
          console.warn('Failed to log setting change:', logError);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating admin settings:', error);
    throw error;
  }
};

/**
 * Get admin settings logs
 */
export const getAdminSettingsLogs = async (
  limit: number = 50,
  offset: number = 0
): Promise<AdminSettingsLog[]> => {
  try {
    const { data, error } = await supabase
      .from('admin_settings_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching admin settings logs:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching admin settings logs:', error);
    throw error;
  }
};

/**
 * Get admin settings logs by category
 */
export const getAdminSettingsLogsByCategory = async (
  category: string,
  limit: number = 50,
  offset: number = 0
): Promise<AdminSettingsLog[]> => {
  try {
    const { data, error } = await supabase
      .from('admin_settings_log')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error(`Error fetching admin settings logs for category ${category}:`, error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error(`Error fetching admin settings logs for category ${category}:`, error);
    throw error;
  }
};

/**
 * Get admin settings logs by setting
 */
export const getAdminSettingsLogsBySetting = async (
  category: string,
  key: string,
  limit: number = 50,
  offset: number = 0
): Promise<AdminSettingsLog[]> => {
  try {
    const { data, error } = await supabase
      .from('admin_settings_log')
      .select('*')
      .eq('category', category)
      .eq('setting_key', key)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error(`Error fetching admin settings logs for ${category}.${key}:`, error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error(`Error fetching admin settings logs for ${category}.${key}:`, error);
    throw error;
  }
};

/**
 * Convert settings array to object by category
 */
export const groupSettingsByCategory = (settings: AdminSetting[]): Record<string, Record<string, any>> => {
  const grouped: Record<string, Record<string, any>> = {};

  settings.forEach(setting => {
    if (!grouped[setting.category]) {
      grouped[setting.category] = {};
    }

    // Convert value based on type
    let value: any = setting.setting_value;
    if (setting.setting_type === 'number') {
      value = parseFloat(setting.setting_value);
    } else if (setting.setting_type === 'boolean') {
      value = setting.setting_value === 'true';
    } else if (setting.setting_type === 'json') {
      try {
        value = JSON.parse(setting.setting_value);
      } catch {
        value = setting.setting_value;
      }
    }

    grouped[setting.category][setting.setting_key] = value;
  });

  return grouped;
};

/**
 * Convert settings object to array for database
 */
export const flattenSettingsForDatabase = (
  settings: Record<string, Record<string, any>>,
  category: string
): Array<{ category: string; setting_key: string; setting_value: string; setting_type: string }> => {
  const flattened: Array<{ category: string; setting_key: string; setting_value: string; setting_type: string }> = [];

  Object.entries(settings[category] || {}).forEach(([key, value]) => {
    let stringValue: string;
    let type: string;

    if (typeof value === 'boolean') {
      stringValue = value.toString();
      type = 'boolean';
    } else if (typeof value === 'number') {
      stringValue = value.toString();
      type = 'number';
    } else if (typeof value === 'object') {
      stringValue = JSON.stringify(value);
      type = 'json';
    } else {
      stringValue = String(value);
      type = 'string';
    }

    flattened.push({
      category,
      setting_key: key,
      setting_value: stringValue,
      setting_type: type
    });
  });

  return flattened;
}; 