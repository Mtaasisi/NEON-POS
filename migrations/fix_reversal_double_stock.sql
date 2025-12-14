-- ================================================
-- FIX REVERSAL DOUBLE STOCK ISSUE
-- ================================================
-- Problem: When reversing a sale, the code updates variant quantity directly,
-- then creates a stock movement. The trigger sees the 'in' movement and adds
-- stock again, causing double stock.
-- 
-- Solution: Update the trigger to respect new_quantity if it's already set,
-- preventing double updates when the code has already set the correct quantity.
-- ================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_update_stock_on_movement ON lats_stock_movements;

-- Create improved trigger function that respects pre-set quantities
CREATE OR REPLACE FUNCTION update_variant_stock_on_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
    v_should_calculate BOOLEAN := true;
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
    
    -- ✅ CRITICAL FIX: If new_quantity is already set (by application code),
    -- use it directly instead of calculating. This prevents double updates.
    -- This happens when the code has already calculated and set the correct quantity.
    IF NEW.new_quantity IS NOT NULL AND NEW.new_quantity >= 0 THEN
        v_new_quantity := NEW.new_quantity;
        v_should_calculate := false;
        RAISE NOTICE 'Using pre-set new_quantity: % (skipping calculation)', v_new_quantity;
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
    
    IF NEW.new_quantity IS NULL OR v_should_calculate THEN
        NEW.new_quantity := v_new_quantity;
    END IF;
    
    RAISE NOTICE 'Updated variant % quantity from % to %', 
        NEW.variant_id, v_current_quantity, v_new_quantity;
    
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
    RAISE NOTICE '✅ Reversal double stock fix applied successfully!';
    RAISE NOTICE '📝 The trigger now respects pre-set new_quantity values to prevent double stock on reversals.';
END $$;

