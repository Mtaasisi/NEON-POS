-- ============================================
-- CLEANUP IMEI VARIANTS
-- ============================================
-- This script removes all IMEI variants from all products.
-- IMEI variants are identified by:
-- 1. variant_attributes containing 'imei' or 'serial_number'
-- 2. variant_name starting with 'IMEI:' or 'imei:'
-- 3. variant_name containing 'IMEI' (case insensitive)
-- 4. variant_name being a long numeric string (10+ digits, likely IMEI)
--
-- Safety: Verifies no foreign key references before deletion
-- ============================================

BEGIN;

-- Step 1: Show summary of IMEI variants to be deleted
DO $$
DECLARE
    imei_in_attributes INTEGER;
    imei_prefix_count INTEGER;
    imei_in_name_count INTEGER;
    long_numeric_count INTEGER;
    total_imei_variants INTEGER;
BEGIN
    -- Count IMEI in variant_attributes
    SELECT COUNT(*) INTO imei_in_attributes
    FROM lats_product_variants
    WHERE variant_attributes->>'imei' IS NOT NULL
       OR variant_attributes->>'serial_number' IS NOT NULL;

    -- Count IMEI: prefix
    SELECT COUNT(*) INTO imei_prefix_count
    FROM lats_product_variants
    WHERE variant_name LIKE 'IMEI:%'
       OR variant_name LIKE 'imei:%';

    -- Count IMEI in variant_name (case insensitive)
    SELECT COUNT(*) INTO imei_in_name_count
    FROM lats_product_variants
    WHERE LOWER(variant_name) LIKE '%imei%';

    -- Count long numeric names (10+ digits, likely IMEI)
    SELECT COUNT(*) INTO long_numeric_count
    FROM lats_product_variants
    WHERE variant_name ~ '^[0-9]{10,}$';

    -- Total unique IMEI variants (may overlap)
    WITH all_imei_variants AS (
        SELECT id FROM lats_product_variants
        WHERE variant_attributes->>'imei' IS NOT NULL
           OR variant_attributes->>'serial_number' IS NOT NULL
           OR variant_name LIKE 'IMEI:%'
           OR variant_name LIKE 'imei:%'
           OR LOWER(variant_name) LIKE '%imei%'
           OR variant_name ~ '^[0-9]{10,}$'
    )
    SELECT COUNT(DISTINCT id) INTO total_imei_variants FROM all_imei_variants;

    RAISE NOTICE '📊 IMEI Variants Summary:';
    RAISE NOTICE '   IMEI in variant_attributes: %', imei_in_attributes;
    RAISE NOTICE '   IMEI: prefix in variant_name: %', imei_prefix_count;
    RAISE NOTICE '   IMEI in variant_name (anywhere): %', imei_in_name_count;
    RAISE NOTICE '   Long numeric variant_name (10+ digits): %', long_numeric_count;
    RAISE NOTICE '   Total unique IMEI variants to delete: %', total_imei_variants;
END $$;

-- Step 2: Verify no foreign key references for IMEI variants to be deleted
DO $$
DECLARE
    ref_count INTEGER;
BEGIN
    WITH imei_variants AS (
        SELECT id FROM lats_product_variants
        WHERE variant_attributes->>'imei' IS NOT NULL
           OR variant_attributes->>'serial_number' IS NOT NULL
           OR variant_name LIKE 'IMEI:%'
           OR variant_name LIKE 'imei:%'
           OR LOWER(variant_name) LIKE '%imei%'
           OR variant_name ~ '^[0-9]{10,}$'
    )
    SELECT 
        (SELECT COUNT(*) FROM lats_trade_in_prices WHERE variant_id IN (SELECT id FROM imei_variants)) +
        (SELECT COUNT(*) FROM lats_stock_transfers WHERE variant_id IN (SELECT id FROM imei_variants)) +
        (SELECT COUNT(*) FROM lats_stock_movements WHERE variant_id IN (SELECT id FROM imei_variants)) +
        (SELECT COUNT(*) FROM lats_purchase_order_items WHERE variant_id IN (SELECT id FROM imei_variants)) +
        (SELECT COUNT(*) FROM lats_inventory_items WHERE variant_id IN (SELECT id FROM imei_variants)) +
        (SELECT COUNT(*) FROM lats_inventory_adjustments WHERE variant_id IN (SELECT id FROM imei_variants))
    INTO ref_count;

    IF ref_count > 0 THEN
        RAISE EXCEPTION '⚠️  SAFETY CHECK FAILED: % IMEI variants are referenced in other tables! Aborting.', ref_count;
    ELSE
        RAISE NOTICE '✅ Safety check passed: No foreign key references found for IMEI variants';
    END IF;
END $$;

-- Step 3: Delete all IMEI variants
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM lats_product_variants
        WHERE variant_attributes->>'imei' IS NOT NULL
           OR variant_attributes->>'serial_number' IS NOT NULL
           OR variant_name LIKE 'IMEI:%'
           OR variant_name LIKE 'imei:%'
           OR LOWER(variant_name) LIKE '%imei%'
           OR variant_name ~ '^[0-9]{10,}$'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RAISE NOTICE '🗑️  Deleted % IMEI variants from all products', deleted_count;
END $$;

-- Step 4: Verify cleanup
DO $$
DECLARE
    remaining_imei_variants INTEGER;
BEGIN
    WITH remaining AS (
        SELECT id FROM lats_product_variants
        WHERE variant_attributes->>'imei' IS NOT NULL
           OR variant_attributes->>'serial_number' IS NOT NULL
           OR variant_name LIKE 'IMEI:%'
           OR variant_name LIKE 'imei:%'
           OR LOWER(variant_name) LIKE '%imei%'
           OR variant_name ~ '^[0-9]{10,}$'
    )
    SELECT COUNT(*) INTO remaining_imei_variants FROM remaining;

    RAISE NOTICE '📊 Cleanup Results:';
    RAISE NOTICE '   Remaining IMEI variants: %', remaining_imei_variants;

    IF remaining_imei_variants = 0 THEN
        RAISE NOTICE '✅ All IMEI variants have been removed!';
    ELSE
        RAISE NOTICE '⚠️  Warning: % IMEI variants still remain', remaining_imei_variants;
    END IF;
END $$;

COMMIT;

