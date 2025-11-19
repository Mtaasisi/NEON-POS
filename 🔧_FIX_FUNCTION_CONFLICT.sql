-- ============================================================================
-- FIX: Function Name Conflicts
-- ============================================================================
-- This fixes the "function name is not unique" error
-- Run this BEFORE running COMPLETE_IMEI_SYSTEM_FIX.sql
-- ============================================================================

-- Drop all versions of mark_imei_as_sold function (with different signatures)
DROP FUNCTION IF EXISTS mark_imei_as_sold(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_imei_as_sold(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS mark_imei_as_sold(UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_imei_as_sold(TEXT) CASCADE;

-- Drop all versions of add_imei_to_parent_variant (with different signatures)
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant CASCADE;

-- Drop all versions of get_available_imeis_for_pos (with different signatures)
DROP FUNCTION IF EXISTS get_available_imeis_for_pos(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_available_imeis_for_pos CASCADE;

-- Drop all other potentially conflicting functions
DROP FUNCTION IF EXISTS get_child_imeis(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_child_imeis CASCADE;
DROP FUNCTION IF EXISTS get_parent_variants(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_parent_variants CASCADE;
DROP FUNCTION IF EXISTS calculate_parent_variant_stock(UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_parent_variant_stock CASCADE;
DROP FUNCTION IF EXISTS update_parent_stock_from_children() CASCADE;
DROP FUNCTION IF EXISTS update_parent_stock_from_children CASCADE;
DROP FUNCTION IF EXISTS update_parent_variant_stock() CASCADE;
DROP FUNCTION IF EXISTS update_parent_variant_stock CASCADE;
DROP FUNCTION IF EXISTS recalculate_all_parent_stocks() CASCADE;
DROP FUNCTION IF EXISTS recalculate_all_parent_stocks CASCADE;

-- Drop any old triggers
DROP TRIGGER IF EXISTS trigger_update_parent_stock ON lats_product_variants CASCADE;
DROP TRIGGER IF EXISTS trigger_sync_parent_quantity ON lats_product_variants CASCADE;
DROP TRIGGER IF EXISTS enforce_unique_imei ON lats_product_variants CASCADE;

-- Drop old views
DROP VIEW IF EXISTS v_parent_child_variants CASCADE;

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE '✅ All conflicting functions, triggers, and views dropped successfully';
  RAISE NOTICE 'ℹ️  Now run: COMPLETE_IMEI_SYSTEM_FIX.sql';
END $$;

