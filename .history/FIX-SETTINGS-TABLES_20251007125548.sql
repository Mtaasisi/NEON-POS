-- ============================================
-- FIX SETTINGS TABLES WITH CORRECT NAMES
-- This creates the tables your app actually needs
-- ============================================

-- Drop old tables (without lats_pos_ prefix) if they exist
DROP TABLE IF EXISTS general_settings CASCADE;
DROP TABLE IF EXISTS dynamic_pricing_settings CASCADE;
DROP TABLE IF EXISTS receipt_settings CASCADE;
DROP TABLE IF EXISTS barcode_scanner_settings CASCADE;
DROP TABLE IF EXISTS delivery_settings CASCADE;
DROP TABLE IF EXISTS search_filter_settings CASCADE;
DROP TABLE IF EXISTS user_permissions_settings CASCADE;
DROP TABLE IF EXISTS loyalty_customer_settings CASCADE;
DROP TABLE IF EXISTS analytics_reporting_settings CASCADE;
DROP TABLE IF EXISTS notification_settings CASCADE;
DROP TABLE IF EXISTS advanced_settings CASCADE;

-- ============================================
-- Create tables with correct lats_pos_ prefix
-- ============================================

-- 1. General Settings
CREATE TABLE IF NOT EXISTS lats_pos_general_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'en',
  currency TEXT DEFAULT 'TZS',
  timezone TEXT DEFAULT 'Africa/Dar_es_Salaam',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  time_format TEXT DEFAULT '24',
  show_product_images BOOLEAN DEFAULT true,
  show_stock_levels BOOLEAN DEFAULT true,
  show_prices BOOLEAN DEFAULT true,
  show_barcodes BOOLEAN DEFAULT true,
  products_per_page INTEGER DEFAULT 20,
  auto_complete_search BOOLEAN DEFAULT true,
  confirm_delete BOOLEAN DEFAULT true,
  show_confirmations BOOLEAN DEFAULT true,
  enable_sound_effects BOOLEAN DEFAULT true,
  sound_volume NUMERIC(3,2) DEFAULT 0.8,
  enable_click_sounds BOOLEAN DEFAULT true,
  enable_cart_sounds BOOLEAN DEFAULT true,
  enable_payment_sounds BOOLEAN DEFAULT true,
  enable_delete_sounds BOOLEAN DEFAULT true,
  enable_animations BOOLEAN DEFAULT true,
  enable_caching BOOLEAN DEFAULT true,
  cache_duration INTEGER DEFAULT 300,
  enable_lazy_loading BOOLEAN DEFAULT true,
  max_search_results INTEGER DEFAULT 50,
  enable_tax BOOLEAN DEFAULT true,
  tax_rate NUMERIC(5,2) DEFAULT 18,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Dynamic Pricing Settings
CREATE TABLE IF NOT EXISTS lats_pos_dynamic_pricing_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  enable_dynamic_pricing BOOLEAN DEFAULT true,
  enable_loyalty_pricing BOOLEAN DEFAULT true,
  enable_bulk_pricing BOOLEAN DEFAULT true,
  enable_time_based_pricing BOOLEAN DEFAULT false,
  enable_customer_pricing BOOLEAN DEFAULT false,
  enable_special_events BOOLEAN DEFAULT false,
  loyalty_discount_percent NUMERIC(5,2) DEFAULT 5.00,
  loyalty_points_threshold INTEGER DEFAULT 1000,
  loyalty_max_discount NUMERIC(5,2) DEFAULT 20.00,
  bulk_discount_enabled BOOLEAN DEFAULT true,
  bulk_discount_threshold INTEGER DEFAULT 10,
  bulk_discount_percent NUMERIC(5,2) DEFAULT 10.00,
  time_based_discount_enabled BOOLEAN DEFAULT false,
  time_based_start_time TEXT DEFAULT '18:00',
  time_based_end_time TEXT DEFAULT '22:00',
  time_based_discount_percent NUMERIC(5,2) DEFAULT 15.00,
  customer_pricing_enabled BOOLEAN DEFAULT false,
  vip_customer_discount NUMERIC(5,2) DEFAULT 10.00,
  regular_customer_discount NUMERIC(5,2) DEFAULT 5.00,
  special_events_enabled BOOLEAN DEFAULT false,
  special_event_discount_percent NUMERIC(5,2) DEFAULT 20.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Receipt Settings
CREATE TABLE IF NOT EXISTS lats_pos_receipt_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  receipt_template TEXT DEFAULT 'standard',
  receipt_width INTEGER DEFAULT 80,
  receipt_font_size INTEGER DEFAULT 12,
  show_business_logo BOOLEAN DEFAULT true,
  show_business_name BOOLEAN DEFAULT true,
  show_business_address BOOLEAN DEFAULT true,
  show_business_phone BOOLEAN DEFAULT true,
  show_business_email BOOLEAN DEFAULT false,
  show_business_website BOOLEAN DEFAULT false,
  show_transaction_id BOOLEAN DEFAULT true,
  show_date_time BOOLEAN DEFAULT true,
  show_cashier_name BOOLEAN DEFAULT true,
  show_customer_name BOOLEAN DEFAULT true,
  show_customer_phone BOOLEAN DEFAULT false,
  show_product_names BOOLEAN DEFAULT true,
  show_product_skus BOOLEAN DEFAULT false,
  show_product_barcodes BOOLEAN DEFAULT false,
  show_quantities BOOLEAN DEFAULT true,
  show_unit_prices BOOLEAN DEFAULT true,
  show_discounts BOOLEAN DEFAULT true,
  show_subtotal BOOLEAN DEFAULT true,
  show_tax BOOLEAN DEFAULT true,
  show_discount_total BOOLEAN DEFAULT true,
  show_grand_total BOOLEAN DEFAULT true,
  show_payment_method BOOLEAN DEFAULT true,
  show_change_amount BOOLEAN DEFAULT true,
  auto_print_receipt BOOLEAN DEFAULT false,
  print_duplicate_receipt BOOLEAN DEFAULT false,
  enable_email_receipt BOOLEAN DEFAULT false,
  enable_sms_receipt BOOLEAN DEFAULT false,
  enable_receipt_numbering BOOLEAN DEFAULT true,
  receipt_number_prefix TEXT DEFAULT 'RCP',
  receipt_number_start INTEGER DEFAULT 1,
  receipt_number_format TEXT DEFAULT 'RCP-{YEAR}-{NUMBER}',
  show_footer_message BOOLEAN DEFAULT true,
  footer_message TEXT DEFAULT 'Thank you for your business!',
  show_return_policy BOOLEAN DEFAULT false,
  return_policy_text TEXT DEFAULT 'Returns accepted within 7 days with receipt',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Barcode Scanner Settings
CREATE TABLE IF NOT EXISTS lats_pos_barcode_scanner_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  enable_barcode_scanner BOOLEAN DEFAULT false,
  enable_camera_scanner BOOLEAN DEFAULT false,
  enable_keyboard_input BOOLEAN DEFAULT true,
  enable_manual_entry BOOLEAN DEFAULT true,
  auto_add_to_cart BOOLEAN DEFAULT true,
  auto_focus_search BOOLEAN DEFAULT true,
  play_sound_on_scan BOOLEAN DEFAULT true,
  vibrate_on_scan BOOLEAN DEFAULT false,
  show_scan_feedback BOOLEAN DEFAULT true,
  show_invalid_barcode_alert BOOLEAN DEFAULT true,
  allow_unknown_products BOOLEAN DEFAULT false,
  prompt_for_unknown_products BOOLEAN DEFAULT true,
  retry_on_error BOOLEAN DEFAULT true,
  max_retry_attempts INTEGER DEFAULT 3,
  scanner_device_name TEXT DEFAULT NULL,
  scanner_connection_type TEXT DEFAULT 'usb',
  scanner_timeout INTEGER DEFAULT 5000,
  support_ean13 BOOLEAN DEFAULT true,
  support_ean8 BOOLEAN DEFAULT true,
  support_upc_a BOOLEAN DEFAULT true,
  support_upc_e BOOLEAN DEFAULT true,
  support_code128 BOOLEAN DEFAULT true,
  support_code39 BOOLEAN DEFAULT true,
  support_qr_code BOOLEAN DEFAULT true,
  support_data_matrix BOOLEAN DEFAULT false,
  enable_continuous_scanning BOOLEAN DEFAULT false,
  scan_delay INTEGER DEFAULT 500,
  enable_scan_history BOOLEAN DEFAULT true,
  max_scan_history INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Delivery Settings
CREATE TABLE IF NOT EXISTS lats_pos_delivery_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  enable_delivery BOOLEAN DEFAULT false,
  default_delivery_fee NUMERIC(10,2) DEFAULT 0,
  free_delivery_threshold NUMERIC(10,2) DEFAULT 0,
  max_delivery_distance NUMERIC(10,2) DEFAULT 10,
  enable_delivery_areas BOOLEAN DEFAULT false,
  delivery_areas JSONB DEFAULT '[]'::jsonb,
  area_delivery_fees JSONB DEFAULT '{}'::jsonb,
  area_delivery_times JSONB DEFAULT '{}'::jsonb,
  enable_delivery_hours BOOLEAN DEFAULT false,
  delivery_start_time TEXT DEFAULT '09:00',
  delivery_end_time TEXT DEFAULT '18:00',
  enable_same_day_delivery BOOLEAN DEFAULT true,
  enable_next_day_delivery BOOLEAN DEFAULT true,
  delivery_time_slots JSONB DEFAULT '[]'::jsonb,
  notify_customer_on_delivery BOOLEAN DEFAULT true,
  notify_driver_on_assignment BOOLEAN DEFAULT true,
  enable_sms_notifications BOOLEAN DEFAULT false,
  enable_email_notifications BOOLEAN DEFAULT true,
  enable_driver_assignment BOOLEAN DEFAULT false,
  driver_commission NUMERIC(5,2) DEFAULT 10,
  require_signature BOOLEAN DEFAULT false,
  enable_driver_tracking BOOLEAN DEFAULT false,
  enable_scheduled_delivery BOOLEAN DEFAULT true,
  enable_partial_delivery BOOLEAN DEFAULT false,
  require_advance_payment BOOLEAN DEFAULT false,
  advance_payment_percent NUMERIC(5,2) DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Search & Filter Settings
CREATE TABLE IF NOT EXISTS lats_pos_search_filter_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  enable_product_search BOOLEAN DEFAULT true,
  enable_customer_search BOOLEAN DEFAULT true,
  enable_sales_search BOOLEAN DEFAULT true,
  search_by_name BOOLEAN DEFAULT true,
  search_by_barcode BOOLEAN DEFAULT true,
  search_by_sku BOOLEAN DEFAULT true,
  search_by_category BOOLEAN DEFAULT true,
  search_by_supplier BOOLEAN DEFAULT false,
  search_by_description BOOLEAN DEFAULT false,
  search_by_tags BOOLEAN DEFAULT false,
  enable_fuzzy_search BOOLEAN DEFAULT true,
  enable_autocomplete BOOLEAN DEFAULT true,
  min_search_length INTEGER DEFAULT 2,
  max_search_results INTEGER DEFAULT 50,
  search_timeout INTEGER DEFAULT 5000,
  search_debounce_time INTEGER DEFAULT 300,
  enable_search_history BOOLEAN DEFAULT true,
  max_search_history INTEGER DEFAULT 10,
  enable_recent_searches BOOLEAN DEFAULT true,
  enable_popular_searches BOOLEAN DEFAULT true,
  enable_search_suggestions BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. User Permissions Settings
CREATE TABLE IF NOT EXISTS lats_pos_user_permissions_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  enable_pos_access BOOLEAN DEFAULT true,
  enable_sales_access BOOLEAN DEFAULT true,
  enable_refunds_access BOOLEAN DEFAULT false,
  enable_void_access BOOLEAN DEFAULT false,
  enable_discount_access BOOLEAN DEFAULT false,
  enable_inventory_view BOOLEAN DEFAULT true,
  enable_inventory_edit BOOLEAN DEFAULT false,
  enable_stock_adjustments BOOLEAN DEFAULT false,
  enable_product_creation BOOLEAN DEFAULT false,
  enable_product_deletion BOOLEAN DEFAULT false,
  enable_customer_view BOOLEAN DEFAULT true,
  enable_customer_creation BOOLEAN DEFAULT false,
  enable_customer_edit BOOLEAN DEFAULT false,
  enable_customer_deletion BOOLEAN DEFAULT false,
  enable_customer_history BOOLEAN DEFAULT true,
  enable_payment_processing BOOLEAN DEFAULT true,
  enable_cash_management BOOLEAN DEFAULT false,
  enable_daily_reports BOOLEAN DEFAULT false,
  enable_financial_reports BOOLEAN DEFAULT false,
  enable_tax_management BOOLEAN DEFAULT false,
  enable_settings_access BOOLEAN DEFAULT false,
  enable_user_management BOOLEAN DEFAULT false,
  enable_backup_restore BOOLEAN DEFAULT false,
  enable_system_maintenance BOOLEAN DEFAULT false,
  enable_api_access BOOLEAN DEFAULT false,
  enable_audit_logs BOOLEAN DEFAULT false,
  enable_security_settings BOOLEAN DEFAULT false,
  enable_password_reset BOOLEAN DEFAULT false,
  enable_session_management BOOLEAN DEFAULT false,
  enable_data_export BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Loyalty & Customer Settings
CREATE TABLE IF NOT EXISTS lats_pos_loyalty_customer_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  enable_loyalty_program BOOLEAN DEFAULT false,
  loyalty_program_name TEXT DEFAULT 'Loyalty Program',
  points_per_currency NUMERIC(10,2) DEFAULT 1,
  points_redemption_rate NUMERIC(10,2) DEFAULT 0.01,
  minimum_points_redemption INTEGER DEFAULT 100,
  points_expiry_days INTEGER DEFAULT 365,
  enable_customer_registration BOOLEAN DEFAULT true,
  require_customer_info BOOLEAN DEFAULT false,
  enable_customer_categories BOOLEAN DEFAULT true,
  enable_customer_tags BOOLEAN DEFAULT true,
  enable_customer_notes BOOLEAN DEFAULT true,
  enable_automatic_rewards BOOLEAN DEFAULT true,
  enable_manual_rewards BOOLEAN DEFAULT true,
  enable_birthday_rewards BOOLEAN DEFAULT false,
  enable_anniversary_rewards BOOLEAN DEFAULT false,
  enable_referral_rewards BOOLEAN DEFAULT false,
  enable_email_communication BOOLEAN DEFAULT true,
  enable_sms_communication BOOLEAN DEFAULT false,
  enable_push_notifications BOOLEAN DEFAULT false,
  enable_marketing_emails BOOLEAN DEFAULT false,
  enable_customer_analytics BOOLEAN DEFAULT true,
  enable_purchase_history BOOLEAN DEFAULT true,
  enable_spending_patterns BOOLEAN DEFAULT true,
  enable_customer_segmentation BOOLEAN DEFAULT false,
  enable_customer_insights BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Analytics & Reporting Settings
CREATE TABLE IF NOT EXISTS lats_pos_analytics_reporting_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  enable_analytics BOOLEAN DEFAULT true,
  enable_real_time_analytics BOOLEAN DEFAULT true,
  analytics_refresh_interval INTEGER DEFAULT 300,
  enable_data_export BOOLEAN DEFAULT true,
  enable_sales_analytics BOOLEAN DEFAULT true,
  enable_sales_trends BOOLEAN DEFAULT true,
  enable_product_performance BOOLEAN DEFAULT true,
  enable_customer_analytics BOOLEAN DEFAULT true,
  enable_revenue_tracking BOOLEAN DEFAULT true,
  enable_inventory_analytics BOOLEAN DEFAULT true,
  enable_stock_alerts BOOLEAN DEFAULT true,
  enable_low_stock_reports BOOLEAN DEFAULT true,
  enable_inventory_turnover BOOLEAN DEFAULT true,
  enable_supplier_analytics BOOLEAN DEFAULT false,
  enable_automated_reports BOOLEAN DEFAULT false,
  report_generation_time TEXT DEFAULT '09:00',
  enable_email_reports BOOLEAN DEFAULT false,
  enable_pdf_reports BOOLEAN DEFAULT true,
  enable_excel_reports BOOLEAN DEFAULT true,
  enable_custom_dashboard BOOLEAN DEFAULT true,
  enable_kpi_widgets BOOLEAN DEFAULT true,
  enable_chart_animations BOOLEAN DEFAULT true,
  enable_data_drill_down BOOLEAN DEFAULT true,
  enable_comparative_analysis BOOLEAN DEFAULT false,
  enable_predictive_analytics BOOLEAN DEFAULT false,
  enable_data_retention BOOLEAN DEFAULT true,
  data_retention_days INTEGER DEFAULT 365,
  enable_data_backup BOOLEAN DEFAULT true,
  enable_api_export BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Notification Settings
CREATE TABLE IF NOT EXISTS lats_pos_notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  enable_notifications BOOLEAN DEFAULT true,
  enable_sound_notifications BOOLEAN DEFAULT true,
  enable_visual_notifications BOOLEAN DEFAULT true,
  enable_push_notifications BOOLEAN DEFAULT false,
  notification_timeout INTEGER DEFAULT 5000,
  enable_sales_notifications BOOLEAN DEFAULT true,
  notify_on_sale_completion BOOLEAN DEFAULT true,
  notify_on_refund BOOLEAN DEFAULT true,
  notify_on_void BOOLEAN DEFAULT true,
  notify_on_discount BOOLEAN DEFAULT false,
  enable_inventory_notifications BOOLEAN DEFAULT true,
  notify_on_low_stock BOOLEAN DEFAULT true,
  low_stock_threshold INTEGER DEFAULT 10,
  notify_on_out_of_stock BOOLEAN DEFAULT true,
  notify_on_stock_adjustment BOOLEAN DEFAULT false,
  enable_customer_notifications BOOLEAN DEFAULT false,
  notify_on_customer_registration BOOLEAN DEFAULT false,
  notify_on_loyalty_points BOOLEAN DEFAULT false,
  notify_on_customer_birthday BOOLEAN DEFAULT false,
  notify_on_customer_anniversary BOOLEAN DEFAULT false,
  enable_system_notifications BOOLEAN DEFAULT true,
  notify_on_system_errors BOOLEAN DEFAULT true,
  notify_on_backup_completion BOOLEAN DEFAULT false,
  notify_on_sync_completion BOOLEAN DEFAULT false,
  notify_on_maintenance BOOLEAN DEFAULT true,
  enable_email_notifications BOOLEAN DEFAULT false,
  enable_sms_notifications BOOLEAN DEFAULT false,
  enable_in_app_notifications BOOLEAN DEFAULT true,
  enable_desktop_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Advanced Settings
CREATE TABLE IF NOT EXISTS lats_pos_advanced_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  enable_performance_mode BOOLEAN DEFAULT true,
  enable_caching BOOLEAN DEFAULT true,
  cache_size INTEGER DEFAULT 100,
  enable_lazy_loading BOOLEAN DEFAULT true,
  max_concurrent_requests INTEGER DEFAULT 10,
  enable_database_optimization BOOLEAN DEFAULT true,
  enable_auto_backup BOOLEAN DEFAULT true,
  backup_frequency TEXT DEFAULT 'daily',
  enable_data_compression BOOLEAN DEFAULT false,
  enable_query_optimization BOOLEAN DEFAULT true,
  enable_two_factor_auth BOOLEAN DEFAULT false,
  enable_session_timeout BOOLEAN DEFAULT true,
  session_timeout_minutes INTEGER DEFAULT 60,
  enable_audit_logging BOOLEAN DEFAULT false,
  enable_encryption BOOLEAN DEFAULT false,
  enable_api_access BOOLEAN DEFAULT false,
  enable_webhooks BOOLEAN DEFAULT false,
  enable_third_party_integrations BOOLEAN DEFAULT false,
  enable_data_sync BOOLEAN DEFAULT true,
  sync_interval INTEGER DEFAULT 300,
  enable_debug_mode BOOLEAN DEFAULT false,
  enable_error_reporting BOOLEAN DEFAULT true,
  enable_performance_monitoring BOOLEAN DEFAULT true,
  enable_logging BOOLEAN DEFAULT true,
  log_level TEXT DEFAULT 'info',
  enable_experimental_features BOOLEAN DEFAULT false,
  enable_beta_features BOOLEAN DEFAULT false,
  enable_custom_scripts BOOLEAN DEFAULT false,
  enable_plugin_system BOOLEAN DEFAULT false,
  enable_auto_updates BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Disable RLS on all tables
-- ============================================

ALTER TABLE lats_pos_general_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_dynamic_pricing_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_receipt_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_barcode_scanner_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_delivery_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_search_filter_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_user_permissions_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_loyalty_customer_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_analytics_reporting_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_notification_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_advanced_settings DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Grant permissions
-- ============================================

GRANT ALL ON lats_pos_general_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON lats_pos_dynamic_pricing_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON lats_pos_receipt_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON lats_pos_barcode_scanner_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON lats_pos_delivery_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON lats_pos_search_filter_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON lats_pos_user_permissions_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON lats_pos_loyalty_customer_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON lats_pos_analytics_reporting_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON lats_pos_notification_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON lats_pos_advanced_settings TO postgres, anon, authenticated, service_role;

-- ============================================
-- Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_lats_pos_general_settings_user_id ON lats_pos_general_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_lats_pos_dynamic_pricing_settings_user_id ON lats_pos_dynamic_pricing_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_lats_pos_receipt_settings_user_id ON lats_pos_receipt_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_lats_pos_barcode_scanner_settings_user_id ON lats_pos_barcode_scanner_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_lats_pos_delivery_settings_user_id ON lats_pos_delivery_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_lats_pos_search_filter_settings_user_id ON lats_pos_search_filter_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_lats_pos_user_permissions_settings_user_id ON lats_pos_user_permissions_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_lats_pos_loyalty_customer_settings_user_id ON lats_pos_loyalty_customer_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_lats_pos_analytics_reporting_settings_user_id ON lats_pos_analytics_reporting_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_lats_pos_notification_settings_user_id ON lats_pos_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_lats_pos_advanced_settings_user_id ON lats_pos_advanced_settings(user_id);

-- ============================================
-- Add unique constraints to prevent duplicates
-- ============================================

ALTER TABLE lats_pos_general_settings 
  ADD CONSTRAINT IF NOT EXISTS lats_pos_general_settings_user_id_unique UNIQUE (user_id);

ALTER TABLE lats_pos_dynamic_pricing_settings 
  ADD CONSTRAINT IF NOT EXISTS lats_pos_dynamic_pricing_settings_user_id_unique UNIQUE (user_id);

ALTER TABLE lats_pos_receipt_settings 
  ADD CONSTRAINT IF NOT EXISTS lats_pos_receipt_settings_user_id_unique UNIQUE (user_id);

ALTER TABLE lats_pos_barcode_scanner_settings 
  ADD CONSTRAINT IF NOT EXISTS lats_pos_barcode_scanner_settings_user_id_unique UNIQUE (user_id);

ALTER TABLE lats_pos_delivery_settings 
  ADD CONSTRAINT IF NOT EXISTS lats_pos_delivery_settings_user_id_unique UNIQUE (user_id);

ALTER TABLE lats_pos_search_filter_settings 
  ADD CONSTRAINT IF NOT EXISTS lats_pos_search_filter_settings_user_id_unique UNIQUE (user_id);

ALTER TABLE lats_pos_user_permissions_settings 
  ADD CONSTRAINT IF NOT EXISTS lats_pos_user_permissions_settings_user_id_unique UNIQUE (user_id);

ALTER TABLE lats_pos_loyalty_customer_settings 
  ADD CONSTRAINT IF NOT EXISTS lats_pos_loyalty_customer_settings_user_id_unique UNIQUE (user_id);

ALTER TABLE lats_pos_analytics_reporting_settings 
  ADD CONSTRAINT IF NOT EXISTS lats_pos_analytics_reporting_settings_user_id_unique UNIQUE (user_id);

ALTER TABLE lats_pos_notification_settings 
  ADD CONSTRAINT IF NOT EXISTS lats_pos_notification_settings_user_id_unique UNIQUE (user_id);

ALTER TABLE lats_pos_advanced_settings 
  ADD CONSTRAINT IF NOT EXISTS lats_pos_advanced_settings_user_id_unique UNIQUE (user_id);

-- ============================================
-- Done!
-- ============================================

SELECT '🎉 All settings tables created with correct names!' as status;
SELECT 'Tables created: lats_pos_general_settings, lats_pos_dynamic_pricing_settings, etc.' as info;
SELECT 'Now refresh your app - 400 errors should be gone!' as next_step;

