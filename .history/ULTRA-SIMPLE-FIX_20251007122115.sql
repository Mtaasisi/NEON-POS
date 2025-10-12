-- ============================================
-- ULTRA SIMPLE 400 FIX - Works on Neon Database
-- Just disables RLS - no role-specific permissions
-- ============================================

-- Disable RLS on all LATS tables
ALTER TABLE IF EXISTS lats_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;

-- Grant to roles that actually exist in Neon
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Verify the fix
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '❌ RLS Still ON' ELSE '✅ RLS OFF' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE 'lats_%' OR tablename = 'customers')
ORDER BY tablename;

SELECT '✅ Fix complete! Refresh your browser now.' as message;

