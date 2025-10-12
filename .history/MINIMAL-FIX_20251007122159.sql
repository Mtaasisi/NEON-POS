-- ============================================
-- MINIMAL FIX - Just disable RLS, nothing else
-- This is the absolute minimum needed
-- ============================================

-- Disable RLS on all tables (this is the main fix for 400 errors)
ALTER TABLE IF EXISTS lats_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;

-- Grant to PUBLIC (works everywhere)
GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC;

-- Check the result
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '❌ RLS ON' ELSE '✅ RLS OFF' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE 'lats_%' OR tablename = 'customers')
ORDER BY tablename;

