-- =====================================================
-- Function: Add Inventory Items for Products Without IMEI/Serial
-- =====================================================
-- This function allows you to add inventory items directly
-- for products that don't require IMEI or serial number tracking.
-- The variant quantity will automatically sync via the trigger.
-- =====================================================

CREATE OR REPLACE FUNCTION add_inventory_items_without_tracking(
    p_variant_id UUID,
    p_quantity INTEGER,
    p_cost_price NUMERIC DEFAULT NULL,
    p_selling_price NUMERIC DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_branch_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
    items_created INTEGER,
    variant_id UUID,
    new_quantity INTEGER,
    message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_product_id UUID;
    v_variant_name TEXT;
    v_sku TEXT;
    v_items_created INTEGER := 0;
    v_i INTEGER;
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
    v_cost NUMERIC;
    v_price NUMERIC;
BEGIN
    -- Validate inputs
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be greater than 0';
    END IF;
    
    IF p_variant_id IS NULL THEN
        RAISE EXCEPTION 'Variant ID is required';
    END IF;
    
    -- Get variant and product info
    SELECT 
        pv.product_id,
        pv.variant_name,
        pv.sku,
        COALESCE(pv.cost_price, 0),
        COALESCE(pv.selling_price, 0)
    INTO 
        v_product_id,
        v_variant_name,
        v_sku,
        v_cost,
        v_price
    FROM lats_product_variants pv
    WHERE pv.id = p_variant_id;
    
    IF v_product_id IS NULL THEN
        RAISE EXCEPTION 'Variant not found: %', p_variant_id;
    END IF;
    
    -- Use provided prices or variant prices
    v_cost := COALESCE(p_cost_price, v_cost);
    v_price := COALESCE(p_selling_price, v_price);
    
    -- Get current quantity
    SELECT COALESCE(quantity, 0) INTO v_current_quantity
    FROM lats_product_variants
    WHERE id = p_variant_id;
    
    -- Create inventory items (without IMEI/serial)
    FOR v_i IN 1..p_quantity LOOP
        INSERT INTO inventory_items (
            product_id,
            variant_id,
            status,
            cost_price,
            selling_price,
            notes,
            branch_id,
            created_by,
            metadata,
            created_at,
            updated_at
        ) VALUES (
            v_product_id,
            p_variant_id,
            'available',
            v_cost,
            v_price,
            COALESCE(
                p_notes,
                format('Added %s units without IMEI/serial tracking (Item %s of %s)', 
                    p_quantity, v_i, p_quantity)
            ),
            p_branch_id,
            p_user_id,
            jsonb_build_object(
                'added_without_tracking', true,
                'added_at', NOW(),
                'added_by', p_user_id,
                'batch_number', v_i,
                'total_in_batch', p_quantity
            ),
            NOW(),
            NOW()
        );
        
        v_items_created := v_items_created + 1;
    END LOOP;
    
    -- Get new quantity (trigger will have synced it)
    SELECT COALESCE(quantity, 0) INTO v_new_quantity
    FROM lats_product_variants
    WHERE id = p_variant_id;
    
    -- Return results
    RETURN QUERY SELECT 
        v_items_created::INTEGER,
        p_variant_id,
        v_new_quantity::INTEGER,
        format('Successfully created %s inventory items for variant %s. Stock updated from %s to %s.', 
            v_items_created, v_sku, v_current_quantity, v_new_quantity)::TEXT;
    
    RAISE NOTICE '✅ Created % inventory items for variant % (SKU: %)', 
        v_items_created, v_variant_name, v_sku;
    RAISE NOTICE '   Stock updated: % -> %', v_current_quantity, v_new_quantity;
END;
$$;

COMMENT ON FUNCTION add_inventory_items_without_tracking IS 
'Adds inventory items for products without IMEI/serial number tracking.
The variant quantity will automatically sync via the sync_variant_quantity_from_inventory trigger.

Parameters:
- p_variant_id: The variant to add items to (required)
- p_quantity: Number of items to add (required, must be > 0)
- p_cost_price: Cost price per item (optional, uses variant cost_price if not provided)
- p_selling_price: Selling price per item (optional, uses variant selling_price if not provided)
- p_notes: Notes for the items (optional)
- p_branch_id: Branch ID where items are located (optional)
- p_user_id: User ID who is adding the items (optional)

Returns:
- items_created: Number of inventory items created
- variant_id: The variant ID
- new_quantity: New stock quantity after adding items
- message: Success message

Example:
SELECT * FROM add_inventory_items_without_tracking(
    ''b4418cf0-7624-4238-8e98-7d1eb5986b28''::UUID,  -- variant_id
    4,                                                -- quantity
    1000,                                             -- cost_price (optional)
    51000,                                            -- selling_price (optional)
    ''Added manually without IMEI tracking'',         -- notes (optional)
    NULL,                                             -- branch_id (optional)
    NULL                                              -- user_id (optional)
);';

-- =====================================================
-- Quick Add Function (Simplified)
-- =====================================================

CREATE OR REPLACE FUNCTION quick_add_stock(
    p_variant_id UUID,
    p_quantity INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    old_quantity INTEGER,
    new_quantity INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_result RECORD;
BEGIN
    -- Call the main function with minimal parameters
    SELECT * INTO v_result
    FROM add_inventory_items_without_tracking(
        p_variant_id,
        p_quantity,
        NULL, -- cost_price (use variant default)
        NULL, -- selling_price (use variant default)
        format('Quick add: %s units', p_quantity), -- notes
        NULL, -- branch_id
        NULL  -- user_id
    );
    
    RETURN QUERY SELECT 
        TRUE as success,
        v_result.message,
        (v_result.new_quantity - p_quantity)::INTEGER as old_quantity,
        v_result.new_quantity::INTEGER;
END;
$$;

COMMENT ON FUNCTION quick_add_stock IS 
'Quick function to add stock without IMEI/serial tracking.
Simplified version that uses variant default prices.

Example:
SELECT * FROM quick_add_stock(
    ''b4418cf0-7624-4238-8e98-7d1eb5986b28''::UUID,  -- variant_id
    4                                                -- quantity
);';

-- =====================================================
-- Example Usage
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '✅ Functions Created: Add Inventory Without IMEI/Serial';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Available Functions:';
    RAISE NOTICE '';
    RAISE NOTICE '1. add_inventory_items_without_tracking()';
    RAISE NOTICE '   Full control with all parameters';
    RAISE NOTICE '';
    RAISE NOTICE '   Example:';
    RAISE NOTICE '   SELECT * FROM add_inventory_items_without_tracking(';
    RAISE NOTICE '       ''variant-uuid-here''::UUID,';
    RAISE NOTICE '       4,                    -- quantity';
    RAISE NOTICE '       1000,                 -- cost_price (optional)';
    RAISE NOTICE '       51000,                -- selling_price (optional)';
    RAISE NOTICE '       ''Added manually'',   -- notes (optional)';
    RAISE NOTICE '       NULL,                 -- branch_id (optional)';
    RAISE NOTICE '       NULL                  -- user_id (optional)';
    RAISE NOTICE '   );';
    RAISE NOTICE '';
    RAISE NOTICE '2. quick_add_stock()';
    RAISE NOTICE '   Simplified version with minimal parameters';
    RAISE NOTICE '';
    RAISE NOTICE '   Example:';
    RAISE NOTICE '   SELECT * FROM quick_add_stock(';
    RAISE NOTICE '       ''variant-uuid-here''::UUID,';
    RAISE NOTICE '       4                     -- quantity';
    RAISE NOTICE '   );';
    RAISE NOTICE '';
    RAISE NOTICE '💡 The variant quantity will automatically sync';
    RAISE NOTICE '   via the sync_variant_quantity_from_inventory trigger.';
    RAISE NOTICE '';
END $$;

