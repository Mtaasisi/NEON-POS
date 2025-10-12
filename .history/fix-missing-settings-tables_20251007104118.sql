-- SQL migration to create missing POS settings tables
-- This fixes the 400 Bad Request errors by creating all required settings tables

-- ===================================================
-- 1. Dynamic Pricing Settings Table
-- ===================================================
CREATE TABLE IF NOT EXISTS lats_pos_dynamic_pricing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  enable_dynamic_pricing BOOLEAN DEFAULT false,
  enable_loyalty_pricing BOOLEAN DEFAULT false,
  enable_bulk_pricing BOOLEAN DEFAULT false,
  enable_time_based_pricing BOOLEAN DEFAULT false,
  enable_customer_pricing BOOLEAN DEFAULT false,
  enable_special_events BOOLEAN DEFAULT false,
  loyalty_discount_percent NUMERIC(5,2) DEFAULT 0,
  loyalty_points_threshold INTEGER DEFAULT 100,
  loyalty_max_discount NUMERIC(5,2) DEFAULT 20,
  bulk_discount_enabled BOOLEAN DEFAULT false,
  bulk_discount_threshold INTEGER DEFAULT 10,
  bulk_discount_percent NUMERIC(5,2) DEFAULT 5,
  time_based_discount_enabled BOOLEAN DEFAULT false,
  time_based_start_time TEXT DEFAULT '00:00',
  time_based_end_time TEXT DEFAULT '23:59',
  time_based_discount_percent NUMERIC(5,2) DEFAULT 0,
  customer_pricing_enabled BOOLEAN DEFAULT false,
  vip_customer_discount NUMERIC(5,2) DEFAULT 10,
  regular_customer_discount NUMERIC(5,2) DEFAULT 5,
  special_events_enabled BOOLEAN DEFAULT false,
  special_event_discount_percent NUMERIC(5,2) DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_pricing_settings_user_id ON lats_pos_dynamic_pricing_settings(user_id);

-- ===================================================
-- 2. Barcode Scanner Settings Table
-- ===================================================
CREATE TABLE IF NOT EXISTS lats_pos_barcode_scanner_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  enable_barcode_scanner BOOLEAN DEFAULT true,
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
  scanner_device_name TEXT,
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

CREATE INDEX IF NOT EXISTS idx_scanner_settings_user_id ON lats_pos_barcode_scanner_settings(user_id);

-- ===================================================
-- 3. Delivery Settings Table
-- ===================================================
CREATE TABLE IF NOT EXISTS lats_pos_delivery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  enable_delivery BOOLEAN DEFAULT false,
  default_delivery_fee NUMERIC(10,2) DEFAULT 0,
  free_delivery_threshold NUMERIC(10,2) DEFAULT 0,
  max_delivery_distance NUMERIC(10,2) DEFAULT 50,
  enable_delivery_areas BOOLEAN DEFAULT false,
  delivery_areas JSONB DEFAULT '[]'::jsonb,
  area_delivery_fees JSONB DEFAULT '{}'::jsonb,
  area_delivery_times JSONB DEFAULT '{}'::jsonb,
  enable_delivery_hours BOOLEAN DEFAULT false,
  delivery_start_time TEXT DEFAULT '08:00',
  delivery_end_time TEXT DEFAULT '20:00',
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
  enable_scheduled_delivery BOOLEAN DEFAULT false,
  enable_partial_delivery BOOLEAN DEFAULT false,
  require_advance_payment BOOLEAN DEFAULT false,
  advance_payment_percent NUMERIC(5,2) DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_settings_user_id ON lats_pos_delivery_settings(user_id);

-- ===================================================
-- 4. Search & Filter Settings Table
-- ===================================================
CREATE TABLE IF NOT EXISTS lats_pos_search_filter_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  enable_product_search BOOLEAN DEFAULT true,
  enable_customer_search BOOLEAN DEFAULT true,
  enable_sales_search BOOLEAN DEFAULT true,
  search_by_name BOOLEAN DEFAULT true,
  search_by_barcode BOOLEAN DEFAULT true,
  search_by_sku BOOLEAN DEFAULT true,
  search_by_category BOOLEAN DEFAULT true,
  search_by_supplier BOOLEAN DEFAULT true,
  search_by_description BOOLEAN DEFAULT true,
  search_by_tags BOOLEAN DEFAULT true,
  enable_fuzzy_search BOOLEAN DEFAULT true,
  enable_autocomplete BOOLEAN DEFAULT true,
  min_search_length INTEGER DEFAULT 2,
  max_search_results INTEGER DEFAULT 50,
  search_timeout INTEGER DEFAULT 5000,
  search_debounce_time INTEGER DEFAULT 300,
  enable_search_history BOOLEAN DEFAULT true,
  max_search_history INTEGER DEFAULT 20,
  enable_recent_searches BOOLEAN DEFAULT true,
  enable_popular_searches BOOLEAN DEFAULT true,
  enable_search_suggestions BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_settings_user_id ON lats_pos_search_filter_settings(user_id);

-- ===================================================
-- 5. User Permissions Settings Table
-- ===================================================
CREATE TABLE IF NOT EXISTS lats_pos_user_permissions_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  enable_pos_access BOOLEAN DEFAULT true,
  enable_sales_access BOOLEAN DEFAULT true,
  enable_refunds_access BOOLEAN DEFAULT false,
  enable_void_access BOOLEAN DEFAULT false,
  enable_discount_access BOOLEAN DEFAULT true,
  enable_inventory_view BOOLEAN DEFAULT true,
  enable_inventory_edit BOOLEAN DEFAULT false,
  enable_stock_adjustments BOOLEAN DEFAULT false,
  enable_product_creation BOOLEAN DEFAULT false,
  enable_product_deletion BOOLEAN DEFAULT false,
  enable_customer_view BOOLEAN DEFAULT true,
  enable_customer_creation BOOLEAN DEFAULT true,
  enable_customer_edit BOOLEAN DEFAULT false,
  enable_customer_deletion BOOLEAN DEFAULT false,
  enable_customer_history BOOLEAN DEFAULT true,
  enable_payment_processing BOOLEAN DEFAULT true,
  enable_cash_management BOOLEAN DEFAULT false,
  enable_daily_reports BOOLEAN DEFAULT true,
  enable_financial_reports BOOLEAN DEFAULT false,
  enable_tax_management BOOLEAN DEFAULT false,
  enable_settings_access BOOLEAN DEFAULT false,
  enable_user_management BOOLEAN DEFAULT false,
  enable_backup_restore BOOLEAN DEFAULT false,
  enable_system_maintenance BOOLEAN DEFAULT false,
  enable_api_access BOOLEAN DEFAULT false,
  enable_audit_logs BOOLEAN DEFAULT false,
  enable_security_settings BOOLEAN DEFAULT false,
  enable_password_reset BOOLEAN DEFAULT true,
  enable_session_management BOOLEAN DEFAULT false,
  enable_data_export BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_settings_user_id ON lats_pos_user_permissions_settings(user_id);

-- ===================================================
-- 6. Loyalty & Customer Settings Table
-- ===================================================
CREATE TABLE IF NOT EXISTS lats_pos_loyalty_customer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  enable_loyalty_program BOOLEAN DEFAULT false,
  loyalty_program_name TEXT DEFAULT 'Loyalty Program',
  points_per_currency NUMERIC(10,2) DEFAULT 1,
  points_redemption_rate NUMERIC(10,2) DEFAULT 100,
  minimum_points_redemption INTEGER DEFAULT 100,
  points_expiry_days INTEGER DEFAULT 365,
  enable_customer_registration BOOLEAN DEFAULT true,
  require_customer_info BOOLEAN DEFAULT false,
  enable_customer_categories BOOLEAN DEFAULT true,
  enable_customer_tags BOOLEAN DEFAULT true,
  enable_customer_notes BOOLEAN DEFAULT true,
  enable_automatic_rewards BOOLEAN DEFAULT true,
  enable_manual_rewards BOOLEAN DEFAULT true,
  enable_birthday_rewards BOOLEAN DEFAULT true,
  enable_anniversary_rewards BOOLEAN DEFAULT true,
  enable_referral_rewards BOOLEAN DEFAULT true,
  enable_email_communication BOOLEAN DEFAULT true,
  enable_sms_communication BOOLEAN DEFAULT false,
  enable_push_notifications BOOLEAN DEFAULT true,
  enable_marketing_emails BOOLEAN DEFAULT true,
  enable_customer_analytics BOOLEAN DEFAULT true,
  enable_purchase_history BOOLEAN DEFAULT true,
  enable_spending_patterns BOOLEAN DEFAULT true,
  enable_customer_segmentation BOOLEAN DEFAULT true,
  enable_customer_insights BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_settings_user_id ON lats_pos_loyalty_customer_settings(user_id);

-- ===================================================
-- 7. Analytics & Reporting Settings Table
-- ===================================================
CREATE TABLE IF NOT EXISTS lats_pos_analytics_reporting_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  enable_analytics BOOLEAN DEFAULT true,
  enable_real_time_analytics BOOLEAN DEFAULT true,
  analytics_refresh_interval INTEGER DEFAULT 60000,
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
  enable_supplier_analytics BOOLEAN DEFAULT true,
  enable_automated_reports BOOLEAN DEFAULT false,
  report_generation_time TEXT DEFAULT '00:00',
  enable_email_reports BOOLEAN DEFAULT false,
  enable_pdf_reports BOOLEAN DEFAULT true,
  enable_excel_reports BOOLEAN DEFAULT true,
  enable_custom_dashboard BOOLEAN DEFAULT true,
  enable_kpi_widgets BOOLEAN DEFAULT true,
  enable_chart_animations BOOLEAN DEFAULT true,
  enable_data_drill_down BOOLEAN DEFAULT true,
  enable_comparative_analysis BOOLEAN DEFAULT true,
  enable_predictive_analytics BOOLEAN DEFAULT false,
  enable_data_retention BOOLEAN DEFAULT true,
  data_retention_days INTEGER DEFAULT 365,
  enable_data_backup BOOLEAN DEFAULT true,
  enable_api_export BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_settings_user_id ON lats_pos_analytics_reporting_settings(user_id);

-- ===================================================
-- 8. Notification Settings Table
-- ===================================================
CREATE TABLE IF NOT EXISTS lats_pos_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  enable_notifications BOOLEAN DEFAULT true,
  enable_sound_notifications BOOLEAN DEFAULT true,
  enable_visual_notifications BOOLEAN DEFAULT true,
  enable_push_notifications BOOLEAN DEFAULT true,
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
  enable_customer_notifications BOOLEAN DEFAULT true,
  notify_on_customer_registration BOOLEAN DEFAULT false,
  notify_on_loyalty_points BOOLEAN DEFAULT true,
  notify_on_customer_birthday BOOLEAN DEFAULT true,
  notify_on_customer_anniversary BOOLEAN DEFAULT true,
  enable_system_notifications BOOLEAN DEFAULT true,
  notify_on_system_errors BOOLEAN DEFAULT true,
  notify_on_backup_completion BOOLEAN DEFAULT false,
  notify_on_sync_completion BOOLEAN DEFAULT false,
  notify_on_maintenance BOOLEAN DEFAULT true,
  enable_email_notifications BOOLEAN DEFAULT false,
  enable_sms_notifications BOOLEAN DEFAULT false,
  enable_in_app_notifications BOOLEAN DEFAULT true,
  enable_desktop_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON lats_pos_notification_settings(user_id);

-- ===================================================
-- Enable Row Level Security (RLS) on all new tables
-- ===================================================
ALTER TABLE lats_pos_dynamic_pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_barcode_scanner_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_search_filter_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_user_permissions_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_loyalty_customer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_analytics_reporting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_notification_settings ENABLE ROW LEVEL SECURITY;

-- ===================================================
-- Create RLS Policies (Allow users to access their own settings)
-- ===================================================

-- Dynamic Pricing Settings Policies
CREATE POLICY "Users can view their own pricing settings" ON lats_pos_dynamic_pricing_settings
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own pricing settings" ON lats_pos_dynamic_pricing_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own pricing settings" ON lats_pos_dynamic_pricing_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Barcode Scanner Settings Policies
CREATE POLICY "Users can view their own scanner settings" ON lats_pos_barcode_scanner_settings
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own scanner settings" ON lats_pos_barcode_scanner_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own scanner settings" ON lats_pos_barcode_scanner_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Delivery Settings Policies
CREATE POLICY "Users can view their own delivery settings" ON lats_pos_delivery_settings
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own delivery settings" ON lats_pos_delivery_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own delivery settings" ON lats_pos_delivery_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Search Filter Settings Policies
CREATE POLICY "Users can view their own search settings" ON lats_pos_search_filter_settings
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own search settings" ON lats_pos_search_filter_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own search settings" ON lats_pos_search_filter_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- User Permissions Settings Policies
CREATE POLICY "Users can view their own permissions settings" ON lats_pos_user_permissions_settings
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own permissions settings" ON lats_pos_user_permissions_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own permissions settings" ON lats_pos_user_permissions_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Loyalty Customer Settings Policies
CREATE POLICY "Users can view their own loyalty settings" ON lats_pos_loyalty_customer_settings
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own loyalty settings" ON lats_pos_loyalty_customer_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own loyalty settings" ON lats_pos_loyalty_customer_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Analytics Reporting Settings Policies
CREATE POLICY "Users can view their own analytics settings" ON lats_pos_analytics_reporting_settings
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own analytics settings" ON lats_pos_analytics_reporting_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own analytics settings" ON lats_pos_analytics_reporting_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Notification Settings Policies
CREATE POLICY "Users can view their own notification settings" ON lats_pos_notification_settings
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own notification settings" ON lats_pos_notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own notification settings" ON lats_pos_notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- ===================================================
-- Migration Complete
-- ===================================================
-- This migration creates all missing POS settings tables
-- and enables proper RLS policies for secure data access.
-- 
-- The following tables were created:
-- 1. lats_pos_dynamic_pricing_settings
-- 2. lats_pos_barcode_scanner_settings
-- 3. lats_pos_delivery_settings
-- 4. lats_pos_search_filter_settings
-- 5. lats_pos_user_permissions_settings
-- 6. lats_pos_loyalty_customer_settings
-- 7. lats_pos_analytics_reporting_settings
-- 8. lats_pos_notification_settings

