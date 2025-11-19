-- ============================================
-- QUALITY CHECK SYSTEM TABLES
-- ============================================
-- This migration creates all tables needed for the comprehensive quality check system

-- 1. Quality Check Templates Table
-- Stores reusable quality check templates
CREATE TABLE IF NOT EXISTS quality_check_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'electronics', 'food', 'textiles', 'hardware', 'other')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Quality Check Criteria Table
-- Stores individual check criteria for each template
CREATE TABLE IF NOT EXISTS quality_check_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL REFERENCES quality_check_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Purchase Order Quality Checks Table
-- Stores the main quality check records for purchase orders
CREATE TABLE IF NOT EXISTS purchase_order_quality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES quality_check_templates(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'passed', 'failed', 'partial')),
  overall_result TEXT CHECK (overall_result IN ('pass', 'fail', 'conditional')),
  checked_by UUID REFERENCES auth.users(id),
  checked_at TIMESTAMPTZ,
  notes TEXT,
  signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Purchase Order Quality Check Items Table
-- Stores individual check results for each item and criteria
CREATE TABLE IF NOT EXISTS purchase_order_quality_check_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quality_check_id UUID NOT NULL REFERENCES purchase_order_quality_checks(id) ON DELETE CASCADE,
  purchase_order_item_id UUID NOT NULL REFERENCES lats_purchase_order_items(id) ON DELETE CASCADE,
  criteria_id UUID REFERENCES quality_check_criteria(id) ON DELETE SET NULL,
  criteria_name TEXT NOT NULL,
  result TEXT CHECK (result IN ('pass', 'fail', 'na')),
  quantity_checked INTEGER DEFAULT 0,
  quantity_passed INTEGER DEFAULT 0,
  quantity_failed INTEGER DEFAULT 0,
  defect_type TEXT CHECK (defect_type IN ('physical_damage', 'functional_issue', 'missing_parts', 'cosmetic_defect', 'other')),
  defect_description TEXT,
  action_taken TEXT CHECK (action_taken IN ('accept', 'reject', 'return', 'replace', 'repair')),
  notes TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quality_check_criteria_template 
  ON quality_check_criteria(template_id);

CREATE INDEX IF NOT EXISTS idx_po_quality_checks_po 
  ON purchase_order_quality_checks(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_po_quality_checks_status 
  ON purchase_order_quality_checks(status);

CREATE INDEX IF NOT EXISTS idx_po_quality_check_items_qc 
  ON purchase_order_quality_check_items(quality_check_id);

CREATE INDEX IF NOT EXISTS idx_po_quality_check_items_po_item 
  ON purchase_order_quality_check_items(purchase_order_item_id);

-- ============================================
-- DATABASE FUNCTIONS
-- ============================================

-- Function to create quality check from template
CREATE OR REPLACE FUNCTION create_quality_check_from_template(
  p_purchase_order_id UUID,
  p_template_id TEXT,
  p_checked_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_quality_check_id UUID;
  v_criterion RECORD;
  v_po_item RECORD;
BEGIN
  -- Create the main quality check record
  INSERT INTO purchase_order_quality_checks (
    purchase_order_id,
    template_id,
    checked_by,
    status
  ) VALUES (
    p_purchase_order_id,
    p_template_id,
    p_checked_by,
    'in_progress'
  )
  RETURNING id INTO v_quality_check_id;

  -- Create quality check items for each criteria and each PO item
  FOR v_criterion IN 
    SELECT * FROM quality_check_criteria 
    WHERE template_id = p_template_id 
    ORDER BY sort_order
  LOOP
    FOR v_po_item IN 
      SELECT * FROM lats_purchase_order_items 
      WHERE purchase_order_id = p_purchase_order_id
    LOOP
      INSERT INTO purchase_order_quality_check_items (
        quality_check_id,
        purchase_order_item_id,
        criteria_id,
        criteria_name
      ) VALUES (
        v_quality_check_id,
        v_po_item.id,
        v_criterion.id,
        v_criterion.name
      );
    END LOOP;
  END LOOP;

  RETURN v_quality_check_id;
END;
$$;

-- Function to complete quality check
CREATE OR REPLACE FUNCTION complete_quality_check(
  p_quality_check_id UUID,
  p_notes TEXT DEFAULT NULL,
  p_signature TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_items INTEGER;
  v_passed_items INTEGER;
  v_failed_items INTEGER;
  v_overall_result TEXT;
BEGIN
  -- Count items by result
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE result = 'pass'),
    COUNT(*) FILTER (WHERE result = 'fail')
  INTO v_total_items, v_passed_items, v_failed_items
  FROM purchase_order_quality_check_items
  WHERE quality_check_id = p_quality_check_id;

  -- Determine overall result
  IF v_failed_items = 0 THEN
    v_overall_result := 'pass';
  ELSIF v_passed_items = 0 THEN
    v_overall_result := 'fail';
  ELSE
    v_overall_result := 'conditional';
  END IF;

  -- Update quality check
  UPDATE purchase_order_quality_checks
  SET 
    status = CASE 
      WHEN v_overall_result = 'fail' THEN 'failed'
      ELSE 'passed'
    END,
    overall_result = v_overall_result,
    checked_at = NOW(),
    notes = COALESCE(p_notes, notes),
    signature = COALESCE(p_signature, signature),
    updated_at = NOW()
  WHERE id = p_quality_check_id;

  RETURN jsonb_build_object(
    'success', true,
    'overall_result', v_overall_result,
    'total_items', v_total_items,
    'passed_items', v_passed_items,
    'failed_items', v_failed_items
  );
END;
$$;

-- Function to get quality check summary
CREATE OR REPLACE FUNCTION get_quality_check_summary(
  p_purchase_order_id UUID
)
RETURNS TABLE (
  quality_check_id UUID,
  status TEXT,
  overall_result TEXT,
  checked_by UUID,
  checked_at TIMESTAMPTZ,
  total_items BIGINT,
  passed_items BIGINT,
  failed_items BIGINT,
  pending_items BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qc.id,
    qc.status,
    qc.overall_result,
    qc.checked_by,
    qc.checked_at,
    COUNT(qci.id) as total_items,
    COUNT(qci.id) FILTER (WHERE qci.result = 'pass') as passed_items,
    COUNT(qci.id) FILTER (WHERE qci.result = 'fail') as failed_items,
    COUNT(qci.id) FILTER (WHERE qci.result IS NULL) as pending_items
  FROM purchase_order_quality_checks qc
  LEFT JOIN purchase_order_quality_check_items qci ON qci.quality_check_id = qc.id
  WHERE qc.purchase_order_id = p_purchase_order_id
  GROUP BY qc.id, qc.status, qc.overall_result, qc.checked_by, qc.checked_at
  ORDER BY qc.created_at DESC
  LIMIT 1;
END;
$$;

-- Function to receive quality-checked items to inventory
CREATE OR REPLACE FUNCTION receive_quality_checked_items(
  p_quality_check_id UUID,
  p_purchase_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_item RECORD;
  v_received_count INTEGER := 0;
BEGIN
  -- Update items that passed quality check
  FOR v_item IN 
    SELECT 
      qci.purchase_order_item_id,
      qci.quantity_passed
    FROM purchase_order_quality_check_items qci
    WHERE qci.quality_check_id = p_quality_check_id
      AND qci.result = 'pass'
      AND qci.quantity_passed > 0
  LOOP
    -- Update the PO item received quantity
    UPDATE lats_purchase_order_items
    SET 
      received_quantity = COALESCE(received_quantity, 0) + v_item.quantity_passed,
      updated_at = NOW()
    WHERE id = v_item.purchase_order_item_id;
    
    v_received_count := v_received_count + 1;
  END LOOP;

  -- Check if all items are now received and update PO status
  PERFORM 1 FROM lats_purchase_order_items poi
  WHERE poi.purchase_order_id = p_purchase_order_id
    AND COALESCE(poi.received_quantity, 0) < poi.quantity;
  
  IF NOT FOUND THEN
    -- All items received
    UPDATE lats_purchase_orders
    SET 
      status = 'received',
      updated_at = NOW()
    WHERE id = p_purchase_order_id;
  ELSE
    -- Partially received
    UPDATE lats_purchase_orders
    SET 
      status = 'partially_received',
      updated_at = NOW()
    WHERE id = p_purchase_order_id
      AND status != 'partially_received';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Successfully received %s items to inventory', v_received_count),
    'items_received', v_received_count
  );
END;
$$;

-- Function to add quality items to inventory with pricing
CREATE OR REPLACE FUNCTION add_quality_items_to_inventory_v2(
  p_quality_check_id UUID,
  p_purchase_order_id UUID,
  p_user_id UUID,
  p_profit_margin_percentage DECIMAL DEFAULT 30,
  p_default_location TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_item RECORD;
  v_added_count INTEGER := 0;
  v_selling_price DECIMAL;
BEGIN
  -- Process each passed item
  FOR v_item IN 
    SELECT 
      qci.purchase_order_item_id,
      qci.quantity_passed,
      poi.product_id,
      poi.variant_id,
      poi.unit_price
    FROM purchase_order_quality_check_items qci
    JOIN lats_purchase_order_items poi ON poi.id = qci.purchase_order_item_id
    WHERE qci.quality_check_id = p_quality_check_id
      AND qci.result = 'pass'
      AND qci.quantity_passed > 0
  LOOP
    -- Calculate selling price
    v_selling_price := v_item.unit_price * (1 + (p_profit_margin_percentage / 100));
    
    -- Update product/variant with new prices
    IF v_item.variant_id IS NOT NULL THEN
      UPDATE lats_product_variants
      SET 
        cost_price = v_item.unit_price,
        selling_price = v_selling_price,
        updated_at = NOW()
      WHERE id = v_item.variant_id;
    ELSE
      UPDATE lats_products
      SET 
        cost_price = v_item.unit_price,
        selling_price = v_selling_price,
        updated_at = NOW()
      WHERE id = v_item.product_id;
    END IF;
    
    -- Update received quantity
    UPDATE lats_purchase_order_items
    SET 
      received_quantity = COALESCE(received_quantity, 0) + v_item.quantity_passed,
      updated_at = NOW()
    WHERE id = v_item.purchase_order_item_id;
    
    v_added_count := v_added_count + 1;
  END LOOP;

  -- Update PO status
  PERFORM 1 FROM lats_purchase_order_items poi
  WHERE poi.purchase_order_id = p_purchase_order_id
    AND COALESCE(poi.received_quantity, 0) < poi.quantity;
  
  IF NOT FOUND THEN
    UPDATE lats_purchase_orders SET status = 'received', updated_at = NOW()
    WHERE id = p_purchase_order_id;
  ELSE
    UPDATE lats_purchase_orders SET status = 'partially_received', updated_at = NOW()
    WHERE id = p_purchase_order_id AND status != 'partially_received';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Successfully added %s items to inventory', v_added_count),
    'items_added', v_added_count
  );
END;
$$;

-- ============================================
-- SEED DATA: Default Templates
-- ============================================

-- General Template
INSERT INTO quality_check_templates (id, name, description, category, is_active)
VALUES ('fallback-general', 'General Quality Check', 'Basic quality check for all items', 'general', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Add criteria for general template
INSERT INTO quality_check_criteria (template_id, name, description, is_required, sort_order)
VALUES 
  ('fallback-general', 'Physical Condition', 'Check for physical damage or defects', true, 1),
  ('fallback-general', 'Completeness', 'Verify all parts and accessories are included', true, 2),
  ('fallback-general', 'Packaging', 'Check packaging condition', false, 3),
  ('fallback-general', 'Documentation', 'Verify documentation and labels', false, 4)
ON CONFLICT DO NOTHING;

-- Electronics Template
INSERT INTO quality_check_templates (id, name, description, category, is_active)
VALUES ('electronics-check', 'Electronics Quality Check', 'Comprehensive check for electronic items', 'electronics', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Add criteria for electronics template
INSERT INTO quality_check_criteria (template_id, name, description, is_required, sort_order)
VALUES 
  ('electronics-check', 'Physical Condition', 'Check for physical damage', true, 1),
  ('electronics-check', 'Power Test', 'Test if device powers on', true, 2),
  ('electronics-check', 'Functionality Test', 'Test all major functions', true, 3),
  ('electronics-check', 'Accessories', 'Verify all accessories included', true, 4),
  ('electronics-check', 'Serial Numbers', 'Verify serial numbers match', false, 5),
  ('electronics-check', 'Warranty Documentation', 'Check warranty documents', false, 6)
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON quality_check_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON quality_check_criteria TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON purchase_order_quality_checks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON purchase_order_quality_check_items TO authenticated;

GRANT EXECUTE ON FUNCTION create_quality_check_from_template TO authenticated;
GRANT EXECUTE ON FUNCTION complete_quality_check TO authenticated;
GRANT EXECUTE ON FUNCTION get_quality_check_summary TO authenticated;
GRANT EXECUTE ON FUNCTION receive_quality_checked_items TO authenticated;
GRANT EXECUTE ON FUNCTION add_quality_items_to_inventory_v2 TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE quality_check_templates IS 'Stores reusable quality check templates';
COMMENT ON TABLE quality_check_criteria IS 'Individual check criteria for each template';
COMMENT ON TABLE purchase_order_quality_checks IS 'Main quality check records for purchase orders';
COMMENT ON TABLE purchase_order_quality_check_items IS 'Individual check results for each item and criteria';

COMMENT ON FUNCTION create_quality_check_from_template IS 'Creates a new quality check from a template';
COMMENT ON FUNCTION complete_quality_check IS 'Completes a quality check and calculates overall result';
COMMENT ON FUNCTION get_quality_check_summary IS 'Gets summary statistics for a quality check';
COMMENT ON FUNCTION receive_quality_checked_items IS 'Receives quality-checked items to inventory';
COMMENT ON FUNCTION add_quality_items_to_inventory_v2 IS 'Adds quality items to inventory with pricing';

