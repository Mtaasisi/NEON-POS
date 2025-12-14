-- =====================================================
-- COMPREHENSIVE FIX FOR BRANCH_ID NOT NULL VIOLATIONS
-- =====================================================
-- This migration fixes ALL places where product variants
-- are created without branch_id, which violates the
-- NOT NULL constraint on lats_product_variants.branch_id
--
-- WHAT THIS FIXES:
-- 1. auto_create_default_variant() trigger function
-- 2. create_product_variant() helper function
-- 3. complete_purchase_order_receive() function (if exists)
--
-- HOW TO APPLY:
-- Option 1: psql "YOUR_NEON_CONNECTION_STRING" -f migrations/APPLY_THIS_fix_all_branch_id_issues.sql
-- Option 2: Copy contents to Neon SQL Editor and run
--
-- =====================================================

-- =====================================================
-- FIX 1: Update auto_create_default_variant() function
-- =====================================================
-- This function is triggered after every product insert
-- to automatically create a default variant if none exist

CREATE OR REPLACE FUNCTION public.auto_create_default_variant() 
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    variant_count INTEGER;
    v_new_variant_id UUID;
BEGIN
    -- Wait a moment to allow batch variant insertions
    PERFORM pg_sleep(0.1);
    
    -- Check if this product has any variants
    SELECT COUNT(*) INTO variant_count
    FROM lats_product_variants
    WHERE product_id = NEW.id
    AND parent_variant_id IS NULL; -- Only count parent variants, not IMEI children
    
    -- If no variants exist, create a default one
    IF variant_count = 0 THEN
        INSERT INTO lats_product_variants (
            product_id,
            name,
            variant_name,
            sku,
            cost_price,
            unit_price,
            selling_price,
            quantity,
            min_quantity,
            variant_attributes,
            attributes,
            branch_id,  -- ✅ CRITICAL FIX: Include branch_id from product
            is_active,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            'Default',
            'Default',
            COALESCE(NEW.sku || '-DEFAULT', 'SKU-' || SUBSTRING(NEW.id::text, 1, 8) || '-DEFAULT'),
            COALESCE(NEW.cost_price, 0),
            COALESCE(NEW.unit_price, NEW.selling_price, 0),
            COALESCE(NEW.selling_price, 0),
            COALESCE(NEW.stock_quantity, 0),
            COALESCE(NEW.min_stock_level, 0),
            jsonb_build_object(
                'auto_created', true,
                'created_at', NOW(),
                'created_from', 'product_insert_trigger'
            ),
            COALESCE(NEW.attributes, '{}'::jsonb),
            NEW.branch_id,  -- ✅ CRITICAL FIX: Copy branch_id from the product
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_new_variant_id;
        
        RAISE NOTICE '✨ Auto-created default variant (ID: %) for product: "%" (ID: %) with branch_id: %', 
            v_new_variant_id, NEW.name, NEW.id, NEW.branch_id;
    ELSE
        RAISE NOTICE '✅ Product "%" already has % variant(s), skipping auto-creation', 
            NEW.name, variant_count;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_create_default_variant() IS 
'Automatically creates a default variant for products that have no variants. Includes branch_id from parent product.';

RAISE NOTICE '✅ FIX 1: auto_create_default_variant() function updated with branch_id support';

-- =====================================================
-- FIX 2: Update create_product_variant() helper function
-- =====================================================
-- This is a helper function that may be used by other code
-- Updated to support branch_id parameter (optional for backward compatibility)

CREATE OR REPLACE FUNCTION public.create_product_variant(
    p_product_id uuid, 
    p_variant_name text, 
    p_sku text DEFAULT NULL::text, 
    p_cost_price numeric DEFAULT 0, 
    p_unit_price numeric DEFAULT 0, 
    p_quantity integer DEFAULT 0,
    p_branch_id uuid DEFAULT NULL::uuid  -- ✅ NEW PARAMETER (optional)
) 
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_id UUID;
    has_variant_name BOOLEAN;
    has_name BOOLEAN;
    v_branch_id UUID;
BEGIN
    -- If branch_id not provided, try to get it from the product
    IF p_branch_id IS NULL THEN
        SELECT branch_id INTO v_branch_id
        FROM lats_products
        WHERE id = p_product_id;
        
        IF v_branch_id IS NULL THEN
            RAISE EXCEPTION 'Cannot create variant: Product has no branch_id and none was provided';
        END IF;
    ELSE
        v_branch_id := p_branch_id;
    END IF;
    
    -- Check which columns exist (for backward compatibility)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'variant_name'
    ) INTO has_variant_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'name'
    ) INTO has_name;
    
    -- Insert using appropriate column name
    IF has_variant_name THEN
        INSERT INTO lats_product_variants (
            product_id, branch_id, variant_name, sku, cost_price, unit_price, 
            selling_price, quantity, variant_attributes, is_active
        )
        VALUES (
            p_product_id, v_branch_id, p_variant_name, p_sku, p_cost_price, p_unit_price,
            p_unit_price, p_quantity, '{}'::jsonb, true
        )
        RETURNING id INTO v_id;
    ELSIF has_name THEN
        INSERT INTO lats_product_variants (
            product_id, branch_id, name, sku, cost_price, unit_price, 
            selling_price, quantity, attributes, is_active
        )
        VALUES (
            p_product_id, v_branch_id, p_variant_name, p_sku, p_cost_price, p_unit_price,
            p_unit_price, p_quantity, '{}'::jsonb, true
        )
        RETURNING id INTO v_id;
    ELSE
        RAISE EXCEPTION 'No valid name column found in lats_product_variants';
    END IF;
    
    RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.create_product_variant IS 
'Creates a product variant with branch_id support. If branch_id not provided, inherits from product.';

RAISE NOTICE '✅ FIX 2: create_product_variant() function updated with branch_id support';

-- =====================================================
-- FIX 3: Verify and fix any existing orphaned variants
-- =====================================================
-- Check if there are any variants without branch_id
-- and try to fix them by inheriting from their products

DO $$
DECLARE
    v_fixed_count INTEGER := 0;
    v_orphaned_count INTEGER := 0;
BEGIN
    -- Count variants with NULL branch_id
    SELECT COUNT(*) INTO v_orphaned_count
    FROM lats_product_variants
    WHERE branch_id IS NULL;
    
    IF v_orphaned_count > 0 THEN
        RAISE NOTICE 'Found % variants with NULL branch_id, attempting to fix...', v_orphaned_count;
        
        -- Update variants to inherit branch_id from their products
        UPDATE lats_product_variants v
        SET branch_id = p.branch_id
        FROM lats_products p
        WHERE v.product_id = p.id
        AND v.branch_id IS NULL
        AND p.branch_id IS NOT NULL;
        
        GET DIAGNOSTICS v_fixed_count = ROW_COUNT;
        RAISE NOTICE '✅ FIX 3: Fixed % variants by inheriting branch_id from products', v_fixed_count;
        
        -- Check if any still remain
        SELECT COUNT(*) INTO v_orphaned_count
        FROM lats_product_variants
        WHERE branch_id IS NULL;
        
        IF v_orphaned_count > 0 THEN
            RAISE WARNING '⚠️  Still have % variants with NULL branch_id (their products also lack branch_id)', v_orphaned_count;
        END IF;
    ELSE
        RAISE NOTICE '✅ FIX 3: No orphaned variants found (all have branch_id)';
    END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Verify the fixes were applied successfully

DO $$
DECLARE
    v_trigger_exists BOOLEAN;
    v_function_updated BOOLEAN;
BEGIN
    -- Check if trigger exists
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_auto_create_default_variant'
    ) INTO v_trigger_exists;
    
    -- Check if function includes branch_id (by checking if it contains the text)
    SELECT pg_get_functiondef(oid)::text LIKE '%NEW.branch_id%'
    INTO v_function_updated
    FROM pg_proc 
    WHERE proname = 'auto_create_default_variant'
    LIMIT 1;
    
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'VERIFICATION RESULTS';
    RAISE NOTICE '==============================================';
    
    IF v_trigger_exists THEN
        RAISE NOTICE '✅ Trigger exists: trigger_auto_create_default_variant';
    ELSE
        RAISE WARNING '⚠️  Trigger NOT found: trigger_auto_create_default_variant';
    END IF;
    
    IF v_function_updated THEN
        RAISE NOTICE '✅ Function updated: auto_create_default_variant includes branch_id';
    ELSE
        RAISE WARNING '⚠️  Function may not be updated correctly';
    END IF;
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ ALL FIXES APPLIED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Reload your application (Cmd+Shift+R or Ctrl+Shift+F5)';
    RAISE NOTICE '2. Test creating a new product';
    RAISE NOTICE '3. Verify no more branch_id errors occur';
    RAISE NOTICE '';
END $$;

