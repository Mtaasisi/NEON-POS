-- ================================================
-- FIX STOCK ADJUSTMENT FEATURE
-- ================================================
-- This migration creates a trigger that automatically updates
-- the variant quantity when a stock movement is inserted
-- ================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_stock_on_movement ON lats_stock_movements;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_variant_stock_on_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
BEGIN
    -- Get the current quantity of the variant
    SELECT quantity INTO v_current_quantity
    FROM lats_product_variants
    WHERE id = NEW.variant_id;
    
    -- If variant doesn't exist, skip the update
    IF NOT FOUND THEN
        RAISE NOTICE 'Variant % not found', NEW.variant_id;
        RETURN NEW;
    END IF;
    
    -- Calculate the new quantity based on movement type
    CASE NEW.movement_type
        WHEN 'in' THEN
            v_new_quantity := v_current_quantity + NEW.quantity;
        WHEN 'out' THEN
            v_new_quantity := v_current_quantity - NEW.quantity;
        WHEN 'adjustment' THEN
            -- For adjustments, the quantity can be positive or negative
            v_new_quantity := v_current_quantity + NEW.quantity;
        WHEN 'transfer' THEN
            -- Transfers are handled separately, but just in case
            v_new_quantity := v_current_quantity;
        ELSE
            -- Default: treat as adjustment
            v_new_quantity := v_current_quantity + NEW.quantity;
    END CASE;
    
    -- Ensure quantity doesn't go negative
    IF v_new_quantity < 0 THEN
        v_new_quantity := 0;
        RAISE NOTICE 'Quantity would be negative, setting to 0';
    END IF;
    
    -- Update the variant quantity
    UPDATE lats_product_variants
    SET 
        quantity = v_new_quantity,
        updated_at = NOW()
    WHERE id = NEW.variant_id;
    
    -- Update the stock movement record with before/after quantities
    NEW.previous_quantity := v_current_quantity;
    NEW.new_quantity := v_new_quantity;
    
    RAISE NOTICE 'Updated variant % quantity from % to %', 
        NEW.variant_id, v_current_quantity, v_new_quantity;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_update_stock_on_movement
    BEFORE INSERT ON lats_stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_variant_stock_on_movement();

-- Add a comment
COMMENT ON TRIGGER trigger_update_stock_on_movement ON lats_stock_movements IS 
    'Automatically updates variant quantity when a stock movement is recorded';

-- Test the trigger
DO $$
DECLARE
    v_test_product_id UUID;
    v_test_variant_id UUID;
    v_before_qty INTEGER;
    v_after_qty INTEGER;
BEGIN
    -- Find a test variant
    SELECT v.product_id, v.id, v.quantity 
    INTO v_test_product_id, v_test_variant_id, v_before_qty
    FROM lats_product_variants v
    WHERE v.is_active = true
    LIMIT 1;
    
    IF v_test_variant_id IS NULL THEN
        RAISE NOTICE 'No variants found for testing';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with variant % (current quantity: %)', v_test_variant_id, v_before_qty;
    
    -- Insert a test stock movement
    INSERT INTO lats_stock_movements (product_id, variant_id, quantity, movement_type, reason, reference)
    VALUES (v_test_product_id, v_test_variant_id, 1, 'in', 'Trigger test', 'TEST-TRIGGER');
    
    -- Check the result
    SELECT quantity INTO v_after_qty
    FROM lats_product_variants
    WHERE id = v_test_variant_id;
    
    IF v_after_qty = v_before_qty + 1 THEN
        RAISE NOTICE '✓ Trigger test PASSED: quantity updated from % to %', v_before_qty, v_after_qty;
    ELSE
        RAISE WARNING '✗ Trigger test FAILED: expected %, got %', v_before_qty + 1, v_after_qty;
    END IF;
    
    -- Rollback the test by removing the test movement and restoring quantity
    DELETE FROM lats_stock_movements WHERE reference = 'TEST-TRIGGER';
    UPDATE lats_product_variants SET quantity = v_before_qty WHERE id = v_test_variant_id;
    
    RAISE NOTICE 'Test data cleaned up';
END $$;

RAISE NOTICE 'Stock adjustment trigger created successfully!';

