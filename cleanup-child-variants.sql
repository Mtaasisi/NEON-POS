-- ============================================
-- CLEANUP CHILD VARIANTS
-- ============================================
-- This script removes all child variants (variants with parent_variant_id)
-- and optionally cleans up parent variants that have no children.
--
-- Safety: Verifies no foreign key references before deletion
-- ============================================

BEGIN;

-- Step 1: Show summary of child variants
DO $$
DECLARE
    child_variants_count INTEGER;
    parent_variants_count INTEGER;
    parents_with_children_count INTEGER;
    parents_without_children_count INTEGER;
BEGIN
    -- Count child variants
    SELECT COUNT(*) INTO child_variants_count
    FROM lats_product_variants
    WHERE parent_variant_id IS NOT NULL;

    -- Count parent variants
    SELECT COUNT(*) INTO parent_variants_count
    FROM lats_product_variants
    WHERE is_parent = true OR variant_type = 'parent';

    -- Count parents with children
    SELECT COUNT(DISTINCT parent_variant_id) INTO parents_with_children_count
    FROM lats_product_variants
    WHERE parent_variant_id IS NOT NULL;

    -- Count parents without children
    SELECT COUNT(*) INTO parents_without_children_count
    FROM lats_product_variants pv
    WHERE (pv.is_parent = true OR pv.variant_type = 'parent')
      AND NOT EXISTS (
          SELECT 1 FROM lats_product_variants child
          WHERE child.parent_variant_id = pv.id
      );

    RAISE NOTICE '📊 Child Variants Summary:';
    RAISE NOTICE '   Child variants: %', child_variants_count;
    RAISE NOTICE '   Parent variants: %', parent_variants_count;
    RAISE NOTICE '   Parents with children: %', parents_with_children_count;
    RAISE NOTICE '   Parents without children: %', parents_without_children_count;
END $$;

-- Step 2: Verify no foreign key references for child variants
DO $$
DECLARE
    ref_count INTEGER;
BEGIN
    WITH child_variants AS (
        SELECT id FROM lats_product_variants WHERE parent_variant_id IS NOT NULL
    )
    SELECT 
        (SELECT COUNT(*) FROM lats_trade_in_prices WHERE variant_id IN (SELECT id FROM child_variants)) +
        (SELECT COUNT(*) FROM lats_stock_transfers WHERE variant_id IN (SELECT id FROM child_variants)) +
        (SELECT COUNT(*) FROM lats_stock_movements WHERE variant_id IN (SELECT id FROM child_variants)) +
        (SELECT COUNT(*) FROM lats_purchase_order_items WHERE variant_id IN (SELECT id FROM child_variants)) +
        (SELECT COUNT(*) FROM lats_inventory_items WHERE variant_id IN (SELECT id FROM child_variants)) +
        (SELECT COUNT(*) FROM lats_inventory_adjustments WHERE variant_id IN (SELECT id FROM child_variants))
    INTO ref_count;

    IF ref_count > 0 THEN
        RAISE EXCEPTION '⚠️  SAFETY CHECK FAILED: % child variants are referenced in other tables! Aborting.', ref_count;
    ELSE
        RAISE NOTICE '✅ Safety check passed: No foreign key references found for child variants';
    END IF;
END $$;

-- Step 3: Delete all child variants and get count
DO $$
DECLARE
    deleted_child_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM lats_product_variants
        WHERE parent_variant_id IS NOT NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_child_count FROM deleted;
    
    RAISE NOTICE '🗑️  Deleted % child variants', deleted_child_count;
END $$;

-- Step 4: Clean up parent variants that have no children (convert to regular variants)
DO $$
DECLARE
    updated_parent_count INTEGER;
BEGIN
    WITH updated AS (
        UPDATE lats_product_variants
        SET 
            is_parent = false,
            variant_type = 'standard',
            parent_variant_id = NULL
        WHERE (is_parent = true OR variant_type = 'parent')
          AND NOT EXISTS (
              SELECT 1 FROM lats_product_variants child
              WHERE child.parent_variant_id = lats_product_variants.id
          )
        RETURNING id
    )
    SELECT COUNT(*) INTO updated_parent_count FROM updated;
    
    RAISE NOTICE '🔄 Converted % parent variants to regular variants', updated_parent_count;
END $$;

-- Step 5: Verify cleanup
DO $$
DECLARE
    remaining_child_variants INTEGER;
    remaining_parent_variants INTEGER;
BEGIN
    -- Count remaining child variants
    SELECT COUNT(*) INTO remaining_child_variants
    FROM lats_product_variants
    WHERE parent_variant_id IS NOT NULL;

    -- Count remaining parent variants
    SELECT COUNT(*) INTO remaining_parent_variants
    FROM lats_product_variants
    WHERE is_parent = true OR variant_type = 'parent';

    RAISE NOTICE '📊 Cleanup Results:';
    RAISE NOTICE '   Remaining child variants: %', remaining_child_variants;
    RAISE NOTICE '   Remaining parent variants: %', remaining_parent_variants;

    IF remaining_child_variants = 0 AND remaining_parent_variants = 0 THEN
        RAISE NOTICE '✅ All child variants cleaned up and parent variants converted!';
    ELSIF remaining_child_variants = 0 THEN
        RAISE NOTICE '✅ All child variants deleted!';
    ELSE
        RAISE NOTICE '⚠️  Warning: % child variants still remain', remaining_child_variants;
    END IF;
END $$;

COMMIT;

