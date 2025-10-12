-- ============================================
-- DISABLE RLS ON ALL TABLES
-- This stops the 400 errors
-- ============================================

-- Customers table
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;

-- Auth tables
ALTER TABLE IF EXISTS auth_users DISABLE ROW LEVEL SECURITY;

-- LATS Inventory tables
ALTER TABLE IF EXISTS lats_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_sale_items DISABLE ROW LEVEL SECURITY;

-- POS Settings tables (already done, but ensuring)
ALTER TABLE IF EXISTS lats_pos_general_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_dynamic_pricing_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_receipt_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_barcode_scanner_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_delivery_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_search_filter_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_user_permissions_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_loyalty_customer_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_analytics_reporting_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_notification_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_pos_advanced_settings DISABLE ROW LEVEL SECURITY;

-- Device and payment tables
ALTER TABLE IF EXISTS devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customer_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_methods DISABLE ROW LEVEL SECURITY;

-- Spare parts tables
ALTER TABLE IF EXISTS spare_parts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS spare_part_usage DISABLE ROW LEVEL SECURITY;

-- Other tables
ALTER TABLE IF EXISTS expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_goals DISABLE ROW LEVEL SECURITY;

SELECT '✅ RLS disabled on all tables!' as status;
SELECT 'Now refresh your app with Ctrl+Shift+R or Cmd+Shift+R' as next_step;

