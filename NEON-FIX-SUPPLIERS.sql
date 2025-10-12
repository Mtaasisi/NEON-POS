-- ============================================
-- NEON DATABASE FIX - DISABLE RLS
-- This works specifically for Neon (not Supabase)
-- ============================================

-- Disable RLS on all LATS tables
ALTER TABLE IF EXISTS lats_suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;

-- Drop any RLS policies (they might be blocking access)
DROP POLICY IF EXISTS select_policy ON lats_suppliers;
DROP POLICY IF EXISTS insert_policy ON lats_suppliers;
DROP POLICY IF EXISTS update_policy ON lats_suppliers;
DROP POLICY IF EXISTS delete_policy ON lats_suppliers;

DROP POLICY IF EXISTS select_policy ON lats_categories;
DROP POLICY IF EXISTS insert_policy ON lats_categories;
DROP POLICY IF EXISTS update_policy ON lats_categories;
DROP POLICY IF EXISTS delete_policy ON lats_categories;

DROP POLICY IF EXISTS select_policy ON lats_products;
DROP POLICY IF EXISTS insert_policy ON lats_products;
DROP POLICY IF EXISTS update_policy ON lats_products;
DROP POLICY IF EXISTS delete_policy ON lats_products;

-- Grant to PUBLIC (works on all Postgres/Neon databases)
GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- Verify RLS is disabled
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '❌ RLS STILL ON' ELSE '✅ RLS OFF' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE 'lats_%' OR tablename = 'customers')
ORDER BY tablename;

SELECT '✅ Fix complete! Refresh your app with Cmd+Shift+R' as message;

