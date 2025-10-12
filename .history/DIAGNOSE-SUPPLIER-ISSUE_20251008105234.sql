-- =====================================================
-- DIAGNOSE WHY SUPPLIER DATA ISN'T LOADING
-- =====================================================

-- Step 1: Check if RLS is enabled on suppliers table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'lats_suppliers';

-- Step 2: Check ALL RLS policies on suppliers
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'lats_suppliers'
ORDER BY cmd;

-- Step 3: Test direct JOIN (this simulates what Supabase does)
SELECT 
  'Testing JOIN...' as test,
  po.id,
  po.po_number,
  po.supplier_id,
  s.id as supplier_actual_id,
  s.name as supplier_name,
  s.email as supplier_email,
  s.phone as supplier_phone,
  CASE 
    WHEN s.id IS NULL THEN '❌ SUPPLIER JOIN FAILED'
    ELSE '✅ SUPPLIER JOIN WORKS'
  END as status
FROM lats_purchase_orders po
LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
WHERE po.id = '4bbd7c73-1d49-45cc-97c0-3c869b68d45c';

-- Step 4: Check if the supplier can be selected at all
SELECT 
  'Direct supplier query...' as test,
  id,
  name,
  email,
  phone,
  created_at
FROM lats_suppliers
WHERE id = '39034e8e-2043-4a49-85cc-fb332d1f5e5b';

-- Step 5: Check foreign key constraint
SELECT
  'Foreign key check...' as test,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'lats_purchase_orders'
  AND kcu.column_name = 'supplier_id';

-- Step 6: FORCE DISABLE RLS on suppliers temporarily (for testing)
ALTER TABLE lats_suppliers DISABLE ROW LEVEL SECURITY;

-- Step 7: Test JOIN again with RLS disabled
SELECT 
  'Testing JOIN with RLS DISABLED...' as test,
  po.id,
  po.po_number,
  s.name as supplier_name,
  CASE 
    WHEN s.id IS NULL THEN '❌ STILL FAILED - Different issue'
    ELSE '✅ WORKS NOW - RLS was the problem!'
  END as status
FROM lats_purchase_orders po
LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
WHERE po.id = '4bbd7c73-1d49-45cc-97c0-3c869b68d45c';

-- Step 8: Re-enable RLS and create proper policies
ALTER TABLE lats_suppliers ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON lats_suppliers;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON lats_suppliers;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON lats_suppliers;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON lats_suppliers;

-- Create a comprehensive policy that allows all operations
CREATE POLICY "allow_all_authenticated" 
ON lats_suppliers 
FOR ALL 
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Step 9: Final verification
SELECT 
  'FINAL TEST...' as test,
  po.id,
  po.po_number,
  po.supplier_id,
  s.name as supplier_name,
  s.email as supplier_email,
  CASE 
    WHEN s.id IS NULL THEN '❌ FAILED - Need more investigation'
    ELSE '✅ SUCCESS - Supplier data now loads!'
  END as status
FROM lats_purchase_orders po
LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
WHERE po.id = '4bbd7c73-1d49-45cc-97c0-3c869b68d45c';

SELECT '✅ Diagnostic complete! Check the results above.' as final_message;

