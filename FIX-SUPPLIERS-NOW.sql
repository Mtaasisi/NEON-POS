-- ============================================
-- QUICK FIX FOR "Failed to load suppliers"
-- ============================================

-- Step 1: Disable RLS on suppliers table
ALTER TABLE IF EXISTS lats_suppliers DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop any blocking policies
DROP POLICY IF EXISTS select_policy ON lats_suppliers;
DROP POLICY IF EXISTS insert_policy ON lats_suppliers;
DROP POLICY IF EXISTS update_policy ON lats_suppliers;
DROP POLICY IF EXISTS delete_policy ON lats_suppliers;
DROP POLICY IF EXISTS suppliers_select_policy ON lats_suppliers;
DROP POLICY IF EXISTS suppliers_insert_policy ON lats_suppliers;
DROP POLICY IF EXISTS suppliers_update_policy ON lats_suppliers;
DROP POLICY IF EXISTS suppliers_delete_policy ON lats_suppliers;

-- Step 3: Grant full access
GRANT ALL ON lats_suppliers TO PUBLIC;

-- Step 4: Verify the fix
SELECT 
  '✅ Checking suppliers table...' as status;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '❌ RLS STILL ON' ELSE '✅ RLS OFF' END as rls_status
FROM pg_tables 
WHERE tablename = 'lats_suppliers';

-- Step 5: Test data access
SELECT 
  COUNT(*) as supplier_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Suppliers accessible!'
    ELSE '⚠️ No suppliers in database (add some)'
  END as result
FROM lats_suppliers;

-- Show sample suppliers (if any)
SELECT id, name, email, phone, is_active 
FROM lats_suppliers 
LIMIT 5;

SELECT '✅ Fix complete! Refresh your app (Cmd+Shift+R or Ctrl+Shift+R)' as message;

