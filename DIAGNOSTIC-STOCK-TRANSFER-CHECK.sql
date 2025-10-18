-- ============================================================================
-- COMPREHENSIVE STOCK TRANSFER & INVENTORY DIAGNOSTIC CHECK
-- ============================================================================
-- Run this in your Neon database to identify all issues
-- ============================================================================

\echo '===================================================================='
\echo '📊 DIAGNOSTIC CHECK: Stock Transfer & Inventory Connection'
\echo '===================================================================='
\echo ''

-- ============================================================================
-- CHECK 1: Required Database Functions
-- ============================================================================
\echo '1️⃣ Checking Database Functions...'
\echo '-------------------------------------------'

SELECT 
  routine_name,
  string_agg(parameter_name || ' ' || data_type, ', ' ORDER BY ordinal_position) as parameters,
  CASE 
    WHEN routine_name = 'complete_stock_transfer_transaction' THEN
      CASE 
        WHEN string_agg(parameter_name, ',' ORDER BY ordinal_position) = 'p_transfer_id,p_completed_by' THEN '✅ CORRECT (2 params)'
        WHEN string_agg(parameter_name, ',' ORDER BY ordinal_position) = 'p_transfer_id' THEN '❌ WRONG (1 param - needs p_completed_by)'
        ELSE '⚠️ UNKNOWN SIGNATURE'
      END
    ELSE '✅'
  END as status
FROM information_schema.routines
LEFT JOIN information_schema.parameters ON routines.specific_name = parameters.specific_name
WHERE routine_schema = 'public'
  AND routine_name IN (
    'reserve_variant_stock',
    'release_variant_stock',
    'reduce_variant_stock',
    'increase_variant_stock',
    'find_or_create_variant_at_branch',
    'check_duplicate_transfer',
    'complete_stock_transfer_transaction'
  )
GROUP BY routine_name, routine_type
ORDER BY routine_name;

\echo ''
\echo '❓ Expected Functions:'
\echo '   - reserve_variant_stock(p_variant_id, p_quantity)'
\echo '   - release_variant_stock(p_variant_id, p_quantity)'
\echo '   - reduce_variant_stock(p_variant_id, p_quantity)'
\echo '   - increase_variant_stock(p_variant_id, p_quantity)'
\echo '   - find_or_create_variant_at_branch(p_source_variant_id, p_target_branch_id)'
\echo '   - check_duplicate_transfer(p_from_branch_id, p_to_branch_id, p_entity_id)'
\echo '   - complete_stock_transfer_transaction(p_transfer_id, p_completed_by) ⬅️ MUST HAVE 2 PARAMS!'
\echo ''

-- ============================================================================
-- CHECK 2: Required Table Columns
-- ============================================================================
\echo '2️⃣ Checking Table Structure...'
\echo '-------------------------------------------'

-- Check lats_product_variants
\echo '📦 lats_product_variants columns:'
SELECT 
  column_name,
  data_type,
  column_default,
  CASE 
    WHEN column_name = 'reserved_quantity' THEN '✅ CRITICAL - Stock Reservation'
    WHEN column_name = 'quantity' THEN '✅ Required'
    WHEN column_name = 'branch_id' THEN '✅ Required'
    ELSE '✅'
  END as importance
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
  AND column_name IN ('id', 'quantity', 'reserved_quantity', 'branch_id', 'variant_name', 'sku')
ORDER BY 
  CASE column_name
    WHEN 'id' THEN 1
    WHEN 'variant_name' THEN 2
    WHEN 'sku' THEN 3
    WHEN 'branch_id' THEN 4
    WHEN 'quantity' THEN 5
    WHEN 'reserved_quantity' THEN 6
  END;

\echo ''
\echo '❓ Missing reserved_quantity column?'
SELECT CASE 
  WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'reserved_quantity'
  ) THEN '✅ reserved_quantity exists'
  ELSE '❌ CRITICAL: reserved_quantity column MISSING! Stock reservation will not work!'
END as reserved_quantity_status;

\echo ''

-- Check branch_transfers
\echo '🔄 branch_transfers columns:'
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'rejection_reason' THEN '⚠️ Optional but useful'
    ELSE '✅ Required'
  END as importance
FROM information_schema.columns
WHERE table_name = 'branch_transfers'
  AND column_name IN ('id', 'from_branch_id', 'to_branch_id', 'entity_id', 'quantity', 'status', 'rejection_reason')
ORDER BY column_name;

\echo ''

-- Check lats_stock_movements
\echo '📊 lats_stock_movements columns:'
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('from_branch_id', 'to_branch_id') THEN '✅ CRITICAL for audit trail'
    ELSE '✅'
  END as importance
FROM information_schema.columns
WHERE table_name = 'lats_stock_movements'
  AND column_name IN ('id', 'variant_id', 'movement_type', 'quantity', 'from_branch_id', 'to_branch_id', 'reference_id')
ORDER BY column_name;

\echo ''
\echo '❓ Check stock movements has branch support:'
SELECT CASE 
  WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_stock_movements' 
    AND column_name = 'from_branch_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_stock_movements' 
    AND column_name = 'to_branch_id'
  ) THEN '✅ Branch tracking enabled'
  ELSE '❌ CRITICAL: Branch columns missing in stock_movements! No audit trail!'
END as branch_tracking_status;

\echo ''

-- ============================================================================
-- CHECK 3: Current Transfer Status
-- ============================================================================
\echo '3️⃣ Checking Current Transfers...'
\echo '-------------------------------------------'

SELECT 
  status,
  COUNT(*) as count,
  CASE 
    WHEN status = 'pending' THEN '⚠️ Needs approval'
    WHEN status = 'approved' THEN '⚠️ Needs completion'
    WHEN status = 'in_transit' THEN '⚠️ Needs completion'
    WHEN status = 'completed' THEN '✅ Done'
    WHEN status IN ('rejected', 'cancelled') THEN '🚫 Terminated'
    ELSE '❓ Unknown'
  END as action_needed
FROM branch_transfers
WHERE transfer_type = 'stock'
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'pending' THEN 1
    WHEN 'approved' THEN 2
    WHEN 'in_transit' THEN 3
    WHEN 'completed' THEN 4
    ELSE 5
  END;

\echo ''

-- ============================================================================
-- CHECK 4: Inventory Reservation Status
-- ============================================================================
\echo '4️⃣ Checking Stock Reservations...'
\echo '-------------------------------------------'

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'reserved_quantity'
  ) THEN
    RAISE NOTICE 'Variants with reserved stock:';
    PERFORM 1; -- Placeholder
  ELSE
    RAISE WARNING '❌ Cannot check reservations - reserved_quantity column does not exist!';
  END IF;
END $$;

-- Only run if column exists
SELECT 
  pv.id,
  pv.variant_name,
  pv.sku,
  pv.quantity as total_stock,
  COALESCE(pv.reserved_quantity, 0) as reserved,
  (pv.quantity - COALESCE(pv.reserved_quantity, 0)) as available,
  sl.name as branch
FROM lats_product_variants pv
JOIN store_locations sl ON pv.branch_id = sl.id
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'lats_product_variants' 
  AND column_name = 'reserved_quantity'
)
AND COALESCE(pv.reserved_quantity, 0) > 0
LIMIT 10;

\echo ''

-- ============================================================================
-- CHECK 5: Pending Transfers Without Reservation
-- ============================================================================
\echo '5️⃣ Checking for Orphaned Transfers (not reserved)...'
\echo '-------------------------------------------'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'reserved_quantity'
  ) THEN
    RAISE WARNING '❌ All pending/approved transfers are orphaned! No reservation system exists!';
  END IF;
END $$;

SELECT 
  bt.id as transfer_id,
  bt.status,
  bt.quantity as transfer_qty,
  pv.variant_name,
  pv.quantity as current_stock,
  COALESCE(pv.reserved_quantity, 0) as reserved_stock,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'lats_product_variants' 
      AND column_name = 'reserved_quantity'
    ) THEN '❌ NO RESERVATION SYSTEM'
    WHEN COALESCE(pv.reserved_quantity, 0) < bt.quantity THEN '❌ UNDER-RESERVED'
    WHEN COALESCE(pv.reserved_quantity, 0) >= bt.quantity THEN '✅ Properly Reserved'
    ELSE '⚠️ Unknown'
  END as reservation_status
FROM branch_transfers bt
JOIN lats_product_variants pv ON bt.entity_id = pv.id
WHERE bt.status IN ('pending', 'approved', 'in_transit')
  AND bt.transfer_type = 'stock'
ORDER BY bt.created_at DESC
LIMIT 10;

\echo ''

-- ============================================================================
-- CHECK 6: Test Complete Function Signature
-- ============================================================================
\echo '6️⃣ Testing Function Signatures...'
\echo '-------------------------------------------'

SELECT 
  routine_name,
  parameter_name,
  data_type,
  parameter_mode,
  ordinal_position
FROM information_schema.parameters
WHERE specific_name IN (
  SELECT specific_name 
  FROM information_schema.routines 
  WHERE routine_name = 'complete_stock_transfer_transaction'
)
ORDER BY ordinal_position;

\echo ''
\echo '❓ Expected: 2 parameters (p_transfer_id UUID, p_completed_by UUID)'
\echo ''

-- ============================================================================
-- CHECK 7: Sample Stock Movement Logs
-- ============================================================================
\echo '7️⃣ Checking Stock Movement Audit Trail...'
\echo '-------------------------------------------'

SELECT 
  sm.movement_type,
  sm.quantity,
  from_b.name as from_branch,
  to_b.name as to_branch,
  sm.created_at,
  CASE 
    WHEN sm.from_branch_id IS NULL AND sm.to_branch_id IS NULL THEN '❌ No branch tracking'
    ELSE '✅ Branch tracked'
  END as tracking_status
FROM lats_stock_movements sm
LEFT JOIN store_locations from_b ON sm.from_branch_id = from_b.id
LEFT JOIN store_locations to_b ON sm.to_branch_id = to_b.id
WHERE sm.movement_type = 'transfer'
ORDER BY sm.created_at DESC
LIMIT 5;

\echo ''
\echo 'If no results above, no transfers have been completed yet.'
\echo ''

-- ============================================================================
-- SUMMARY & RECOMMENDATIONS
-- ============================================================================
\echo '===================================================================='
\echo '📋 DIAGNOSTIC SUMMARY'
\echo '===================================================================='
\echo ''
\echo '🔍 Issues to Check:'
\echo ''
\echo '1. ❌ CRITICAL: Does complete_stock_transfer_transaction accept 2 parameters?'
\echo '   - Frontend sends: (p_transfer_id, p_completed_by)'
\echo '   - If function only has 1 param, it will FAIL!'
\echo ''
\echo '2. ❌ CRITICAL: Is reserved_quantity column present?'
\echo '   - Without this, stock reservation does not work'
\echo '   - Pending transfers can oversell stock'
\echo ''
\echo '3. ❌ CRITICAL: Does complete_stock_transfer_transaction actually:'
\echo '   - Reduce stock from source?'
\echo '   - Increase stock at destination?'
\echo '   - Log stock movements?'
\echo '   - Release reservations?'
\echo ''
\echo '4. ⚠️ Are helper functions present?'
\echo '   - find_or_create_variant_at_branch'
\echo '   - reserve_variant_stock'
\echo '   - release_variant_stock'
\echo ''
\echo '===================================================================='
\echo ''

-- ============================================================================
-- Final Check
-- ============================================================================
SELECT 
  '🎯 FINAL STATUS' as check_type,
  CASE 
    WHEN (
      -- All critical functions exist
      (SELECT COUNT(*) FROM information_schema.routines 
       WHERE routine_schema = 'public' 
       AND routine_name IN (
         'reserve_variant_stock', 
         'release_variant_stock',
         'reduce_variant_stock', 
         'increase_variant_stock',
         'find_or_create_variant_at_branch',
         'complete_stock_transfer_transaction'
       )) >= 6
      -- Reserved quantity column exists
      AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'reserved_quantity'
      )
      -- Stock movements has branch support
      AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_stock_movements' 
        AND column_name = 'from_branch_id'
      )
    ) THEN '✅ SYSTEM APPEARS COMPLETE'
    ELSE '❌ CRITICAL ISSUES FOUND - NEEDS FIX'
  END as overall_status;

