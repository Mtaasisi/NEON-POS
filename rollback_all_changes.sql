-- =====================================================
-- ROLLBACK ALL CHANGES FROM SESSION
-- =====================================================
-- This script undoes all changes made in this session:
-- 1. Removes branch_id from settings tables
-- 2. Removes cross-branch product visibility features
-- =====================================================

-- Print start message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⏮️  =====================================================';
    RAISE NOTICE '⏮️  Rolling Back All Changes';
    RAISE NOTICE '⏮️  =====================================================';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- PART 1: Rollback Cross-Branch Product Visibility
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '1️⃣ Removing cross-branch product visibility features...';
END $$;

-- Drop views
DROP VIEW IF EXISTS cross_branch_usage_examples CASCADE;
DROP VIEW IF EXISTS product_summary_by_branch CASCADE;
DROP VIEW IF EXISTS cross_branch_variants_no_stock CASCADE;
DROP VIEW IF EXISTS cross_branch_products_no_stock CASCADE;
DROP VIEW IF EXISTS settings_isolation_status CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS search_products_all_branches(TEXT, UUID, INTEGER);
DROP FUNCTION IF EXISTS is_cross_branch_view_enabled(UUID, UUID);
DROP FUNCTION IF EXISTS get_cross_branch_variants(UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS get_cross_branch_products(UUID, BOOLEAN, UUID, TEXT, INTEGER, INTEGER);

-- Remove setting column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' 
        AND column_name = 'enable_cross_branch_product_view'
    ) THEN
        ALTER TABLE lats_pos_general_settings 
        DROP COLUMN enable_cross_branch_product_view;
        
        RAISE NOTICE '✅ Removed enable_cross_branch_product_view from settings';
    END IF;
END $$;

-- =====================================================
-- PART 2: Rollback Settings Branch Isolation
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '2️⃣ Removing branch_id from settings tables...';
    RAISE NOTICE '';
END $$;

-- Function to drop branch_id from a table
CREATE OR REPLACE FUNCTION drop_branch_id_from_table(table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Drop unique constraints containing branch_id
    EXECUTE format('
        DO $inner$
        DECLARE
            constraint_rec RECORD;
        BEGIN
            FOR constraint_rec IN
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE table_name = %L
                AND constraint_type = ''UNIQUE''
                AND constraint_name LIKE ''%%branch%%''
            LOOP
                EXECUTE format(''ALTER TABLE %I DROP CONSTRAINT IF EXISTS %%I'', %L, constraint_rec.constraint_name);
            END LOOP;
        END $inner$;
    ', table_name, table_name, table_name);
    
    -- Drop foreign key constraint
    EXECUTE format('
        ALTER TABLE %I DROP CONSTRAINT IF EXISTS fk_%s_branch
    ', table_name, REPLACE(table_name, 'lats_pos_', ''));
    
    -- Drop index
    EXECUTE format('
        DROP INDEX IF EXISTS idx_%s_branch_id
    ', REPLACE(table_name, 'lats_', ''));
    
    -- Drop column
    EXECUTE format('
        ALTER TABLE %I DROP COLUMN IF EXISTS branch_id
    ', table_name);
    
    RAISE NOTICE '  ✅ Removed branch_id from %', table_name;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '  ⚠️  Error removing branch_id from %: %', table_name, SQLERRM;
END;
$$;

-- Drop branch_id from all settings tables
SELECT drop_branch_id_from_table('lats_pos_general_settings');
SELECT drop_branch_id_from_table('lats_pos_receipt_settings');
SELECT drop_branch_id_from_table('lats_pos_advanced_settings');
SELECT drop_branch_id_from_table('lats_pos_dynamic_pricing_settings');
SELECT drop_branch_id_from_table('lats_pos_barcode_scanner_settings');
SELECT drop_branch_id_from_table('lats_pos_delivery_settings');
SELECT drop_branch_id_from_table('lats_pos_search_filter_settings');
SELECT drop_branch_id_from_table('lats_pos_user_permissions_settings');
SELECT drop_branch_id_from_table('lats_pos_loyalty_customer_settings');
SELECT drop_branch_id_from_table('lats_pos_analytics_reporting_settings');
SELECT drop_branch_id_from_table('lats_pos_notification_settings');
SELECT drop_branch_id_from_table('lats_pos_integrations_settings');
SELECT drop_branch_id_from_table('user_settings');
SELECT drop_branch_id_from_table('system_settings');
SELECT drop_branch_id_from_table('admin_settings');

-- Restore original unique constraints
DO $$
BEGIN
    -- Restore user_id unique constraint for general settings
    ALTER TABLE lats_pos_general_settings
    ADD CONSTRAINT lats_pos_general_settings_user_id_unique UNIQUE (user_id);
    
    RAISE NOTICE '  ✅ Restored user_id unique constraint for general_settings';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '  ℹ️  Constraint already exists';
    WHEN OTHERS THEN
        RAISE NOTICE '  ⚠️  Error restoring constraint: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Restore user_id unique constraint for receipt settings
    ALTER TABLE lats_pos_receipt_settings
    ADD CONSTRAINT lats_pos_receipt_settings_user_id_unique UNIQUE (user_id);
    
    RAISE NOTICE '  ✅ Restored user_id unique constraint for receipt_settings';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '  ℹ️  Constraint already exists';
    WHEN OTHERS THEN
        RAISE NOTICE '  ⚠️  Error restoring constraint: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Restore user_id/business_id unique constraint for advanced settings
    ALTER TABLE lats_pos_advanced_settings
    ADD CONSTRAINT lats_pos_advanced_settings_user_id_business_id_key UNIQUE (user_id, business_id);
    
    RAISE NOTICE '  ✅ Restored user_id/business_id unique constraint for advanced_settings';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '  ℹ️  Constraint already exists';
    WHEN OTHERS THEN
        RAISE NOTICE '  ⚠️  Error restoring constraint: %', SQLERRM;
END $$;

-- Drop the helper function
DROP FUNCTION IF EXISTS drop_branch_id_from_table(TEXT);

-- =====================================================
-- PART 3: Verification
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '3️⃣ Verifying rollback...';
    RAISE NOTICE '';
END $$;

-- Check if branch_id columns are removed
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.columns
    WHERE table_name LIKE '%settings%'
    AND column_name = 'branch_id'
    AND table_name IN (
        'lats_pos_general_settings',
        'lats_pos_receipt_settings',
        'lats_pos_advanced_settings',
        'user_settings',
        'system_settings',
        'admin_settings'
    );
    
    IF v_count = 0 THEN
        RAISE NOTICE '  ✅ All branch_id columns removed from settings tables';
    ELSE
        RAISE NOTICE '  ⚠️  % settings tables still have branch_id column', v_count;
    END IF;
END $$;

-- Check if views are removed
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
        'cross_branch_usage_examples',
        'settings_isolation_status'
    );
    
    IF v_count = 0 THEN
        RAISE NOTICE '  ✅ All cross-branch views removed';
    ELSE
        RAISE NOTICE '  ⚠️  % cross-branch views still exist', v_count;
    END IF;
END $$;

-- Check if functions are removed
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
        'get_cross_branch_products',
        'get_cross_branch_variants',
        'search_products_all_branches',
        'is_cross_branch_view_enabled'
    );
    
    IF v_count = 0 THEN
        RAISE NOTICE '  ✅ All cross-branch functions removed';
    ELSE
        RAISE NOTICE '  ⚠️  % cross-branch functions still exist', v_count;
    END IF;
END $$;

-- =====================================================
-- Success message
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '✅ Rollback Complete!';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What was removed:';
    RAISE NOTICE '  1. ✅ branch_id columns from settings tables';
    RAISE NOTICE '  2. ✅ Cross-branch product visibility views';
    RAISE NOTICE '  3. ✅ Cross-branch product visibility functions';
    RAISE NOTICE '  4. ✅ enable_cross_branch_product_view setting';
    RAISE NOTICE '  5. ✅ Foreign key constraints';
    RAISE NOTICE '  6. ✅ Indexes';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Your database is now back to its previous state.';
    RAISE NOTICE '';
END $$;

