-- ============================================================================
-- DIAGNOSE STOCK TRANSFER EMPTY LIST ISSUE
-- ============================================================================
-- This script helps diagnose why transfers show in count but not in list
-- ============================================================================

-- Step 1: Check if transfers exist in the database
SELECT 
  '1. All Transfers' as check_name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN transfer_type = 'stock' THEN 1 END) as stock_transfer_count
FROM branch_transfers;

-- Step 2: Show recent transfers with all details
SELECT 
  '2. Recent Transfers' as check_name,
  id,
  from_branch_id,
  to_branch_id,
  transfer_type,
  entity_type,
  status,
  quantity,
  created_at,
  requested_by
FROM branch_transfers
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: Check if from_branch and to_branch references exist
SELECT 
  '3. Branch Reference Check' as check_name,
  t.id as transfer_id,
  t.from_branch_id,
  t.to_branch_id,
  fb.name as from_branch_name,
  tb.name as to_branch_name,
  fb.is_active as from_active,
  tb.is_active as to_active
FROM branch_transfers t
LEFT JOIN store_locations fb ON fb.id = t.from_branch_id
LEFT JOIN store_locations tb ON tb.id = t.to_branch_id
ORDER BY t.created_at DESC
LIMIT 10;

-- Step 4: Check for NULL branch_ids (this would cause issues)
SELECT 
  '4. NULL Branch IDs' as check_name,
  COUNT(*) as transfers_with_null_branches
FROM branch_transfers
WHERE from_branch_id IS NULL OR to_branch_id IS NULL;

-- Step 5: Check RLS policies on branch_transfers table
SELECT 
  '5. RLS Policies' as check_name,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'branch_transfers';

-- Step 6: Check if entity_id references exist
SELECT 
  '6. Entity Reference Check' as check_name,
  t.id as transfer_id,
  t.entity_id,
  t.entity_type,
  v.variant_name,
  v.sku,
  v.branch_id as variant_branch_id
FROM branch_transfers t
LEFT JOIN lats_product_variants v ON v.id = t.entity_id
WHERE t.transfer_type = 'stock'
ORDER BY t.created_at DESC
LIMIT 10;

-- Step 7: List all branches
SELECT 
  '7. Available Branches' as check_name,
  id,
  name,
  code,
  city,
  is_active,
  is_main
FROM store_locations
ORDER BY name;

-- ============================================================================
-- POTENTIAL FIXES BASED ON RESULTS
-- ============================================================================

-- If Step 1 shows transfers exist but Step 2 shows nothing:
-- -> RLS policy is blocking reads

-- If Step 3 shows NULL branch names:
-- -> Branch references are broken, run this:
/*
SELECT 
  'Transfers with missing branches:' as issue,
  id,
  from_branch_id,
  to_branch_id
FROM branch_transfers t
WHERE NOT EXISTS (SELECT 1 FROM store_locations WHERE id = t.from_branch_id)
   OR NOT EXISTS (SELECT 1 FROM store_locations WHERE id = t.to_branch_id);
*/

-- If Step 4 shows NULL branch_ids:
-- -> Transfers were created incorrectly

-- If Step 5 shows restrictive RLS policies:
-- -> Need to disable or adjust RLS policies

-- Step 8: Check what the actual query in the app would return
-- Replace 'YOUR_BRANCH_ID_HERE' with the actual branch ID from localStorage
DO $$
DECLARE
  v_branch_id UUID;
  v_count INTEGER;
BEGIN
  -- Get the first branch ID as a test
  SELECT id INTO v_branch_id FROM store_locations WHERE is_active = true LIMIT 1;
  
  RAISE NOTICE 'Testing with branch_id: %', v_branch_id;
  
  -- Simulate the app query
  SELECT COUNT(*) INTO v_count
  FROM branch_transfers
  WHERE transfer_type = 'stock'
    AND (from_branch_id = v_branch_id OR to_branch_id = v_branch_id);
  
  RAISE NOTICE 'Transfers found for this branch: %', v_count;
END $$;

-- ============================================================================
-- EMERGENCY FIX: If RLS is blocking, disable it temporarily
-- ============================================================================
-- UNCOMMENT ONLY IF STEP 5 SHOWS RLS POLICIES ARE THE ISSUE
/*
ALTER TABLE branch_transfers DISABLE ROW LEVEL SECURITY;
*/

-- ============================================================================
-- BETTER FIX: Create proper RLS policies
-- ============================================================================
-- This allows users to see transfers for their branches
/*
-- Drop existing restrictive policies
DROP POLICY IF EXISTS branch_transfers_select_policy ON branch_transfers;

-- Create new permissive policy
CREATE POLICY branch_transfers_select_policy ON branch_transfers
  FOR SELECT
  USING (true); -- Allow all reads (adjust based on your needs)

-- Or create branch-based policy (if you have user-branch mapping)
CREATE POLICY branch_transfers_select_policy ON branch_transfers
  FOR SELECT
  USING (
    from_branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
    OR to_branch_id IN (SELECT branch_id FROM user_branches WHERE user_id = auth.uid())
  );
*/

