-- ============================================
-- FIX ALL SETTINGS TABLES STRUCTURE
-- ============================================
-- The original 3 tables used key-value pattern
-- but the code expects structured columns.
-- This script will recreate them properly.

-- Step 1: Drop the old key-value tables
DROP TABLE IF EXISTS lats_pos_general_settings CASCADE;
DROP TABLE IF EXISTS lats_pos_receipt_settings CASCADE;
DROP TABLE IF EXISTS lats_pos_advanced_settings CASCADE;

-- Step 2: Recreate with proper column structure

-- General Settings (matching TypeScript interface)
CREATE TABLE lats_pos_general_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'en',
  currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'UTC',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  time_format TEXT DEFAULT '12',
  show_product_images BOOLEAN DEFAULT true,
  show_stock_levels BOOLEAN DEFAULT true,
  show_prices BOOLEAN DEFAULT true,
  show_barcodes BOOLEAN DEFAULT true,
  products_per_page INTEGER DEFAULT 20,
  auto_complete_search BOOLEAN DEFAULT true,
  confirm_delete BOOLEAN DEFAULT true,
  show_confirmations BOOLEAN DEFAULT true,
  enable_sound_effects BOOLEAN DEFAULT true,
  sound_volume NUMERIC(3,2) DEFAULT 0.5,
  enable_click_sounds BOOLEAN DEFAULT true,
  enable_cart_sounds BOOLEAN DEFAULT true,
  enable_payment_sounds BOOLEAN DEFAULT true,
  enable_delete_sounds BOOLEAN DEFAULT true,
  enable_animations BOOLEAN DEFAULT true,
  enable_caching BOOLEAN DEFAULT true,
  cache_duration INTEGER DEFAULT 300000,
  enable_lazy_loading BOOLEAN DEFAULT true,
  max_search_results INTEGER DEFAULT 50,
  enable_tax BOOLEAN DEFAULT false,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Receipt Settings (matching TypeScript interface)
CREATE TABLE lats_pos_receipt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  receipt_template TEXT DEFAULT 'standard',
  receipt_width INTEGER DEFAULT 80,
  receipt_font_size INTEGER DEFAULT 12,
  show_business_logo BOOLEAN DEFAULT true,
  show_business_name BOOLEAN DEFAULT true,
  show_business_address BOOLEAN DEFAULT true,
  show_business_phone BOOLEAN DEFAULT true,
  show_business_email BOOLEAN DEFAULT true,
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
  enable_email_receipt BOOLEAN DEFAULT true,
  enable_sms_receipt BOOLEAN DEFAULT false,
  enable_receipt_numbering BOOLEAN DEFAULT true,
  receipt_number_prefix TEXT DEFAULT 'RCP',
  receipt_number_start INTEGER DEFAULT 1000,
  receipt_number_format TEXT DEFAULT 'RCP-{number}',
  show_footer_message BOOLEAN DEFAULT true,
  footer_message TEXT DEFAULT 'Thank you for your business!',
  show_return_policy BOOLEAN DEFAULT false,
  return_policy_text TEXT DEFAULT '30-day return policy',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Advanced Settings (matching TypeScript interface)
CREATE TABLE lats_pos_advanced_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  business_id TEXT,
  enable_performance_mode BOOLEAN DEFAULT true,
  enable_caching BOOLEAN DEFAULT true,
  cache_size INTEGER DEFAULT 50,
  enable_lazy_loading BOOLEAN DEFAULT true,
  max_concurrent_requests INTEGER DEFAULT 10,
  enable_database_optimization BOOLEAN DEFAULT true,
  enable_auto_backup BOOLEAN DEFAULT false,
  backup_frequency TEXT DEFAULT 'daily',
  enable_data_compression BOOLEAN DEFAULT false,
  enable_query_optimization BOOLEAN DEFAULT true,
  enable_two_factor_auth BOOLEAN DEFAULT false,
  enable_session_timeout BOOLEAN DEFAULT true,
  session_timeout_minutes INTEGER DEFAULT 60,
  enable_audit_logging BOOLEAN DEFAULT true,
  enable_encryption BOOLEAN DEFAULT false,
  enable_api_access BOOLEAN DEFAULT false,
  enable_webhooks BOOLEAN DEFAULT false,
  enable_third_party_integrations BOOLEAN DEFAULT false,
  enable_data_sync BOOLEAN DEFAULT false,
  sync_interval INTEGER DEFAULT 3600000,
  enable_debug_mode BOOLEAN DEFAULT false,
  enable_error_reporting BOOLEAN DEFAULT true,
  enable_performance_monitoring BOOLEAN DEFAULT true,
  enable_logging BOOLEAN DEFAULT true,
  log_level TEXT DEFAULT 'info',
  enable_experimental_features BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS on all tables (to match existing behavior)
ALTER TABLE lats_pos_general_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_receipt_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_advanced_settings DISABLE ROW LEVEL SECURITY;

-- Create indexes for faster user lookups
CREATE INDEX IF NOT EXISTS idx_general_settings_user_id ON lats_pos_general_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_receipt_settings_user_id ON lats_pos_receipt_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_advanced_settings_user_id ON lats_pos_advanced_settings(user_id);

SELECT '✅ All settings tables recreated with proper structure!' as result;
SELECT '✅ Now refresh your app - the 400 errors should be gone!' as next_step;

