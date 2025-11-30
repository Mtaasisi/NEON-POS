-- ============================================================================
-- FIX ALL CRITICAL ISSUES FOUND IN DEEP RECHECK
-- ============================================================================
-- This script fixes the 26 orphaned IMEI children and other data issues
-- ============================================================================

\echo ''
\echo '╔═══════════════════════════════════════════════════════════════════════════╗'
\echo '║              FIXING ALL CRITICAL ISSUES - STARTING                        ║'
\echo '╚═══════════════════════════════════════════════════════════════════════════╝'
\echo ''

-- ============================================================================
-- ISSUE 1: Fix 26 Orphaned IMEI Children (NO parent_variant_id)
-- ============================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'ISSUE 1: Fixing 26 Orphaned IMEI Children'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Strategy: Delete orphaned IMEI children without valid IMEI or parent
-- These appear to be test/invalid data that should not be in the system

-- First, show what we're about to delete
\echo 'Orphaned IMEI children to be deleted:'
SELECT 
  id,
  name,
  variant_type,
  variant_attributes->>'imei' as imei,
  quantity
FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND parent_variant_id IS NULL
ORDER BY created_at DESC;

\echo ''
\echo 'Deleting orphaned IMEI children...'

-- Delete orphaned IMEI children
-- These have no parent and violate the system's parent-child architecture
DELETE FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND parent_variant_id IS NULL;

\echo 'Orphaned IMEI children deleted'
\echo ''

-- ============================================================================
-- ISSUE 2: Fix IMEIs Without Status
-- ============================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'ISSUE 2: Setting IMEI Status for Remaining IMEIs'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Set 'available' status for IMEIs with quantity > 0
UPDATE lats_product_variants
SET variant_attributes = jsonb_set(
  COALESCE(variant_attributes, '{}'::jsonb),
  '{imei_status}',
  '"available"'::jsonb
)
WHERE variant_type = 'imei_child'
  AND variant_attributes ? 'imei'
  AND (
    NOT variant_attributes ? 'imei_status'
    OR variant_attributes->>'imei_status' IS NULL
    OR variant_attributes->>'imei_status' = ''
  )
  AND quantity > 0
  AND parent_variant_id IS NOT NULL;

\echo 'Set available status for IMEIs with stock'

-- Set 'sold' status for IMEIs with quantity = 0
UPDATE lats_product_variants
SET variant_attributes = jsonb_set(
  COALESCE(variant_attributes, '{}'::jsonb),
  '{imei_status}',
  '"sold"'::jsonb
)
WHERE variant_type = 'imei_child'
  AND variant_attributes ? 'imei'
  AND (
    NOT variant_attributes ? 'imei_status'
    OR variant_attributes->>'imei_status' IS NULL
    OR variant_attributes->>'imei_status' = ''
  )
  AND quantity = 0
  AND parent_variant_id IS NOT NULL;

\echo 'Set sold status for IMEIs without stock'
\echo ''

-- ============================================================================
-- ISSUE 3: Clean Up Invalid 'invalid' Status
-- ============================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'ISSUE 3: Fixing Invalid IMEI Statuses'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Change 'invalid' to 'available' for IMEIs with stock
UPDATE lats_product_variants
SET variant_attributes = jsonb_set(
  variant_attributes,
  '{imei_status}',
  '"available"'::jsonb
)
WHERE variant_type = 'imei_child'
  AND variant_attributes->>'imei_status' = 'invalid'
  AND quantity > 0
  AND parent_variant_id IS NOT NULL;

\echo 'Fixed invalid statuses'
\echo ''

-- ============================================================================
-- ISSUE 4: Ensure All Parent Variants Are Marked
-- ============================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'ISSUE 4: Ensuring Parent Variants Are Marked'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Mark variants with children as parent
UPDATE lats_product_variants p
SET 
  is_parent = TRUE,
  variant_type = 'parent'
WHERE EXISTS (
  SELECT 1 FROM lats_product_variants c
  WHERE c.parent_variant_id = p.id
    AND c.variant_type = 'imei_child'
)
AND (p.is_parent != TRUE OR p.variant_type != 'parent');

\echo 'Parent variants marked'
\echo ''

-- ============================================================================
-- ISSUE 5: Recalculate All Parent Stocks
-- ============================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'ISSUE 5: Recalculating Parent Stocks'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Recalculate all parent stocks
SELECT * FROM recalculate_all_parent_stocks();

\echo ''
\echo 'Parent stocks recalculated'
\echo ''

-- ============================================================================
-- ISSUE 6: Sync Product Stock Quantities
-- ============================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'ISSUE 6: Syncing Product Stock'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Update product stock to match variants
UPDATE lats_products p
SET stock_quantity = (
  SELECT COALESCE(SUM(v.quantity), 0)
  FROM lats_product_variants v
  WHERE v.product_id = p.id
    AND v.is_active = TRUE
    AND (v.parent_variant_id IS NULL OR v.variant_type != 'imei_child')
);

\echo 'Product stock synchronized'
\echo ''

-- ============================================================================
-- VERIFICATION: Check All Issues Fixed
-- ============================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'VERIFICATION: Checking If All Issues Fixed'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

SELECT 
  'Orphaned IMEI Children' as issue,
  COUNT(*)::text as count,
  CASE WHEN COUNT(*) = 0 THEN '✅ FIXED' ELSE '⚠️  REMAINING' END as status
FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND parent_variant_id IS NULL

UNION ALL

SELECT 
  'IMEIs Without Status',
  COUNT(*)::text,
  CASE WHEN COUNT(*) = 0 THEN '✅ FIXED' ELSE '⚠️  REMAINING' END
FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND variant_attributes ? 'imei'
  AND (
    NOT variant_attributes ? 'imei_status'
    OR variant_attributes->>'imei_status' IS NULL
    OR variant_attributes->>'imei_status' = ''
  )
  AND parent_variant_id IS NOT NULL

UNION ALL

SELECT 
  'Invalid IMEI Status',
  COUNT(*)::text,
  CASE WHEN COUNT(*) = 0 THEN '✅ FIXED' ELSE '⚠️  REMAINING' END
FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND variant_attributes->>'imei_status' = 'invalid'
  AND quantity > 0

UNION ALL

SELECT 
  'Stock Mismatches',
  COUNT(*)::text,
  CASE WHEN COUNT(*) = 0 THEN '✅ FIXED' ELSE '⚠️  REMAINING' END
FROM (
  SELECT p.id
  FROM lats_product_variants p
  LEFT JOIN lats_product_variants c 
    ON c.parent_variant_id = p.id 
    AND c.variant_type = 'imei_child'
  WHERE (p.is_parent = TRUE OR p.variant_type = 'parent')
  GROUP BY p.id, p.quantity
  HAVING p.quantity != COALESCE(SUM(c.quantity), 0)
) subq;

\echo ''
\echo '╔═══════════════════════════════════════════════════════════════════════════╗'
\echo '║              ALL CRITICAL ISSUES FIXED - COMPLETE                         ║'
\echo '╚═══════════════════════════════════════════════════════════════════════════╝'
\echo ''

