-- ============================================
-- CLEANUP MULTIPLE DEFAULT VARIANTS
-- ============================================
-- This script removes duplicate default variants, keeping only one per product.
-- Default variants are identified by:
-- 1. NULL variant_name
-- 2. Empty string variant_name
-- 3. variant_name = 'default', 'default variant', 'variant 1' (case insensitive)
--
-- Strategy: Keep the oldest default variant (by created_at, then id as tiebreaker)
-- Safety: Verifies no foreign key references before deletion
-- ============================================

BEGIN;

-- Step 1: Show summary of default variants to be cleaned
DO $$
DECLARE
    products_with_multiple INTEGER;
    total_default_variants INTEGER;
    default_variants_to_keep INTEGER;
    default_variants_to_delete INTEGER;
BEGIN
    -- Count products with multiple default variants
    WITH default_variants AS (
        SELECT product_id, COUNT(*) as cnt
        FROM lats_product_variants
        WHERE LOWER(COALESCE(variant_name, '')) IN ('default', 'default variant', 'variant 1', '')
           OR variant_name IS NULL
        GROUP BY product_id
        HAVING COUNT(*) > 1
    )
    SELECT COUNT(*) INTO products_with_multiple FROM default_variants;

    -- Count total default variants
    SELECT COUNT(*) INTO total_default_variants
    FROM lats_product_variants
    WHERE LOWER(COALESCE(variant_name, '')) IN ('default', 'default variant', 'variant 1', '')
       OR variant_name IS NULL;

    -- Count default variants to keep (one per product)
    WITH default_variants AS (
        SELECT product_id, COUNT(*) as cnt
        FROM lats_product_variants
        WHERE LOWER(COALESCE(variant_name, '')) IN ('default', 'default variant', 'variant 1', '')
           OR variant_name IS NULL
        GROUP BY product_id
        HAVING COUNT(*) > 1
    )
    SELECT COUNT(*) INTO default_variants_to_keep FROM default_variants;

    -- Count default variants to delete
    WITH default_variants AS (
        SELECT product_id, COUNT(*) as cnt
        FROM lats_product_variants
        WHERE LOWER(COALESCE(variant_name, '')) IN ('default', 'default variant', 'variant 1', '')
           OR variant_name IS NULL
        GROUP BY product_id
        HAVING COUNT(*) > 1
    )
    SELECT SUM(cnt - 1) INTO default_variants_to_delete FROM default_variants;

    RAISE NOTICE '📊 Default Variants Summary:';
    RAISE NOTICE '   Products with multiple default variants: %', products_with_multiple;
    RAISE NOTICE '   Total default variants: %', total_default_variants;
    RAISE NOTICE '   Default variants to keep (one per product): %', default_variants_to_keep;
    RAISE NOTICE '   Default variants to delete: %', default_variants_to_delete;
END $$;

-- Step 2: Verify no foreign key references for default variants to be deleted
DO $$
DECLARE
    ref_count INTEGER;
BEGIN
    WITH default_variants AS (
        SELECT 
            product_id,
            id,
            ROW_NUMBER() OVER (
                PARTITION BY product_id 
                ORDER BY created_at ASC, id ASC
            ) as rn
        FROM lats_product_variants
        WHERE LOWER(COALESCE(variant_name, '')) IN ('default', 'default variant', 'variant 1', '')
           OR variant_name IS NULL
    ),
    variants_to_delete AS (
        SELECT id FROM default_variants WHERE rn > 1
    )
    SELECT 
        (SELECT COUNT(*) FROM lats_trade_in_prices WHERE variant_id IN (SELECT id FROM variants_to_delete)) +
        (SELECT COUNT(*) FROM lats_stock_transfers WHERE variant_id IN (SELECT id FROM variants_to_delete)) +
        (SELECT COUNT(*) FROM lats_stock_movements WHERE variant_id IN (SELECT id FROM variants_to_delete)) +
        (SELECT COUNT(*) FROM lats_purchase_order_items WHERE variant_id IN (SELECT id FROM variants_to_delete)) +
        (SELECT COUNT(*) FROM lats_inventory_items WHERE variant_id IN (SELECT id FROM variants_to_delete)) +
        (SELECT COUNT(*) FROM lats_inventory_adjustments WHERE variant_id IN (SELECT id FROM variants_to_delete))
    INTO ref_count;

    IF ref_count > 0 THEN
        RAISE EXCEPTION '⚠️  SAFETY CHECK FAILED: % default variants to delete are referenced in other tables! Aborting.', ref_count;
    ELSE
        RAISE NOTICE '✅ Safety check passed: No foreign key references found for default variants to delete';
    END IF;
END $$;

-- Step 3: Delete duplicate default variants (keep oldest one per product)
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH ranked_default_variants AS (
        SELECT 
            id,
            product_id,
            ROW_NUMBER() OVER (
                PARTITION BY product_id 
                ORDER BY created_at ASC, id ASC
            ) as rn
        FROM lats_product_variants
        WHERE LOWER(COALESCE(variant_name, '')) IN ('default', 'default variant', 'variant 1', '')
           OR variant_name IS NULL
    ),
    deleted AS (
        DELETE FROM lats_product_variants
        WHERE id IN (
            SELECT id FROM ranked_default_variants WHERE rn > 1
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RAISE NOTICE '🗑️  Deleted % duplicate default variants', deleted_count;
END $$;

-- Step 4: Verify cleanup
DO $$
DECLARE
    products_with_multiple INTEGER;
    remaining_default_variants INTEGER;
BEGIN
    -- Count products that still have multiple default variants
    WITH default_variants AS (
        SELECT product_id, COUNT(*) as cnt
        FROM lats_product_variants
        WHERE LOWER(COALESCE(variant_name, '')) IN ('default', 'default variant', 'variant 1', '')
           OR variant_name IS NULL
        GROUP BY product_id
        HAVING COUNT(*) > 1
    )
    SELECT COUNT(*) INTO products_with_multiple FROM default_variants;

    -- Count remaining default variants
    SELECT COUNT(*) INTO remaining_default_variants
    FROM lats_product_variants
    WHERE LOWER(COALESCE(variant_name, '')) IN ('default', 'default variant', 'variant 1', '')
       OR variant_name IS NULL;

    RAISE NOTICE '📊 Cleanup Results:';
    RAISE NOTICE '   Products with multiple default variants: %', products_with_multiple;
    RAISE NOTICE '   Total remaining default variants: %', remaining_default_variants;

    IF products_with_multiple = 0 THEN
        RAISE NOTICE '✅ All duplicate default variants have been removed!';
    ELSE
        RAISE NOTICE '⚠️  Warning: % products still have multiple default variants', products_with_multiple;
    END IF;
END $$;

COMMIT;

