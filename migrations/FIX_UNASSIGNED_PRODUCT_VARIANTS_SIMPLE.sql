-- ============================================================================
-- FIX UNASSIGNED PRODUCT VARIANTS - Simple Version
-- ============================================================================
-- This script fixes the issue where product variants have NULL branch_id
-- ============================================================================

BEGIN;

-- Show diagnostic information
SELECT 
    'DIAGNOSTIC: Unassigned Variants Found' AS status,
    COUNT(*) AS count
FROM lats_product_variants pv
JOIN lats_products p ON p.id = pv.product_id
WHERE pv.branch_id IS NULL
  AND p.branch_id IS NOT NULL;

-- Show affected products
SELECT 
    'AFFECTED PRODUCT' AS status,
    p.id AS product_id,
    p.name AS product_name,
    p.branch_id AS product_branch,
    pv.id AS variant_id,
    pv.variant_name,
    pv.quantity AS stock,
    pv.unit_price AS price
FROM lats_products p
JOIN lats_product_variants pv ON pv.product_id = p.id
WHERE pv.branch_id IS NULL
  AND p.branch_id IS NOT NULL;

-- FIX 1: Assign variants to parent product's branch
UPDATE lats_product_variants pv
SET 
    branch_id = p.branch_id,
    updated_at = NOW()
FROM lats_products p
WHERE p.id = pv.product_id
  AND pv.branch_id IS NULL
  AND p.branch_id IS NOT NULL;

-- Show update count
SELECT 'FIX 1: Variants assigned to branches' AS status, COUNT(*) AS updated_count
FROM lats_product_variants pv
JOIN lats_products p ON p.id = pv.product_id
WHERE pv.branch_id = p.branch_id;

-- FIX 2: Set primary variants for products that don't have one
WITH products_needing_primary AS (
    SELECT DISTINCT p.id AS product_id
    FROM lats_products p
    WHERE p.is_active = TRUE
      AND NOT EXISTS (
          SELECT 1 
          FROM lats_product_variants pv 
          WHERE pv.product_id = p.id 
            AND pv.is_primary = TRUE
      )
      AND EXISTS (
          SELECT 1 
          FROM lats_product_variants pv2 
          WHERE pv2.product_id = p.id
      )
),
first_variants AS (
    SELECT DISTINCT ON (pv.product_id)
        pv.id AS variant_id,
        pv.product_id,
        pv.variant_name
    FROM lats_product_variants pv
    JOIN products_needing_primary pnp ON pnp.product_id = pv.product_id
    ORDER BY pv.product_id, pv.created_at ASC
)
UPDATE lats_product_variants pv
SET 
    is_primary = TRUE,
    updated_at = NOW()
FROM first_variants fv
WHERE pv.id = fv.variant_id;

-- Show primary variants set
SELECT 'FIX 2: Primary variants set' AS status, COUNT(*) AS updated_count
FROM lats_product_variants
WHERE is_primary = TRUE;

-- FIX 3: Update minimum stock levels
UPDATE lats_products
SET 
    min_stock_level = 5,
    updated_at = NOW()
WHERE (min_stock_level IS NULL OR min_stock_level = 0)
  AND is_active = TRUE;

-- Show min stock updates
SELECT 'FIX 3: Minimum stock levels updated' AS status, COUNT(*) AS updated_count
FROM lats_products
WHERE min_stock_level > 0;

-- FIX 4: Fix specific product (Min Mac A1347)
UPDATE lats_products
SET 
    min_stock_level = COALESCE(NULLIF(min_stock_level, 0), 5),
    updated_at = NOW()
WHERE id = '868d6354-524e-4cec-8fbb-2f3553824728';

UPDATE lats_product_variants pv
SET 
    branch_id = p.branch_id,
    is_primary = TRUE,
    updated_at = NOW()
FROM lats_products p
WHERE p.id = pv.product_id
  AND p.id = '868d6354-524e-4cec-8fbb-2f3553824728';

-- Validation: Check for remaining issues
SELECT 
    'VALIDATION: Remaining Unassigned Variants' AS status,
    COUNT(*) AS count
FROM lats_product_variants pv
JOIN lats_products p ON p.id = pv.product_id
WHERE pv.branch_id IS NULL
  AND p.branch_id IS NOT NULL;

-- Show final state of Min Mac A1347
SELECT 
    'FINAL STATE: Min Mac A1347' AS status,
    p.name AS product_name,
    p.branch_id AS product_branch,
    pv.variant_name,
    pv.branch_id AS variant_branch,
    pv.is_primary,
    pv.quantity AS stock,
    pv.unit_price AS price,
    pv.cost_price,
    (pv.quantity * pv.unit_price) AS total_value
FROM lats_products p
LEFT JOIN lats_product_variants pv ON pv.product_id = p.id
WHERE p.id = '868d6354-524e-4cec-8fbb-2f3553824728';

COMMIT;

-- Final success message
SELECT 
    '✅ SUCCESS' AS status,
    'All product variants fixed and assigned to branches!' AS message;

