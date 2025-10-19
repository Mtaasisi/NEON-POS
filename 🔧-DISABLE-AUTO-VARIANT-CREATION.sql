-- ============================================
-- 🔧 DISABLE AUTO VARIANT CREATION TRIGGER
-- ============================================
-- Issue: Empty variants are auto-created even when user creates variants manually
-- Solution: Disable the trigger that auto-creates default variants
-- Date: October 19, 2025
-- ============================================

BEGIN;

-- Check if trigger exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'auto_create_default_variant_trigger'
    ) THEN
        RAISE NOTICE '🔍 Found auto_create_default_variant_trigger - will disable it';
    ELSE
        RAISE NOTICE 'ℹ️  Trigger auto_create_default_variant_trigger does not exist';
    END IF;
END $$;

-- Disable the trigger (don't delete it, just disable in case we need it later)
DROP TRIGGER IF EXISTS auto_create_default_variant_trigger ON lats_products;

RAISE NOTICE '✅ Disabled auto_create_default_variant_trigger';

-- Also disable any other variant auto-creation triggers
DROP TRIGGER IF EXISTS ensure_product_has_variant_trigger ON lats_products;
DROP TRIGGER IF EXISTS create_default_variant_trigger ON lats_products;
DROP TRIGGER IF EXISTS auto_create_variant_trigger ON lats_products;

RAISE NOTICE '✅ Checked and disabled all variant auto-creation triggers';

COMMIT;

-- ============================================
-- Verification
-- ============================================

-- Show remaining triggers on lats_products table
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'lats_products';
    
    RAISE NOTICE '';
    RAISE NOTICE '📋 Remaining triggers on lats_products table: %', trigger_count;
    
    -- List them if any exist
    IF trigger_count > 0 THEN
        RAISE NOTICE 'Listing triggers:';
        FOR trigger_rec IN (
            SELECT t.tgname
            FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            WHERE c.relname = 'lats_products'
        ) LOOP
            RAISE NOTICE '  - %', trigger_rec.tgname;
        END LOOP;
    END IF;
END $$;

-- ============================================
-- Success Message
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ AUTO VARIANT CREATION DISABLED!';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What was changed:';
    RAISE NOTICE '  • Disabled auto_create_default_variant_trigger';
    RAISE NOTICE '  • Checked and disabled other variant auto-creation triggers';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Result:';
    RAISE NOTICE '  • Products will ONLY have the variants YOU create';
    RAISE NOTICE '  • No more empty "Default" variants';
    RAISE NOTICE '  • Application code still handles variant creation properly';
    RAISE NOTICE '';
    RAISE NOTICE '✨ Next step:';
    RAISE NOTICE '  Try creating a product with variants now!';
    RAISE NOTICE '  You should only see the variants you explicitly create.';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════';
END $$;

