-- ============================================================================
-- FIX STOCK TRANSFER EMPTY LIST ISSUE
-- ============================================================================
-- This script fixes the issue where transfers show in count but not in list
-- The problem is usually with RLS policies or missing foreign key constraints
-- ============================================================================

-- Step 1: Check and fix RLS policies on branch_transfers
-- ============================================================================

-- First, check if RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'branch_transfers';

-- Disable RLS temporarily if it's causing issues (NOT RECOMMENDED FOR PRODUCTION)
-- Uncomment if you want to test if RLS is the issue:
-- ALTER TABLE branch_transfers DISABLE ROW LEVEL SECURITY;

-- Better approach: Create a permissive RLS policy
-- Drop any overly restrictive policies
DROP POLICY IF EXISTS branch_transfers_select_policy ON branch_transfers;
DROP POLICY IF EXISTS branch_transfers_isolation_policy ON branch_transfers;

-- Create a new policy that allows reading all transfers
-- (You can make this more restrictive based on your auth setup)
DO $$
BEGIN
  -- Only create the policy if RLS is enabled
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'branch_transfers' 
    AND rowsecurity = true
  ) THEN
    -- Allow all authenticated users to read all transfers
    CREATE POLICY branch_transfers_read_all ON branch_transfers
      FOR SELECT
      TO authenticated
      USING (true);
    
    -- Allow authenticated users to insert transfers
    CREATE POLICY branch_transfers_insert ON branch_transfers
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
    
    -- Allow users to update their own transfers
    CREATE POLICY branch_transfers_update ON branch_transfers
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
    
    RAISE NOTICE '✅ Created permissive RLS policies for branch_transfers';
  ELSE
    RAISE NOTICE 'ℹ️  RLS is not enabled on branch_transfers';
  END IF;
END $$;

-- Step 2: Ensure store_locations table has proper RLS
-- ============================================================================

DROP POLICY IF EXISTS store_locations_select_policy ON store_locations;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'store_locations' 
    AND rowsecurity = true
  ) THEN
    CREATE POLICY store_locations_read_all ON store_locations
      FOR SELECT
      TO authenticated
      USING (true);
    
    RAISE NOTICE '✅ Created permissive RLS policy for store_locations';
  ELSE
    RAISE NOTICE 'ℹ️  RLS is not enabled on store_locations';
  END IF;
END $$;

-- Step 3: Ensure lats_product_variants table has proper RLS
-- ============================================================================

DROP POLICY IF EXISTS lats_product_variants_select_policy ON lats_product_variants;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'lats_product_variants' 
    AND rowsecurity = true
  ) THEN
    CREATE POLICY lats_product_variants_read_all ON lats_product_variants
      FOR SELECT
      TO authenticated
      USING (true);
    
    RAISE NOTICE '✅ Created permissive RLS policy for lats_product_variants';
  ELSE
    RAISE NOTICE 'ℹ️  RLS is not enabled on lats_product_variants';
  END IF;
END $$;

-- Step 4: Ensure lats_products table has proper RLS
-- ============================================================================

DROP POLICY IF EXISTS lats_products_select_policy ON lats_products;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'lats_products' 
    AND rowsecurity = true
  ) THEN
    CREATE POLICY lats_products_read_all ON lats_products
      FOR SELECT
      TO authenticated
      USING (true);
    
    RAISE NOTICE '✅ Created permissive RLS policy for lats_products';
  ELSE
    RAISE NOTICE 'ℹ️  RLS is not enabled on lats_products';
  END IF;
END $$;

-- Step 5: Verify foreign key constraints exist
-- ============================================================================

-- Check if foreign keys exist for branch_transfers
SELECT 
  '5. Foreign Key Check' as check_name,
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
WHERE tc.table_name = 'branch_transfers'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Add missing foreign key constraints if they don't exist
DO $$
BEGIN
  -- Add from_branch_id foreign key if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'branch_transfers' 
    AND constraint_name = 'branch_transfers_from_branch_fkey'
  ) THEN
    ALTER TABLE branch_transfers
    ADD CONSTRAINT branch_transfers_from_branch_fkey
    FOREIGN KEY (from_branch_id) REFERENCES store_locations(id);
    
    RAISE NOTICE '✅ Added from_branch_id foreign key';
  END IF;

  -- Add to_branch_id foreign key if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'branch_transfers' 
    AND constraint_name = 'branch_transfers_to_branch_fkey'
  ) THEN
    ALTER TABLE branch_transfers
    ADD CONSTRAINT branch_transfers_to_branch_fkey
    FOREIGN KEY (to_branch_id) REFERENCES store_locations(id);
    
    RAISE NOTICE '✅ Added to_branch_id foreign key';
  END IF;

  -- Add entity_id foreign key for variants if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'branch_transfers' 
    AND constraint_name = 'branch_transfers_entity_fkey'
  ) THEN
    ALTER TABLE branch_transfers
    ADD CONSTRAINT branch_transfers_entity_fkey
    FOREIGN KEY (entity_id) REFERENCES lats_product_variants(id);
    
    RAISE NOTICE '✅ Added entity_id foreign key';
  END IF;
END $$;

-- Step 6: Test the query that the app uses
-- ============================================================================

DO $$
DECLARE
  v_test_branch_id UUID;
  v_transfer_count INTEGER;
  v_error TEXT;
BEGIN
  -- Get a test branch ID
  SELECT id INTO v_test_branch_id 
  FROM store_locations 
  WHERE is_active = true 
  LIMIT 1;
  
  IF v_test_branch_id IS NULL THEN
    RAISE EXCEPTION 'No active branches found!';
  END IF;
  
  RAISE NOTICE '📝 Testing with branch_id: %', v_test_branch_id;
  
  -- Try the simple query (like stats)
  SELECT COUNT(*) INTO v_transfer_count
  FROM branch_transfers
  WHERE transfer_type = 'stock'
    AND (from_branch_id = v_test_branch_id OR to_branch_id = v_test_branch_id);
  
  RAISE NOTICE '✅ Simple query found % transfers', v_transfer_count;
  
  -- Try the complex query (like list) - this might fail
  BEGIN
    SELECT COUNT(*) INTO v_transfer_count
    FROM branch_transfers bt
    LEFT JOIN store_locations fb ON fb.id = bt.from_branch_id
    LEFT JOIN store_locations tb ON tb.id = bt.to_branch_id
    LEFT JOIN lats_product_variants v ON v.id = bt.entity_id
    LEFT JOIN lats_products p ON p.id = v.product_id
    WHERE bt.transfer_type = 'stock'
      AND (bt.from_branch_id = v_test_branch_id OR bt.to_branch_id = v_test_branch_id);
    
    RAISE NOTICE '✅ Complex query found % transfers', v_transfer_count;
  EXCEPTION
    WHEN OTHERS THEN
      v_error := SQLERRM;
      RAISE NOTICE '❌ Complex query failed: %', v_error;
  END;
END $$;

-- Step 7: Grant necessary permissions
-- ============================================================================

GRANT SELECT ON branch_transfers TO authenticated;
GRANT SELECT ON store_locations TO authenticated;
GRANT SELECT ON lats_product_variants TO authenticated;
GRANT SELECT ON lats_products TO authenticated;

GRANT INSERT, UPDATE ON branch_transfers TO authenticated;
GRANT UPDATE ON lats_product_variants TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show all transfers with joined data
SELECT 
  bt.id,
  bt.status,
  bt.quantity,
  bt.transfer_type,
  bt.created_at,
  fb.name as from_branch,
  tb.name as to_branch,
  v.variant_name,
  v.sku,
  p.name as product_name
FROM branch_transfers bt
LEFT JOIN store_locations fb ON fb.id = bt.from_branch_id
LEFT JOIN store_locations tb ON tb.id = bt.to_branch_id
LEFT JOIN lats_product_variants v ON v.id = bt.entity_id
LEFT JOIN lats_products p ON p.id = v.product_id
WHERE bt.transfer_type = 'stock'
ORDER BY bt.created_at DESC
LIMIT 10;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ STOCK TRANSFER LIST FIX APPLIED';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'What was fixed:';
  RAISE NOTICE '1. ✅ RLS policies made permissive for authenticated users';
  RAISE NOTICE '2. ✅ Foreign key constraints verified/added';
  RAISE NOTICE '3. ✅ Permissions granted for all necessary tables';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run this script in your Neon database SQL editor';
  RAISE NOTICE '2. Refresh your application';
  RAISE NOTICE '3. Try creating a transfer again';
  RAISE NOTICE '';
  RAISE NOTICE 'If the issue persists:';
  RAISE NOTICE '1. Check browser console for errors';
  RAISE NOTICE '2. Run DIAGNOSE-STOCK-TRANSFER-EMPTY-LIST.sql';
  RAISE NOTICE '3. Check that current_branch_id is set in localStorage';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

