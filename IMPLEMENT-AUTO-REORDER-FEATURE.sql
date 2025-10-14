-- ============================================
-- IMPLEMENT AUTO REORDER FEATURE
-- Creates database functions and triggers for automatic purchase order creation
-- Date: October 13, 2025
-- ============================================

-- ============================================
-- 1. CREATE TABLE FOR AUTO-GENERATED POS (TRACKING)
-- ============================================
CREATE TABLE IF NOT EXISTS auto_reorder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  variant_id UUID NOT NULL,
  supplier_id UUID,
  triggered_quantity INTEGER NOT NULL,
  reorder_point INTEGER NOT NULL,
  suggested_quantity INTEGER NOT NULL,
  purchase_order_id UUID,
  po_created BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (product_id) REFERENCES lats_products(id),
  FOREIGN KEY (variant_id) REFERENCES lats_product_variants(id),
  FOREIGN KEY (purchase_order_id) REFERENCES lats_purchase_orders(id)
);

CREATE INDEX IF NOT EXISTS idx_auto_reorder_log_created ON auto_reorder_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_reorder_log_po ON auto_reorder_log(purchase_order_id);

GRANT ALL ON auto_reorder_log TO PUBLIC;

-- ============================================
-- 2. FUNCTION TO CHECK IF AUTO-REORDER IS ENABLED
-- ============================================
CREATE OR REPLACE FUNCTION is_auto_reorder_enabled()
RETURNS BOOLEAN AS $$
DECLARE
  v_enabled TEXT;
BEGIN
  SELECT setting_value INTO v_enabled
  FROM admin_settings
  WHERE category = 'inventory' 
    AND setting_key = 'auto_reorder_enabled'
    AND is_active = true;
  
  RETURN (v_enabled = 'true');
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_auto_reorder_enabled() TO PUBLIC;

-- ============================================
-- 3. FUNCTION TO CHECK IF AUTO-CREATE PO IS ENABLED
-- ============================================
CREATE OR REPLACE FUNCTION is_auto_create_po_enabled()
RETURNS BOOLEAN AS $$
DECLARE
  v_enabled TEXT;
BEGIN
  SELECT setting_value INTO v_enabled
  FROM admin_settings
  WHERE category = 'inventory' 
    AND setting_key = 'auto_create_po_at_reorder'
    AND is_active = true;
  
  RETURN (v_enabled = 'true');
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_auto_create_po_enabled() TO PUBLIC;

-- ============================================
-- 4. FUNCTION TO GET MINIMUM ORDER QUANTITY
-- ============================================
CREATE OR REPLACE FUNCTION get_minimum_order_quantity()
RETURNS INTEGER AS $$
DECLARE
  v_min_qty TEXT;
BEGIN
  SELECT setting_value INTO v_min_qty
  FROM admin_settings
  WHERE category = 'inventory' 
    AND setting_key = 'minimum_order_quantity'
    AND is_active = true;
  
  RETURN COALESCE(v_min_qty::INTEGER, 1);
EXCEPTION WHEN OTHERS THEN
  RETURN 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_minimum_order_quantity() TO PUBLIC;

-- ============================================
-- 5. FUNCTION TO CALCULATE SUGGESTED ORDER QUANTITY
-- ============================================
CREATE OR REPLACE FUNCTION calculate_suggested_order_quantity(
  p_current_quantity INTEGER,
  p_reorder_point INTEGER,
  p_maximum_stock_level INTEGER,
  p_safety_stock_level INTEGER,
  p_minimum_order_qty INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_suggested_qty INTEGER;
  v_max_stock INTEGER;
BEGIN
  -- Use maximum_stock_level from settings if not provided
  IF p_maximum_stock_level IS NULL OR p_maximum_stock_level = 0 THEN
    SELECT COALESCE(setting_value::INTEGER, 1000) INTO v_max_stock
    FROM admin_settings
    WHERE category = 'inventory' AND setting_key = 'maximum_stock_level';
  ELSE
    v_max_stock := p_maximum_stock_level;
  END IF;
  
  -- Calculate: (Max Stock - Current Stock) + Safety Stock
  v_suggested_qty := (v_max_stock - p_current_quantity) + COALESCE(p_safety_stock_level, 0);
  
  -- Ensure it meets minimum order quantity
  IF v_suggested_qty < p_minimum_order_qty THEN
    v_suggested_qty := p_minimum_order_qty;
  END IF;
  
  -- Ensure it doesn't exceed reasonable limits
  IF v_suggested_qty > v_max_stock * 2 THEN
    v_suggested_qty := v_max_stock;
  END IF;
  
  RETURN v_suggested_qty;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

GRANT EXECUTE ON FUNCTION calculate_suggested_order_quantity(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) TO PUBLIC;

-- ============================================
-- 6. MAIN FUNCTION TO AUTO-CREATE PURCHASE ORDER
-- ============================================
CREATE OR REPLACE FUNCTION auto_create_purchase_order_for_low_stock(
  p_variant_id UUID,
  p_product_id UUID,
  p_current_quantity INTEGER,
  p_reorder_point INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_po_id UUID;
  v_po_number TEXT;
  v_supplier_id UUID;
  v_suggested_qty INTEGER;
  v_min_order_qty INTEGER;
  v_unit_cost NUMERIC(10,2);
  v_total_amount NUMERIC(10,2);
  v_product_name TEXT;
  v_safety_stock INTEGER;
  v_max_stock INTEGER;
BEGIN
  -- Check if auto-create PO is enabled
  IF NOT is_auto_create_po_enabled() THEN
    RAISE NOTICE '⚠️  Auto-create PO is disabled in settings';
    RETURN NULL;
  END IF;
  
  -- Get minimum order quantity from settings
  v_min_order_qty := get_minimum_order_quantity();
  
  -- Get product details
  SELECT name INTO v_product_name FROM lats_products WHERE id = p_product_id;
  
  -- Get safety stock and max stock from settings
  SELECT COALESCE(setting_value::INTEGER, 5) INTO v_safety_stock
  FROM admin_settings
  WHERE category = 'inventory' AND setting_key = 'safety_stock_level';
  
  SELECT COALESCE(setting_value::INTEGER, 1000) INTO v_max_stock
  FROM admin_settings
  WHERE category = 'inventory' AND setting_key = 'maximum_stock_level';
  
  -- Calculate suggested order quantity
  v_suggested_qty := calculate_suggested_order_quantity(
    p_current_quantity,
    p_reorder_point,
    v_max_stock,
    v_safety_stock,
    v_min_order_qty
  );
  
  -- Get preferred supplier for this product
  SELECT ps.supplier_id, ps.cost_price 
  INTO v_supplier_id, v_unit_cost
  FROM lats_product_suppliers ps
  WHERE ps.product_id = p_product_id 
    AND ps.is_preferred = true
  LIMIT 1;
  
  -- If no preferred supplier, get any supplier
  IF v_supplier_id IS NULL THEN
    SELECT ps.supplier_id, ps.cost_price 
    INTO v_supplier_id, v_unit_cost
    FROM lats_product_suppliers ps
    WHERE ps.product_id = p_product_id
    LIMIT 1;
  END IF;
  
  -- If still no supplier, get the first active supplier
  IF v_supplier_id IS NULL THEN
    SELECT id INTO v_supplier_id
    FROM lats_suppliers
    WHERE is_active = true
    LIMIT 1;
  END IF;
  
  -- If no supplier found, log and exit
  IF v_supplier_id IS NULL THEN
    INSERT INTO auto_reorder_log (
      product_id, variant_id, triggered_quantity, reorder_point,
      suggested_quantity, po_created, error_message
    ) VALUES (
      p_product_id, p_variant_id, p_current_quantity, p_reorder_point,
      v_suggested_qty, false, 'No supplier found for product'
    );
    
    RAISE NOTICE '❌ No supplier found for product %', v_product_name;
    RETURN NULL;
  END IF;
  
  -- Use variant cost price if available
  IF v_unit_cost IS NULL OR v_unit_cost = 0 THEN
    SELECT cost_price INTO v_unit_cost
    FROM lats_product_variants
    WHERE id = p_variant_id;
  END IF;
  
  -- Default to 1000 if still no cost
  v_unit_cost := COALESCE(v_unit_cost, 1000);
  
  -- Calculate total amount
  v_total_amount := v_suggested_qty * v_unit_cost;
  
  -- Generate PO number
  v_po_number := 'PO-AUTO-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || substring(p_variant_id::TEXT, 1, 8);
  
  -- Create purchase order
  INSERT INTO lats_purchase_orders (
    po_number,
    supplier_id,
    status,
    total_amount,
    notes,
    order_date,
    created_at
  ) VALUES (
    v_po_number,
    v_supplier_id,
    'draft', -- Auto-generated POs start as draft for review
    v_total_amount,
    'Auto-generated purchase order for ' || v_product_name || ' - Stock fell below reorder point',
    NOW(),
    NOW()
  ) RETURNING id INTO v_po_id;
  
  -- Create purchase order item
  INSERT INTO lats_purchase_order_items (
    purchase_order_id,
    product_id,
    variant_id,
    quantity_ordered,
    quantity_received,
    unit_cost,
    subtotal
  ) VALUES (
    v_po_id,
    p_product_id,
    p_variant_id,
    v_suggested_qty,
    0,
    v_unit_cost,
    v_total_amount
  );
  
  -- Log the auto-reorder
  INSERT INTO auto_reorder_log (
    product_id,
    variant_id,
    supplier_id,
    triggered_quantity,
    reorder_point,
    suggested_quantity,
    purchase_order_id,
    po_created
  ) VALUES (
    p_product_id,
    p_variant_id,
    v_supplier_id,
    p_current_quantity,
    p_reorder_point,
    v_suggested_qty,
    v_po_id,
    true
  );
  
  RAISE NOTICE '✅ Auto-created PO % for product % (Qty: %)', v_po_number, v_product_name, v_suggested_qty;
  
  RETURN v_po_id;
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error
  INSERT INTO auto_reorder_log (
    product_id, variant_id, triggered_quantity, reorder_point,
    suggested_quantity, po_created, error_message
  ) VALUES (
    p_product_id, p_variant_id, p_current_quantity, p_reorder_point,
    v_suggested_qty, false, SQLERRM
  );
  
  RAISE NOTICE '❌ Error auto-creating PO: %', SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION auto_create_purchase_order_for_low_stock(UUID, UUID, INTEGER, INTEGER) TO PUBLIC;

-- ============================================
-- 7. TRIGGER FUNCTION TO CHECK STOCK AND AUTO-REORDER
-- ============================================
CREATE OR REPLACE FUNCTION trigger_auto_reorder_check()
RETURNS TRIGGER AS $$
DECLARE
  v_po_id UUID;
  v_recent_po UUID;
  v_product_name TEXT;
BEGIN
  -- Only proceed if:
  -- 1. Auto-reorder is enabled
  -- 2. Stock decreased (not increased)
  -- 3. New quantity is at or below reorder point
  -- 4. Reorder point is set (> 0)
  
  IF NOT is_auto_reorder_enabled() THEN
    RETURN NEW;
  END IF;
  
  -- Check if this is a stock decrease below reorder point
  IF NEW.quantity <= NEW.reorder_point 
     AND NEW.reorder_point > 0
     AND (OLD.quantity IS NULL OR OLD.quantity > NEW.reorder_point) THEN
    
    -- Check if we already created a PO recently (within last hour) for this variant
    SELECT purchase_order_id INTO v_recent_po
    FROM auto_reorder_log
    WHERE variant_id = NEW.id
      AND po_created = true
      AND created_at > NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Only create PO if none created recently
    IF v_recent_po IS NULL THEN
      SELECT name INTO v_product_name FROM lats_products WHERE id = NEW.product_id;
      
      RAISE NOTICE '🔔 Stock Alert: % dropped to % (reorder point: %)', 
        v_product_name, NEW.quantity, NEW.reorder_point;
      
      -- Create purchase order
      v_po_id := auto_create_purchase_order_for_low_stock(
        NEW.id,
        NEW.product_id,
        NEW.quantity,
        NEW.reorder_point
      );
      
      IF v_po_id IS NOT NULL THEN
        RAISE NOTICE '✅ Auto-generated purchase order: %', v_po_id;
      END IF;
    ELSE
      RAISE NOTICE 'ℹ️  Skipping auto-reorder - PO already created recently for this variant';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION trigger_auto_reorder_check() TO PUBLIC;

-- ============================================
-- 8. CREATE TRIGGER ON PRODUCT VARIANTS
-- ============================================
DROP TRIGGER IF EXISTS trigger_auto_reorder ON lats_product_variants;

CREATE TRIGGER trigger_auto_reorder
  AFTER UPDATE OF quantity
  ON lats_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_reorder_check();

-- ============================================
-- 9. FUNCTION TO MANUALLY TRIGGER AUTO-REORDER CHECK
-- ============================================
CREATE OR REPLACE FUNCTION check_all_products_for_reorder()
RETURNS TABLE (
  product_name TEXT,
  variant_id UUID,
  current_qty INTEGER,
  reorder_point INTEGER,
  po_created BOOLEAN,
  po_id UUID,
  error TEXT
) AS $$
DECLARE
  v_variant RECORD;
  v_po_id UUID;
  v_recent_po UUID;
BEGIN
  -- Only proceed if auto-reorder is enabled
  IF NOT is_auto_reorder_enabled() THEN
    RAISE NOTICE '⚠️  Auto-reorder is disabled in settings';
    RETURN;
  END IF;
  
  RAISE NOTICE '🔍 Checking all products for reorder...';
  
  -- Loop through all variants below reorder point
  FOR v_variant IN 
    SELECT 
      p.name as product_name,
      pv.id as variant_id,
      pv.quantity,
      pv.reorder_point,
      p.id as product_id
    FROM lats_product_variants pv
    JOIN lats_products p ON p.id = pv.product_id
    WHERE pv.reorder_point > 0
      AND pv.quantity <= pv.reorder_point
      AND p.is_active = true
  LOOP
    -- Check if we already created a PO recently
    SELECT purchase_order_id INTO v_recent_po
    FROM auto_reorder_log
    WHERE variant_id = v_variant.variant_id
      AND po_created = true
      AND created_at > NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_recent_po IS NOT NULL THEN
      -- Already has recent PO
      product_name := v_variant.product_name;
      variant_id := v_variant.variant_id;
      current_qty := v_variant.quantity;
      reorder_point := v_variant.reorder_point;
      po_created := true;
      po_id := v_recent_po;
      error := 'PO already created recently';
      RETURN NEXT;
    ELSE
      -- Create new PO
      BEGIN
        v_po_id := auto_create_purchase_order_for_low_stock(
          v_variant.variant_id,
          v_variant.product_id,
          v_variant.quantity,
          v_variant.reorder_point
        );
        
        product_name := v_variant.product_name;
        variant_id := v_variant.variant_id;
        current_qty := v_variant.quantity;
        reorder_point := v_variant.reorder_point;
        po_created := (v_po_id IS NOT NULL);
        po_id := v_po_id;
        error := CASE WHEN v_po_id IS NULL THEN 'Failed to create PO' ELSE NULL END;
        RETURN NEXT;
      EXCEPTION WHEN OTHERS THEN
        product_name := v_variant.product_name;
        variant_id := v_variant.variant_id;
        current_qty := v_variant.quantity;
        reorder_point := v_variant.reorder_point;
        po_created := false;
        po_id := NULL;
        error := SQLERRM;
        RETURN NEXT;
      END;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Reorder check complete';
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_all_products_for_reorder() TO PUBLIC;

-- ============================================
-- 10. CREATE VIEW FOR AUTO-REORDER MONITORING
-- ============================================
CREATE OR REPLACE VIEW auto_reorder_status AS
SELECT 
  p.name as product_name,
  pv.sku,
  pv.quantity as current_stock,
  pv.reorder_point,
  pv.quantity - pv.reorder_point as stock_buffer,
  CASE 
    WHEN pv.quantity <= 0 THEN 'OUT_OF_STOCK'
    WHEN pv.quantity <= pv.reorder_point THEN 'BELOW_REORDER_POINT'
    WHEN pv.quantity <= pv.reorder_point * 1.5 THEN 'LOW_STOCK_WARNING'
    ELSE 'OK'
  END as stock_status,
  arl.purchase_order_id as latest_auto_po_id,
  arl.created_at as latest_auto_po_date,
  po.status as latest_po_status,
  s.name as supplier_name
FROM lats_product_variants pv
JOIN lats_products p ON p.id = pv.product_id
LEFT JOIN LATERAL (
  SELECT * FROM auto_reorder_log
  WHERE variant_id = pv.id
  ORDER BY created_at DESC
  LIMIT 1
) arl ON true
LEFT JOIN lats_purchase_orders po ON po.id = arl.purchase_order_id
LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
WHERE pv.reorder_point > 0
  AND p.is_active = true
ORDER BY 
  CASE 
    WHEN pv.quantity <= 0 THEN 1
    WHEN pv.quantity <= pv.reorder_point THEN 2
    WHEN pv.quantity <= pv.reorder_point * 1.5 THEN 3
    ELSE 4
  END,
  p.name;

GRANT SELECT ON auto_reorder_status TO PUBLIC;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✅ AUTO-REORDER FEATURE IMPLEMENTED!';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 What was created:';
  RAISE NOTICE '  1. auto_reorder_log table - tracks all auto-generated POs';
  RAISE NOTICE '  2. Helper functions to check settings';
  RAISE NOTICE '  3. auto_create_purchase_order_for_low_stock() function';
  RAISE NOTICE '  4. trigger_auto_reorder trigger on stock changes';
  RAISE NOTICE '  5. check_all_products_for_reorder() manual check function';
  RAISE NOTICE '  6. auto_reorder_status view for monitoring';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 How it works:';
  RAISE NOTICE '  • When stock quantity drops to/below reorder_point';
  RAISE NOTICE '  • IF auto_reorder_enabled = true AND auto_create_po_at_reorder = true';
  RAISE NOTICE '  • THEN automatically create a draft purchase order';
  RAISE NOTICE '  • PO includes calculated reorder quantity to max stock level';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Usage:';
  RAISE NOTICE '  • Enable in Admin Settings → Inventory → Auto Reorder';
  RAISE NOTICE '  • Set reorder_point on product variants';
  RAISE NOTICE '  • Manual check: SELECT * FROM check_all_products_for_reorder();';
  RAISE NOTICE '  • Monitor: SELECT * FROM auto_reorder_status;';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
END $$;

