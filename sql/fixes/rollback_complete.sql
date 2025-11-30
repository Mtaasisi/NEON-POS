-- =====================================================
-- COMPLETE ROLLBACK - All Database Changes
-- =====================================================
-- This removes:
-- 1. Cross-branch product visibility features
-- 2. Product transfer features
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⏮️  =====================================================';
    RAISE NOTICE '⏮️  Rolling Back All Database Changes';
    RAISE NOTICE '⏮️  =====================================================';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- 1. Drop Product Transfer Features
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '1️⃣ Removing product transfer features...';
END $$;

-- Drop table
DROP TABLE IF EXISTS lats_product_transfers CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS copy_product_to_branch(UUID, UUID, UUID, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS batch_copy_products_to_branch(UUID[], UUID, UUID, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS get_transfer_history(UUID, INTEGER);
DROP FUNCTION IF EXISTS can_transfer_product(UUID, UUID);

-- Drop view
DROP VIEW IF EXISTS available_products_for_transfer CASCADE;

-- Remove setting
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' 
        AND column_name = 'enable_product_transfer'
    ) THEN
        ALTER TABLE lats_pos_general_settings 
        DROP COLUMN enable_product_transfer;
        RAISE NOTICE '  ✅ Removed enable_product_transfer setting';
    END IF;
END $$;

-- =====================================================
-- 2. Drop Cross-Branch Visibility Features
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '2️⃣ Removing cross-branch visibility features...';
END $$;

-- Drop views
DROP VIEW IF EXISTS cross_branch_usage_examples CASCADE;
DROP VIEW IF EXISTS product_summary_by_branch CASCADE;
DROP VIEW IF EXISTS cross_branch_variants_no_stock CASCADE;
DROP VIEW IF EXISTS cross_branch_products_no_stock CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS search_products_all_branches(TEXT, UUID, INTEGER);
DROP FUNCTION IF EXISTS is_cross_branch_view_enabled(UUID, UUID);
DROP FUNCTION IF EXISTS get_cross_branch_variants(UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS get_cross_branch_products(UUID, BOOLEAN, UUID, TEXT, INTEGER, INTEGER);

-- Remove setting
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' 
        AND column_name = 'enable_cross_branch_product_view'
    ) THEN
        ALTER TABLE lats_pos_general_settings 
        DROP COLUMN enable_cross_branch_product_view;
        RAISE NOTICE '  ✅ Removed enable_cross_branch_product_view setting';
    END IF;
END $$;

-- =====================================================
-- 3. Verification
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '3️⃣ Verifying rollback...';
    RAISE NOTICE '';
END $$;

-- Check transfer table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'lats_product_transfers'
    ) THEN
        RAISE NOTICE '  ✅ Product transfer table removed';
    ELSE
        RAISE NOTICE '  ⚠️  Product transfer table still exists';
    END IF;
END $$;

-- Check views
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.views
    WHERE table_name IN (
        'cross_branch_products_no_stock',
        'cross_branch_variants_no_stock',
        'product_summary_by_branch',
        'available_products_for_transfer'
    );
    
    IF v_count = 0 THEN
        RAISE NOTICE '  ✅ All views removed';
    ELSE
        RAISE NOTICE '  ⚠️  % views still exist', v_count;
    END IF;
END $$;

-- Check functions
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'copy_product_to_branch',
        'batch_copy_products_to_branch',
        'get_cross_branch_products',
        'get_cross_branch_variants',
        'search_products_all_branches',
        'is_cross_branch_view_enabled',
        'get_transfer_history',
        'can_transfer_product'
    );
    
    IF v_count = 0 THEN
        RAISE NOTICE '  ✅ All functions removed';
    ELSE
        RAISE NOTICE '  ⚠️  % functions still exist', v_count;
    END IF;
END $$;

-- Check settings
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'lats_pos_general_settings'
    AND column_name IN (
        'enable_product_transfer',
        'enable_cross_branch_product_view'
    );
    
    IF v_count = 0 THEN
        RAISE NOTICE '  ✅ All setting columns removed';
    ELSE
        RAISE NOTICE '  ⚠️  % setting columns still exist', v_count;
    END IF;
END $$;

-- =====================================================
-- Success message
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '✅ Complete Rollback Finished!';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What was removed:';
    RAISE NOTICE '  1. ✅ Product transfer table and functions';
    RAISE NOTICE '  2. ✅ Cross-branch visibility views and functions';
    RAISE NOTICE '  3. ✅ All setting columns';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Your database is now back to its original state.';
    RAISE NOTICE '';
END $$;

