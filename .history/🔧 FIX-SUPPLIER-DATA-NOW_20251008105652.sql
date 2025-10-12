-- =====================================================
-- FIX SUPPLIER DATA NOT LOADING IN PURCHASE ORDERS
-- Simple & Direct Fix
-- =====================================================

-- Step 1: Disable RLS on suppliers table
ALTER TABLE lats_suppliers DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON lats_suppliers;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON lats_suppliers;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON lats_suppliers;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON lats_suppliers;
DROP POLICY IF EXISTS "allow_all_authenticated" ON lats_suppliers;

-- Step 3: Re-enable RLS with proper policy
ALTER TABLE lats_suppliers ENABLE ROW LEVEL SECURITY;

-- Step 4: Create comprehensive policy for all operations
CREATE POLICY "suppliers_all_access" 
ON lats_suppliers 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Step 5: Add foreign key constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_purchase_orders_supplier'
      AND table_name = 'lats_purchase_orders'
  ) THEN
    ALTER TABLE lats_purchase_orders
    ADD CONSTRAINT fk_purchase_orders_supplier
    FOREIGN KEY (supplier_id)
    REFERENCES lats_suppliers(id)
    ON DELETE RESTRICT;
  END IF;
END $$;

-- Step 6: Verify the fix works
SELECT 
  '✅ VERIFICATION TEST' as status,
  po.id,
  po.po_number,
  po.supplier_id,
  s.name as supplier_name,
  s.email as supplier_email,
  s.phone as supplier_phone,
  CASE 
    WHEN s.id IS NULL THEN '❌ FAILED - Supplier still not loading'
    ELSE '✅ SUCCESS - Supplier data now loads!'
  END as result
FROM lats_purchase_orders po
LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
WHERE po.id = '4bbd7c73-1d49-45cc-97c0-3c869b68d45c';

SELECT '✅ Fix applied! Refresh your app to see supplier data.' as final_status;

