-- ============================================
-- CLEANUP NON-STORAGE VARIANTS
-- ============================================
-- This script removes all non-storage variants from smartphones and iPads,
-- keeping only variants with storage capacity names (e.g., "128GB Storage", "256GB Storage")
--
-- Safety: Verifies no foreign key references before deletion
-- ============================================

BEGIN;

-- Step 1: Show summary of variants to be cleaned
DO $$
DECLARE
    total_variants INTEGER;
    storage_variants INTEGER;
    non_storage_variants INTEGER;
    affected_products INTEGER;
BEGIN
    -- Count affected products
    WITH smartphone_ipad_products AS (
        SELECT DISTINCT p.id
        FROM lats_products p
        JOIN lats_categories c ON c.id = p.category_id
        WHERE c.name IN ('Smartphones', 'Tablets')
           OR LOWER(p.name) LIKE '%iphone%'
           OR LOWER(p.name) LIKE '%ipad%'
    )
    SELECT COUNT(DISTINCT id) INTO affected_products FROM smartphone_ipad_products;

    -- Count total variants
    WITH smartphone_ipad_products AS (
        SELECT DISTINCT p.id
        FROM lats_products p
        JOIN lats_categories c ON c.id = p.category_id
        WHERE c.name IN ('Smartphones', 'Tablets')
           OR LOWER(p.name) LIKE '%iphone%'
           OR LOWER(p.name) LIKE '%ipad%'
    )
    SELECT COUNT(*) INTO total_variants
    FROM lats_product_variants pv
    JOIN smartphone_ipad_products sp ON sp.id = pv.product_id;

    -- Count storage variants (to keep)
    WITH smartphone_ipad_products AS (
        SELECT DISTINCT p.id
        FROM lats_products p
        JOIN lats_categories c ON c.id = p.category_id
        WHERE c.name IN ('Smartphones', 'Tablets')
           OR LOWER(p.name) LIKE '%iphone%'
           OR LOWER(p.name) LIKE '%ipad%'
    ),
    storage_variants_cte AS (
        SELECT pv.id
        FROM lats_product_variants pv
        JOIN smartphone_ipad_products sp ON sp.id = pv.product_id
        WHERE pv.variant_name ~* '^[0-9]+(GB|TB)[[:space:]]*Storage?$'
           OR pv.variant_name ~* '^[0-9]+(GB|TB)$'
    )
    SELECT COUNT(*) INTO storage_variants FROM storage_variants_cte;

    non_storage_variants := total_variants - storage_variants;

    RAISE NOTICE '📊 Cleanup Summary:';
    RAISE NOTICE '   Affected products (smartphones/iPads): %', affected_products;
    RAISE NOTICE '   Total variants: %', total_variants;
    RAISE NOTICE '   Storage variants (to keep): %', storage_variants;
    RAISE NOTICE '   Non-storage variants (to delete): %', non_storage_variants;
END $$;

-- Step 2: Verify no foreign key references for variants to be deleted
DO $$
DECLARE
    ref_count INTEGER;
BEGIN
    WITH smartphone_ipad_products AS (
        SELECT DISTINCT p.id
        FROM lats_products p
        JOIN lats_categories c ON c.id = p.category_id
        WHERE c.name IN ('Smartphones', 'Tablets')
           OR LOWER(p.name) LIKE '%iphone%'
           OR LOWER(p.name) LIKE '%ipad%'
    ),
    storage_variants AS (
        SELECT pv.id
        FROM lats_product_variants pv
        JOIN smartphone_ipad_products sp ON sp.id = pv.product_id
        WHERE pv.variant_name ~* '^[0-9]+(GB|TB)[[:space:]]*Storage?$'
           OR pv.variant_name ~* '^[0-9]+(GB|TB)$'
    ),
    variants_to_delete AS (
        SELECT pv.id
        FROM lats_product_variants pv
        JOIN smartphone_ipad_products sp ON sp.id = pv.product_id
        WHERE pv.id NOT IN (SELECT id FROM storage_variants)
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
        RAISE EXCEPTION '⚠️  SAFETY CHECK FAILED: % non-storage variants are referenced in other tables! Aborting.', ref_count;
    ELSE
        RAISE NOTICE '✅ Safety check passed: No foreign key references found for variants to delete';
    END IF;
END $$;

-- Step 3: Delete non-storage variants from smartphones and iPads
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH smartphone_ipad_products AS (
        SELECT DISTINCT p.id
        FROM lats_products p
        JOIN lats_categories c ON c.id = p.category_id
        WHERE c.name IN ('Smartphones', 'Tablets')
           OR LOWER(p.name) LIKE '%iphone%'
           OR LOWER(p.name) LIKE '%ipad%'
    ),
    storage_variants AS (
        SELECT pv.id
        FROM lats_product_variants pv
        JOIN smartphone_ipad_products sp ON sp.id = pv.product_id
        WHERE pv.variant_name ~* '^[0-9]+(GB|TB)[[:space:]]*Storage?$'
           OR pv.variant_name ~* '^[0-9]+(GB|TB)$'
    ),
    deleted AS (
        DELETE FROM lats_product_variants pv
        WHERE EXISTS (
            SELECT 1 FROM smartphone_ipad_products sp WHERE sp.id = pv.product_id
        )
        AND pv.id NOT IN (SELECT id FROM storage_variants)
        RETURNING pv.id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    RAISE NOTICE '🗑️  Deleted % non-storage variants from smartphones and iPads', deleted_count;
END $$;

-- Step 4: Verify cleanup
DO $$
DECLARE
    remaining_non_storage INTEGER;
    remaining_storage INTEGER;
BEGIN
    WITH smartphone_ipad_products AS (
        SELECT DISTINCT p.id
        FROM lats_products p
        JOIN lats_categories c ON c.id = p.category_id
        WHERE c.name IN ('Smartphones', 'Tablets')
           OR LOWER(p.name) LIKE '%iphone%'
           OR LOWER(p.name) LIKE '%ipad%'
    ),
    storage_variants AS (
        SELECT pv.id
        FROM lats_product_variants pv
        JOIN smartphone_ipad_products sp ON sp.id = pv.product_id
        WHERE pv.variant_name ~* '^[0-9]+(GB|TB)[[:space:]]*Storage?$'
           OR pv.variant_name ~* '^[0-9]+(GB|TB)$'
    ),
    all_variants AS (
        SELECT pv.id, 
               CASE WHEN pv.id IN (SELECT id FROM storage_variants) THEN 1 ELSE 0 END as is_storage
        FROM lats_product_variants pv
        JOIN smartphone_ipad_products sp ON sp.id = pv.product_id
    )
    SELECT 
        COUNT(*) FILTER (WHERE is_storage = 0),
        COUNT(*) FILTER (WHERE is_storage = 1)
    INTO remaining_non_storage, remaining_storage
    FROM all_variants;

    RAISE NOTICE '📊 Cleanup Results:';
    RAISE NOTICE '   Remaining storage variants: %', remaining_storage;
    RAISE NOTICE '   Remaining non-storage variants: %', remaining_non_storage;

    IF remaining_non_storage = 0 THEN
        RAISE NOTICE '✅ All non-storage variants have been removed!';
    ELSE
        RAISE NOTICE '⚠️  Warning: % non-storage variants still remain', remaining_non_storage;
    END IF;
END $$;

COMMIT;

