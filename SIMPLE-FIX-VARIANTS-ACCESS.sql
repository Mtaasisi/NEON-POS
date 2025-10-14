-- ============================================
-- SIMPLE FIX: Grant access to lats_product_variants
-- ============================================

-- Option 1: Disable RLS (simplest, works immediately)
ALTER TABLE lats_product_variants DISABLE ROW LEVEL SECURITY;

-- Option 2: If you want to keep RLS enabled, create a permissive policy
-- Uncomment the lines below and comment out the ALTER TABLE above

-- DROP POLICY IF EXISTS lats_product_variants_select_all ON lats_product_variants;
-- 
-- CREATE POLICY lats_product_variants_select_all
--   ON lats_product_variants
--   FOR ALL
--   TO PUBLIC
--   USING (true);
-- 
-- ALTER TABLE lats_product_variants ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON lats_product_variants TO PUBLIC;

-- Test it works
SELECT id, quantity, cost_price 
FROM lats_product_variants 
LIMIT 1;

-- Success
SELECT '✅ Product variants access fixed!' as status;

