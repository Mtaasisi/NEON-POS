-- =====================================================
-- AUTOMATIC SUPPLIER STATISTICS UPDATE SYSTEM
-- =====================================================
-- This migration creates triggers to automatically update
-- supplier statistics when purchase orders are created/updated
-- =====================================================

-- =====================================================
-- 1. UPDATE TOTAL ORDERS WHEN PO IS CREATED
-- =====================================================

CREATE OR REPLACE FUNCTION update_supplier_total_orders()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total orders count for the supplier
  UPDATE lats_suppliers
  SET total_orders = (
    SELECT COUNT(*)
    FROM lats_purchase_orders
    WHERE supplier_id = NEW.supplier_id
  )
  WHERE id = NEW.supplier_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_supplier_total_orders ON lats_purchase_orders;
CREATE TRIGGER trigger_update_supplier_total_orders
AFTER INSERT ON lats_purchase_orders
FOR EACH ROW
EXECUTE FUNCTION update_supplier_total_orders();

-- =====================================================
-- 2. UPDATE TOTAL ORDER VALUE WHEN PO IS CREATED/UPDATED
-- =====================================================

CREATE OR REPLACE FUNCTION update_supplier_order_value()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total order value for the supplier
  UPDATE lats_suppliers
  SET total_order_value = (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM lats_purchase_orders
    WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
  )
  WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_supplier_order_value ON lats_purchase_orders;
CREATE TRIGGER trigger_update_supplier_order_value
AFTER INSERT OR UPDATE OR DELETE ON lats_purchase_orders
FOR EACH ROW
EXECUTE FUNCTION update_supplier_order_value();

-- =====================================================
-- 3. UPDATE ON-TIME DELIVERY RATE
-- =====================================================

CREATE OR REPLACE FUNCTION update_supplier_on_time_delivery()
RETURNS TRIGGER AS $$
DECLARE
  total_completed INTEGER;
  on_time_completed INTEGER;
  delivery_rate NUMERIC;
BEGIN
  -- Count total completed orders
  SELECT COUNT(*) INTO total_completed
  FROM lats_purchase_orders
  WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
    AND status IN ('received', 'completed');
  
  -- Count on-time deliveries (received before or on expected date)
  SELECT COUNT(*) INTO on_time_completed
  FROM lats_purchase_orders
  WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
    AND status IN ('received', 'completed')
    AND expected_delivery_date IS NOT NULL
    AND updated_at <= expected_delivery_date;
  
  -- Calculate rate
  IF total_completed > 0 THEN
    delivery_rate := (on_time_completed::NUMERIC / total_completed::NUMERIC) * 100;
  ELSE
    delivery_rate := 0;
  END IF;
  
  -- Update supplier
  UPDATE lats_suppliers
  SET on_time_delivery_rate = ROUND(delivery_rate, 2)
  WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_on_time_delivery ON lats_purchase_orders;
CREATE TRIGGER trigger_update_on_time_delivery
AFTER UPDATE ON lats_purchase_orders
FOR EACH ROW
WHEN (NEW.status IN ('received', 'completed') AND (OLD.status IS DISTINCT FROM NEW.status))
EXECUTE FUNCTION update_supplier_on_time_delivery();

-- =====================================================
-- 4. UPDATE RESPONSE TIME (FROM COMMUNICATIONS)
-- =====================================================

CREATE OR REPLACE FUNCTION update_supplier_response_time()
RETURNS TRIGGER AS $$
DECLARE
  avg_response_hours NUMERIC;
BEGIN
  -- Calculate average response time from inbound communications
  -- This is a simplified calculation - you can enhance based on your needs
  SELECT AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at))) / 3600)
  INTO avg_response_hours
  FROM (
    SELECT created_at
    FROM lats_supplier_communications
    WHERE supplier_id = NEW.supplier_id
      AND direction = 'inbound'
    ORDER BY created_at DESC
    LIMIT 10
  ) recent_comms;
  
  -- Update supplier if we have data
  IF avg_response_hours IS NOT NULL THEN
    UPDATE lats_suppliers
    SET response_time_hours = ROUND(avg_response_hours, 1)
    WHERE id = NEW.supplier_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_response_time ON lats_supplier_communications;
CREATE TRIGGER trigger_update_response_time
AFTER INSERT ON lats_supplier_communications
FOR EACH ROW
WHEN (NEW.direction = 'inbound')
EXECUTE FUNCTION update_supplier_response_time();

-- =====================================================
-- 5. ONE-TIME UPDATE: BACKFILL EXISTING DATA
-- =====================================================

-- Update all existing suppliers with correct stats
DO $$
DECLARE
  supplier_record RECORD;
BEGIN
  FOR supplier_record IN SELECT id FROM lats_suppliers
  LOOP
    -- Update total orders
    UPDATE lats_suppliers
    SET total_orders = (
      SELECT COUNT(*)
      FROM lats_purchase_orders
      WHERE supplier_id = supplier_record.id
    )
    WHERE id = supplier_record.id;
    
    -- Update total order value
    UPDATE lats_suppliers
    SET total_order_value = (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM lats_purchase_orders
      WHERE supplier_id = supplier_record.id
    )
    WHERE id = supplier_record.id;
    
    -- Update on-time delivery rate
    UPDATE lats_suppliers
    SET on_time_delivery_rate = (
      SELECT 
        CASE 
          WHEN COUNT(*) FILTER (WHERE status IN ('received', 'completed')) > 0 
          THEN ROUND(
            (COUNT(*) FILTER (WHERE status IN ('received', 'completed') 
              AND expected_delivery_date IS NOT NULL 
              AND updated_at <= expected_delivery_date)::NUMERIC 
            / COUNT(*) FILTER (WHERE status IN ('received', 'completed'))::NUMERIC) * 100, 
            2
          )
          ELSE 0
        END
      FROM lats_purchase_orders
      WHERE supplier_id = supplier_record.id
    )
    WHERE id = supplier_record.id;
  END LOOP;
  
  RAISE NOTICE '✅ Successfully backfilled supplier statistics';
END $$;

-- =====================================================
-- 6. CREATE VIEW FOR SUPPLIER PERFORMANCE
-- =====================================================

CREATE OR REPLACE VIEW supplier_performance_dashboard AS
SELECT 
  s.id,
  s.name,
  s.company_name,
  s.country,
  s.total_orders,
  s.total_order_value,
  s.average_rating,
  s.on_time_delivery_rate,
  s.response_time_hours,
  s.quality_score,
  s.last_contact_date,
  s.priority_level,
  -- Recent activity
  (SELECT COUNT(*) FROM lats_supplier_communications WHERE supplier_id = s.id AND created_at > NOW() - INTERVAL '30 days') as communications_last_30_days,
  (SELECT COUNT(*) FROM lats_purchase_orders WHERE supplier_id = s.id AND created_at > NOW() - INTERVAL '30 days') as orders_last_30_days,
  (SELECT MAX(order_date) FROM lats_purchase_orders WHERE supplier_id = s.id) as last_order_date,
  -- Status flags
  CASE 
    WHEN s.average_rating >= 4.5 AND s.on_time_delivery_rate >= 90 THEN 'Excellent'
    WHEN s.average_rating >= 4.0 AND s.on_time_delivery_rate >= 80 THEN 'Good'
    WHEN s.average_rating >= 3.0 AND s.on_time_delivery_rate >= 70 THEN 'Fair'
    ELSE 'Needs Improvement'
  END as performance_status
FROM lats_suppliers s
WHERE s.is_active = true
  AND s.is_trade_in_customer IS NOT TRUE
ORDER BY s.average_rating DESC, s.on_time_delivery_rate DESC;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check trigger installation
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%supplier%'
ORDER BY event_object_table, trigger_name;

-- Show current supplier stats
SELECT 
  name,
  total_orders,
  total_order_value,
  average_rating,
  on_time_delivery_rate,
  response_time_hours
FROM lats_suppliers
WHERE is_active = true
ORDER BY total_orders DESC
LIMIT 10;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION update_supplier_total_orders() IS 'Automatically updates supplier total_orders count when POs are created';
COMMENT ON FUNCTION update_supplier_order_value() IS 'Automatically updates supplier total_order_value when POs change';
COMMENT ON FUNCTION update_supplier_on_time_delivery() IS 'Automatically calculates on-time delivery rate when POs are completed';
COMMENT ON FUNCTION update_supplier_response_time() IS 'Automatically calculates average response time from communications';
COMMENT ON VIEW supplier_performance_dashboard IS 'Comprehensive view of supplier performance metrics and recent activity';

