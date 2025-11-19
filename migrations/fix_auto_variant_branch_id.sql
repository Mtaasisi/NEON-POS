-- =====================================================
-- FIX AUTO-VARIANT CREATION TO INCLUDE BRANCH_ID
-- =====================================================
-- This migration fixes the auto_create_default_variant() function
-- to include branch_id when creating default variants.
-- This resolves the NOT NULL constraint violation error.

-- Update the function to include branch_id
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
            branch_id,  -- ✅ ADDED: Include branch_id from product
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
            NEW.branch_id,  -- ✅ ADDED: Copy branch_id from the product
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

-- Update the comment
COMMENT ON FUNCTION public.auto_create_default_variant() IS 
'Automatically creates a default variant for products that have no variants. Includes branch_id from parent product.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Auto-variant creation function updated to include branch_id!';
  RAISE NOTICE '📝 Default variants will now inherit branch_id from their products';
END $$;

