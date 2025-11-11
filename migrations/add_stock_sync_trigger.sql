-- ============================================================================
-- Stock Synchronization Trigger (for Supabase/Neon Dashboard SQL Editor)
-- ============================================================================
-- This migration creates database triggers to automatically keep product-level
-- stock in sync with variant totals whenever variants are modified.
--
-- INSTRUCTIONS: Copy and paste this entire file into your database SQL editor:
--   - Neon Dashboard: https://console.neon.tech/ → SQL Editor
--   - Supabase Dashboard: https://supabase.com/dashboard → SQL Editor
-- ============================================================================

-- Step 1: Create the sync function
CREATE OR REPLACE FUNCTION sync_product_stock_from_variants()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the product's stock_quantity to match sum of all active variant quantities
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS trigger_sync_product_stock_on_variant_insert ON lats_product_variants;
DROP TRIGGER IF EXISTS trigger_sync_product_stock_on_variant_update ON lats_product_variants;
DROP TRIGGER IF EXISTS trigger_sync_product_stock_on_variant_delete ON lats_product_variants;

-- Step 3: Create trigger for INSERT operations
CREATE TRIGGER trigger_sync_product_stock_on_variant_insert
    AFTER INSERT ON lats_product_variants
    FOR EACH ROW
    EXECUTE FUNCTION sync_product_stock_from_variants();

-- Step 4: Create trigger for UPDATE operations
-- Only fires when quantity or is_active changes
CREATE TRIGGER trigger_sync_product_stock_on_variant_update
    AFTER UPDATE OF quantity, is_active ON lats_product_variants
    FOR EACH ROW
    WHEN (
        OLD.quantity IS DISTINCT FROM NEW.quantity 
        OR OLD.is_active IS DISTINCT FROM NEW.is_active
    )
    EXECUTE FUNCTION sync_product_stock_from_variants();

-- Step 5: Create trigger for DELETE operations
CREATE TRIGGER trigger_sync_product_stock_on_variant_delete
    AFTER DELETE ON lats_product_variants
    FOR EACH ROW
    EXECUTE FUNCTION sync_product_stock_from_variants();

-- ============================================================================
-- Test the trigger (Optional - verify it works)
-- ============================================================================
-- Uncomment the following to test:
-- 
-- -- Test 1: Update a variant quantity
-- UPDATE lats_product_variants
-- SET quantity = quantity + 1
-- WHERE sku = 'IMEI-35678901-mh3imnh5';
-- 
-- -- Verify the product stock was updated
-- SELECT 
--     p.name,
--     p.stock_quantity as product_stock,
--     (SELECT SUM(quantity) FROM lats_product_variants WHERE product_id = p.id) as variant_total
-- FROM lats_products p
-- WHERE p.name = 'Embe';
-- 
-- -- Test 2: Rollback the test change
-- UPDATE lats_product_variants
-- SET quantity = quantity - 1
-- WHERE sku = 'IMEI-35678901-mh3imnh5';

-- ============================================================================
-- Success! Triggers are now active
-- ============================================================================
-- From now on, whenever you:
--   - INSERT a new variant → product stock updates automatically
--   - UPDATE a variant's quantity → product stock updates automatically  
--   - DELETE a variant → product stock updates automatically
--   - Deactivate a variant (is_active = false) → product stock updates automatically
-- ============================================================================

