-- =====================================================
-- FIX SUPPLIER DATA NOT LOADING IN PURCHASE ORDERS
-- =====================================================

-- Step 1: Check if supplier exists
SELECT 
  'Checking supplier...' as step,
  id,
  name,
  created_at
FROM lats_suppliers 
WHERE id = '39034e8e-2043-4a49-85cc-fb332d1f5e5b';

-- Step 2: Check if foreign key exists
SELECT
  'Checking foreign key...' as step,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'lats_purchase_orders'
  AND kcu.column_name = 'supplier_id';

-- Step 3: Check RLS policies on suppliers table
SELECT 
  'Checking RLS policies...' as step,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'lats_suppliers';

-- Step 4: Add foreign key if missing (with ON DELETE RESTRICT to prevent accidental deletions)
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
    
    RAISE NOTICE 'Foreign key constraint added successfully';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists';
  END IF;
END $$;

-- Step 5: Ensure RLS SELECT policy for suppliers
DO $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Enable read access for all users" ON lats_suppliers;
  
  -- Create comprehensive SELECT policy
  CREATE POLICY "Enable read access for all users"
    ON lats_suppliers
    FOR SELECT
    USING (true);
    
  RAISE NOTICE 'RLS policy created/updated for suppliers';
END $$;

-- Step 6: Verify the fix
SELECT 
  'Verification...' as step,
  po.id,
  po.po_number,
  po.supplier_id,
  s.name as supplier_name,
  s.email as supplier_email
FROM lats_purchase_orders po
LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
WHERE po.id = '4bbd7c73-1d49-45cc-97c0-3c869b68d45c';

SELECT 'Fix completed! ✅' as status;
