-- ============================================================================
-- Consolidate Duplicate Trade-In Products
-- ============================================================================
-- Problem: Each trade-in creates a new product instead of adding variants
-- Solution: Merge duplicates by converting them to variants of a single product
-- ============================================================================

-- Step 1: View the duplicates
SELECT 
    name,
    COUNT(*) as count,
    ARRAY_AGG(id ORDER BY created_at) as product_ids
FROM lats_products
WHERE name ILIKE '%(Trade-In)%'
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Step 2: For each group of duplicates, consolidate them
-- This procedure will:
-- 1. Keep the first (oldest) product
-- 2. Move all variants from duplicate products to the kept product
-- 3. Delete the duplicate products

DO $$
DECLARE
    duplicate_group RECORD;
    primary_product_id UUID;
    dup_product_id UUID;
    variant_count INT;
BEGIN
    -- Loop through each group of duplicates
    FOR duplicate_group IN 
        SELECT 
            name,
            ARRAY_AGG(id ORDER BY created_at) as product_ids
        FROM lats_products
        WHERE name ILIKE '%(Trade-In)%'
        GROUP BY name
        HAVING COUNT(*) > 1
    LOOP
        -- Get the primary product (first/oldest one)
        primary_product_id := duplicate_group.product_ids[1];
        
        RAISE NOTICE 'Processing: % (Primary: %)', duplicate_group.name, primary_product_id;
        
        -- Loop through duplicate products (skip the first one)
        FOR i IN 2..array_length(duplicate_group.product_ids, 1)
        LOOP
            dup_product_id := duplicate_group.product_ids[i];
            
            RAISE NOTICE '  - Moving variants from duplicate: %', dup_product_id;
            
            -- Move variants from duplicate to primary product
            UPDATE lats_product_variants
            SET product_id = primary_product_id
            WHERE product_id = dup_product_id;
            
            GET DIAGNOSTICS variant_count = ROW_COUNT;
            RAISE NOTICE '    Moved % variants', variant_count;
            
            -- Update stock movements
            UPDATE lats_stock_movements
            SET product_id = primary_product_id
            WHERE product_id = dup_product_id;
            
            -- Update trade-in transactions (using new_product_id column)
            UPDATE lats_trade_in_transactions
            SET new_product_id = primary_product_id
            WHERE new_product_id = dup_product_id;
            
            -- Delete the duplicate product
            DELETE FROM lats_products WHERE id = dup_product_id;
            
            RAISE NOTICE '    ✓ Deleted duplicate product';
        END LOOP;
        
        -- Update stock quantity of primary product
        UPDATE lats_products
        SET stock_quantity = (
            SELECT COALESCE(SUM(quantity), 0)
            FROM lats_product_variants
            WHERE product_id = primary_product_id
        )
        WHERE id = primary_product_id;
        
        RAISE NOTICE '  ✓ Completed consolidation for %', duplicate_group.name;
    END LOOP;
    
    RAISE NOTICE '✅ All duplicates consolidated!';
END $$;

-- Step 3: Verify the consolidation
SELECT 
    p.name,
    p.id,
    p.stock_quantity,
    COUNT(v.id) as variant_count
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.name ILIKE '%(Trade-In)%'
GROUP BY p.id, p.name, p.stock_quantity
ORDER BY p.name;

-- Step 4: Show summary statistics
SELECT 
    'Trade-In Products' as category,
    COUNT(DISTINCT p.id) as unique_products,
    COUNT(v.id) as total_variants,
    SUM(p.stock_quantity) as total_stock
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.name ILIKE '%(Trade-In)%';

