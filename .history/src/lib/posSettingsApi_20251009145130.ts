import { supabase } from './supabaseClient';

// Types for all POS settings
export interface GeneralSettings {
  id?: string;
  user_id?: string;
  business_id?: string;
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'sw' | 'fr';
  currency: string;
  timezone: string;
  date_format: string;
  time_format: '12' | '24';
  show_product_images: boolean;
  show_stock_levels: boolean;
  show_prices: boolean;
  show_barcodes: boolean;
  products_per_page: number;
  auto_complete_search: boolean;
  confirm_delete: boolean;
  show_confirmations: boolean;
  enable_sound_effects: boolean;
  sound_volume: number;
  enable_click_sounds: boolean;
  enable_cart_sounds: boolean;
  enable_payment_sounds: boolean;
  enable_delete_sounds: boolean;
  enable_animations: boolean;
  enable_caching: boolean;
  cache_duration: number;
  enable_lazy_loading: boolean;
  max_search_results: number;
  enable_tax: boolean;
  tax_rate: number;
}

export interface DynamicPricingSettings {
  id?: string;
  user_id?: string;
  business_id?: string;
  enable_dynamic_pricing: boolean;
  enable_loyalty_pricing: boolean;
  enable_bulk_pricing: boolean;
  enable_time_based_pricing: boolean;
  enable_customer_pricing: boolean;
  enable_special_events: boolean;
  loyalty_discount_percent: number;
  loyalty_points_threshold: number;
  loyalty_max_discount: number;
  bulk_discount_enabled: boolean;
  bulk_discount_threshold: number;
  bulk_discount_percent: number;
  time_based_discount_enabled: boolean;
  time_based_start_time: string;
  time_based_end_time: string;
  time_based_discount_percent: number;
  customer_pricing_enabled: boolean;
  vip_customer_discount: number;
  regular_customer_discount: number;
  special_events_enabled: boolean;
  special_event_discount_percent: number;
}

export interface ReceiptSettings {
  id?: string;
  user_id?: string;
  business_id?: string;
  receipt_template: 'standard' | 'compact' | 'detailed' | 'custom';
  receipt_width: number;
  receipt_font_size: number;
  show_business_logo: boolean;
  show_business_name: boolean;
  show_business_address: boolean;
  show_business_phone: boolean;
  show_business_email: boolean;
  show_business_website: boolean;
  show_transaction_id: boolean;
  show_date_time: boolean;
  show_cashier_name: boolean;
  show_customer_name: boolean;
  show_customer_phone: boolean;
  show_product_names: boolean;
  show_product_skus: boolean;
  show_product_barcodes: boolean;
  show_quantities: boolean;
  show_unit_prices: boolean;
  show_discounts: boolean;
  show_subtotal: boolean;
  show_tax: boolean;
  show_discount_total: boolean;
  show_grand_total: boolean;
  show_payment_method: boolean;
  show_change_amount: boolean;
  auto_print_receipt: boolean;
  print_duplicate_receipt: boolean;
  enable_email_receipt: boolean;
  enable_sms_receipt: boolean;
  enable_receipt_numbering: boolean;
  receipt_number_prefix: string;
  receipt_number_start: number;
  receipt_number_format: string;
  show_footer_message: boolean;
  footer_message: string;
  show_return_policy: boolean;
  return_policy_text: string;
}

export interface BarcodeScannerSettings {
  id?: string;
  user_id?: string;
  business_id?: string;
  enable_barcode_scanner: boolean;
  enable_camera_scanner: boolean;
  enable_keyboard_input: boolean;
  enable_manual_entry: boolean;
  auto_add_to_cart: boolean;
  auto_focus_search: boolean;
  play_sound_on_scan: boolean;
  vibrate_on_scan: boolean;
  show_scan_feedback: boolean;
  show_invalid_barcode_alert: boolean;
  allow_unknown_products: boolean;
  prompt_for_unknown_products: boolean;
  retry_on_error: boolean;
  max_retry_attempts: number;
  scanner_device_name?: string;
  scanner_connection_type: 'usb' | 'bluetooth' | 'wifi';
  scanner_timeout: number;
  support_ean13: boolean;
  support_ean8: boolean;
  support_upc_a: boolean;
  support_upc_e: boolean;
  support_code128: boolean;
  support_code39: boolean;
  support_qr_code: boolean;
  support_data_matrix: boolean;
  enable_continuous_scanning: boolean;
  scan_delay: number;
  enable_scan_history: boolean;
  max_scan_history: number;
}

export interface DeliveryMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedTime: string;
  isDefault: boolean;
  enabled: boolean;
}

export interface DeliverySettings {
  id?: string;
  user_id?: string;
  business_id?: string;
  enable_delivery: boolean;
  default_delivery_fee: number;
  free_delivery_threshold: number;
  max_delivery_distance: number;
  enable_delivery_areas: boolean;
  delivery_areas: string[];
  area_delivery_fees: Record<string, number>;
  area_delivery_times: Record<string, number>;
  enable_delivery_hours: boolean;
  delivery_start_time: string;
  delivery_end_time: string;
  enable_same_day_delivery: boolean;
  enable_next_day_delivery: boolean;
  delivery_time_slots: string[];
  notify_customer_on_delivery: boolean;
  notify_driver_on_assignment: boolean;
  enable_sms_notifications: boolean;
  enable_email_notifications: boolean;
  enable_driver_assignment: boolean;
  driver_commission: number;
  require_signature: boolean;
  enable_driver_tracking: boolean;
  enable_scheduled_delivery: boolean;
  enable_partial_delivery: boolean;
  require_advance_payment: boolean;
  advance_payment_percent: number;
}

export interface SearchFilterSettings {
  id?: string;
  user_id?: string;
  business_id?: string;
  
  // Search Settings
  enable_product_search: boolean;
  enable_customer_search: boolean;
  enable_sales_search: boolean;
  search_by_name: boolean;
  search_by_barcode: boolean;
  search_by_sku: boolean;
  search_by_category: boolean;

  search_by_supplier: boolean;
  search_by_description: boolean;
  search_by_tags: boolean;
  
  // Advanced Search
  enable_fuzzy_search: boolean;
  enable_autocomplete: boolean;
  min_search_length: number;
  max_search_results: number;
  search_timeout: number;
  search_debounce_time: number;
  
  // Search History
  enable_search_history: boolean;
  max_search_history: number;
  enable_recent_searches: boolean;
  enable_popular_searches: boolean;
  enable_search_suggestions: boolean;
}

export interface UserPermissionsSettings {
  id?: string;
  user_id?: string;
  business_id?: string;
  enable_pos_access: boolean;
  enable_sales_access: boolean;
  enable_refunds_access: boolean;
  enable_void_access: boolean;
  enable_discount_access: boolean;
  enable_inventory_view: boolean;
  enable_inventory_edit: boolean;
  enable_stock_adjustments: boolean;
  enable_product_creation: boolean;
  enable_product_deletion: boolean;
  enable_customer_view: boolean;
  enable_customer_creation: boolean;
  enable_customer_edit: boolean;
  enable_customer_deletion: boolean;
  enable_customer_history: boolean;
  enable_payment_processing: boolean;
  enable_cash_management: boolean;
  enable_daily_reports: boolean;
  enable_financial_reports: boolean;
  enable_tax_management: boolean;
  enable_settings_access: boolean;
  enable_user_management: boolean;
  enable_backup_restore: boolean;
  enable_system_maintenance: boolean;
  enable_api_access: boolean;
  enable_audit_logs: boolean;
  enable_security_settings: boolean;
  enable_password_reset: boolean;
  enable_session_management: boolean;
  enable_data_export: boolean;
}

export interface LoyaltyCustomerSettings {
  id?: string;
  user_id?: string;
  business_id?: string;
  enable_loyalty_program: boolean;
  loyalty_program_name: string;
  points_per_currency: number;
  points_redemption_rate: number;
  minimum_points_redemption: number;
  points_expiry_days: number;
  enable_customer_registration: boolean;
  require_customer_info: boolean;
  enable_customer_categories: boolean;
  enable_customer_tags: boolean;
  enable_customer_notes: boolean;
  enable_automatic_rewards: boolean;
  enable_manual_rewards: boolean;
  enable_birthday_rewards: boolean;
  enable_anniversary_rewards: boolean;
  enable_referral_rewards: boolean;
  enable_email_communication: boolean;
  enable_sms_communication: boolean;
  enable_push_notifications: boolean;
  enable_marketing_emails: boolean;
  enable_customer_analytics: boolean;
  enable_purchase_history: boolean;
  enable_spending_patterns: boolean;
  enable_customer_segmentation: boolean;
  enable_customer_insights: boolean;
}

export interface AnalyticsReportingSettings {
  id?: string;
  user_id?: string;
  business_id?: string;
  enable_analytics: boolean;
  enable_real_time_analytics: boolean;
  analytics_refresh_interval: number;
  enable_data_export: boolean;
  enable_sales_analytics: boolean;
  enable_sales_trends: boolean;
  enable_product_performance: boolean;
  enable_customer_analytics: boolean;
  enable_revenue_tracking: boolean;
  enable_inventory_analytics: boolean;
  enable_stock_alerts: boolean;
  enable_low_stock_reports: boolean;
  enable_inventory_turnover: boolean;
  enable_supplier_analytics: boolean;
  enable_automated_reports: boolean;
  report_generation_time: string;
  enable_email_reports: boolean;
  enable_pdf_reports: boolean;
  enable_excel_reports: boolean;
  enable_custom_dashboard: boolean;
  enable_kpi_widgets: boolean;
  enable_chart_animations: boolean;
  enable_data_drill_down: boolean;
  enable_comparative_analysis: boolean;
  enable_predictive_analytics: boolean;
  enable_data_retention: boolean;
  data_retention_days: number;
  enable_data_backup: boolean;
  enable_api_export: boolean;
}

export interface NotificationSettings {
  id?: string;
  user_id?: string;
  business_id?: string;
  enable_notifications: boolean;
  enable_sound_notifications: boolean;
  enable_visual_notifications: boolean;
  enable_push_notifications: boolean;
  notification_timeout: number;
  enable_sales_notifications: boolean;
  notify_on_sale_completion: boolean;
  notify_on_refund: boolean;
  notify_on_void: boolean;
  notify_on_discount: boolean;
  enable_inventory_notifications: boolean;
  notify_on_low_stock: boolean;
  low_stock_threshold: number;
  notify_on_out_of_stock: boolean;
  notify_on_stock_adjustment: boolean;
  enable_customer_notifications: boolean;
  notify_on_customer_registration: boolean;
  notify_on_loyalty_points: boolean;
  notify_on_customer_birthday: boolean;
  notify_on_customer_anniversary: boolean;
  enable_system_notifications: boolean;
  notify_on_system_errors: boolean;
  notify_on_backup_completion: boolean;
  notify_on_sync_completion: boolean;
  notify_on_maintenance: boolean;
  enable_email_notifications: boolean;
  enable_sms_notifications: boolean;
  enable_in_app_notifications: boolean;
  enable_desktop_notifications: boolean;
}

export interface AdvancedSettings {
  id?: string;
  user_id?: string;
  business_id?: string;
  enable_performance_mode: boolean;
  enable_caching: boolean;
  cache_size: number;
  enable_lazy_loading: boolean;
  max_concurrent_requests: number;
  enable_database_optimization: boolean;
  enable_auto_backup: boolean;
  backup_frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  enable_data_compression: boolean;
  enable_query_optimization: boolean;
  enable_two_factor_auth: boolean;
  enable_session_timeout: boolean;
  session_timeout_minutes: number;
  enable_audit_logging: boolean;
  enable_encryption: boolean;
  enable_api_access: boolean;
  enable_webhooks: boolean;
  enable_third_party_integrations: boolean;
  enable_data_sync: boolean;
  sync_interval: number;
  enable_debug_mode: boolean;
  enable_error_reporting: boolean;
  enable_performance_monitoring: boolean;
  enable_logging: boolean;
  log_level: 'error' | 'warn' | 'info' | 'debug';
  enable_experimental_features: boolean;
  enable_beta_features: boolean;
  enable_custom_scripts: boolean;
  enable_plugin_system: boolean;
  enable_auto_updates: boolean;
}

// Generic settings type for all settings
export type POSSettingsType = 
  | GeneralSettings 
  | DynamicPricingSettings 
  | ReceiptSettings 
  | BarcodeScannerSettings 
  | DeliverySettings 
  | SearchFilterSettings 
  | UserPermissionsSettings 
  | LoyaltyCustomerSettings 
  | AnalyticsReportingSettings 
  | NotificationSettings 
  | AdvancedSettings;

// Settings table names mapping
export const SETTINGS_TABLES = {
  general: 'lats_pos_general_settings',
  pricing: 'lats_pos_dynamic_pricing_settings',
  receipt: 'lats_pos_receipt_settings',
  scanner: 'lats_pos_barcode_scanner_settings',
  delivery: 'lats_pos_delivery_settings',
  search: 'lats_pos_search_filter_settings',
  permissions: 'lats_pos_user_permissions_settings',
  loyalty: 'lats_pos_loyalty_customer_settings',
  analytics: 'lats_pos_analytics_reporting_settings',
  notifications: 'lats_pos_notification_settings',
  advanced: 'lats_pos_advanced_settings'
} as const;

export type SettingsTableKey = keyof typeof SETTINGS_TABLES;

// Enhanced cache for current user to prevent excessive auth calls
let currentUserCache: { user: any; timestamp: number } | null = null;
const USER_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (increased from 5)
let cacheRefreshPromise: Promise<any> | null = null; // Prevent multiple simultaneous auth calls

// API Functions for POS Settings
export class POSSettingsAPI {
  // Enhanced function to get current user with improved caching and deduplication
  private static async getCurrentUser() {
    // Check cache first
    if (currentUserCache && (Date.now() - currentUserCache.timestamp) < USER_CACHE_DURATION) {
      // Only log cached user access occasionally to reduce spam
      if (Math.random() < 0.01) { // 1% chance to log

      }
      return currentUserCache.user;
    }
    
    // If there's already a refresh in progress, wait for it
    if (cacheRefreshPromise) {

      return await cacheRefreshPromise;
    }
    
    // Start a new refresh
    cacheRefreshPromise = this.performAuthRefresh();
    try {
      const user = await cacheRefreshPromise;
      return user;
    } finally {
      cacheRefreshPromise = null;
    }
  }

  // Separate method for actual auth refresh
  private static async performAuthRefresh() {
    // Get current session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      // Silently handle session errors
    }
    
    if (!session) {
      // No session available
    }
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // Silently handle auth errors
    }

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Cache the user
    currentUserCache = { user, timestamp: Date.now() };
    return user;
  }

  // Clear user cache (call this on logout or when needed)
  static clearUserCache() {
    currentUserCache = null;
  }

  // Get default settings for a specific table
  private static getDefaultSettings(tableKey: SettingsTableKey, userId: string): any {
    const baseRecord = {
      user_id: userId,
      business_id: null
    };

    switch (tableKey) {
      case 'general':
        return {
          ...baseRecord,
          theme: 'light',
          language: 'en',
          currency: 'TZS',
          timezone: 'Africa/Dar_es_Salaam',
          date_format: 'DD/MM/YYYY',
          time_format: '24',
          show_product_images: true,
          show_stock_levels: true,
          show_prices: true,
          show_barcodes: true,
          products_per_page: 20,
          auto_complete_search: true,
          confirm_delete: true,
          show_confirmations: true,
          enable_sound_effects: true,
          enable_animations: true,
          enable_caching: true,
          cache_duration: 300,
          enable_lazy_loading: true,
          max_search_results: 50,
          enable_tax: true,
          tax_rate: 16
        };
      
      case 'pricing':
        return {
          ...baseRecord,
          enable_dynamic_pricing: true,
          enable_loyalty_pricing: true,
          enable_bulk_pricing: true,
          enable_time_based_pricing: false,
          enable_customer_pricing: false,
          enable_special_events: false,
          loyalty_discount_percent: 5.00,
          loyalty_points_threshold: 1000,
          loyalty_max_discount: 20.00,
          bulk_discount_enabled: true,
          bulk_discount_threshold: 10,
          bulk_discount_percent: 10.00,
          time_based_discount_enabled: false,
          time_based_start_time: '18:00',
          time_based_end_time: '22:00',
          time_based_discount_percent: 15.00,
          customer_pricing_enabled: false,
          vip_customer_discount: 10.00,
          regular_customer_discount: 5.00,
          special_events_enabled: false,
          special_event_discount_percent: 20.00
        };
      
      case 'receipt':
        return {
          ...baseRecord,
          receipt_template: 'standard',
          receipt_width: 80,
          receipt_font_size: 12,
          show_business_logo: true,
          show_business_name: true,
          show_business_address: true,
          show_business_phone: true,
          show_business_email: false,
          show_business_website: false,
          show_transaction_id: true,
          show_date_time: true,
          show_cashier_name: true,
          show_customer_name: true,
          show_customer_phone: false,
          show_product_names: true,
          show_product_skus: false,
          show_product_barcodes: false,
          show_quantities: true,
          show_unit_prices: true,
          show_discounts: true,
          show_subtotal: true,
          show_tax: true,
          show_discount_total: true,
          show_grand_total: true,
          show_payment_method: true,
          show_change_amount: true,
          auto_print_receipt: false,
          print_duplicate_receipt: false,
          enable_email_receipt: false,
          enable_sms_receipt: false,
          enable_receipt_numbering: true,
          receipt_number_prefix: 'RCP',
          receipt_number_start: 1,
          receipt_number_format: 'RCP-{YEAR}-{NUMBER}',
          show_footer_message: true,
          footer_message: 'Thank you for your business!',
          show_return_policy: false,
          return_policy_text: 'Returns accepted within 7 days with receipt'
        };

      case 'scanner':
        return {
          ...baseRecord,
          enable_barcode_scanner: true,
          enable_camera_scanner: false,
          enable_keyboard_input: true,
          enable_manual_entry: true,
          auto_add_to_cart: true,
          auto_focus_search: true,
          play_sound_on_scan: true,
          vibrate_on_scan: false,
          show_scan_feedback: true,
          show_invalid_barcode_alert: true,
          allow_unknown_products: false,
          prompt_for_unknown_products: true,
          retry_on_error: true,
          max_retry_attempts: 3,
          scanner_connection_type: 'usb',
          scanner_timeout: 5000,
          support_ean13: true,
          support_ean8: true,
          support_upc_a: true,
          support_upc_e: true,
          support_code128: true,
          support_code39: true,
          support_qr_code: true,
          support_data_matrix: false,
          enable_continuous_scanning: false,
          scan_delay: 500,
          enable_scan_history: true,
          max_scan_history: 50
        };

      case 'delivery':
        return {
          ...baseRecord,
          enable_delivery: true,
          default_delivery_fee: 5000,
          free_delivery_threshold: 50000,
          max_delivery_distance: 20,
          enable_delivery_areas: false,
          delivery_areas: [],
          area_delivery_fees: {},
          area_delivery_times: {},
          enable_delivery_hours: false,
          delivery_start_time: '08:00',
          delivery_end_time: '18:00',
          enable_same_day_delivery: true,
          enable_next_day_delivery: true,
          delivery_time_slots: [],
          notify_customer_on_delivery: true,
          notify_driver_on_assignment: true,
          enable_sms_notifications: false,
          enable_email_notifications: false,
          enable_driver_assignment: false,
          driver_commission: 10,
          require_signature: false,
          enable_driver_tracking: false,
          enable_scheduled_delivery: false,
          enable_partial_delivery: false,
          require_advance_payment: false,
          advance_payment_percent: 50
        };

      case 'search':
        return {
          ...baseRecord,
          enable_product_search: true,
          enable_customer_search: true,
          enable_sales_search: true,
          search_by_name: true,
          search_by_barcode: true,
          search_by_sku: true,
          search_by_category: true,
          search_by_supplier: true,
          search_by_description: true,
          search_by_tags: true,
          enable_fuzzy_search: true,
          enable_autocomplete: true,
          min_search_length: 2,
          max_search_results: 50,
          search_timeout: 5000,
          search_debounce_time: 300,
          enable_search_history: true,
          max_search_history: 50,
          enable_recent_searches: true,
          enable_popular_searches: true,
          enable_search_suggestions: true
        };

      case 'permissions':
        return {
          ...baseRecord,
          enable_pos_access: true,
          enable_sales_access: true,
          enable_refunds_access: true,
          enable_void_access: false,
          enable_discount_access: true,
          enable_inventory_view: true,
          enable_inventory_edit: true,
          enable_stock_adjustments: true,
          enable_product_creation: true,
          enable_product_deletion: false,
          enable_customer_view: true,
          enable_customer_creation: true,
          enable_customer_edit: true,
          enable_customer_deletion: false,
          enable_customer_history: true,
          enable_payment_processing: true,
          enable_cash_management: true,
          enable_daily_reports: true,
          enable_financial_reports: false,
          enable_tax_management: false,
          enable_settings_access: false,
          enable_user_management: false,
          enable_backup_restore: false,
          enable_system_maintenance: false,
          enable_api_access: false,
          enable_audit_logs: false,
          enable_security_settings: false,
          enable_password_reset: false,
          enable_session_management: false,
          enable_data_export: true
        };

      case 'loyalty':
        return {
          ...baseRecord,
          enable_loyalty_program: true,
          loyalty_program_name: 'Loyalty Rewards',
          points_per_currency: 1,
          points_redemption_rate: 100,
          minimum_points_redemption: 500,
          points_expiry_days: 365,
          enable_customer_registration: true,
          require_customer_info: false,
          enable_customer_categories: true,
          enable_customer_tags: true,
          enable_customer_notes: true,
          enable_automatic_rewards: true,
          enable_manual_rewards: true,
          enable_birthday_rewards: true,
          enable_anniversary_rewards: false,
          enable_referral_rewards: false,
          enable_email_communication: false,
          enable_sms_communication: false,
          enable_push_notifications: false,
          enable_marketing_emails: false,
          enable_customer_analytics: true,
          enable_purchase_history: true,
          enable_spending_patterns: true,
          enable_customer_segmentation: false,
          enable_customer_insights: false
        };

      case 'analytics':
        return {
          ...baseRecord,
          enable_analytics: true,
          enable_real_time_analytics: true,
          analytics_refresh_interval: 30000,
          enable_data_export: true,
          enable_sales_analytics: true,
          enable_sales_trends: true,
          enable_product_performance: true,
          enable_customer_analytics: true,
          enable_revenue_tracking: true,
          enable_inventory_analytics: true,
          enable_stock_alerts: true,
          enable_low_stock_reports: true,
          enable_inventory_turnover: true,
          enable_supplier_analytics: false,
          enable_automated_reports: false,
          report_generation_time: '08:00',
          enable_email_reports: false,
          enable_pdf_reports: true,
          enable_excel_reports: true,
          enable_custom_dashboard: true,
          enable_kpi_widgets: true,
          enable_chart_animations: true,
          enable_data_drill_down: true,
          enable_comparative_analysis: true,
          enable_predictive_analytics: false,
          enable_data_retention: true,
          data_retention_days: 365,
          enable_data_backup: true,
          enable_api_export: false
        };

      case 'notifications':
        return {
          ...baseRecord,
          enable_notifications: true,
          enable_sound_notifications: true,
          enable_visual_notifications: true,
          enable_push_notifications: false,
          notification_timeout: 5000,
          enable_sales_notifications: true,
          notify_on_sale_completion: true,
          notify_on_refund: true,
          notify_on_void: true,
          notify_on_discount: false,
          enable_inventory_notifications: true,
          notify_on_low_stock: true,
          low_stock_threshold: 10,
          notify_on_out_of_stock: true,
          notify_on_stock_adjustment: false,
          enable_customer_notifications: false,
          notify_on_customer_registration: false,
          notify_on_loyalty_points: false,
          notify_on_customer_birthday: false,
          notify_on_customer_anniversary: false,
          enable_system_notifications: true,
          notify_on_system_errors: true,
          notify_on_backup_completion: false,
          notify_on_sync_completion: false,
          notify_on_maintenance: true,
          enable_email_notifications: false,
          enable_sms_notifications: false,
          enable_in_app_notifications: true,
          enable_desktop_notifications: false
        };

      case 'advanced':
        return {
          ...baseRecord,
          enable_performance_mode: true,
          enable_caching: true,
          cache_size: 100,
          enable_lazy_loading: true,
          max_concurrent_requests: 5,
          enable_database_optimization: true,
          enable_auto_backup: false,
          backup_frequency: 'daily',
          enable_data_compression: false,
          enable_query_optimization: true,
          enable_two_factor_auth: false,
          enable_session_timeout: true,
          session_timeout_minutes: 60,
          enable_audit_logging: false,
          enable_encryption: false,
          enable_api_access: false,
          enable_webhooks: false,
          enable_third_party_integrations: false,
          enable_data_sync: true,
          sync_interval: 300000,
          enable_debug_mode: false,
          enable_error_reporting: true,
          enable_performance_monitoring: false,
          enable_logging: true,
          log_level: 'error',
          enable_experimental_features: false,
          enable_beta_features: false,
          enable_custom_scripts: false,
          enable_plugin_system: false,
          enable_auto_updates: false
        };
      
      default:
        // Return base record for other settings types
        return baseRecord;
    }
  }

  // Generic function to load settings
  static async loadSettings<T extends POSSettingsType>(
    tableKey: SettingsTableKey
  ): Promise<T | null> {
    try {
      const user = await this.getCurrentUser();
      const tableName = SETTINGS_TABLES[tableKey];

      // First, try to get existing records
      const { data: existingData, error: existingError } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', user.id);

      if (existingError) {
        // Handle 400 Bad Request errors (table doesn't exist or RLS issues)
        if (existingError.code === '400' || existingError.message?.includes('400') || existingError.message?.includes('Bad Request')) {
          // Silently return defaults - no console spam
          return this.getDefaultSettings(tableKey, user.id) as T;
        }

        // Handle 406 Not Acceptable errors (RLS policy issues)
        if (existingError.code === '406' || existingError.message?.includes('Not Acceptable')) {
          // Silently return defaults - no console spam
          return this.getDefaultSettings(tableKey, user.id) as T;
        }
        
        // Handle 42P01 (table doesn't exist)
        if (existingError.code === '42P01' || existingError.message?.includes('does not exist')) {
          // Silently return defaults - no console spam
          return this.getDefaultSettings(tableKey, user.id) as T;
        }
        
        // Handle PGRST301 (JWT expired or invalid)
        if (existingError.code === 'PGRST301' || existingError.message?.includes('JWT')) {
          // Silently return defaults - no console spam
          return this.getDefaultSettings(tableKey, user.id) as T;
        }
        
        // For any other database error, silently return defaults
        return this.getDefaultSettings(tableKey, user.id) as T;
      }

      // Check if we have existing records
      if (existingData && existingData.length > 0) {
        if (existingData.length === 1) {
          return existingData[0] as T;
        } else {
          // Return the first record and let the migration clean up duplicates
          return existingData[0] as T;
        }
      }

      // No existing records found, create a default one
      const defaultRecord = this.getDefaultSettings(tableKey, user.id);
      
      const { data: insertData, error: insertError } = await supabase
        .from(tableName)
        .insert(defaultRecord)
        .select()
        .single();
      
      if (insertError) {
        // Silently return default settings even if insert fails
        return defaultRecord as T;
      } else {
        return insertData as T;
      }
    } catch (error) {
      // Silently handle all exceptions - return default settings instead of null
      try {
        const user = await this.getCurrentUser();
        return this.getDefaultSettings(tableKey, user.id) as T;
      } catch (userError) {
        // If we can't even get the user, return null
        return null;
      }
    }
  }

  // Generic function to save settings
  static async saveSettings<T extends POSSettingsType>(
    tableKey: SettingsTableKey,
    settings: Omit<T, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<T | null> {
    try {
      const user = await this.getCurrentUser();
      const tableName = SETTINGS_TABLES[tableKey];

      // Check if settings already exist
      const { data: existing, error: checkError } = await supabase
        .from(tableName)
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // Handle 400 Bad Request errors - silently return defaults
        if (checkError.code === '400' || checkError.message?.includes('400') || checkError.message?.includes('Bad Request')) {
          return this.getDefaultSettings(tableKey, user.id) as T;
        }
      }

      if (existing) {
        // Update existing settings
        const { id, ...updateData } = settings;

        const { data, error } = await supabase
          .from(tableName)
          .update({
            ...updateData,
            user_id: user.id
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          // Silently return null on error
          return null;
        }
        
        return data as T;
      } else {
        // Insert new settings
        const { data, error } = await supabase
          .from(tableName)
          .insert({
            ...settings,
            user_id: user.id
          })
          .select()
          .single();

        if (error) {
          // Silently return null on error
          return null;
        }

        return data as T;
      }
    } catch (error) {
      // Silently handle all errors
      return null;
    }
  }

  // Generic function to update specific settings
  static async updateSettings<T extends POSSettingsType>(
    tableKey: SettingsTableKey,
    updates: Partial<Omit<T, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<T | null> {
    try {
      const user = await this.getCurrentUser();
      const tableName = SETTINGS_TABLES[tableKey];
      
      const { data, error } = await supabase
        .from(tableName)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        // Silently return null on error
        return null;
      }

      return data as T;
    } catch (error) {
      // Silently handle all errors
      return null;
    }
  }

  // Generic function to delete settings
  static async deleteSettings(tableKey: SettingsTableKey): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      const tableName = SETTINGS_TABLES[tableKey];
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('user_id', user.id);

      if (error) {
        // Silently return false on error
        return false;
      }

      return true;
    } catch (error) {
      // Silently handle all errors
      return false;
    }
  }

  // Load all settings for a user
  static async loadAllSettings(): Promise<Record<SettingsTableKey, any>> {
    const settings: Record<SettingsTableKey, any> = {} as any;
    
    for (const tableKey of Object.keys(SETTINGS_TABLES) as SettingsTableKey[]) {
      settings[tableKey] = await this.loadSettings(tableKey);
    }
    
    return settings;
  }

  // Save all settings at once
  static async saveAllSettings(
    allSettings: Partial<Record<SettingsTableKey, any>>
  ): Promise<Record<SettingsTableKey, any>> {
    const results: Record<SettingsTableKey, any> = {} as any;
    
    for (const [tableKey, settings] of Object.entries(allSettings)) {
      if (settings) {
        results[tableKey as SettingsTableKey] = await this.saveSettings(
          tableKey as SettingsTableKey,
          settings
        );
      }
    }
    
    return results;
  }

  // Reset settings to defaults
  static async resetSettings(tableKey: SettingsTableKey): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      const tableName = SETTINGS_TABLES[tableKey];
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('user_id', user.id);

      if (error) {
        // Silently return false on error
        return false;
      }

      return true;
    } catch (error) {
      // Silently handle all errors
      return false;
    }
  }

  // Export settings
  static async exportSettings(tableKey: SettingsTableKey): Promise<string> {
    try {
      const settings = await this.loadSettings(tableKey);
      return JSON.stringify(settings, null, 2);
    } catch (error) {
      // Silently return empty string on error
      return '';
    }
  }

  // Import settings
  static async importSettings(
    tableKey: SettingsTableKey,
    settingsJson: string
  ): Promise<boolean> {
    try {
      const settings = JSON.parse(settingsJson);
      const result = await this.saveSettings(tableKey, settings);
      return result !== null;
    } catch (error) {
      // Silently handle all errors
      return false;
    }
  }

  // Subscribe to settings changes
  static subscribeToSettings(
    tableKey: SettingsTableKey,
    callback: (settings: any) => void
  ) {
    const user = supabase.auth.getUser();
    const tableName = SETTINGS_TABLES[tableKey];
    
    return supabase
      .channel(`${tableName}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `user_id=eq.${user.then(u => u.data.user?.id)}`
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  }

  // Unsubscribe from settings changes
  static unsubscribeFromSettings(tableKey: SettingsTableKey) {
    const tableName = SETTINGS_TABLES[tableKey];
    supabase.removeChannel(`${tableName}_changes`);
  }
}

// Convenience functions for each settings type
export const POSSettingsService = {
  // General Settings
  loadGeneralSettings: () => POSSettingsAPI.loadSettings<GeneralSettings>('general'),
  saveGeneralSettings: (settings: Omit<GeneralSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    return POSSettingsAPI.saveSettings('general', settings);
  },
  updateGeneralSettings: (updates: Partial<GeneralSettings>) => 
    POSSettingsAPI.updateSettings('general', updates),

  // Dynamic Pricing Settings
  loadDynamicPricingSettings: () => POSSettingsAPI.loadSettings<DynamicPricingSettings>('pricing'),
  saveDynamicPricingSettings: (settings: Omit<DynamicPricingSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => 
    POSSettingsAPI.saveSettings('pricing', settings),
  updateDynamicPricingSettings: (updates: Partial<DynamicPricingSettings>) => 
    POSSettingsAPI.updateSettings('pricing', updates),

  // Receipt Settings
  loadReceiptSettings: () => POSSettingsAPI.loadSettings<ReceiptSettings>('receipt'),
  saveReceiptSettings: (settings: Omit<ReceiptSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => 
    POSSettingsAPI.saveSettings('receipt', settings),
  updateReceiptSettings: (updates: Partial<ReceiptSettings>) => 
    POSSettingsAPI.updateSettings('receipt', updates),

  // Barcode Scanner Settings
  loadBarcodeScannerSettings: () => POSSettingsAPI.loadSettings<BarcodeScannerSettings>('scanner'),
  saveBarcodeScannerSettings: (settings: Omit<BarcodeScannerSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => 
    POSSettingsAPI.saveSettings('scanner', settings),
  updateBarcodeScannerSettings: (updates: Partial<BarcodeScannerSettings>) => 
    POSSettingsAPI.updateSettings('scanner', updates),

  // Delivery Settings
  loadDeliverySettings: () => POSSettingsAPI.loadSettings<DeliverySettings>('delivery'),
  saveDeliverySettings: (settings: Omit<DeliverySettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => 
    POSSettingsAPI.saveSettings('delivery', settings),
  updateDeliverySettings: (updates: Partial<DeliverySettings>) => 
    POSSettingsAPI.updateSettings('delivery', updates),

  // Search & Filter Settings
  loadSearchFilterSettings: () => POSSettingsAPI.loadSettings<SearchFilterSettings>('search'),
  saveSearchFilterSettings: (settings: Omit<SearchFilterSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => 
    POSSettingsAPI.saveSettings('search', settings),
  updateSearchFilterSettings: (updates: Partial<SearchFilterSettings>) => 
    POSSettingsAPI.updateSettings('search', updates),

  // User Permissions Settings
  loadUserPermissionsSettings: () => POSSettingsAPI.loadSettings<UserPermissionsSettings>('permissions'),
  saveUserPermissionsSettings: (settings: Omit<UserPermissionsSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => 
    POSSettingsAPI.saveSettings('permissions', settings),
  updateUserPermissionsSettings: (updates: Partial<UserPermissionsSettings>) => 
    POSSettingsAPI.updateSettings('permissions', updates),

  // Loyalty & Customer Settings
  loadLoyaltyCustomerSettings: () => POSSettingsAPI.loadSettings<LoyaltyCustomerSettings>('loyalty'),
  saveLoyaltyCustomerSettings: (settings: Omit<LoyaltyCustomerSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => 
    POSSettingsAPI.saveSettings('loyalty', settings),
  updateLoyaltyCustomerSettings: (updates: Partial<LoyaltyCustomerSettings>) => 
    POSSettingsAPI.updateSettings('loyalty', updates),

  // Analytics & Reporting Settings
  loadAnalyticsReportingSettings: () => POSSettingsAPI.loadSettings<AnalyticsReportingSettings>('analytics'),
  saveAnalyticsReportingSettings: (settings: Omit<AnalyticsReportingSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => 
    POSSettingsAPI.saveSettings('analytics', settings),
  updateAnalyticsReportingSettings: (updates: Partial<AnalyticsReportingSettings>) => 
    POSSettingsAPI.updateSettings('analytics', updates),

  // Notification Settings
  loadNotificationSettings: () => POSSettingsAPI.loadSettings<NotificationSettings>('notifications'),
  saveNotificationSettings: (settings: Omit<NotificationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => 
    POSSettingsAPI.saveSettings('notifications', settings),
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => 
    POSSettingsAPI.updateSettings('notifications', updates),

  // Advanced Settings
  loadAdvancedSettings: () => POSSettingsAPI.loadSettings<AdvancedSettings>('advanced'),
  saveAdvancedSettings: (settings: Omit<AdvancedSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => 
    POSSettingsAPI.saveSettings('advanced', settings),
  updateAdvancedSettings: (updates: Partial<AdvancedSettings>) => 
    POSSettingsAPI.updateSettings('advanced', updates),

  // All Settings
  loadAllSettings: () => POSSettingsAPI.loadAllSettings(),
  saveAllSettings: (allSettings: Partial<Record<SettingsTableKey, any>>) => 
    POSSettingsAPI.saveAllSettings(allSettings),
  resetAllSettings: async () => {
    const results: Record<SettingsTableKey, boolean> = {} as any;
    for (const tableKey of Object.keys(SETTINGS_TABLES) as SettingsTableKey[]) {
      results[tableKey] = await POSSettingsAPI.resetSettings(tableKey);
    }
    return results;
  }
};
