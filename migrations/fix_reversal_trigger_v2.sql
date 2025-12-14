-- ================================================
-- FIX REVERSAL DOUBLE STOCK ISSUE - VERSION 2
-- ================================================
-- Problem: The trigger checks NEW.new_quantity, but in BEFORE INSERT triggers,
-- the value might not be properly accessible. We need to check if it's being
-- set in the INSERT statement itself.
-- 
-- Solution: Improve the trigger to properly detect pre-set new_quantity values
-- and also add a check for sale reversals specifically.
-- ================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_update_stock_on_movement ON lats_stock_movements;

-- Create improved trigger function
CREATE OR REPLACE FUNCTION update_variant_stock_on_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
    v_should_calculate BOOLEAN := true;
    v_is_reversal BOOLEAN := false;
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
    
    -- Check if this is a sale reversal
    v_is_reversal := (NEW.reason = 'Sale Reversal' OR NEW.reason ILIKE '%reversal%');
    
    -- ✅ CRITICAL FIX: If new_quantity is already set (by application code),
    -- use it directly instead of calculating. This prevents double updates.
    -- Check both NEW.new_quantity and if it's a reversal with new_quantity set
    IF (NEW.new_quantity IS NOT NULL AND NEW.new_quantity >= 0) THEN
        v_new_quantity := NEW.new_quantity;
        v_should_calculate := false;
        RAISE NOTICE 'Using pre-set new_quantity: % (skipping calculation)', v_new_quantity;
    ELSIF v_is_reversal AND NEW.previous_quantity IS NOT NULL THEN
        -- For reversals, if previous_quantity is set, it means we want to restore to that
        -- But we need to check the sale's original previous_quantity, not the reversal's
        -- For now, calculate based on current + quantity (will be fixed by code setting new_quantity)
        v_should_calculate := true;
    END IF;
    
    -- Only calculate if new_quantity wasn't pre-set
    IF v_should_calculate THEN
        -- Calculate the new quantity based on movement type
        CASE NEW.movement_type
            WHEN 'in' THEN
                v_new_quantity := v_current_quantity + NEW.quantity;
            WHEN 'out' THEN
                v_new_quantity := v_current_quantity - NEW.quantity;
            WHEN 'sale' THEN
                -- Sales reduce stock
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
    END IF;
    
    -- Update the variant quantity
    UPDATE lats_product_variants
    SET 
        quantity = v_new_quantity,
        updated_at = NOW()
    WHERE id = NEW.variant_id;
    
    -- Update the stock movement record with before/after quantities
    -- Only set if they weren't already set
    IF NEW.previous_quantity IS NULL THEN
        NEW.previous_quantity := v_current_quantity;
    END IF;
    
    -- ✅ CRITICAL: Only overwrite new_quantity if we calculated it
    -- If it was pre-set, keep the pre-set value
    IF v_should_calculate THEN
        NEW.new_quantity := v_new_quantity;
    END IF;
    -- If new_quantity was pre-set, it's already in NEW.new_quantity, don't overwrite
    
    RAISE NOTICE 'Updated variant % quantity from % to % (calculated: %)', 
        NEW.variant_id, v_current_quantity, v_new_quantity, v_should_calculate;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_stock_on_movement
    BEFORE INSERT ON lats_stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_variant_stock_on_movement();

-- Add a comment
COMMENT ON TRIGGER trigger_update_stock_on_movement ON lats_stock_movements IS 
    'Automatically updates variant quantity when a stock movement is recorded. Respects pre-set new_quantity to prevent double updates.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Reversal double stock fix V2 applied successfully!';
    RAISE NOTICE '📝 The trigger now properly respects pre-set new_quantity values.';
END $$;

