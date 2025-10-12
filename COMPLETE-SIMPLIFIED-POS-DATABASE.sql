-- ============================================
-- COMPLETE SIMPLIFIED POS SETTINGS DATABASE
-- ============================================
-- This creates the full database schema for the
-- simplified POS settings system (5 tabs only)
--
-- WHAT THIS INCLUDES:
-- ✅ 5 Core settings tables
-- ✅ Indexes for performance
-- ✅ Row Level Security (RLS) policies
-- ✅ Auto-update timestamps
-- ✅ Default values
-- ✅ Sample data
-- ✅ Helper functions
--
-- Created: October 11, 2025
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLE 1: GENERAL SETTINGS
-- ============================================
-- Includes: Business info, interface, display, hardware, notifications, security

CREATE TABLE IF NOT EXISTS lats_pos_general_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID,
  
  -- Business Information
  business_name TEXT DEFAULT 'My Store',
  business_address TEXT,
  business_phone TEXT,
  business_email TEXT,
  business_website TEXT,
  business_logo TEXT, -- Base64 or URL
  
  -- Regional Settings
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'sw', 'fr')),
  currency TEXT DEFAULT 'TZS',
  timezone TEXT DEFAULT 'Africa/Dar_es_Salaam',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  time_format TEXT DEFAULT '24' CHECK (time_format IN ('12', '24')),
  
  -- Display Settings
  show_product_images BOOLEAN DEFAULT true,
  show_stock_levels BOOLEAN DEFAULT true,
  show_prices BOOLEAN DEFAULT true,
  show_barcodes BOOLEAN DEFAULT true,
  products_per_page INTEGER DEFAULT 20 CHECK (products_per_page BETWEEN 10 AND 100),
  
  -- Behavior Settings
  auto_complete_search BOOLEAN DEFAULT true,
  confirm_delete BOOLEAN DEFAULT true,
  show_confirmations BOOLEAN DEFAULT true,
  enable_sound_effects BOOLEAN DEFAULT true,
  sound_volume NUMERIC(3,2) DEFAULT 0.8 CHECK (sound_volume BETWEEN 0 AND 1),
  enable_click_sounds BOOLEAN DEFAULT true,
  enable_cart_sounds BOOLEAN DEFAULT true,
  enable_payment_sounds BOOLEAN DEFAULT true,
  enable_delete_sounds BOOLEAN DEFAULT true,
  enable_animations BOOLEAN DEFAULT true,
  
  -- Performance Settings
  enable_caching BOOLEAN DEFAULT true,
  cache_duration INTEGER DEFAULT 300 CHECK (cache_duration BETWEEN 60 AND 3600),
  enable_lazy_loading BOOLEAN DEFAULT true,
  max_search_results INTEGER DEFAULT 50 CHECK (max_search_results BETWEEN 10 AND 200),
  
  -- Tax Settings
  enable_tax BOOLEAN DEFAULT true,
  tax_rate NUMERIC(5,2) DEFAULT 18.00 CHECK (tax_rate BETWEEN 0 AND 50),
  
  -- Security Settings
  day_closing_passcode TEXT DEFAULT '1234',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, business_id)
);

-- Indexes for General Settings
CREATE INDEX IF NOT EXISTS idx_general_settings_user_id ON lats_pos_general_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_general_settings_business_id ON lats_pos_general_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_general_settings_created_at ON lats_pos_general_settings(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_general_settings_updated_at
    BEFORE UPDATE ON lats_pos_general_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 2: PRICING & DISCOUNTS (SIMPLIFIED)
-- ============================================
-- Quick presets: Happy Hour, Bulk Discount, VIP Customer

CREATE TABLE IF NOT EXISTS lats_pos_pricing_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID,
  
  -- Master Toggle
  enable_dynamic_pricing BOOLEAN DEFAULT true,
  
  -- Happy Hour Preset
  happy_hour_enabled BOOLEAN DEFAULT false,
  happy_hour_start_time TIME DEFAULT '18:00',
  happy_hour_end_time TIME DEFAULT '21:00',
  happy_hour_discount_percent NUMERIC(5,2) DEFAULT 15.00 CHECK (happy_hour_discount_percent BETWEEN 0 AND 50),
  
  -- Bulk Discount Preset
  bulk_discount_enabled BOOLEAN DEFAULT true,
  bulk_discount_min_quantity INTEGER DEFAULT 10 CHECK (bulk_discount_min_quantity >= 2),
  bulk_discount_percent NUMERIC(5,2) DEFAULT 10.00 CHECK (bulk_discount_percent BETWEEN 0 AND 50),
  
  -- VIP/Loyalty Discount Preset
  loyalty_discount_enabled BOOLEAN DEFAULT true,
  loyalty_discount_percent NUMERIC(5,2) DEFAULT 5.00 CHECK (loyalty_discount_percent BETWEEN 0 AND 25),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, business_id)
);

-- Indexes for Pricing Settings
CREATE INDEX IF NOT EXISTS idx_pricing_settings_user_id ON lats_pos_pricing_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_settings_business_id ON lats_pos_pricing_settings(business_id);

-- Trigger for updated_at
CREATE TRIGGER update_pricing_settings_updated_at
    BEFORE UPDATE ON lats_pos_pricing_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 3: RECEIPT SETTINGS
-- ============================================
-- Receipt design, content, and printing options

CREATE TABLE IF NOT EXISTS lats_pos_receipt_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID,
  
  -- Receipt Design
  receipt_template TEXT DEFAULT 'standard' CHECK (receipt_template IN ('standard', 'compact', 'detailed', 'custom')),
  receipt_width INTEGER DEFAULT 80 CHECK (receipt_width IN (58, 80)),
  receipt_font_size INTEGER DEFAULT 12 CHECK (receipt_font_size BETWEEN 8 AND 16),
  
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
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, business_id)
);

-- Indexes for Receipt Settings
CREATE INDEX IF NOT EXISTS idx_receipt_settings_user_id ON lats_pos_receipt_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_receipt_settings_business_id ON lats_pos_receipt_settings(business_id);

-- Trigger for updated_at
CREATE TRIGGER update_receipt_settings_updated_at
    BEFORE UPDATE ON lats_pos_receipt_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 4: FEATURES TOGGLES
-- ============================================
-- Enable/disable optional POS features

CREATE TABLE IF NOT EXISTS lats_pos_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID,
  
  -- Feature Toggles
  enable_delivery BOOLEAN DEFAULT false,
  enable_loyalty_program BOOLEAN DEFAULT true,
  enable_customer_profiles BOOLEAN DEFAULT true,
  enable_payment_tracking BOOLEAN DEFAULT true,
  enable_dynamic_pricing BOOLEAN DEFAULT true,
  
  -- Feature-specific settings can be stored in JSON for flexibility
  delivery_config JSONB DEFAULT '{}',
  loyalty_config JSONB DEFAULT '{}',
  customer_config JSONB DEFAULT '{}',
  payment_config JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, business_id)
);

-- Indexes for Features
CREATE INDEX IF NOT EXISTS idx_features_user_id ON lats_pos_features(user_id);
CREATE INDEX IF NOT EXISTS idx_features_business_id ON lats_pos_features(business_id);

-- Trigger for updated_at
CREATE TRIGGER update_features_updated_at
    BEFORE UPDATE ON lats_pos_features
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE 5: USER PERMISSIONS (SIMPLIFIED)
-- ============================================
-- Simple/Advanced permission modes

CREATE TABLE IF NOT EXISTS lats_pos_user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID,
  
  -- Permission Mode
  mode TEXT DEFAULT 'simple' CHECK (mode IN ('simple', 'advanced')),
  default_role TEXT DEFAULT 'cashier' CHECK (default_role IN ('cashier', 'manager', 'admin', 'custom')),
  
  -- Advanced/Custom Permissions (only used in advanced mode)
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
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, business_id)
);

-- Indexes for User Permissions
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON lats_pos_user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_business_id ON lats_pos_user_permissions(business_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_mode ON lats_pos_user_permissions(mode);
CREATE INDEX IF NOT EXISTS idx_user_permissions_role ON lats_pos_user_permissions(default_role);

-- Trigger for updated_at
CREATE TRIGGER update_user_permissions_updated_at
    BEFORE UPDATE ON lats_pos_user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE lats_pos_general_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_receipt_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE lats_pos_user_permissions ENABLE ROW LEVEL SECURITY;

-- General Settings Policies
CREATE POLICY "Users can view their own general settings"
  ON lats_pos_general_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own general settings"
  ON lats_pos_general_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own general settings"
  ON lats_pos_general_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own general settings"
  ON lats_pos_general_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Pricing Settings Policies
CREATE POLICY "Users can view their own pricing settings"
  ON lats_pos_pricing_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pricing settings"
  ON lats_pos_pricing_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pricing settings"
  ON lats_pos_pricing_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pricing settings"
  ON lats_pos_pricing_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Receipt Settings Policies
CREATE POLICY "Users can view their own receipt settings"
  ON lats_pos_receipt_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own receipt settings"
  ON lats_pos_receipt_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receipt settings"
  ON lats_pos_receipt_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receipt settings"
  ON lats_pos_receipt_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Features Policies
CREATE POLICY "Users can view their own features"
  ON lats_pos_features FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own features"
  ON lats_pos_features FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own features"
  ON lats_pos_features FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own features"
  ON lats_pos_features FOR DELETE
  USING (auth.uid() = user_id);

-- User Permissions Policies
CREATE POLICY "Users can view their own permissions"
  ON lats_pos_user_permissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own permissions"
  ON lats_pos_user_permissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own permissions"
  ON lats_pos_user_permissions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own permissions"
  ON lats_pos_user_permissions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View to get complete settings for a user
CREATE OR REPLACE VIEW lats_pos_complete_settings AS
SELECT 
  g.user_id,
  g.business_id,
  g.business_name,
  g.business_logo,
  g.currency,
  g.theme,
  g.language,
  p.enable_dynamic_pricing,
  f.enable_delivery,
  f.enable_loyalty_program,
  f.enable_customer_profiles,
  u.mode as permissions_mode,
  u.default_role,
  g.updated_at as last_updated
FROM lats_pos_general_settings g
LEFT JOIN lats_pos_pricing_settings p ON g.user_id = p.user_id AND g.business_id = p.business_id
LEFT JOIN lats_pos_features f ON g.user_id = f.user_id AND g.business_id = f.business_id
LEFT JOIN lats_pos_user_permissions u ON g.user_id = u.user_id AND g.business_id = u.business_id;

-- ============================================
-- SAMPLE DATA (Optional - uncomment to use)
-- ============================================

/*
-- Insert sample general settings
INSERT INTO lats_pos_general_settings (
  user_id,
  business_name,
  business_address,
  business_phone,
  business_email,
  currency,
  theme,
  language
) VALUES (
  auth.uid(),
  'Sample Store',
  '123 Main St, Dar es Salaam',
  '+255 123 456 789',
  'info@samplestore.com',
  'TZS',
  'light',
  'en'
) ON CONFLICT (user_id, business_id) DO NOTHING;

-- Insert sample pricing settings
INSERT INTO lats_pos_pricing_settings (
  user_id,
  enable_dynamic_pricing,
  happy_hour_enabled,
  bulk_discount_enabled,
  loyalty_discount_enabled
) VALUES (
  auth.uid(),
  true,
  false,
  true,
  true
) ON CONFLICT (user_id, business_id) DO NOTHING;

-- Insert sample receipt settings
INSERT INTO lats_pos_receipt_settings (
  user_id,
  receipt_template,
  show_business_logo,
  show_footer_message,
  footer_message
) VALUES (
  auth.uid(),
  'standard',
  true,
  true,
  'Thank you for your business! Visit us again!'
) ON CONFLICT (user_id, business_id) DO NOTHING;

-- Insert sample features
INSERT INTO lats_pos_features (
  user_id,
  enable_delivery,
  enable_loyalty_program,
  enable_customer_profiles,
  enable_payment_tracking
) VALUES (
  auth.uid(),
  false,
  true,
  true,
  true
) ON CONFLICT (user_id, business_id) DO NOTHING;

-- Insert sample permissions
INSERT INTO lats_pos_user_permissions (
  user_id,
  mode,
  default_role
) VALUES (
  auth.uid(),
  'simple',
  'cashier'
) ON CONFLICT (user_id, business_id) DO NOTHING;
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check all tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name LIKE 'lats_pos_%'
ORDER BY table_name;

-- Check RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'lats_pos_%'
ORDER BY tablename;

-- Check indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'lats_pos_%'
ORDER BY tablename, indexname;

-- ============================================
-- MAINTENANCE FUNCTIONS
-- ============================================

-- Function to reset all settings to defaults for a user
CREATE OR REPLACE FUNCTION reset_user_pos_settings(p_user_id UUID)
RETURNS TEXT AS $$
BEGIN
  DELETE FROM lats_pos_general_settings WHERE user_id = p_user_id;
  DELETE FROM lats_pos_pricing_settings WHERE user_id = p_user_id;
  DELETE FROM lats_pos_receipt_settings WHERE user_id = p_user_id;
  DELETE FROM lats_pos_features WHERE user_id = p_user_id;
  DELETE FROM lats_pos_user_permissions WHERE user_id = p_user_id;
  
  RETURN 'All POS settings reset successfully for user: ' || p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get settings summary
CREATE OR REPLACE FUNCTION get_user_settings_summary(p_user_id UUID)
RETURNS TABLE(
  has_general BOOLEAN,
  has_pricing BOOLEAN,
  has_receipt BOOLEAN,
  has_features BOOLEAN,
  has_permissions BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM lats_pos_general_settings WHERE user_id = p_user_id),
    EXISTS(SELECT 1 FROM lats_pos_pricing_settings WHERE user_id = p_user_id),
    EXISTS(SELECT 1 FROM lats_pos_receipt_settings WHERE user_id = p_user_id),
    EXISTS(SELECT 1 FROM lats_pos_features WHERE user_id = p_user_id),
    EXISTS(SELECT 1 FROM lats_pos_user_permissions WHERE user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE lats_pos_general_settings IS 'Simplified general POS settings including business info, interface, display, hardware, notifications, and security';
COMMENT ON TABLE lats_pos_pricing_settings IS 'Simplified pricing with 3 quick presets: Happy Hour, Bulk Discount, and VIP/Loyalty';
COMMENT ON TABLE lats_pos_receipt_settings IS 'Receipt design, content, and printing configuration';
COMMENT ON TABLE lats_pos_features IS 'Feature toggles for optional POS functionality';
COMMENT ON TABLE lats_pos_user_permissions IS 'User permissions with Simple (3 roles) or Advanced (custom) modes';

-- ============================================
-- GRANTS (if using service role)
-- ============================================

-- Grant appropriate permissions to authenticated users
-- GRANT ALL ON lats_pos_general_settings TO authenticated;
-- GRANT ALL ON lats_pos_pricing_settings TO authenticated;
-- GRANT ALL ON lats_pos_receipt_settings TO authenticated;
-- GRANT ALL ON lats_pos_features TO authenticated;
-- GRANT ALL ON lats_pos_user_permissions TO authenticated;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'POS Settings Database Created Successfully!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tables Created: 5';
  RAISE NOTICE 'Indexes Created: 13+';
  RAISE NOTICE 'RLS Policies: Enabled on all tables';
  RAISE NOTICE 'Triggers: Auto-update timestamps';
  RAISE NOTICE 'Helper Functions: 2';
  RAISE NOTICE 'Views: 1 (complete_settings)';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Run verification queries above';
  RAISE NOTICE '2. Test with your application';
  RAISE NOTICE '3. Uncomment sample data if needed';
  RAISE NOTICE '4. Grant permissions if using service role';
  RAISE NOTICE '============================================';
END $$;

