-- Drop all versions of IMEI functions before migration

-- Drop all versions of add_imei_to_parent_variant
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, NUMERIC, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_imei_to_parent_variant CASCADE;

-- Drop all versions of mark_imei_as_sold
DROP FUNCTION IF EXISTS mark_imei_as_sold(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_imei_as_sold(UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_imei_as_sold CASCADE;

-- Drop related functions
DROP FUNCTION IF EXISTS get_available_imeis_for_parent CASCADE;
DROP FUNCTION IF EXISTS get_variant_by_imei CASCADE;
DROP FUNCTION IF EXISTS imei_exists CASCADE;
DROP FUNCTION IF EXISTS update_parent_quantity_trigger CASCADE;

-- Drop old trigger
DROP TRIGGER IF EXISTS trg_update_parent_quantity ON lats_product_variants;

-- Drop old views
DROP VIEW IF EXISTS v_parent_variants_with_imei_count CASCADE;

-- Success
DO $$
BEGIN
    RAISE NOTICE '✅ Old IMEI functions and objects dropped successfully';
END $$;

