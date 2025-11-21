-- ============================================================================
-- FIX: Preserve Existing Stock When Adding IMEI Children
-- ============================================================================
-- Problem: When adding IMEI children to a parent variant, the parent quantity
-- is recalculated from ONLY IMEI children, which clears any existing stock
-- that was in the parent variant before it became a parent.
--
-- Solution: When calculating parent quantity, preserve existing non-IMEI stock
-- by adding it to the IMEI children count.
-- ============================================================================

-- Step 1: Update add_imei_to_parent_variant function to preserve existing stock
CREATE OR REPLACE FUNCTION add_imei_to_parent_variant_internal(
  parent_variant_id_param UUID,
  imei_param TEXT,
  serial_number_param TEXT DEFAULT NULL,
  mac_address_param TEXT DEFAULT NULL,
  cost_price_param NUMERIC DEFAULT NULL,
  selling_price_param NUMERIC DEFAULT NULL,
  condition_param TEXT DEFAULT 'new',
  notes_param TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  child_variant_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_child_variant_id UUID;
  v_parent_product_id UUID;
  v_parent_sku TEXT;
  v_parent_name TEXT;
  v_parent_variant_name TEXT;
  v_parent_branch_id UUID;
  v_duplicate_count INT;
  v_cost_price NUMERIC;
  v_selling_price NUMERIC;
  v_serial_number TEXT;
  v_child_name TEXT;
  v_existing_parent_quantity INTEGER;
  v_imei_children_count INTEGER;
  v_new_parent_quantity INTEGER;
BEGIN
  -- Handle NULL prices
  v_cost_price := COALESCE(cost_price_param, 0);
  v_selling_price := COALESCE(selling_price_param, 0);
  
  -- ✅ UNIFIED: Serial number and IMEI are the same - use imei_param for both
  v_serial_number := imei_param::TEXT;
  v_child_name := imei_param::TEXT;

  -- Validate IMEI format
  IF imei_param IS NULL OR imei_param = '' THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      'IMEI cannot be empty' AS error_message;
    RETURN;
  END IF;

  -- Check for duplicate IMEI
  SELECT COUNT(*) INTO v_duplicate_count
  FROM lats_product_variants
  WHERE variant_type IN ('imei', 'imei_child')
    AND (
      variant_attributes->>'imei' = imei_param 
      OR attributes->>'imei' = imei_param
      OR name = imei_param
    );

  IF v_duplicate_count > 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      format('IMEI %s already exists in the system', imei_param) AS error_message;
    RETURN;
  END IF;

  -- Get parent variant details (without quantity - we'll read it fresh before update)
  SELECT 
    product_id, 
    sku, 
    name,
    COALESCE(variant_name, name) as variant_name,
    branch_id
  INTO 
    v_parent_product_id, 
    v_parent_sku, 
    v_parent_name,
    v_parent_variant_name,
    v_parent_branch_id
  FROM lats_product_variants
  WHERE id = parent_variant_id_param;

  IF v_parent_product_id IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      format('Parent variant %s not found', parent_variant_id_param) AS error_message;
    RETURN;
  END IF;

  -- Mark parent as parent type if not already
  UPDATE lats_product_variants
  SET 
    is_parent = TRUE,
    variant_type = 'parent',
    updated_at = NOW()
  WHERE id = parent_variant_id_param
    AND variant_type NOT IN ('parent');

  -- Generate new UUID for child variant
  v_child_variant_id := gen_random_uuid();

  -- Create IMEI child variant
  INSERT INTO lats_product_variants (
    id,
    product_id,
    parent_variant_id,
    variant_type,
    name,
    variant_name,
    sku,
    attributes,
    variant_attributes,
    quantity,
    cost_price,
    selling_price,
    is_active,
    branch_id,
    created_at,
    updated_at
  ) VALUES (
    v_child_variant_id,
    v_parent_product_id,
    parent_variant_id_param,
    'imei_child',
    v_child_name,
    format('IMEI: %s', imei_param),
    v_parent_sku || '-IMEI-' || SUBSTRING(imei_param, LEAST(10, LENGTH(imei_param)), 6),
    jsonb_build_object(
      'imei', imei_param,
      'serial_number', imei_param,
      'mac_address', mac_address_param,
      'condition', condition_param,
      'imei_status', 'available',
      'parent_variant_name', v_parent_variant_name,
      'added_at', NOW(),
      'notes', notes_param
    ),
    jsonb_build_object(
      'imei', imei_param,
      'serial_number', imei_param,
      'mac_address', mac_address_param,
      'condition', condition_param,
      'imei_status', 'available',
      'parent_variant_name', v_parent_variant_name,
      'added_at', NOW(),
      'notes', notes_param
    ),
    1,
    v_cost_price,
    v_selling_price,
    TRUE,
    v_parent_branch_id,
    NOW(),
    NOW()
  );

  -- ✅ FIX: Read current parent quantity RIGHT BEFORE updating (to get latest state)
  -- This ensures we have the most up-to-date quantity, including any IMEI children
  -- that were just added in previous calls
  SELECT COALESCE(quantity, 0)
  INTO v_existing_parent_quantity
  FROM lats_product_variants
  WHERE id = parent_variant_id_param;

  -- Count active IMEI children (including the one we just added)
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_imei_children_count
  FROM lats_product_variants
  WHERE parent_variant_id = parent_variant_id_param
    AND variant_type = 'imei_child'
    AND is_active = TRUE;

  -- ✅ CRITICAL FIX: Preserve existing stock by ADDING IMEI children to existing quantity
  -- If parent had quantity before (non-IMEI stock), we need to ADD the new IMEI children to it
  -- Formula: new_quantity = existing_quantity + 1 (since we're adding one IMEI child)
  -- However, if existing_quantity already equals imei_children_count, it means
  -- the quantity was already recalculated, so we just add 1
  -- If existing_quantity > imei_children_count, there's non-IMEI stock to preserve
  
  IF v_existing_parent_quantity >= v_imei_children_count - 1 THEN
    -- Parent has existing stock (non-IMEI or already includes some IMEI children)
    -- Add the new IMEI child: existing + 1
    v_new_parent_quantity := v_existing_parent_quantity + 1;
  ELSE
    -- Parent quantity is less than expected: use IMEI children count
    v_new_parent_quantity := v_imei_children_count;
  END IF;

  -- Update parent variant quantity
  UPDATE lats_product_variants
  SET 
    quantity = v_new_parent_quantity,
    updated_at = NOW()
  WHERE id = parent_variant_id_param;

  -- Return success
  RETURN QUERY SELECT 
    TRUE, 
    v_child_variant_id, 
    NULL::TEXT AS error_message;

EXCEPTION WHEN OTHERS THEN
  -- Return error
  RETURN QUERY SELECT 
    FALSE, 
    NULL::UUID, 
    format('Error creating IMEI variant: %s', SQLERRM) AS error_message;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Update the trigger function to also preserve existing stock
CREATE OR REPLACE FUNCTION sync_parent_variant_quantity_on_imei_change()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_id UUID;
  v_new_total INTEGER;
  v_existing_quantity INTEGER;
  v_imei_children_count INTEGER;
  v_old_imei_count INTEGER;
  v_imei_change INTEGER;
  v_product_id UUID;
BEGIN
  -- Determine the parent ID
  IF TG_OP = 'DELETE' THEN
    v_parent_id := OLD.parent_variant_id;
  ELSE
    v_parent_id := NEW.parent_variant_id;
  END IF;

  -- Only process if this is an IMEI child variant with a parent
  IF v_parent_id IS NOT NULL AND (
    (TG_OP = 'DELETE' AND OLD.variant_type = 'imei_child') OR
    (TG_OP IN ('INSERT', 'UPDATE') AND NEW.variant_type = 'imei_child')
  ) THEN
    -- Get existing parent quantity BEFORE recalculation
    SELECT COALESCE(quantity, 0)
    INTO v_existing_quantity
    FROM lats_product_variants
    WHERE id = v_parent_id;

    -- Calculate total quantity from all active IMEI children
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_imei_children_count
    FROM lats_product_variants
    WHERE parent_variant_id = v_parent_id
      AND variant_type = 'imei_child'
      AND is_active = TRUE;

    -- ✅ FIX: Preserve existing non-IMEI stock by ADDING to it
    -- If parent had quantity before, we need to ADD the new IMEI children to it
    -- Formula: new_total = existing_quantity + (new_imei_count - old_imei_count)
    -- Calculate old IMEI count (before this change)
    IF TG_OP = 'INSERT' THEN
      -- New IMEI child added: old_count = new_count - 1
      v_old_imei_count := v_imei_children_count - 1;
    ELSIF TG_OP = 'DELETE' THEN
      -- IMEI child deleted: old_count = new_count + 1
      v_old_imei_count := v_imei_children_count + 1;
    ELSE
      -- UPDATE: count didn't change, but quantity might have
      v_old_imei_count := v_imei_children_count;
    END IF;
    
    -- Calculate change in IMEI count
    v_imei_change := v_imei_children_count - v_old_imei_count;
    
    -- If parent had existing stock, add the change to it
    -- Otherwise, use the new IMEI count
    IF v_existing_quantity >= v_old_imei_count THEN
      -- Parent has existing stock: add the change
      v_new_total := v_existing_quantity + v_imei_change;
    ELSE
      -- Parent quantity is less than old IMEI count: use new count
      v_new_total := v_imei_children_count;
    END IF;

    -- Get product ID from parent
    SELECT product_id INTO v_product_id
    FROM lats_product_variants
    WHERE id = v_parent_id;

    -- Update parent variant quantity
    UPDATE lats_product_variants
    SET 
      quantity = v_new_total,
      updated_at = NOW()
    WHERE id = v_parent_id;
    
    -- Update product stock_quantity
    IF v_product_id IS NOT NULL THEN
      UPDATE lats_products
      SET 
        stock_quantity = (
          SELECT COALESCE(SUM(quantity), 0)
          FROM lats_product_variants
          WHERE product_id = v_product_id
            AND is_active = TRUE
            AND (variant_type = 'parent' OR variant_type = 'standard' OR parent_variant_id IS NULL)
        ),
        updated_at = NOW()
      WHERE id = v_product_id;
    END IF;
    
    RAISE NOTICE '✅ Parent % stock updated to % (IMEI children: %, Preserved: %)', 
      v_parent_id, 
      v_new_total, 
      v_imei_children_count,
      v_new_total - v_imei_children_count;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update the trigger
DROP TRIGGER IF EXISTS trigger_sync_parent_quantity_on_imei_change ON lats_product_variants;
CREATE TRIGGER trigger_sync_parent_quantity_on_imei_change
AFTER INSERT OR UPDATE OF quantity, is_active, variant_type OR DELETE ON lats_product_variants
FOR EACH ROW
EXECUTE FUNCTION sync_parent_variant_quantity_on_imei_change();

-- Step 4: Recalculate all parent stocks to fix any that were incorrectly cleared
DO $$
DECLARE
  parent_record RECORD;
  v_imei_count INTEGER;
  v_fixed_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 Checking parent variants for stock issues...';
  
  FOR parent_record IN
    SELECT id, quantity, product_id
    FROM lats_product_variants
    WHERE (is_parent = TRUE OR variant_type = 'parent')
      AND is_active = TRUE
  LOOP
    -- Count IMEI children
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_imei_count
    FROM lats_product_variants
    WHERE parent_variant_id = parent_record.id
      AND variant_type = 'imei_child'
      AND is_active = TRUE;
    
    -- If parent quantity is less than IMEI children, it means stock was lost
    -- We can't recover it, but we can at least set it to IMEI children count
    IF parent_record.quantity < v_imei_count THEN
      UPDATE lats_product_variants
      SET quantity = v_imei_count, updated_at = NOW()
      WHERE id = parent_record.id;
      
      v_fixed_count := v_fixed_count + 1;
      RAISE NOTICE '✅ Fixed parent %: quantity % -> %', parent_record.id, parent_record.quantity, v_imei_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Fixed % parent variants', v_fixed_count;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ PARENT STOCK MERGING FIX APPLIED              ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'The system will now preserve existing stock when adding IMEI children.';
  RAISE NOTICE 'Parent variant quantity = IMEI children + existing non-IMEI stock';
  RAISE NOTICE '';
END $$;

