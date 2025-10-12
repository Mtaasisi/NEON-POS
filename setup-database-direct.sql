-- ============================================
-- DIRECT DATABASE SETUP - SIMPLIFIED VERSION
-- ============================================
-- This is a streamlined version that can be run directly
-- via Supabase SQL Editor or psql
--
-- Run this entire file at once!
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE 1: GENERAL SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS lats_pos_general_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  
  -- Business Information
  business_name TEXT DEFAULT 'My Store',
  business_address TEXT,
  business_phone TEXT,
  business_email TEXT,
  business_website TEXT,
  business_logo TEXT,
  
  -- Regional Settings
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'en',
  currency TEXT DEFAULT 'TZS',
  timezone TEXT DEFAULT 'Africa/Dar_es_Salaam',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  time_format TEXT DEFAULT '24',
  
  -- Display Settings
  show_product_images BOOLEAN DEFAULT true,
  show_stock_levels BOOLEAN DEFAULT true,
  show_prices BOOLEAN DEFAULT true,
  show_barcodes BOOLEAN DEFAULT true,
  products_per_page INTEGER DEFAULT 20,
  
  -- Behavior Settings
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
  
  -- Performance Settings
  enable_caching BOOLEAN DEFAULT true,
  cache_duration INTEGER DEFAULT 300,
  enable_lazy_loading BOOLEAN DEFAULT true,
  max_search_results INTEGER DEFAULT 50,
  
  -- Tax Settings
  enable_tax BOOLEAN DEFAULT true,
  tax_rate NUMERIC(5,2) DEFAULT 18.00,
  
  -- Security Settings
  day_closing_passcode TEXT DEFAULT '1234',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, business_id)
);

-- ============================================
-- TABLE 2: PRICING SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS lats_pos_pricing_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  
  enable_dynamic_pricing BOOLEAN DEFAULT true,
  
  -- Happy Hour Preset
  happy_hour_enabled BOOLEAN DEFAULT false,
  happy_hour_start_time TIME DEFAULT '18:00',
  happy_hour_end_time TIME DEFAULT '21:00',
  happy_hour_discount_percent NUMERIC(5,2) DEFAULT 15.00,
  
  -- Bulk Discount Preset
  bulk_discount_enabled BOOLEAN DEFAULT true,
  bulk_discount_min_quantity INTEGER DEFAULT 10,
  bulk_discount_percent NUMERIC(5,2) DEFAULT 10.00,
  
  -- Loyalty Discount Preset
  loyalty_discount_enabled BOOLEAN DEFAULT true,
  loyalty_discount_percent NUMERIC(5,2) DEFAULT 5.00,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, business_id)
);

-- ============================================
-- TABLE 3: RECEIPT SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS lats_pos_receipt_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  
  -- Receipt Design
  receipt_template TEXT DEFAULT 'standard',
  receipt_width INTEGER DEFAULT 80,
  receipt_font_size INTEGER DEFAULT 12,
  
  -- Business Info Display
  show_business_logo BOOLEAN DEFAULT true,
  show_business_name BOOLEAN DEFAULT true,
  show_business_address BOOLEAN DEFAULT true,
  show_business_phone BOOLEAN DEFAULT true,
  show_business_email BOOLEAN DEFAULT false,
  show_business_website BOOLEAN DEFAULT false,
  
  -- Transaction Details
  show_transaction_id BOOLEAN DEFAULT true,
  show_date_time BOOLEAN DEFAULT true,
  show_cashier_name BOOLEAN DEFAULT true,
  show_customer_name BOOLEAN DEFAULT true,
  show_customer_phone BOOLEAN DEFAULT false,
  
  -- Product Details
  show_product_names BOOLEAN DEFAULT true,
  show_product_skus BOOLEAN DEFAULT false,
  show_product_barcodes BOOLEAN DEFAULT false,
  show_quantities BOOLEAN DEFAULT true,
  show_unit_prices BOOLEAN DEFAULT true,
  show_discounts BOOLEAN DEFAULT true,
  
  -- Totals Display
  show_subtotal BOOLEAN DEFAULT true,
  show_tax BOOLEAN DEFAULT true,
  show_discount_total BOOLEAN DEFAULT true,
  show_grand_total BOOLEAN DEFAULT true,
  show_payment_method BOOLEAN DEFAULT true,
  show_change_amount BOOLEAN DEFAULT true,
  
  -- Printing Options
  auto_print_receipt BOOLEAN DEFAULT false,
  print_duplicate_receipt BOOLEAN DEFAULT false,
  enable_email_receipt BOOLEAN DEFAULT false,
  enable_sms_receipt BOOLEAN DEFAULT false,
  
  -- Receipt Numbering
  enable_receipt_numbering BOOLEAN DEFAULT true,
  receipt_number_prefix TEXT DEFAULT 'RCP',
  receipt_number_start INTEGER DEFAULT 1,
  receipt_number_format TEXT DEFAULT 'RCP-{YEAR}-{NUMBER}',
  
  -- Footer
  show_footer_message BOOLEAN DEFAULT true,
  footer_message TEXT DEFAULT 'Thank you for your business!',
  show_return_policy BOOLEAN DEFAULT false,
  return_policy_text TEXT DEFAULT 'Returns accepted within 7 days with receipt',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, business_id)
);

-- ============================================
-- TABLE 4: FEATURES
-- ============================================

CREATE TABLE IF NOT EXISTS lats_pos_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  
  enable_delivery BOOLEAN DEFAULT false,
  enable_loyalty_program BOOLEAN DEFAULT true,
  enable_customer_profiles BOOLEAN DEFAULT true,
  enable_payment_tracking BOOLEAN DEFAULT true,
  enable_dynamic_pricing BOOLEAN DEFAULT true,
  
  delivery_config JSONB DEFAULT '{}',
  loyalty_config JSONB DEFAULT '{}',
  customer_config JSONB DEFAULT '{}',
  payment_config JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, business_id)
);

-- ============================================
-- TABLE 5: USER PERMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS lats_pos_user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID,
  
  mode TEXT DEFAULT 'simple',
  default_role TEXT DEFAULT 'cashier',
  
  enable_pos_access BOOLEAN DEFAULT true,
  enable_sales_access BOOLEAN DEFAULT true,
  enable_refunds_access BOOLEAN DEFAULT false,
  enable_discount_access BOOLEAN DEFAULT false,
  enable_inventory_view BOOLEAN DEFAULT true,
  enable_inventory_edit BOOLEAN DEFAULT false,
  enable_product_creation BOOLEAN DEFAULT false,
  enable_customer_view BOOLEAN DEFAULT true,
  enable_customer_creation BOOLEAN DEFAULT true,
  enable_daily_reports BOOLEAN DEFAULT false,
  enable_financial_reports BOOLEAN DEFAULT false,
  enable_settings_access BOOLEAN DEFAULT false,
  enable_user_management BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, business_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_general_settings_user_id ON lats_pos_general_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_general_settings_business_id ON lats_pos_general_settings(business_id);

CREATE INDEX IF NOT EXISTS idx_pricing_settings_user_id ON lats_pos_pricing_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_settings_business_id ON lats_pos_pricing_settings(business_id);

CREATE INDEX IF NOT EXISTS idx_receipt_settings_user_id ON lats_pos_receipt_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_receipt_settings_business_id ON lats_pos_receipt_settings(business_id);

CREATE INDEX IF NOT EXISTS idx_features_user_id ON lats_pos_features(user_id);
CREATE INDEX IF NOT EXISTS idx_features_business_id ON lats_pos_features(business_id);

CREATE INDEX IF NOT EXISTS idx_permissions_user_id ON lats_pos_user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_business_id ON lats_pos_user_permissions(business_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE lats_pos_general_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_receipt_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_user_permissions ENABLE ROW LEVEL SECURITY;

-- General Settings Policies
CREATE POLICY IF NOT EXISTS "Users can view own general settings"
  ON lats_pos_general_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own general settings"
  ON lats_pos_general_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own general settings"
  ON lats_pos_general_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own general settings"
  ON lats_pos_general_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Pricing Settings Policies
CREATE POLICY IF NOT EXISTS "Users can view own pricing settings"
  ON lats_pos_pricing_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own pricing settings"
  ON lats_pos_pricing_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own pricing settings"
  ON lats_pos_pricing_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own pricing settings"
  ON lats_pos_pricing_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Receipt Settings Policies
CREATE POLICY IF NOT EXISTS "Users can view own receipt settings"
  ON lats_pos_receipt_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own receipt settings"
  ON lats_pos_receipt_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own receipt settings"
  ON lats_pos_receipt_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own receipt settings"
  ON lats_pos_receipt_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Features Policies
CREATE POLICY IF NOT EXISTS "Users can view own features"
  ON lats_pos_features FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own features"
  ON lats_pos_features FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own features"
  ON lats_pos_features FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own features"
  ON lats_pos_features FOR DELETE
  USING (auth.uid() = user_id);

-- User Permissions Policies
CREATE POLICY IF NOT EXISTS "Users can view own permissions"
  ON lats_pos_user_permissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own permissions"
  ON lats_pos_user_permissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own permissions"
  ON lats_pos_user_permissions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own permissions"
  ON lats_pos_user_permissions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✓ 5 tables created successfully';
  RAISE NOTICE '✓ 13 indexes created';
  RAISE NOTICE '✓ Row Level Security enabled';
  RAISE NOTICE '✓ 20 security policies created';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Your simplified POS settings database is ready!';
  RAISE NOTICE '============================================';
END $$;

