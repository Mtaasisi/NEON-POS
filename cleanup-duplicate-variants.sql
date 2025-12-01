-- ============================================
-- CLEANUP DUPLICATE VARIANTS
-- ============================================
-- This script removes duplicate variants that have identical variant_attributes
-- within the same product, keeping only the oldest variant (earliest created_at).
--
-- Safety: Only deletes variants with identical variant_attributes within same product
--         Keeps the oldest variant (earliest created_at)
--         Verified no foreign key references before deletion
-- ============================================

BEGIN;

-- Step 1: Show summary of what will be deleted
DO $$
DECLARE
    duplicate_groups_count INTEGER;
    variants_to_keep_count INTEGER;
    variants_to_delete_count INTEGER;
BEGIN
    -- Count duplicate groups
    SELECT COUNT(*) INTO duplicate_groups_count
    FROM (
        SELECT product_id, variant_attributes
        FROM lats_product_variants
        WHERE variant_attributes IS NOT NULL 
          AND variant_attributes != '{}'::jsonb
        GROUP BY product_id, variant_attributes
        HAVING COUNT(*) > 1
    ) duplicates;

    -- Count variants to keep (first in each duplicate group)
    WITH duplicate_groups AS (
        SELECT product_id, variant_attributes
        FROM lats_product_variants
        WHERE variant_attributes IS NOT NULL 
          AND variant_attributes != '{}'::jsonb
        GROUP BY product_id, variant_attributes
        HAVING COUNT(*) > 1
    ),
    ranked_variants AS (
        SELECT 
            pv.id,
            ROW_NUMBER() OVER (
                PARTITION BY pv.product_id, pv.variant_attributes 
                ORDER BY pv.created_at ASC, pv.id ASC
            ) as rn
        FROM lats_product_variants pv
        INNER JOIN duplicate_groups dg 
          ON pv.product_id = dg.product_id 
          AND pv.variant_attributes = dg.variant_attributes
    )
    SELECT COUNT(*) INTO variants_to_keep_count
    FROM ranked_variants
    WHERE rn = 1;

    -- Count variants to delete
    WITH ranked_variants AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY product_id, variant_attributes 
                ORDER BY created_at ASC, id ASC
            ) as rn
        FROM lats_product_variants
        WHERE variant_attributes IS NOT NULL 
          AND variant_attributes != '{}'::jsonb
    )
    SELECT COUNT(*) INTO variants_to_delete_count
    FROM ranked_variants
    WHERE rn > 1;

    RAISE NOTICE '📊 Cleanup Summary:';
    RAISE NOTICE '   Duplicate groups: %', duplicate_groups_count;
    RAISE NOTICE '   Variants to keep: %', variants_to_keep_count;
    RAISE NOTICE '   Variants to delete: %', variants_to_delete_count;
END $$;

-- Step 2: Verify no foreign key references (safety check)
DO $$
DECLARE
    ref_count INTEGER;
BEGIN
    WITH ranked_variants AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY product_id, variant_attributes 
                ORDER BY created_at ASC, id ASC
            ) as rn
        FROM lats_product_variants
        WHERE variant_attributes IS NOT NULL 
          AND variant_attributes != '{}'::jsonb
    ),
    variants_to_delete AS (
        SELECT id FROM ranked_variants WHERE rn > 1
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
        RAISE EXCEPTION '⚠️  SAFETY CHECK FAILED: % variants to delete are referenced in other tables! Aborting.', ref_count;
    ELSE
        RAISE NOTICE '✅ Safety check passed: No foreign key references found';
    END IF;
END $$;

-- Step 3: Delete duplicate variants (keep first one by created_at, then id as tiebreaker)
WITH ranked_variants AS (
    SELECT 
        id,
        product_id,
        variant_attributes,
        ROW_NUMBER() OVER (
            PARTITION BY product_id, variant_attributes 
            ORDER BY created_at ASC, id ASC
        ) as rn
    FROM lats_product_variants
    WHERE variant_attributes IS NOT NULL 
      AND variant_attributes != '{}'::jsonb
)
DELETE FROM lats_product_variants pv
WHERE pv.id IN (
    SELECT id 
    FROM ranked_variants 
    WHERE rn > 1
);

-- Step 4: Verify cleanup
DO $$
DECLARE
    remaining_duplicates INTEGER;
    deleted_count INTEGER;
BEGIN
    -- Count remaining duplicates
    SELECT COUNT(*) INTO remaining_duplicates
    FROM (
        SELECT product_id, variant_attributes, COUNT(*) as cnt
        FROM lats_product_variants
        WHERE variant_attributes IS NOT NULL 
          AND variant_attributes != '{}'::jsonb
        GROUP BY product_id, variant_attributes
        HAVING COUNT(*) > 1
    ) duplicates;

    -- Get deleted count from previous DELETE
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    IF remaining_duplicates = 0 THEN
        RAISE NOTICE '✅ All duplicates have been cleaned up!';
    ELSE
        RAISE NOTICE '⚠️  Warning: % duplicate groups still remain', remaining_duplicates;
    END IF;

    RAISE NOTICE '📊 Final Summary:';
    RAISE NOTICE '   Deleted: % duplicate variants', deleted_count;
    RAISE NOTICE '   Remaining duplicates: %', remaining_duplicates;
END $$;

COMMIT;

