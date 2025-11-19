-- ============================================================================
-- QUICK IMEI SETUP - Corrected for Your Schema
-- ============================================================================
-- Run this in your Supabase SQL Editor
-- This adds the required columns and creates the unique IMEI index
-- ============================================================================

-- 1. Add variant_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'variant_type'
    ) THEN
        ALTER TABLE lats_product_variants 
        ADD COLUMN variant_type TEXT DEFAULT 'standard';
        RAISE NOTICE '✅ Added variant_type column';
    ELSE
        RAISE NOTICE 'ℹ️  variant_type column already exists';
    END IF;
END $$;

-- 2. Add parent_variant_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'parent_variant_id'
    ) THEN
        ALTER TABLE lats_product_variants 
        ADD COLUMN parent_variant_id UUID REFERENCES lats_product_variants(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added parent_variant_id column';
    ELSE
        RAISE NOTICE 'ℹ️  parent_variant_id column already exists';
    END IF;
END $$;

-- 3. Ensure attributes JSONB column has proper default
ALTER TABLE lats_product_variants 
ALTER COLUMN attributes SET DEFAULT '{}'::jsonb;

-- 4. Create unique index for IMEIs (prevents duplicates)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'lats_product_variants'
          AND indexname = 'uniq_imei_index'
    ) THEN
        CREATE UNIQUE INDEX uniq_imei_index
        ON lats_product_variants ((attributes->>'imei'))
        WHERE (attributes->>'imei') IS NOT NULL;
        RAISE NOTICE '✅ Created unique IMEI index';
    ELSE
        RAISE NOTICE 'ℹ️  Unique IMEI index already exists';
    END IF;
END$$;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_variants_parent_id 
ON lats_product_variants(parent_variant_id) 
WHERE parent_variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_variants_type 
ON lats_product_variants(variant_type);

CREATE INDEX IF NOT EXISTS idx_variants_product_id 
ON lats_product_variants(product_id);

-- 6. Create parent-child quantity sync function
CREATE OR REPLACE FUNCTION sync_parent_quantity_on_imei_change()
RETURNS TRIGGER AS $$
DECLARE
  parent_id UUID;
  new_total INT;
BEGIN
  -- Determine the parent ID
  IF TG_OP = 'DELETE' THEN
    parent_id := OLD.parent_variant_id;
  ELSE
    parent_id := NEW.parent_variant_id;
  END IF;

  -- Only process if this is an IMEI variant with a parent
  IF parent_id IS NOT NULL AND (
    (TG_OP = 'DELETE' AND OLD.variant_type = 'imei') OR
    (TG_OP IN ('INSERT', 'UPDATE') AND NEW.variant_type = 'imei')
  ) THEN
    -- Calculate total quantity from all IMEI children
    SELECT COALESCE(SUM(quantity), 0)
    INTO new_total
    FROM lats_product_variants
    WHERE parent_variant_id = parent_id
    AND variant_type = 'imei';

    -- Update parent quantity
    UPDATE lats_product_variants
    SET 
      quantity = new_total,
      stock_quantity = new_total,
      updated_at = NOW()
    WHERE id = parent_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for automatic parent quantity sync
DROP TRIGGER IF EXISTS trigger_sync_parent_quantity ON lats_product_variants;
CREATE TRIGGER trigger_sync_parent_quantity
  AFTER INSERT OR UPDATE OR DELETE ON lats_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION sync_parent_quantity_on_imei_change();

-- 8. Validate IMEI format function
CREATE OR REPLACE FUNCTION validate_imei_format(imei_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN imei_value ~ '^\d{15}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9. Add IMEI to parent variant function
CREATE OR REPLACE FUNCTION add_imei_to_parent_variant(
  p_parent_variant_id UUID,
  p_imei TEXT,
  p_cost_price DECIMAL DEFAULT NULL,
  p_selling_price DECIMAL DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_imei_id UUID;
  v_parent_product_id UUID;
  v_parent_sku TEXT;
  v_duplicate_count INT;
BEGIN
  -- Validate IMEI format
  IF NOT validate_imei_format(p_imei) THEN
    RAISE EXCEPTION 'Invalid IMEI format. Must be exactly 15 digits. Provided: %', p_imei;
  END IF;

  -- Check for duplicate IMEI
  SELECT COUNT(*) INTO v_duplicate_count
  FROM lats_product_variants
  WHERE variant_type = 'imei' 
  AND (attributes->>'imei' = p_imei OR name = p_imei);

  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION 'IMEI % already exists in the system', p_imei;
  END IF;

  -- Get parent variant details
  SELECT product_id, sku
  INTO v_parent_product_id, v_parent_sku
  FROM lats_product_variants
  WHERE id = p_parent_variant_id;

  IF v_parent_product_id IS NULL THEN
    RAISE EXCEPTION 'Parent variant % not found', p_parent_variant_id;
  END IF;

  -- Create IMEI child variant
  INSERT INTO lats_product_variants (
    product_id,
    parent_variant_id,
    variant_type,
    name,
    sku,
    attributes,
    quantity,
    stock_quantity,
    cost_price,
    selling_price,
    status,
    is_active
  ) VALUES (
    v_parent_product_id,
    p_parent_variant_id,
    'imei',
    p_imei,
    v_parent_sku || '-IMEI-' || p_imei,
    jsonb_build_object(
      'imei', p_imei,
      'imei_status', 'available',
      'added_at', NOW()
    ),
    1, -- Each IMEI = 1 unit
    1,
    COALESCE(p_cost_price, 0),
    COALESCE(p_selling_price, 0),
    'active',
    true
  ) RETURNING id INTO v_new_imei_id;

  RAISE NOTICE 'IMEI % added successfully as child of variant %', p_imei, p_parent_variant_id;
  RETURN v_new_imei_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Mark IMEI as sold function
CREATE OR REPLACE FUNCTION mark_imei_as_sold(
  p_imei TEXT,
  p_sale_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_variant_id UUID;
BEGIN
  -- Find the IMEI variant
  SELECT id INTO v_variant_id
  FROM lats_product_variants
  WHERE variant_type = 'imei'
  AND (attributes->>'imei' = p_imei OR name = p_imei)
  AND attributes->>'imei_status' = 'available'
  LIMIT 1;

  IF v_variant_id IS NULL THEN
    RAISE EXCEPTION 'Available IMEI % not found', p_imei;
  END IF;

  -- Mark as sold
  UPDATE lats_product_variants
  SET 
    attributes = jsonb_set(
      jsonb_set(
        attributes,
        '{imei_status}',
        '"sold"'
      ),
      '{sold_at}',
      to_jsonb(NOW())
    ),
    quantity = 0,
    stock_quantity = 0,
    updated_at = NOW()
  WHERE id = v_variant_id;

  -- Add sale reference if provided
  IF p_sale_id IS NOT NULL THEN
    UPDATE lats_product_variants
    SET attributes = jsonb_set(attributes, '{sale_id}', to_jsonb(p_sale_id::TEXT))
    WHERE id = v_variant_id;
  END IF;

  RAISE NOTICE 'IMEI % marked as sold', p_imei;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 11. Get available IMEIs for POS
CREATE OR REPLACE FUNCTION get_available_imeis_for_pos(
  p_parent_variant_id UUID
)
RETURNS TABLE(
  imei_id UUID,
  imei TEXT,
  cost_price DECIMAL,
  selling_price DECIMAL,
  added_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id as imei_id,
    COALESCE(attributes->>'imei', name) as imei,
    lats_product_variants.cost_price,
    lats_product_variants.selling_price,
    (attributes->>'added_at')::TIMESTAMP as added_at
  FROM lats_product_variants
  WHERE parent_variant_id = p_parent_variant_id
  AND variant_type = 'imei'
  AND attributes->>'imei_status' = 'available'
  AND quantity > 0
  ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'IMEI SYSTEM SETUP COMPLETE ✅';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Columns added:';
  RAISE NOTICE '  ✅ variant_type';
  RAISE NOTICE '  ✅ parent_variant_id';
  RAISE NOTICE '';
  RAISE NOTICE 'Indexes created:';
  RAISE NOTICE '  ✅ Unique IMEI index (prevents duplicates)';
  RAISE NOTICE '  ✅ Parent-child relationship index';
  RAISE NOTICE '  ✅ Variant type index';
  RAISE NOTICE '  ✅ Product relationship index';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  ✅ validate_imei_format()';
  RAISE NOTICE '  ✅ add_imei_to_parent_variant()';
  RAISE NOTICE '  ✅ mark_imei_as_sold()';
  RAISE NOTICE '  ✅ get_available_imeis_for_pos()';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers created:';
  RAISE NOTICE '  ✅ Automatic parent quantity sync';
  RAISE NOTICE '';
  RAISE NOTICE 'Your IMEI system is now ready to use!';
  RAISE NOTICE 'Next: Run "node check-and-add-missing-columns.mjs" to verify';
  RAISE NOTICE '================================================================';
END $$;

