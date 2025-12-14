-- ============================================================================
-- Fix Product Stock Synchronization Issue
-- ============================================================================
-- Problem: Product-level stock_quantity becomes out of sync with variant totals
-- Solution: Update existing data and create triggers to keep them in sync
-- ============================================================================

-- Step 1: Update all products to sync their stock_quantity with variant totals
-- For products with variants, stock_quantity should equal sum of variant quantities
UPDATE lats_products p
SET stock_quantity = COALESCE((
    SELECT SUM(COALESCE(v.quantity, 0))
    FROM lats_product_variants v
    WHERE v.product_id = p.id
    AND v.is_active = true
), 0),
updated_at = NOW()
WHERE EXISTS (
    SELECT 1
    FROM lats_product_variants v
    WHERE v.product_id = p.id
);

-- Step 2: Create a function to sync product stock from variants
CREATE OR REPLACE FUNCTION sync_product_stock_from_variants()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the product's stock_quantity to match sum of all variant quantities
    UPDATE lats_products
    SET 
        stock_quantity = COALESCE((
            SELECT SUM(COALESCE(quantity, 0))
            FROM lats_product_variants
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
            AND is_active = true
        ), 0),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger for INSERT operations
DROP TRIGGER IF EXISTS trigger_sync_product_stock_on_variant_insert ON lats_product_variants;
CREATE TRIGGER trigger_sync_product_stock_on_variant_insert
    AFTER INSERT ON lats_product_variants
    FOR EACH ROW
    EXECUTE FUNCTION sync_product_stock_from_variants();

-- Step 4: Create trigger for UPDATE operations
DROP TRIGGER IF EXISTS trigger_sync_product_stock_on_variant_update ON lats_product_variants;
CREATE TRIGGER trigger_sync_product_stock_on_variant_update
    AFTER UPDATE OF quantity, is_active ON lats_product_variants
    FOR EACH ROW
    WHEN (
        OLD.quantity IS DISTINCT FROM NEW.quantity 
        OR OLD.is_active IS DISTINCT FROM NEW.is_active
    )
    EXECUTE FUNCTION sync_product_stock_from_variants();

-- Step 5: Create trigger for DELETE operations
DROP TRIGGER IF EXISTS trigger_sync_product_stock_on_variant_delete ON lats_product_variants;
CREATE TRIGGER trigger_sync_product_stock_on_variant_delete
    AFTER DELETE ON lats_product_variants
    FOR EACH ROW
    EXECUTE FUNCTION sync_product_stock_from_variants();

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify the fix worked
SELECT 
    p.name as product_name,
    p.sku as product_sku,
    p.stock_quantity as product_level_stock,
    COALESCE((
        SELECT SUM(COALESCE(v.quantity, 0))
        FROM lats_product_variants v
        WHERE v.product_id = p.id
        AND v.is_active = true
    ), 0) as calculated_variant_stock,
    (
        SELECT COUNT(*)
        FROM lats_product_variants v
        WHERE v.product_id = p.id
    ) as variant_count
FROM lats_products p
WHERE EXISTS (
    SELECT 1
    FROM lats_product_variants v
    WHERE v.product_id = p.id
)
AND p.name = 'Embe'
ORDER BY p.name;

-- Expected result: product_level_stock should equal calculated_variant_stock

