import { supabase } from './supabaseClient';

export interface InventorySettings {
  // Stock Management
  low_stock_threshold: number;
  critical_stock_threshold: number;
  auto_reorder_enabled: boolean;
  reorder_point_percentage: number;
  minimum_order_quantity: number;
  maximum_stock_level: number;
  safety_stock_level: number;
  stock_counting_frequency: 'daily' | 'weekly' | 'monthly';
  
  // Pricing & Valuation
  default_markup_percentage: number;
  enable_dynamic_pricing: boolean;
  price_rounding_method: 'nearest' | 'up' | 'down';
  cost_calculation_method: 'fifo' | 'lifo' | 'average';
  auto_price_update: boolean;
  enable_bulk_discount: boolean;
  enable_seasonal_pricing: boolean;
  price_history_days: number;
  
  // Notifications & Alerts
  low_stock_alerts: boolean;
  out_of_stock_alerts: boolean;
  price_change_alerts: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  whatsapp_notifications: boolean;
  expiry_alert_days: number;
  overstock_alerts: boolean;
  slow_moving_alert_days: number;
  stock_discrepancy_alerts: boolean;
  
  // Tracking & Identification
  enable_barcode_tracking: boolean;
  enable_serial_tracking: boolean;
  enable_batch_tracking: boolean;
  enable_expiry_tracking: boolean;
  enable_location_tracking: boolean;
  enable_sku_auto_generation: boolean;
  barcode_format: string;
  enable_qr_code: boolean;
  
  // Multi-Branch/Multi-Location
  enable_branch_isolation: boolean;
  allow_inter_branch_transfer: boolean;
  transfer_approval_required: boolean;
  default_source_branch: string;
  stock_visibility_mode: 'own_branch' | 'all_branches';
  auto_stock_sync: boolean;
  sync_frequency: 'realtime' | 'hourly' | 'daily';
  
  // Security & Approvals
  require_approval_stock_adjustment: boolean;
  require_approval_price_change: boolean;
  enable_audit_logging: boolean;
  require_manager_pin: boolean;
  approval_threshold_amount: number;
  lock_historical_inventory: boolean;
  max_adjustment_percentage: number;
  
  // Backup & Data Management
  auto_backup_enabled: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  backup_retention_days: number;
  export_format: 'csv' | 'excel' | 'pdf';
  enable_data_archiving: boolean;
  archive_after_months: number;
  
  // Performance & Optimization
  cache_inventory_data: boolean;
  auto_refresh_interval: number;
  enable_analytics: boolean;
  enable_lazy_loading: boolean;
  pagination_size: number;
  enable_search_indexing: boolean;
  enable_image_optimization: boolean;
  
  // Product Organization
  auto_assign_categories: boolean;
  enable_subcategories: boolean;
  max_category_depth: number;
  default_category_id: string;
  enable_tags: boolean;
  enable_product_bundles: boolean;
  enable_product_variants: boolean;
  
  // Supplier Management
  enable_supplier_tracking: boolean;
  default_lead_time_days: number;
  preferred_supplier_auto_select: boolean;
  track_supplier_performance: boolean;
  enable_purchase_orders: boolean;
  auto_create_po_at_reorder: boolean;
  
  // Reporting & Analytics
  stock_valuation_report_frequency: 'daily' | 'weekly' | 'monthly';
  enable_inventory_turnover: boolean;
  enable_abc_analysis: boolean;
  dead_stock_threshold_days: number;
  enable_realtime_reporting: boolean;
  dashboard_refresh_rate: number;
  
  // Integration
  enable_pos_integration: boolean;
  enable_ecommerce_sync: boolean;
  enable_accounting_integration: boolean;
  enable_api_access: boolean;
  webhook_stock_changes: string;
  
  // Returns & Adjustments
  allow_returns_to_inventory: boolean;
  return_inspection_required: boolean;
  damaged_stock_handling: 'separate_bin' | 'write_off';
  adjustment_reason_required: boolean;
  max_return_period_days: number;
  
  // Units of Measure
  enable_multiple_uom: boolean;
  default_uom: string;
  enable_uom_conversion: boolean;
  quantity_decimal_places: number;
}

/**
 * Default inventory settings
 */
export const defaultInventorySettings: InventorySettings = {
  // Stock Management
  low_stock_threshold: 10,
  critical_stock_threshold: 5,
  auto_reorder_enabled: false,
  reorder_point_percentage: 20,
  minimum_order_quantity: 1,
  maximum_stock_level: 1000,
  safety_stock_level: 5,
  stock_counting_frequency: 'weekly',
  
  // Pricing & Valuation
  default_markup_percentage: 30,
  enable_dynamic_pricing: false,
  price_rounding_method: 'nearest',
  cost_calculation_method: 'average',
  auto_price_update: false,
  enable_bulk_discount: true,
  enable_seasonal_pricing: false,
  price_history_days: 365,
  
  // Notifications & Alerts
  low_stock_alerts: true,
  out_of_stock_alerts: true,
  price_change_alerts: false,
  email_notifications: true,
  sms_notifications: false,
  whatsapp_notifications: false,
  expiry_alert_days: 30,
  overstock_alerts: true,
  slow_moving_alert_days: 90,
  stock_discrepancy_alerts: true,
  
  // Tracking & Identification
  enable_barcode_tracking: true,
  enable_serial_tracking: false,
  enable_batch_tracking: false,
  enable_expiry_tracking: true,
  enable_location_tracking: false,
  enable_sku_auto_generation: true,
  barcode_format: 'EAN-13',
  enable_qr_code: true,
  
  // Multi-Branch/Multi-Location
  enable_branch_isolation: true,
  allow_inter_branch_transfer: true,
  transfer_approval_required: false,
  default_source_branch: '',
  stock_visibility_mode: 'own_branch',
  auto_stock_sync: false,
  sync_frequency: 'hourly',
  
  // Security & Approvals
  require_approval_stock_adjustment: false,
  require_approval_price_change: false,
  enable_audit_logging: true,
  require_manager_pin: false,
  approval_threshold_amount: 10000,
  lock_historical_inventory: false,
  max_adjustment_percentage: 50,
  
  // Backup & Data Management
  auto_backup_enabled: true,
  backup_frequency: 'daily',
  backup_retention_days: 90,
  export_format: 'excel',
  enable_data_archiving: true,
  archive_after_months: 12,
  
  // Performance & Optimization
  cache_inventory_data: true,
  auto_refresh_interval: 300,
  enable_analytics: true,
  enable_lazy_loading: true,
  pagination_size: 50,
  enable_search_indexing: true,
  enable_image_optimization: true,
  
  // Product Organization
  auto_assign_categories: false,
  enable_subcategories: true,
  max_category_depth: 3,
  default_category_id: '',
  enable_tags: true,
  enable_product_bundles: true,
  enable_product_variants: true,
  
  // Supplier Management
  enable_supplier_tracking: true,
  default_lead_time_days: 7,
  preferred_supplier_auto_select: false,
  track_supplier_performance: true,
  enable_purchase_orders: true,
  auto_create_po_at_reorder: false,
  
  // Reporting & Analytics
  stock_valuation_report_frequency: 'weekly',
  enable_inventory_turnover: true,
  enable_abc_analysis: true,
  dead_stock_threshold_days: 180,
  enable_realtime_reporting: true,
  dashboard_refresh_rate: 60,
  
  // Integration
  enable_pos_integration: true,
  enable_ecommerce_sync: false,
  enable_accounting_integration: false,
  enable_api_access: true,
  webhook_stock_changes: '',
  
  // Returns & Adjustments
  allow_returns_to_inventory: true,
  return_inspection_required: true,
  damaged_stock_handling: 'separate_bin',
  adjustment_reason_required: true,
  max_return_period_days: 30,
  
  // Units of Measure
  enable_multiple_uom: true,
  default_uom: 'piece',
  enable_uom_conversion: true,
  quantity_decimal_places: 2
};

/**
 * Get all inventory settings from the database
 */
export const getInventorySettings = async (): Promise<InventorySettings> => {
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value, setting_type')
      .eq('category', 'inventory')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching inventory settings:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      // No settings in database is expected for new installations - use defaults silently
      return defaultInventorySettings;
    }

    // Convert array of settings to object
    const settings: any = { ...defaultInventorySettings };
    
    data.forEach((setting) => {
      const key = setting.setting_key;
      const value = setting.setting_value;
      const type = setting.setting_type;

      // Type conversion based on setting_type
      if (type === 'boolean') {
        settings[key] = value === 'true' || value === true;
      } else if (type === 'number') {
        settings[key] = parseFloat(value) || 0;
      } else {
        settings[key] = value;
      }
    });

    return settings as InventorySettings;
  } catch (error) {
    console.error('Error in getInventorySettings:', error);
    return defaultInventorySettings;
  }
};

/**
 * Update a single inventory setting
 */
export const updateInventorySetting = async (
  key: keyof InventorySettings,
  value: any,
  reason?: string
): Promise<boolean> => {
  try {
    // Convert value to string for database storage
    const stringValue = typeof value === 'boolean' 
      ? value.toString() 
      : typeof value === 'number' 
      ? value.toString() 
      : String(value);

    // Determine type
    const settingType = typeof value === 'boolean' 
      ? 'boolean' 
      : typeof value === 'number' 
      ? 'number' 
      : 'string';

    const { error } = await supabase
      .from('admin_settings')
      .update({ 
        setting_value: stringValue,
        setting_type: settingType,
        updated_at: new Date().toISOString() 
      })
      .eq('category', 'inventory')
      .eq('setting_key', key);

    if (error) {
      console.error(`Error updating inventory setting ${key}:`, error);
      throw error;
    }

    console.log(`✅ Updated inventory setting: ${key} = ${stringValue}`);
    return true;
  } catch (error) {
    console.error(`Error in updateInventorySetting for ${key}:`, error);
    throw error;
  }
};

/**
 * Update multiple inventory settings at once
 */
export const updateInventorySettings = async (
  settings: Partial<InventorySettings>,
  reason?: string
): Promise<boolean> => {
  try {
    // Process each setting individually to avoid upsert conflicts
    const updatePromises = Object.entries(settings).map(async ([key, value]) => {
      const stringValue = typeof value === 'boolean' 
        ? value.toString() 
        : typeof value === 'number' 
        ? value.toString() 
        : String(value);

      const settingType = typeof value === 'boolean' 
        ? 'boolean' 
        : typeof value === 'number' 
        ? 'number' 
        : 'string';

      // First, try to update existing record
      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id')
        .eq('category', 'inventory')
        .eq('setting_key', key)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('admin_settings')
          .update({ 
            setting_value: stringValue,
            setting_type: settingType,
            updated_at: new Date().toISOString()
          })
          .eq('category', 'inventory')
          .eq('setting_key', key);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('admin_settings')
          .insert({
            category: 'inventory',
            setting_key: key,
            setting_value: stringValue,
            setting_type: settingType,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }
    });

    await Promise.all(updatePromises);

    console.log(`✅ Updated ${Object.keys(settings).length} inventory settings`);
    return true;
  } catch (error) {
    console.error('Error in updateInventorySettings:', error);
    throw error;
  }
};

/**
 * Reset inventory settings to defaults
 */
export const resetInventorySettings = async (): Promise<boolean> => {
  try {
    return await updateInventorySettings(defaultInventorySettings, 'Reset to defaults');
  } catch (error) {
    console.error('Error resetting inventory settings:', error);
    throw error;
  }
};

/**
 * Get a specific inventory setting value
 */
export const getInventorySetting = async (key: keyof InventorySettings): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('setting_value, setting_type')
      .eq('category', 'inventory')
      .eq('setting_key', key)
      .single();

    if (error) {
      console.error(`Error fetching inventory setting ${key}:`, error);
      return defaultInventorySettings[key];
    }

    if (!data) {
      return defaultInventorySettings[key];
    }

    // Convert based on type
    if (data.setting_type === 'boolean') {
      return data.setting_value === 'true' || data.setting_value === true;
    } else if (data.setting_type === 'number') {
      return parseFloat(data.setting_value) || 0;
    }

    return data.setting_value;
  } catch (error) {
    console.error(`Error in getInventorySetting for ${key}:`, error);
    return defaultInventorySettings[key];
  }
};

/**
 * Export inventory settings to JSON
 */
export const exportInventorySettings = async (): Promise<string> => {
  try {
    const settings = await getInventorySettings();
    return JSON.stringify(settings, null, 2);
  } catch (error) {
    console.error('Error exporting inventory settings:', error);
    throw error;
  }
};

/**
 * Import inventory settings from JSON
 */
export const importInventorySettings = async (jsonString: string): Promise<boolean> => {
  try {
    const settings = JSON.parse(jsonString) as Partial<InventorySettings>;
    return await updateInventorySettings(settings, 'Imported settings');
  } catch (error) {
    console.error('Error importing inventory settings:', error);
    throw error;
  }
};

