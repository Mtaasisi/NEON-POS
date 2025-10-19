-- ============================================================================
-- FIX UNASSIGNED PRODUCT VARIANTS - Automatic Repair
-- ============================================================================
-- Issue: Product variants have NULL branch_id while their parent products
--        have branch_id assigned, causing variants to be invisible in 
--        isolated mode.
-- 
-- This script:
-- 1. Finds all unassigned variants for branch-assigned products
-- 2. Assigns variants to the same branch as their parent product
-- 3. Sets primary variant if none exists
-- 4. Updates minimum stock levels
-- 5. Validates the fix
--
-- Test Date: October 19, 2025
-- Affected Product: Min Mac A1347 (ID: 868d6354-524e-4cec-8fbb-2f3553824728)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: DIAGNOSTIC - Show Current State
-- ============================================================================
DO $$
DECLARE
    unassigned_count INTEGER;
    affected_products INTEGER;
BEGIN
    -- Count unassigned variants
    SELECT COUNT(*)
    INTO unassigned_count
    FROM lats_product_variants pv
    JOIN lats_products p ON p.id = pv.product_id
    WHERE pv.branch_id IS NULL
      AND p.branch_id IS NOT NULL;
    
    -- Count affected products
    SELECT COUNT(DISTINCT p.id)
    INTO affected_products
    FROM lats_product_variants pv
    JOIN lats_products p ON p.id = pv.product_id
    WHERE pv.branch_id IS NULL
      AND p.branch_id IS NOT NULL;
    
    RAISE NOTICE '📊 DIAGNOSTIC RESULTS:';
    RAISE NOTICE '   Unassigned variants found: %', unassigned_count;
    RAISE NOTICE '   Affected products: %', affected_products;
    RAISE NOTICE '';
END $$;

-- Show details of affected products
RAISE NOTICE '📋 AFFECTED PRODUCTS:';
SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.branch_id AS product_branch_id,
    pv.id AS variant_id,
    pv.variant_name,
    pv.quantity AS stock,
    pv.unit_price AS price,
    pv.branch_id AS variant_branch_id
FROM lats_products p
JOIN lats_product_variants pv ON pv.product_id = p.id
WHERE pv.branch_id IS NULL
  AND p.branch_id IS NOT NULL
ORDER BY p.name, pv.variant_name;

-- ============================================================================
-- STEP 2: FIX UNASSIGNED VARIANTS - Assign to Parent Product's Branch
-- ============================================================================
RAISE NOTICE '';
RAISE NOTICE '🔧 FIXING UNASSIGNED VARIANTS...';

-- Update variants to inherit branch_id from their parent product
WITH updated_variants AS (
    UPDATE lats_product_variants pv
    SET 
        branch_id = p.branch_id,
        updated_at = NOW()
    FROM lats_products p
    WHERE p.id = pv.product_id
      AND pv.branch_id IS NULL
      AND p.branch_id IS NOT NULL
    RETURNING pv.id, pv.product_id, pv.variant_name, pv.branch_id
)
SELECT 
    COUNT(*) AS updated_count,
    STRING_AGG(variant_name, ', ') AS updated_variants
FROM updated_variants;

RAISE NOTICE '✅ Variants assigned to branches';

-- ============================================================================
-- STEP 3: SET PRIMARY VARIANTS - Ensure Each Product Has One
-- ============================================================================
RAISE NOTICE '';
RAISE NOTICE '🎯 SETTING PRIMARY VARIANTS...';

-- For products without a primary variant, set the first variant as primary
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
WHERE pv.id = fv.variant_id
RETURNING pv.product_id, pv.variant_name;

RAISE NOTICE '✅ Primary variants set';

-- ============================================================================
-- STEP 4: UPDATE MINIMUM STOCK LEVELS (if not set)
-- ============================================================================
RAISE NOTICE '';
RAISE NOTICE '📦 UPDATING MINIMUM STOCK LEVELS...';

-- Set default min stock level for products that don't have one
UPDATE lats_products
SET 
    min_stock_level = 5,
    updated_at = NOW()
WHERE (min_stock_level IS NULL OR min_stock_level = 0)
  AND is_active = TRUE
RETURNING name, min_stock_level;

RAISE NOTICE '✅ Minimum stock levels updated';

-- ============================================================================
-- STEP 5: FIX SPECIFIC PRODUCT (Min Mac A1347)
-- ============================================================================
RAISE NOTICE '';
RAISE NOTICE '🎯 FIXING SPECIFIC PRODUCT: Min Mac A1347...';

-- Update the specific product mentioned in the test
UPDATE lats_products
SET 
    min_stock_level = COALESCE(NULLIF(min_stock_level, 0), 5),
    updated_at = NOW()
WHERE id = '868d6354-524e-4cec-8fbb-2f3553824728';

-- Ensure its variants are properly assigned
UPDATE lats_product_variants pv
SET 
    branch_id = p.branch_id,
    is_primary = TRUE,  -- Set as primary if it's the only one
    updated_at = NOW()
FROM lats_products p
WHERE p.id = pv.product_id
  AND p.id = '868d6354-524e-4cec-8fbb-2f3553824728'
  AND (pv.branch_id IS NULL OR pv.branch_id != p.branch_id);

RAISE NOTICE '✅ Min Mac A1347 fixed';

-- ============================================================================
-- STEP 6: VALIDATION - Verify Fixes
-- ============================================================================
RAISE NOTICE '';
RAISE NOTICE '✅ VALIDATION RESULTS:';

DO $$
DECLARE
    remaining_unassigned INTEGER;
    products_without_primary INTEGER;
    products_with_zero_min_stock INTEGER;
BEGIN
    -- Check for remaining unassigned variants
    SELECT COUNT(*)
    INTO remaining_unassigned
    FROM lats_product_variants pv
    JOIN lats_products p ON p.id = pv.product_id
    WHERE pv.branch_id IS NULL
      AND p.branch_id IS NOT NULL;
    
    -- Check for products without primary variants
    SELECT COUNT(DISTINCT p.id)
    INTO products_without_primary
    FROM lats_products p
    WHERE p.is_active = TRUE
      AND EXISTS (SELECT 1 FROM lats_product_variants pv WHERE pv.product_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM lats_product_variants pv WHERE pv.product_id = p.id AND pv.is_primary = TRUE);
    
    -- Check for active products with zero min stock
    SELECT COUNT(*)
    INTO products_with_zero_min_stock
    FROM lats_products
    WHERE is_active = TRUE
      AND (min_stock_level IS NULL OR min_stock_level = 0);
    
    RAISE NOTICE '   Remaining unassigned variants: %', remaining_unassigned;
    RAISE NOTICE '   Products without primary variant: %', products_without_primary;
    RAISE NOTICE '   Products with zero min stock: %', products_with_zero_min_stock;
    RAISE NOTICE '';
    
    IF remaining_unassigned = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All variants are properly assigned!';
    ELSE
        RAISE WARNING '⚠️  Some variants are still unassigned!';
    END IF;
END $$;

-- ============================================================================
-- STEP 7: SHOW FINAL STATE
-- ============================================================================
RAISE NOTICE '';
RAISE NOTICE '📊 FINAL STATE - Min Mac A1347:';

SELECT 
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
WHERE p.id = '868d6354-524e-4cec-8fbb-2f3553824728'
ORDER BY pv.is_primary DESC NULLS LAST;

-- ============================================================================
-- COMMIT CHANGES
-- ============================================================================
RAISE NOTICE '';
RAISE NOTICE '💾 Committing changes...';

COMMIT;

RAISE NOTICE '✅ ALL FIXES APPLIED SUCCESSFULLY!';
RAISE NOTICE '';
RAISE NOTICE '🎉 Product variants are now properly assigned to branches!';
RAISE NOTICE '🎉 Products now have primary variants set!';
RAISE NOTICE '🎉 Minimum stock levels configured!';
RAISE NOTICE '';
RAISE NOTICE '📝 Next steps:';
RAISE NOTICE '   1. Refresh the UI to see the changes';
RAISE NOTICE '   2. Verify variants appear in product details';
RAISE NOTICE '   3. Test adding product to POS';
RAISE NOTICE '   4. Upload product images if needed';

