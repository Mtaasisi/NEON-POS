-- =====================================================
-- Product Transfer Between Branches
-- =====================================================
-- This migration adds the ability to:
-- 1. View products from all branches
-- 2. Select and transfer products to current branch
-- 3. Copy product data without stock quantities
-- 4. Track transfer history
-- =====================================================

-- Print start message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📦 =====================================================';
    RAISE NOTICE '📦 Adding Product Transfer Between Branches';
    RAISE NOTICE '📦 =====================================================';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- 1. Create Product Transfer History Table
-- =====================================================

CREATE TABLE IF NOT EXISTS lats_product_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    source_branch_id UUID NOT NULL,
    destination_branch_id UUID NOT NULL,
    transferred_by UUID,
    transfer_type TEXT DEFAULT 'copy', -- 'copy' or 'move'
    include_variants BOOLEAN DEFAULT true,
    include_stock BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES lats_products(id) ON DELETE CASCADE,
    CONSTRAINT fk_source_branch FOREIGN KEY (source_branch_id) REFERENCES lats_branches(id) ON DELETE CASCADE,
    CONSTRAINT fk_dest_branch FOREIGN KEY (destination_branch_id) REFERENCES lats_branches(id) ON DELETE CASCADE,
    CONSTRAINT fk_transferred_by FOREIGN KEY (transferred_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_product_transfers_product ON lats_product_transfers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_transfers_source ON lats_product_transfers(source_branch_id);
CREATE INDEX IF NOT EXISTS idx_product_transfers_dest ON lats_product_transfers(destination_branch_id);
CREATE INDEX IF NOT EXISTS idx_product_transfers_created ON lats_product_transfers(created_at DESC);

COMMENT ON TABLE lats_product_transfers IS 
'Tracks product transfers between branches for audit and history';

-- =====================================================
-- 2. Function: Copy Product to Another Branch
-- =====================================================

CREATE OR REPLACE FUNCTION copy_product_to_branch(
    p_product_id UUID,
    p_destination_branch_id UUID,
    p_user_id UUID,
    p_include_variants BOOLEAN DEFAULT true,
    p_include_stock BOOLEAN DEFAULT false
)
RETURNS TABLE (
    new_product_id UUID,
    new_variant_ids UUID[],
    message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_source_branch_id UUID;
    v_new_product_id UUID;
    v_new_variant_id UUID;
    v_variant_ids UUID[] := ARRAY[]::UUID[];
    v_variant_rec RECORD;
    v_product_rec RECORD;
BEGIN
    -- Get source product details
    SELECT * INTO v_product_rec
    FROM lats_products
    WHERE id = p_product_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
    
    v_source_branch_id := v_product_rec.branch_id;
    
    -- Check if product already exists in destination branch
    IF EXISTS (
        SELECT 1 FROM lats_products 
        WHERE name = v_product_rec.name 
        AND branch_id = p_destination_branch_id
        AND id != p_product_id
    ) THEN
        RAISE EXCEPTION 'Product with same name already exists in destination branch';
    END IF;
    
    -- Copy the product
    INSERT INTO lats_products (
        name,
        description,
        sku,
        barcode,
        category_id,
        unit_price,
        cost_price,
        selling_price,
        stock_quantity,
        min_stock_level,
        max_stock_level,
        is_active,
        image_url,
        brand,
        model,
        warranty_period,
        condition,
        tags,
        attributes,
        metadata,
        branch_id
    )
    SELECT 
        name,
        description,
        sku || '-' || SUBSTRING(p_destination_branch_id::TEXT, 1, 8), -- Make SKU unique
        barcode,
        category_id,
        unit_price,
        cost_price,
        selling_price,
        CASE WHEN p_include_stock THEN stock_quantity ELSE 0 END,
        min_stock_level,
        max_stock_level,
        is_active,
        image_url,
        brand,
        model,
        warranty_period,
        condition,
        tags,
        attributes || jsonb_build_object('copied_from', p_product_id, 'source_branch', v_source_branch_id),
        metadata,
        p_destination_branch_id
    FROM lats_products
    WHERE id = p_product_id
    RETURNING id INTO v_new_product_id;
    
    -- Copy variants if requested
    IF p_include_variants THEN
        FOR v_variant_rec IN 
            SELECT * FROM lats_product_variants
            WHERE product_id = p_product_id
            AND parent_variant_id IS NULL  -- Only parent variants, no IMEI children
            AND is_active = true
        LOOP
            INSERT INTO lats_product_variants (
                product_id,
                name,
                variant_name,
                sku,
                barcode,
                quantity,
                min_quantity,
                unit_price,
                cost_price,
                selling_price,
                is_active,
                attributes,
                variant_attributes,
                branch_id
            )
            VALUES (
                v_new_product_id,
                v_variant_rec.name,
                v_variant_rec.variant_name,
                v_variant_rec.sku || '-' || SUBSTRING(p_destination_branch_id::TEXT, 1, 8),
                v_variant_rec.barcode,
                CASE WHEN p_include_stock THEN v_variant_rec.quantity ELSE 0 END,
                v_variant_rec.min_quantity,
                v_variant_rec.unit_price,
                v_variant_rec.cost_price,
                v_variant_rec.selling_price,
                v_variant_rec.is_active,
                v_variant_rec.attributes,
                v_variant_rec.variant_attributes || jsonb_build_object('copied_from', v_variant_rec.id),
                p_destination_branch_id
            )
            RETURNING id INTO v_new_variant_id;
            
            v_variant_ids := array_append(v_variant_ids, v_new_variant_id);
        END LOOP;
    END IF;
    
    -- Log the transfer
    INSERT INTO lats_product_transfers (
        product_id,
        source_branch_id,
        destination_branch_id,
        transferred_by,
        transfer_type,
        include_variants,
        include_stock
    )
    VALUES (
        p_product_id,
        v_source_branch_id,
        p_destination_branch_id,
        p_user_id,
        'copy',
        p_include_variants,
        p_include_stock
    );
    
    RETURN QUERY SELECT 
        v_new_product_id,
        v_variant_ids,
        format('Product copied successfully. New product ID: %s, Variants copied: %s', 
               v_new_product_id, array_length(v_variant_ids, 1))::TEXT;
END;
$$;

COMMENT ON FUNCTION copy_product_to_branch IS 
'Copies a product from one branch to another. Stock can be optionally included.';

-- =====================================================
-- 3. Function: Batch Copy Multiple Products
-- =====================================================

CREATE OR REPLACE FUNCTION batch_copy_products_to_branch(
    p_product_ids UUID[],
    p_destination_branch_id UUID,
    p_user_id UUID,
    p_include_variants BOOLEAN DEFAULT true,
    p_include_stock BOOLEAN DEFAULT false
)
RETURNS TABLE (
    product_id UUID,
    success BOOLEAN,
    new_product_id UUID,
    message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_product_id UUID;
    v_result RECORD;
BEGIN
    FOREACH v_product_id IN ARRAY p_product_ids
    LOOP
        BEGIN
            SELECT * INTO v_result
            FROM copy_product_to_branch(
                v_product_id,
                p_destination_branch_id,
                p_user_id,
                p_include_variants,
                p_include_stock
            );
            
            RETURN QUERY SELECT 
                v_product_id,
                true,
                v_result.new_product_id,
                v_result.message;
                
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                v_product_id,
                false,
                NULL::UUID,
                SQLERRM::TEXT;
        END;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION batch_copy_products_to_branch IS 
'Copies multiple products to a branch in one operation';

-- =====================================================
-- 4. View: Available Products for Transfer
-- =====================================================

CREATE OR REPLACE VIEW available_products_for_transfer AS
SELECT 
    p.id,
    p.name,
    p.sku,
    p.selling_price,
    p.branch_id as source_branch_id,
    b.name as source_branch_name,
    p.has_variants,
    COUNT(DISTINCT pv.id) FILTER (WHERE pv.parent_variant_id IS NULL) as variant_count,
    p.image_url,
    p.is_active,
    p.created_at
FROM lats_products p
LEFT JOIN lats_branches b ON p.branch_id = b.id
LEFT JOIN lats_product_variants pv ON p.id = pv.product_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.sku, p.selling_price, p.branch_id, b.name, 
         p.has_variants, p.image_url, p.is_active, p.created_at;

COMMENT ON VIEW available_products_for_transfer IS 
'Shows all products available for transfer to other branches';

-- =====================================================
-- 5. Function: Get Transfer History
-- =====================================================

CREATE OR REPLACE FUNCTION get_transfer_history(
    p_branch_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    transfer_id UUID,
    product_name TEXT,
    source_branch TEXT,
    destination_branch TEXT,
    transferred_by_name TEXT,
    transfer_type TEXT,
    variants_included BOOLEAN,
    stock_included BOOLEAN,
    transferred_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.id,
        p.name,
        sb.name,
        db.name,
        u.email,
        pt.transfer_type,
        pt.include_variants,
        pt.include_stock,
        pt.created_at
    FROM lats_product_transfers pt
    JOIN lats_products p ON pt.product_id = p.id
    JOIN lats_branches sb ON pt.source_branch_id = sb.id
    JOIN lats_branches db ON pt.destination_branch_id = db.id
    LEFT JOIN users u ON pt.transferred_by = u.id
    WHERE (p_branch_id IS NULL OR 
           pt.source_branch_id = p_branch_id OR 
           pt.destination_branch_id = p_branch_id)
    ORDER BY pt.created_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_transfer_history IS 
'Returns transfer history for a branch or all branches';

-- =====================================================
-- 6. Add Setting for Transfer Feature
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' 
        AND column_name = 'enable_product_transfer'
    ) THEN
        ALTER TABLE lats_pos_general_settings 
        ADD COLUMN enable_product_transfer BOOLEAN DEFAULT true;
        
        COMMENT ON COLUMN lats_pos_general_settings.enable_product_transfer IS 
        'When true, users can transfer products between branches';
        
        RAISE NOTICE '✅ Added enable_product_transfer setting';
    ELSE
        RAISE NOTICE 'ℹ️  enable_product_transfer setting already exists';
    END IF;
END $$;

-- =====================================================
-- 7. Function: Check if Product Can Be Transferred
-- =====================================================

CREATE OR REPLACE FUNCTION can_transfer_product(
    p_product_id UUID,
    p_destination_branch_id UUID
)
RETURNS TABLE (
    can_transfer BOOLEAN,
    reason TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_product_name TEXT;
    v_exists BOOLEAN;
BEGIN
    -- Check if product exists
    SELECT name INTO v_product_name
    FROM lats_products
    WHERE id = p_product_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Product not found';
        RETURN;
    END IF;
    
    -- Check if already exists in destination
    SELECT EXISTS(
        SELECT 1 FROM lats_products 
        WHERE name = v_product_name 
        AND branch_id = p_destination_branch_id
    ) INTO v_exists;
    
    IF v_exists THEN
        RETURN QUERY SELECT false, 'Product already exists in destination branch';
        RETURN;
    END IF;
    
    RETURN QUERY SELECT true, 'Product can be transferred';
END;
$$;

COMMENT ON FUNCTION can_transfer_product IS 
'Checks if a product can be transferred to a branch';

-- =====================================================
-- Success message
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '✅ Product Transfer System Ready!';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What was created:';
    RAISE NOTICE '  1. ✅ Table: lats_product_transfers';
    RAISE NOTICE '  2. ✅ Function: copy_product_to_branch()';
    RAISE NOTICE '  3. ✅ Function: batch_copy_products_to_branch()';
    RAISE NOTICE '  4. ✅ Function: get_transfer_history()';
    RAISE NOTICE '  5. ✅ Function: can_transfer_product()';
    RAISE NOTICE '  6. ✅ View: available_products_for_transfer';
    RAISE NOTICE '  7. ✅ Setting: enable_product_transfer';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Features:';
    RAISE NOTICE '  • View products from all branches';
    RAISE NOTICE '  • Copy products to your branch';
    RAISE NOTICE '  • Choose to include/exclude stock';
    RAISE NOTICE '  • Choose to include/exclude variants';
    RAISE NOTICE '  • Track transfer history';
    RAISE NOTICE '  • Batch transfer multiple products';
    RAISE NOTICE '';
    RAISE NOTICE '📖 Usage:';
    RAISE NOTICE '  -- Copy single product';
    RAISE NOTICE '  SELECT * FROM copy_product_to_branch(';
    RAISE NOTICE '    ''product-uuid'',';
    RAISE NOTICE '    ''destination-branch-uuid'',';
    RAISE NOTICE '    ''user-uuid'',';
    RAISE NOTICE '    true,  -- include variants';
    RAISE NOTICE '    false  -- exclude stock';
    RAISE NOTICE '  );';
    RAISE NOTICE '';
END $$;

