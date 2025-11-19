-- ================================================
-- COMPREHENSIVE IMEI SYSTEM SETUP & FIX SCRIPT
-- ================================================
-- This migration enhances the existing IMEI parent-child variant system
-- with additional functions and fixes
-- ================================================

-- 1️⃣ Ensure required columns exist (already should be there from previous migrations)
ALTER TABLE lats_product_variants
ADD COLUMN IF NOT EXISTS parent_variant_id UUID REFERENCES lats_product_variants(id) ON DELETE CASCADE;

ALTER TABLE lats_product_variants
ADD COLUMN IF NOT EXISTS variant_type VARCHAR(20) DEFAULT 'standard';

ALTER TABLE lats_product_variants
ADD COLUMN IF NOT EXISTS variant_attributes JSONB DEFAULT '{}'::jsonb;

ALTER TABLE lats_product_variants
ALTER COLUMN variant_attributes SET DEFAULT '{}'::jsonb;

-- Ensure is_parent column exists
ALTER TABLE lats_product_variants
ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT FALSE;

-- Ensure quantity column exists
ALTER TABLE lats_product_variants
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;

-- 2️⃣ Create/Replace unique index for IMEIs
DROP INDEX IF EXISTS uniq_imei_index;
CREATE UNIQUE INDEX uniq_imei_index
ON lats_product_variants((variant_attributes->>'imei'))
WHERE (variant_attributes->>'imei') IS NOT NULL;

-- 3️⃣ Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_variant_parent_id 
ON lats_product_variants(parent_variant_id) 
WHERE parent_variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_variant_type 
ON lats_product_variants(variant_type);

CREATE INDEX IF NOT EXISTS idx_variant_attributes_imei 
ON lats_product_variants USING gin (variant_attributes);

-- 4️⃣ Drop existing functions if they exist with different signatures
DROP FUNCTION IF EXISTS add_imei_to_parent_variant CASCADE;
DROP FUNCTION IF EXISTS mark_imei_as_sold CASCADE;

-- 5️⃣ Function: Add IMEI child variant to parent
-- Updated to match existing TypeScript service expectations
CREATE OR REPLACE FUNCTION add_imei_to_parent_variant(
    parent_variant_id_param UUID,
    imei_param TEXT,
    serial_number_param TEXT DEFAULT NULL,
    mac_address_param TEXT DEFAULT NULL,
    cost_price_param NUMERIC DEFAULT 0,
    selling_price_param NUMERIC DEFAULT 0,
    condition_param TEXT DEFAULT 'new',
    branch_id_param UUID DEFAULT NULL,
    notes_param TEXT DEFAULT NULL
) RETURNS TABLE (
    success BOOLEAN,
    child_variant_id UUID,
    error_message TEXT
) AS $$
DECLARE
    v_parent_variant RECORD;
    v_product_id UUID;
    v_new_sku TEXT;
    v_child_id UUID;
    v_timestamp TEXT;
BEGIN
    -- Validate IMEI (15 digits)
    IF imei_param !~ '^[0-9]{15}$' THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'IMEI must be 15 numeric digits';
        RETURN;
    END IF;
    
    -- Check for duplicate IMEI
    IF EXISTS (
        SELECT 1 FROM lats_product_variants
        WHERE variant_attributes->>'imei' = imei_param
    ) THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Device with IMEI ' || imei_param || ' already exists in inventory';
        RETURN;
    END IF;
    
    -- Get parent variant info
    SELECT * INTO v_parent_variant
    FROM lats_product_variants
    WHERE id = parent_variant_id_param;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Parent variant not found';
        RETURN;
    END IF;
    
    -- Get product ID
    v_product_id := v_parent_variant.product_id;
    
    -- Mark parent as parent type if not already
    UPDATE lats_product_variants
    SET 
        is_parent = TRUE,
        variant_type = 'parent',
        updated_at = NOW()
    WHERE id = parent_variant_id_param
      AND variant_type != 'parent';
    
    -- Generate unique SKU for child IMEI variant
    v_timestamp := EXTRACT(EPOCH FROM NOW())::TEXT;
    v_new_sku := COALESCE(v_parent_variant.sku, 'VAR') || '-IMEI-' || SUBSTRING(imei_param, 1, 8) || '-' || SUBSTRING(v_timestamp, 1, 10);

    -- Insert child variant
    INSERT INTO lats_product_variants (
        product_id,
        parent_variant_id,
        variant_type,
        variant_name,
        name,
        sku,
        variant_attributes,
        quantity,
        cost_price,
        selling_price,
        is_active,
        is_parent,
        branch_id,
        created_at,
        updated_at
    ) VALUES (
        v_product_id,
        parent_variant_id_param,
        'imei_child',
        'IMEI: ' || imei_param,
        'IMEI: ' || imei_param,
        v_new_sku,
        jsonb_build_object(
            'imei', imei_param,
            'imei_status', 'available',
            'serial_number', serial_number_param,
            'mac_address', mac_address_param,
            'condition', COALESCE(condition_param, 'new'),
            'notes', notes_param,
            'source', 'purchase',
            'created_at', NOW()
        ),
        1,
        COALESCE(cost_price_param, v_parent_variant.cost_price, 0),
        COALESCE(selling_price_param, v_parent_variant.selling_price, 0),
        TRUE,
        FALSE,
        COALESCE(branch_id_param, v_parent_variant.branch_id),
        NOW(),
        NOW()
    )
    RETURNING id INTO v_child_id;
    
    -- Create stock movement record
    INSERT INTO lats_stock_movements (
        product_id,
        variant_id,
        branch_id,
        movement_type,
        quantity,
        reference_type,
        notes,
        created_at
    ) VALUES (
        v_product_id,
        v_child_id,
        COALESCE(branch_id_param, v_parent_variant.branch_id),
        'purchase',
        1,
        'imei_receive',
        'Received IMEI ' || imei_param || ' for variant ' || COALESCE(v_parent_variant.variant_name, v_parent_variant.name),
        NOW()
    );

    -- Update parent quantity automatically
    UPDATE lats_product_variants
    SET 
        quantity = (
            SELECT COUNT(*)
            FROM lats_product_variants
            WHERE parent_variant_id = parent_variant_id_param
              AND is_active = TRUE
              AND quantity > 0
        ),
        updated_at = NOW()
    WHERE id = parent_variant_id_param;
    
    -- Update product stock
    UPDATE lats_products
    SET 
        stock_quantity = (
            SELECT COALESCE(SUM(v.quantity), 0)
            FROM lats_product_variants v
            WHERE v.product_id = v_product_id
              AND v.is_active = TRUE
              AND (v.variant_type = 'parent' OR v.parent_variant_id IS NULL)
        ),
        updated_at = NOW()
    WHERE id = v_product_id;

    -- Return success
    RETURN QUERY SELECT TRUE, v_child_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 6️⃣ Function: Mark IMEI as sold
CREATE OR REPLACE FUNCTION mark_imei_as_sold(
    child_variant_id_param UUID,
    sale_id_param UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_parent_id UUID;
    v_child_variant RECORD;
BEGIN
    -- Get child variant info
    SELECT * INTO v_child_variant
    FROM lats_product_variants
    WHERE id = child_variant_id_param;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    v_parent_id := v_child_variant.parent_variant_id;
    
    -- Mark child variant as sold
    UPDATE lats_product_variants
    SET 
        is_active = FALSE,
        quantity = 0,
        variant_attributes = variant_attributes || jsonb_build_object(
            'imei_status', 'sold',
            'sold_at', NOW(),
            'sale_id', sale_id_param
        ),
        updated_at = NOW()
    WHERE id = child_variant_id_param;
    
    -- Create stock movement
    INSERT INTO lats_stock_movements (
        product_id,
        variant_id,
        branch_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_at
    ) VALUES (
        v_child_variant.product_id,
        child_variant_id_param,
        v_child_variant.branch_id,
        'sale',
        -1,
        'imei_sale',
        sale_id_param,
        'Sold IMEI ' || (v_child_variant.variant_attributes->>'imei'),
        NOW()
    );

    -- Update parent quantity automatically if parent exists
    IF v_parent_id IS NOT NULL THEN
        UPDATE lats_product_variants
        SET 
            quantity = (
                SELECT COUNT(*)
                FROM lats_product_variants
                WHERE parent_variant_id = v_parent_id
                  AND is_active = TRUE
                  AND quantity > 0
            ),
            updated_at = NOW()
        WHERE id = v_parent_id;
        
        -- Update product stock
        UPDATE lats_products
        SET 
            stock_quantity = (
                SELECT COALESCE(SUM(v.quantity), 0)
                FROM lats_product_variants v
                WHERE v.product_id = v_child_variant.product_id
                  AND v.is_active = TRUE
                  AND (v.variant_type = 'parent' OR v.parent_variant_id IS NULL)
            ),
            updated_at = NOW()
        WHERE id = v_child_variant.product_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 7️⃣ Enhanced trigger to auto-update parent quantity
CREATE OR REPLACE FUNCTION update_parent_quantity_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_parent_id UUID;
    v_product_id UUID;
BEGIN
    -- Determine parent_variant_id and product_id based on operation
    IF TG_OP = 'DELETE' THEN
        v_parent_id := OLD.parent_variant_id;
        v_product_id := OLD.product_id;
    ELSE
        v_parent_id := NEW.parent_variant_id;
        v_product_id := NEW.product_id;
    END IF;
    
    -- Update parent quantity if this is a child variant
    IF v_parent_id IS NOT NULL THEN
        UPDATE lats_product_variants
        SET 
            quantity = (
                SELECT COUNT(*)
                FROM lats_product_variants
                WHERE parent_variant_id = v_parent_id
                  AND is_active = true
                  AND quantity > 0
            ),
            updated_at = NOW()
        WHERE id = v_parent_id;
    END IF;
    
    -- Update product stock quantity
    IF v_product_id IS NOT NULL THEN
        UPDATE lats_products
        SET 
            stock_quantity = (
                SELECT COALESCE(SUM(v.quantity), 0)
                FROM lats_product_variants v
                WHERE v.product_id = v_product_id
                  AND v.is_active = TRUE
                  AND (v.variant_type = 'parent' OR v.parent_variant_id IS NULL)
            ),
            updated_at = NOW()
        WHERE id = v_product_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_parent_quantity ON lats_product_variants;

CREATE TRIGGER trg_update_parent_quantity
AFTER INSERT OR UPDATE OF quantity, is_active OR DELETE ON lats_product_variants
FOR EACH ROW
EXECUTE FUNCTION update_parent_quantity_trigger();

-- 8️⃣ Helper function: Get available IMEI children for a parent
CREATE OR REPLACE FUNCTION get_available_imeis_for_parent(
    parent_variant_id_param UUID
) RETURNS TABLE (
    child_id UUID,
    imei TEXT,
    serial_number TEXT,
    condition TEXT,
    imei_status TEXT,
    cost_price NUMERIC,
    selling_price NUMERIC,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id as child_id,
        v.variant_attributes->>'imei' as imei,
        v.variant_attributes->>'serial_number' as serial_number,
        COALESCE(v.variant_attributes->>'condition', 'new') as condition,
        COALESCE(v.variant_attributes->>'imei_status', 'available') as imei_status,
        v.cost_price,
        v.selling_price,
        v.created_at
    FROM lats_product_variants v
    WHERE v.parent_variant_id = parent_variant_id_param
      AND v.variant_type = 'imei_child'
      AND v.is_active = TRUE
      AND v.quantity > 0
    ORDER BY v.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 9️⃣ Helper function: Get IMEI variant by IMEI number
CREATE OR REPLACE FUNCTION get_variant_by_imei(
    search_imei TEXT
) RETURNS TABLE (
    variant_id UUID,
    product_id UUID,
    parent_variant_id UUID,
    product_name TEXT,
    variant_name TEXT,
    imei TEXT,
    serial_number TEXT,
    imei_status TEXT,
    cost_price NUMERIC,
    selling_price NUMERIC,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id as variant_id,
        v.product_id,
        v.parent_variant_id,
        p.name as product_name,
        v.variant_name,
        v.variant_attributes->>'imei' as imei,
        v.variant_attributes->>'serial_number' as serial_number,
        COALESCE(v.variant_attributes->>'imei_status', 'unknown') as imei_status,
        v.cost_price,
        v.selling_price,
        v.is_active
    FROM lats_product_variants v
    JOIN lats_products p ON p.id = v.product_id
    WHERE v.variant_attributes->>'imei' = search_imei;
END;
$$ LANGUAGE plpgsql;

-- 🔟 Helper function: Check if IMEI exists
CREATE OR REPLACE FUNCTION imei_exists(
    check_imei TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM lats_product_variants
        WHERE variant_attributes->>'imei' = check_imei
    );
END;
$$ LANGUAGE plpgsql;

-- 1️⃣1️⃣ View: Parent variants with IMEI counts
CREATE OR REPLACE VIEW v_parent_variants_with_imei_count AS
SELECT 
    p.id as parent_id,
    p.product_id,
    p.variant_name as parent_variant_name,
    p.sku as parent_sku,
    p.quantity as parent_quantity,
    p.cost_price as parent_cost_price,
    p.selling_price as parent_selling_price,
    p.is_active as parent_is_active,
    (
        SELECT COUNT(*)
        FROM lats_product_variants child
        WHERE child.parent_variant_id = p.id
          AND child.variant_type = 'imei_child'
          AND child.is_active = TRUE
          AND child.quantity > 0
    ) as available_imei_count,
    (
        SELECT COUNT(*)
        FROM lats_product_variants child
        WHERE child.parent_variant_id = p.id
          AND child.variant_type = 'imei_child'
    ) as total_imei_count
FROM lats_product_variants p
WHERE p.variant_type = 'parent' OR p.is_parent = TRUE;

-- 1️⃣2️⃣ Add documentation comments
COMMENT ON FUNCTION add_imei_to_parent_variant IS 'Add a new IMEI device as a child variant to a parent variant';
COMMENT ON FUNCTION mark_imei_as_sold IS 'Mark an IMEI child variant as sold and update parent quantities';
COMMENT ON FUNCTION get_available_imeis_for_parent IS 'Get all available IMEI child variants for a parent variant';
COMMENT ON FUNCTION get_variant_by_imei IS 'Look up a variant by its IMEI number';
COMMENT ON FUNCTION imei_exists IS 'Check if an IMEI already exists in the system';
COMMENT ON VIEW v_parent_variants_with_imei_count IS 'View of parent variants with counts of their IMEI children';

-- 1️⃣3️⃣ Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION add_imei_to_parent_variant TO authenticated;
GRANT EXECUTE ON FUNCTION mark_imei_as_sold TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_imeis_for_parent TO authenticated;
GRANT EXECUTE ON FUNCTION get_variant_by_imei TO authenticated;
GRANT EXECUTE ON FUNCTION imei_exists TO authenticated;
GRANT SELECT ON v_parent_variants_with_imei_count TO authenticated;

-- 1️⃣4️⃣ Success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ COMPREHENSIVE IMEI SYSTEM SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📦 Features Installed:';
    RAISE NOTICE '   ✓ Unique IMEI validation';
    RAISE NOTICE '   ✓ Parent-child variant system';
    RAISE NOTICE '   ✓ Automatic quantity updates';
    RAISE NOTICE '   ✓ Stock movement tracking';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Available Functions:';
    RAISE NOTICE '   • add_imei_to_parent_variant(parent_id, imei, sn, cost, price)';
    RAISE NOTICE '   • mark_imei_as_sold(child_id, sale_id)';
    RAISE NOTICE '   • get_available_imeis_for_parent(parent_id)';
    RAISE NOTICE '   • get_variant_by_imei(imei)';
    RAISE NOTICE '   • imei_exists(imei)';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Available Views:';
    RAISE NOTICE '   • v_parent_variants_with_imei_count';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

