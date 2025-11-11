-- ============================================
-- FIX: PARENT VARIANT PRICES NOT SYNCING
-- ============================================
-- Problem: When IMEI children are added to a parent variant,
-- the parent's cost_price and selling_price don't get updated.
-- This causes the UI to display stale/incorrect prices.
--
-- Solution: Update add_imei_to_parent_variant function to also
-- update parent prices when children are added.
-- ============================================

-- Drop and recreate the function with price syncing
DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION add_imei_to_parent_variant(
  parent_variant_id_param UUID,
  imei_param TEXT,
  serial_number_param TEXT DEFAULT NULL,
  mac_address_param TEXT DEFAULT NULL,
  cost_price_param NUMERIC DEFAULT 0,
  selling_price_param NUMERIC DEFAULT 0,
  condition_param TEXT DEFAULT 'new',
  branch_id_param UUID DEFAULT NULL,
  notes_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  child_variant_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_parent_variant RECORD;
  v_product_id UUID;
  v_new_sku TEXT;
  v_child_id UUID;
  v_timestamp TEXT;
  v_final_cost_price NUMERIC;
  v_final_selling_price NUMERIC;
BEGIN
  -- Get parent variant info
  SELECT * INTO v_parent_variant
  FROM lats_product_variants
  WHERE id = parent_variant_id_param;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Parent variant not found';
    RETURN;
  END IF;
  
  -- Check for duplicate IMEI
  IF EXISTS (
    SELECT 1 FROM lats_product_variants
    WHERE variant_attributes->>'imei' = imei_param
  ) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Device with IMEI ' || imei_param || ' already exists in inventory';
    RETURN;
  END IF;
  
  -- Get product ID
  v_product_id := v_parent_variant.product_id;
  
  -- Determine final prices (use param if provided, otherwise parent's price)
  v_final_cost_price := COALESCE(cost_price_param, v_parent_variant.cost_price, 0);
  v_final_selling_price := COALESCE(selling_price_param, v_parent_variant.selling_price, 0);
  
  -- Generate unique SKU for child IMEI variant
  v_timestamp := EXTRACT(EPOCH FROM NOW())::TEXT;
  v_new_sku := COALESCE(v_parent_variant.sku, 'VAR') || '-IMEI-' || SUBSTRING(imei_param, 1, 8) || '-' || SUBSTRING(v_timestamp, 1, 10);
  
  -- ✅ FIX: Update parent variant with new prices AND mark as parent
  UPDATE lats_product_variants
  SET 
    is_parent = TRUE,
    variant_type = 'parent',
    cost_price = CASE 
      -- If explicit prices provided, update parent
      WHEN cost_price_param > 0 THEN cost_price_param
      -- Otherwise keep existing
      ELSE COALESCE(cost_price, 0)
    END,
    selling_price = CASE 
      -- If explicit prices provided, update parent
      WHEN selling_price_param > 0 THEN selling_price_param
      -- Otherwise keep existing
      ELSE COALESCE(selling_price, 0)
    END,
    updated_at = NOW()
  WHERE id = parent_variant_id_param;
  
  -- Create child IMEI variant
  INSERT INTO lats_product_variants (
    product_id,
    parent_variant_id,
    name,
    variant_name,
    sku,
    cost_price,
    selling_price,
    quantity,
    is_active,
    is_parent,
    variant_type,
    variant_attributes,
    branch_id
  ) VALUES (
    v_product_id,
    parent_variant_id_param,
    'IMEI: ' || imei_param,
    'IMEI: ' || imei_param,
    v_new_sku,
    v_final_cost_price,
    v_final_selling_price,
    1, -- Each IMEI is quantity 1
    TRUE,
    FALSE,
    'imei_child',
    jsonb_build_object(
      'imei', imei_param,
      'serial_number', serial_number_param,
      'mac_address', mac_address_param,
      'condition', condition_param,
      'notes', notes_param,
      'source', 'purchase',
      'created_at', NOW()
    ),
    COALESCE(branch_id_param, v_parent_variant.branch_id)
  )
  RETURNING id INTO v_child_id;
  
  -- Create stock movement record
  INSERT INTO lats_stock_movements (
    product_id,
    variant_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    notes,
    branch_id,
    created_at
  ) VALUES (
    v_product_id,
    v_child_id,
    'STOCK_IN',
    1,
    'IMEI_ADDITION',
    parent_variant_id_param,
    'IMEI device added: ' || imei_param,
    COALESCE(branch_id_param, v_parent_variant.branch_id),
    NOW()
  );
  
  -- Parent quantity will be auto-updated by trigger
  
  RETURN QUERY SELECT TRUE, v_child_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Additional Fix: Sync existing parent prices from children
-- ============================================
-- For parent variants that already have children but wrong prices,
-- update the parent to use the average/latest child prices

DO $$
DECLARE
  parent_record RECORD;
  avg_cost NUMERIC;
  avg_selling NUMERIC;
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 Syncing prices for existing parent variants...';
  
  -- Loop through all parent variants
  FOR parent_record IN 
    SELECT id, variant_name, cost_price, selling_price
    FROM lats_product_variants
    WHERE (is_parent = TRUE OR variant_type = 'parent')
      AND EXISTS (
        SELECT 1 FROM lats_product_variants child
        WHERE child.parent_variant_id = lats_product_variants.id
          AND child.variant_type = 'imei_child'
      )
  LOOP
    -- Calculate average prices from children
    SELECT 
      AVG(cost_price) as avg_cost,
      AVG(selling_price) as avg_selling
    INTO avg_cost, avg_selling
    FROM lats_product_variants
    WHERE parent_variant_id = parent_record.id
      AND variant_type = 'imei_child'
      AND is_active = TRUE
      AND cost_price > 0; -- Only include valid prices
    
    -- Update parent if children have prices
    IF avg_cost > 0 OR avg_selling > 0 THEN
      UPDATE lats_product_variants
      SET 
        cost_price = COALESCE(avg_cost, cost_price, 0),
        selling_price = COALESCE(avg_selling, selling_price, 0),
        updated_at = NOW()
      WHERE id = parent_record.id
        AND (cost_price != COALESCE(avg_cost, cost_price) 
             OR selling_price != COALESCE(avg_selling, selling_price));
      
      IF FOUND THEN
        updated_count := updated_count + 1;
        RAISE NOTICE '  ✅ Updated % - Cost: % → %, Selling: % → %',
          parent_record.variant_name,
          parent_record.cost_price,
          COALESCE(avg_cost, parent_record.cost_price),
          parent_record.selling_price,
          COALESCE(avg_selling, parent_record.selling_price);
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Updated % parent variant prices', updated_count;
END $$;

-- ============================================
-- Verification Query
-- ============================================
-- Run this to see parent variants and their prices vs children

DO $$
DECLARE
  v_result TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 VERIFICATION: Parent vs Children Prices';
  RAISE NOTICE '================================================';
  
  FOR v_result IN
    SELECT 
      '🏷️  ' || p.name AS product_name,
      '   Parent: ' || parent.variant_name || 
      ' | Cost: TSh ' || COALESCE(parent.cost_price::TEXT, '0') || 
      ' | Selling: TSh ' || COALESCE(parent.selling_price::TEXT, '0') ||
      ' | Stock: ' || COALESCE(parent.quantity::TEXT, '0') AS parent_info,
      '   Avg Child Cost: TSh ' || COALESCE(ROUND(AVG(child.cost_price), 2)::TEXT, 'N/A') ||
      ' | Avg Selling: TSh ' || COALESCE(ROUND(AVG(child.selling_price), 2)::TEXT, 'N/A') ||
      ' | Children: ' || COUNT(child.id)::TEXT AS child_info
    FROM lats_product_variants parent
    JOIN lats_products p ON parent.product_id = p.id
    LEFT JOIN lats_product_variants child ON child.parent_variant_id = parent.id 
      AND child.variant_type = 'imei_child'
    WHERE (parent.is_parent = TRUE OR parent.variant_type = 'parent')
    GROUP BY p.name, parent.id, parent.variant_name, parent.cost_price, parent.selling_price, parent.quantity
    ORDER BY p.name, parent.variant_name
  LOOP
    RAISE NOTICE '%', v_result;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Price sync complete!';
END $$;

