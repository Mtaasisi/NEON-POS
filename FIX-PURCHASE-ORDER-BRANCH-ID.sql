-- ========================================
-- FIX PURCHASE ORDER BRANCH ID ISSUE
-- ========================================
-- Problem: Purchase orders created without branch_id don't show in UI
-- Solution: Update existing purchase orders to have correct branch_id
-- ========================================

\echo '=================================================='
\echo '🔍 CHECKING PURCHASE ORDERS WITHOUT BRANCH_ID'
\echo '=================================================='

-- Check purchase orders missing branch_id
SELECT 
  id,
  po_number,
  supplier_id,
  status,
  total_amount,
  branch_id,
  created_at,
  CASE 
    WHEN branch_id IS NULL THEN '❌ NO BRANCH ID'
    ELSE '✅ HAS BRANCH ID'
  END as branch_status
FROM lats_purchase_orders
ORDER BY created_at DESC
LIMIT 20;

\echo ''
\echo '=================================================='
\echo '🔧 FIXING PURCHASE ORDERS WITHOUT BRANCH_ID'
\echo '=================================================='

-- Update purchase orders without branch_id to use the main/first branch
-- This will make them visible in the UI
DO $$
DECLARE
  v_main_branch_id UUID;
  v_updated_count INTEGER;
BEGIN
  -- Get the main branch ID (or first branch if no main branch)
  SELECT id INTO v_main_branch_id
  FROM branches
  WHERE is_main = true
  LIMIT 1;
  
  -- If no main branch found, get the first branch
  IF v_main_branch_id IS NULL THEN
    SELECT id INTO v_main_branch_id
    FROM branches
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  IF v_main_branch_id IS NULL THEN
    RAISE EXCEPTION '❌ No branches found in database! Please create a branch first.';
  END IF;
  
  RAISE NOTICE '📍 Using branch ID: %', v_main_branch_id;
  
  -- Update purchase orders without branch_id
  UPDATE lats_purchase_orders
  SET branch_id = v_main_branch_id,
      updated_at = NOW()
  WHERE branch_id IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count > 0 THEN
    RAISE NOTICE '✅ Updated % purchase order(s) with branch_id', v_updated_count;
  ELSE
    RAISE NOTICE '✅ All purchase orders already have branch_id';
  END IF;
END $$;

\echo ''
\echo '=================================================='
\echo '✅ VERIFICATION - ALL PURCHASE ORDERS'
\echo '=================================================='

-- Verify all purchase orders now have branch_id
SELECT 
  po.id,
  po.po_number,
  po.status,
  po.total_amount,
  b.name as branch_name,
  po.created_at,
  CASE 
    WHEN po.branch_id IS NULL THEN '❌ NO BRANCH'
    ELSE '✅ HAS BRANCH'
  END as status_check
FROM lats_purchase_orders po
LEFT JOIN branches b ON b.id = po.branch_id
ORDER BY po.created_at DESC
LIMIT 20;

\echo ''
\echo '=================================================='
\echo '🎯 INSTRUCTIONS'
\echo '=================================================='
\echo 'After running this script:'
\echo '1. Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)'
\echo '2. Go to Purchase Orders page'
\echo '3. Your purchase orders should now be visible!'
\echo ''
\echo 'If still not showing:'
\echo '1. Open browser console (F12)'
\echo '2. Run: localStorage.getItem("current_branch_id")'
\echo '3. Make sure it matches the branch_id in the database'
\echo '=================================================='

