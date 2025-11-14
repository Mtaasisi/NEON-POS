-- ============================================================================
-- Fix Store Location Deletion Constraint
-- ============================================================================
-- Changes foreign key behavior from SET NULL to RESTRICT to prevent
-- deletion of stores that have products/variants
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 Fixing store location deletion constraints...';
    
    -- Drop and recreate the foreign key constraints with RESTRICT
    -- This will prevent deletion of a store if it has any products or variants
    
    -- Fix lats_products.branch_id foreign key
    ALTER TABLE lats_products 
        DROP CONSTRAINT IF EXISTS lats_products_branch_id_fkey;
    
    ALTER TABLE lats_products 
        ADD CONSTRAINT lats_products_branch_id_fkey 
        FOREIGN KEY (branch_id) 
        REFERENCES store_locations(id) 
        ON DELETE RESTRICT;
    
    RAISE NOTICE '✅ Fixed lats_products foreign key constraint';
    
    -- Fix lats_product_variants.branch_id foreign key
    ALTER TABLE lats_product_variants 
        DROP CONSTRAINT IF EXISTS lats_product_variants_branch_id_fkey;
    
    ALTER TABLE lats_product_variants 
        ADD CONSTRAINT lats_product_variants_branch_id_fkey 
        FOREIGN KEY (branch_id) 
        REFERENCES store_locations(id) 
        ON DELETE RESTRICT;
    
    RAISE NOTICE '✅ Fixed lats_product_variants foreign key constraint';
    
    RAISE NOTICE '🎉 Store deletion constraints updated successfully!';
    RAISE NOTICE 'ℹ️  Stores with products can no longer be deleted.';
    RAISE NOTICE 'ℹ️  You must transfer or delete products first.';
    
END $$;

-- ============================================================================
-- Create a helper function to check if a store can be deleted
-- ============================================================================

CREATE OR REPLACE FUNCTION can_delete_store_location(store_id UUID)
RETURNS TABLE(
    can_delete BOOLEAN,
    reason TEXT,
    product_count BIGINT,
    variant_count BIGINT,
    customer_count BIGINT,
    employee_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_product_count BIGINT;
    v_variant_count BIGINT;
    v_customer_count BIGINT;
    v_employee_count BIGINT;
BEGIN
    -- Count products
    SELECT COUNT(*) INTO v_product_count
    FROM lats_products
    WHERE branch_id = store_id;
    
    -- Count variants
    SELECT COUNT(*) INTO v_variant_count
    FROM lats_product_variants
    WHERE branch_id = store_id;
    
    -- Count customers
    SELECT COUNT(*) INTO v_customer_count
    FROM customers
    WHERE branch_id = store_id;
    
    -- Count employees
    SELECT COUNT(*) INTO v_employee_count
    FROM employees
    WHERE branch_id = store_id;
    
    -- Check if store can be deleted
    IF v_product_count > 0 OR v_variant_count > 0 THEN
        RETURN QUERY SELECT 
            FALSE,
            'Store has ' || v_product_count || ' products and ' || v_variant_count || ' variants. Delete or transfer them first.',
            v_product_count,
            v_variant_count,
            v_customer_count,
            v_employee_count;
    ELSIF v_customer_count > 0 THEN
        RETURN QUERY SELECT 
            FALSE,
            'Store has ' || v_customer_count || ' customers. Transfer them first or they will be unassigned.',
            v_product_count,
            v_variant_count,
            v_customer_count,
            v_employee_count;
    ELSIF v_employee_count > 0 THEN
        RETURN QUERY SELECT 
            FALSE,
            'Store has ' || v_employee_count || ' employees. Transfer them first or they will be unassigned.',
            v_product_count,
            v_variant_count,
            v_customer_count,
            v_employee_count;
    ELSE
        RETURN QUERY SELECT 
            TRUE,
            'Store can be safely deleted.',
            v_product_count,
            v_variant_count,
            v_customer_count,
            v_employee_count;
    END IF;
END;
$$;

COMMENT ON FUNCTION can_delete_store_location(UUID) IS 
'Checks if a store location can be safely deleted and returns details about related records';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '📊 Verifying constraint changes...';
    
    -- Check the constraint type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'lats_products'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'branch_id'
    ) THEN
        RAISE NOTICE '✅ lats_products.branch_id foreign key constraint exists';
    ELSE
        RAISE WARNING '⚠️  lats_products.branch_id foreign key constraint NOT found';
    END IF;
    
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'lats_product_variants'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'branch_id'
    ) THEN
        RAISE NOTICE '✅ lats_product_variants.branch_id foreign key constraint exists';
    ELSE
        RAISE WARNING '⚠️  lats_product_variants.branch_id foreign key constraint NOT found';
    END IF;
    
    RAISE NOTICE '✅ Verification complete!';
END $$;

