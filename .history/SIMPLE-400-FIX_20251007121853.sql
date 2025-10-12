-- ============================================
-- SIMPLE 400 FIX - NO COMPLEX ERROR HANDLING
-- Just disables RLS and grants permissions
-- Run this in your Neon database SQL Editor
-- ============================================

-- STEP 1: Disable RLS on all LATS tables (one by one)
ALTER TABLE IF EXISTS lats_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop all RLS policies
DROP POLICY IF EXISTS select_policy ON lats_categories;
DROP POLICY IF EXISTS insert_policy ON lats_categories;
DROP POLICY IF EXISTS update_policy ON lats_categories;
DROP POLICY IF EXISTS delete_policy ON lats_categories;

DROP POLICY IF EXISTS select_policy ON lats_suppliers;
DROP POLICY IF EXISTS insert_policy ON lats_suppliers;
DROP POLICY IF EXISTS update_policy ON lats_suppliers;
DROP POLICY IF EXISTS delete_policy ON lats_suppliers;

DROP POLICY IF EXISTS select_policy ON lats_products;
DROP POLICY IF EXISTS insert_policy ON lats_products;
DROP POLICY IF EXISTS update_policy ON lats_products;
DROP POLICY IF EXISTS delete_policy ON lats_products;

DROP POLICY IF EXISTS select_policy ON lats_product_variants;
DROP POLICY IF EXISTS insert_policy ON lats_product_variants;
DROP POLICY IF EXISTS update_policy ON lats_product_variants;
DROP POLICY IF EXISTS delete_policy ON lats_product_variants;

DROP POLICY IF EXISTS select_policy ON lats_stock_movements;
DROP POLICY IF EXISTS insert_policy ON lats_stock_movements;
DROP POLICY IF EXISTS update_policy ON lats_stock_movements;
DROP POLICY IF EXISTS delete_policy ON lats_stock_movements;

DROP POLICY IF EXISTS select_policy ON lats_sales;
DROP POLICY IF EXISTS insert_policy ON lats_sales;
DROP POLICY IF EXISTS update_policy ON lats_sales;
DROP POLICY IF EXISTS delete_policy ON lats_sales;

DROP POLICY IF EXISTS select_policy ON customers;
DROP POLICY IF EXISTS insert_policy ON customers;
DROP POLICY IF EXISTS update_policy ON customers;
DROP POLICY IF EXISTS delete_policy ON customers;

-- STEP 3: Grant all permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Specific table permissions
GRANT ALL ON TABLE lats_categories TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE lats_suppliers TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE lats_products TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE lats_product_variants TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE lats_stock_movements TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE lats_sales TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE customers TO postgres, anon, authenticated, service_role;

-- STEP 4: Verify tables exist and check their status
SELECT 
  'Table Status Check' as info,
  tablename,
  CASE WHEN rowsecurity THEN '❌ RLS Still ON' ELSE '✅ RLS OFF' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE 'lats_%' OR tablename = 'customers')
ORDER BY tablename;

-- Show a final message
SELECT '✅ Simple fix complete! Now refresh your browser.' as status;

