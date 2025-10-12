-- ============================================
-- CREATE ALL MISSING SETTINGS TABLES
-- Run this FIRST before the cleanup script
-- ============================================

-- This script creates all the settings tables that your POS app needs

-- ============================================
-- Step 1: Create general_settings table
-- ============================================

CREATE TABLE IF NOT EXISTS general_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  
  -- Business Information
  business_name TEXT NOT NULL DEFAULT 'My Store',
  business_address TEXT DEFAULT '',
  business_phone TEXT DEFAULT '',
  business_email TEXT DEFAULT '',
  business_logo TEXT,
  tax_id TEXT DEFAULT '',
  
  -- Currency & Locale
  currency TEXT DEFAULT 'USD',
  currency_symbol TEXT DEFAULT '$',
  currency_position TEXT DEFAULT 'before',
  decimal_places INTEGER DEFAULT 2,
  thousand_separator TEXT DEFAULT ',',
  decimal_separator TEXT DEFAULT '.',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  time_format TEXT DEFAULT '12h',
  timezone TEXT DEFAULT 'America/New_York',
  
  -- Tax Settings
  tax_enabled BOOLEAN DEFAULT true,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_included_in_price BOOLEAN DEFAULT false,
  tax_label TEXT DEFAULT 'Tax',
  
  -- Other Settings
  low_stock_threshold INTEGER DEFAULT 10,
  enable_barcode_scanner BOOLEAN DEFAULT false,
  auto_print_receipt BOOLEAN DEFAULT false,
  enable_customer_display BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Step 2: Create dynamic_pricing_settings table
-- ============================================

CREATE TABLE IF NOT EXISTS dynamic_pricing_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  
  -- Dynamic Pricing
  enable_dynamic_pricing BOOLEAN DEFAULT false,
  pricing_rules JSONB DEFAULT '[]'::jsonb,
  time_based_pricing BOOLEAN DEFAULT false,
  quantity_based_pricing BOOLEAN DEFAULT false,
  customer_based_pricing BOOLEAN DEFAULT false,
  
  -- Discounts
  allow_manual_discounts BOOLEAN DEFAULT true,
  max_discount_percent NUMERIC(5,2) DEFAULT 100,
  require_manager_approval BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Step 3: Create receipt_settings table
-- ============================================

CREATE TABLE IF NOT EXISTS receipt_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  
  -- Receipt Options
  header_text TEXT DEFAULT 'Thank you for your purchase!',
  footer_text TEXT DEFAULT 'Please come again!',
  show_logo BOOLEAN DEFAULT true,
  show_barcode BOOLEAN DEFAULT false,
  show_qr_code BOOLEAN DEFAULT false,
  
  -- Receipt Fields
  show_tax_breakdown BOOLEAN DEFAULT true,
  show_item_codes BOOLEAN DEFAULT false,
  show_employee_name BOOLEAN DEFAULT true,
  show_customer_info BOOLEAN DEFAULT true,
  
  -- Paper Settings
  paper_width INTEGER DEFAULT 80,
  font_size INTEGER DEFAULT 12,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Step 4: Create barcode_scanner_settings table
-- ============================================

CREATE TABLE IF NOT EXISTS barcode_scanner_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  
  -- Scanner Settings
  enabled BOOLEAN DEFAULT false,
  auto_add_to_cart BOOLEAN DEFAULT true,
  beep_on_scan BOOLEAN DEFAULT true,
  scanner_type TEXT DEFAULT 'usb',
  
  -- Barcode Format
  barcode_format TEXT DEFAULT 'CODE128',
  prefix TEXT DEFAULT '',
  suffix TEXT DEFAULT '',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Step 5: Create delivery_settings table
-- ============================================

CREATE TABLE IF NOT EXISTS delivery_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  
  -- Delivery Options
  enable_delivery BOOLEAN DEFAULT false,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  free_delivery_threshold NUMERIC(10,2) DEFAULT 0,
  delivery_radius INTEGER DEFAULT 10,
  
  -- Delivery Times
  estimated_delivery_time INTEGER DEFAULT 30,
  enable_scheduled_delivery BOOLEAN DEFAULT false,
  
  -- Advanced
  enable_tracking BOOLEAN DEFAULT false,
  enable_partial_delivery BOOLEAN DEFAULT false,
  require_advance_payment BOOLEAN DEFAULT false,
  advance_payment_percent INTEGER DEFAULT 50,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Step 6: Create search_filter_settings table
-- ============================================

CREATE TABLE IF NOT EXISTS search_filter_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  
  -- Search Settings
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
  
  -- Advanced Search
  enable_fuzzy_search BOOLEAN DEFAULT true,
  enable_autocomplete BOOLEAN DEFAULT true,
  min_search_length INTEGER DEFAULT 2,
  max_search_results INTEGER DEFAULT 50,
  search_timeout INTEGER DEFAULT 5000,
  search_debounce_time INTEGER DEFAULT 300,
  
  -- Search History
  enable_search_history BOOLEAN DEFAULT true,
  max_search_history INTEGER DEFAULT 10,
  enable_recent_searches BOOLEAN DEFAULT true,
  enable_popular_searches BOOLEAN DEFAULT true,
  enable_search_suggestions BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Step 7: Create user_permissions_settings table
-- ============================================

CREATE TABLE IF NOT EXISTS user_permissions_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  
  -- POS Permissions
  enable_pos_access BOOLEAN DEFAULT true,
  enable_sales_access BOOLEAN DEFAULT true,
  enable_refunds_access BOOLEAN DEFAULT false,
  enable_void_access BOOLEAN DEFAULT false,
  enable_discount_access BOOLEAN DEFAULT false,
  
  -- Inventory Permissions
  enable_inventory_view BOOLEAN DEFAULT true,
  enable_inventory_edit BOOLEAN DEFAULT false,
  enable_price_edit BOOLEAN DEFAULT false,
  enable_stock_adjustment BOOLEAN DEFAULT false,
  
  -- Reports Permissions
  enable_reports_view BOOLEAN DEFAULT false,
  enable_financial_reports BOOLEAN DEFAULT false,
  
  -- Settings Permissions
  enable_settings_access BOOLEAN DEFAULT false,
  enable_user_management BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Step 8: Create loyalty_customer_settings table
-- ============================================

CREATE TABLE IF NOT EXISTS loyalty_customer_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  
  -- Loyalty Program
  enable_loyalty_program BOOLEAN DEFAULT false,
  points_per_dollar NUMERIC(10,2) DEFAULT 1,
  points_value NUMERIC(10,2) DEFAULT 0.01,
  
  -- Customer Features
  enable_customer_accounts BOOLEAN DEFAULT true,
  require_customer_on_sale BOOLEAN DEFAULT false,
  enable_customer_credit BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Step 9: Create analytics_reporting_settings table
-- ============================================

CREATE TABLE IF NOT EXISTS analytics_reporting_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  
  -- Analytics
  enable_analytics BOOLEAN DEFAULT true,
  track_product_views BOOLEAN DEFAULT false,
  track_cart_abandonment BOOLEAN DEFAULT false,
  
  -- Reports
  enable_daily_reports BOOLEAN DEFAULT true,
  enable_weekly_reports BOOLEAN DEFAULT false,
  enable_monthly_reports BOOLEAN DEFAULT true,
  email_reports BOOLEAN DEFAULT false,
  report_email TEXT DEFAULT '',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Step 10: Create notification_settings table
-- ============================================

CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  
  -- Notification Types
  enable_low_stock_alerts BOOLEAN DEFAULT true,
  enable_sale_notifications BOOLEAN DEFAULT false,
  enable_customer_notifications BOOLEAN DEFAULT false,
  
  -- Notification Channels
  notification_email TEXT DEFAULT '',
  notification_phone TEXT DEFAULT '',
  enable_sms_notifications BOOLEAN DEFAULT false,
  enable_email_notifications BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Step 11: Create advanced_settings table
-- ============================================

CREATE TABLE IF NOT EXISTS advanced_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  
  -- Performance
  enable_caching BOOLEAN DEFAULT true,
  cache_duration INTEGER DEFAULT 300,
  enable_lazy_loading BOOLEAN DEFAULT true,
  
  -- Security
  enable_two_factor_auth BOOLEAN DEFAULT false,
  session_timeout INTEGER DEFAULT 3600,
  require_pin_for_refunds BOOLEAN DEFAULT false,
  
  -- Data
  enable_data_backup BOOLEAN DEFAULT true,
  backup_frequency TEXT DEFAULT 'daily',
  enable_audit_log BOOLEAN DEFAULT false,
  
  -- Integration
  enable_api_access BOOLEAN DEFAULT false,
  api_rate_limit INTEGER DEFAULT 100,
  
  -- System
  enable_debug_mode BOOLEAN DEFAULT false,
  enable_plugin_system BOOLEAN DEFAULT false,
  enable_auto_updates BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Step 12: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_general_settings_user_id ON general_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_pricing_settings_user_id ON dynamic_pricing_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_receipt_settings_user_id ON receipt_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_barcode_scanner_settings_user_id ON barcode_scanner_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_settings_user_id ON delivery_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_search_filter_settings_user_id ON search_filter_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_settings_user_id ON user_permissions_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_customer_settings_user_id ON loyalty_customer_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_reporting_settings_user_id ON analytics_reporting_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_advanced_settings_user_id ON advanced_settings(user_id);

-- ============================================
-- Step 13: Disable RLS on all settings tables
-- ============================================

ALTER TABLE general_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_pricing_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_scanner_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE search_filter_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_customer_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_reporting_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE advanced_settings DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 14: Grant permissions
-- ============================================

GRANT ALL ON general_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON dynamic_pricing_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON receipt_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON barcode_scanner_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON delivery_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON search_filter_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON user_permissions_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON loyalty_customer_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON analytics_reporting_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON notification_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON advanced_settings TO postgres, anon, authenticated, service_role;

-- ============================================
-- DONE!
-- ============================================

SELECT '🎉 All settings tables created successfully!' as status;
SELECT 'Now you can refresh your app and the 400 errors should be gone!' as next_step;

