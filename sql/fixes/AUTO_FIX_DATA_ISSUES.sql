-- ============================================================================
-- AUTOMATIC DATA CLEANUP & FIXES
-- ============================================================================
-- Fixes all issues found in the comprehensive audit
-- ============================================================================

\echo ''
\echo '╔═══════════════════════════════════════════════════════════════════════════╗'
\echo '║                    AUTOMATIC DATA CLEANUP - STARTING                      ║'
\echo '╚═══════════════════════════════════════════════════════════════════════════╝'
\echo ''

-- ============================================================================
-- FIX 1: Set IMEI Status for IMEIs Without Status
-- ============================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '1️⃣  Setting IMEI Status for IMEIs Without Status'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Set status to 'available' for IMEIs with quantity > 0 and no status
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
  AND quantity > 0;

\echo 'Updated IMEIs with quantity > 0 to "available" status'

-- Set status to 'sold' for IMEIs with quantity = 0 and no status
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
  AND quantity = 0;

\echo 'Updated IMEIs with quantity = 0 to "sold" status'

-- ============================================================================
-- FIX 2: Fix Invalid IMEI Statuses
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '2️⃣  Fixing Invalid IMEI Statuses'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Fix 'invalid' status to 'available' if quantity > 0
UPDATE lats_product_variants
SET variant_attributes = jsonb_set(
  variant_attributes,
  '{imei_status}',
  '"available"'::jsonb
)
WHERE variant_type = 'imei_child'
  AND variant_attributes->>'imei_status' = 'invalid'
  AND quantity > 0;

\echo 'Fixed "invalid" status to "available" for IMEIs with stock'

-- ============================================================================
-- FIX 3: Fix Selling Price Issues
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '3️⃣  Fixing Selling Price Issues'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Set selling price to cost_price * 1.3 (30% markup) where selling < cost
UPDATE lats_product_variants
SET selling_price = ROUND(cost_price * 1.30, 2)
WHERE selling_price < cost_price
  AND cost_price > 0;

\echo 'Fixed selling prices (set to cost + 30% markup)'

-- ============================================================================
-- FIX 4: Ensure All Parent Variants Are Correctly Marked
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '4️⃣  Ensuring Parent Variants Are Correctly Marked'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Mark variants as parent if they have IMEI children
UPDATE lats_product_variants p
SET 
  is_parent = TRUE,
  variant_type = 'parent'
WHERE EXISTS (
  SELECT 1 FROM lats_product_variants c
  WHERE c.parent_variant_id = p.id
    AND c.variant_type = 'imei_child'
)
AND (p.is_parent = FALSE OR p.variant_type != 'parent');

\echo 'Marked variants with children as parent variants'

-- ============================================================================
-- FIX 5: Recalculate All Parent Stock Quantities
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '5️⃣  Recalculating All Parent Stock Quantities'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Recalculate parent stocks
SELECT * FROM recalculate_all_parent_stocks();

\echo ''
\echo 'Parent stocks recalculated'

-- ============================================================================
-- FIX 6: Sync Product Stock Quantities
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '6️⃣  Syncing Product Stock Quantities'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Update product stock to match sum of variant quantities (excluding IMEI children)
UPDATE lats_products p
SET stock_quantity = (
  SELECT COALESCE(SUM(v.quantity), 0)
  FROM lats_product_variants v
  WHERE v.product_id = p.id
    AND v.is_active = TRUE
    AND (v.parent_variant_id IS NULL OR v.variant_type != 'imei_child')
);

\echo 'Product stock quantities synchronized'

-- ============================================================================
-- VERIFICATION: Count Issues Remaining
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '7️⃣  VERIFICATION - Issues Remaining'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

SELECT 
  'IMEIs Without Status' as issue,
  COUNT(*)::text as count
FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND variant_attributes ? 'imei'
  AND (
    NOT variant_attributes ? 'imei_status'
    OR variant_attributes->>'imei_status' IS NULL
    OR variant_attributes->>'imei_status' = ''
  )

UNION ALL

SELECT 
  'Invalid IMEI Status',
  COUNT(*)::text
FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND variant_attributes->>'imei_status' = 'invalid'

UNION ALL

SELECT 
  'Selling < Cost Price',
  COUNT(*)::text
FROM lats_product_variants
WHERE selling_price < cost_price
  AND cost_price > 0

UNION ALL

SELECT 
  'Negative Stock',
  COUNT(*)::text
FROM lats_product_variants
WHERE quantity < 0

UNION ALL

SELECT 
  'Orphaned IMEI Children',
  COUNT(*)::text
FROM lats_product_variants v
WHERE v.variant_type = 'imei_child'
  AND v.parent_variant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lats_product_variants p
    WHERE p.id = v.parent_variant_id
  );

\echo ''
\echo '╔═══════════════════════════════════════════════════════════════════════════╗'
\echo '║                    AUTOMATIC DATA CLEANUP - COMPLETED                     ║'
\echo '╚═══════════════════════════════════════════════════════════════════════════╝'
\echo ''

