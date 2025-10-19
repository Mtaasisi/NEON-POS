-- ============================================================================
-- FIX UNASSIGNED PRODUCT VARIANTS - Final Working Version
-- ============================================================================
-- Fixes variants that have NULL branch_id while their products have branch_id
-- ============================================================================

BEGIN;

-- DIAGNOSTIC: Show current state
SELECT 
    '📊 DIAGNOSTIC' AS status,
    COUNT(*) AS unassigned_variants
FROM lats_product_variants pv
JOIN lats_products p ON p.id = pv.product_id
WHERE pv.branch_id IS NULL
  AND p.branch_id IS NOT NULL;

-- Show affected products before fix
SELECT 
    '🔍 BEFORE FIX' AS status,
    p.name AS product_name,
    p.branch_id AS product_branch,
    pv.variant_name,
    pv.branch_id AS variant_branch,
    pv.quantity AS stock,
    pv.unit_price AS price,
    (pv.quantity * pv.unit_price) AS total_value
FROM lats_products p
JOIN lats_product_variants pv ON pv.product_id = p.id
WHERE pv.branch_id IS NULL
  AND p.branch_id IS NOT NULL;

-- FIX 1: Assign variants to parent product's branch
UPDATE lats_product_variants pv
SET 
    branch_id = p.branch_id,
    is_shared = FALSE,
    sharing_mode = 'isolated',
    updated_at = NOW()
FROM lats_products p
WHERE p.id = pv.product_id
  AND pv.branch_id IS NULL
  AND p.branch_id IS NOT NULL;

SELECT '✅ FIX 1 COMPLETE' AS status, 'Variants assigned to branches' AS message;

-- FIX 2: Update minimum stock levels
UPDATE lats_products
SET 
    min_stock_level = 5,
    updated_at = NOW()
WHERE (min_stock_level IS NULL OR min_stock_level = 0)
  AND is_active = TRUE;

SELECT '✅ FIX 2 COMPLETE' AS status, 'Minimum stock levels updated' AS message;

-- VALIDATION: Check for remaining issues
SELECT 
    '🔍 VALIDATION' AS status,
    COUNT(*) AS remaining_unassigned
FROM lats_product_variants pv
JOIN lats_products p ON p.id = pv.product_id
WHERE pv.branch_id IS NULL
  AND p.branch_id IS NOT NULL;

-- Show final state
SELECT 
    '✅ AFTER FIX' AS status,
    p.name AS product_name,
    p.branch_id AS product_branch,
    pv.variant_name,
    pv.branch_id AS variant_branch,
    pv.is_shared,
    pv.sharing_mode,
    pv.quantity AS stock,
    pv.unit_price AS price,
    (pv.quantity * pv.unit_price) AS total_value
FROM lats_products p
LEFT JOIN lats_product_variants pv ON pv.product_id = p.id
WHERE p.id = '868d6354-524e-4cec-8fbb-2f3553824728';

COMMIT;

SELECT 
    '🎉 SUCCESS' AS status,
    'All product variants fixed!' AS message,
    'Refresh the UI to see changes' AS next_step;

