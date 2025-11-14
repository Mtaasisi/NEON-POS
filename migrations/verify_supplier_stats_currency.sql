-- ============================================
-- VERIFY SUPPLIER STATS CURRENCY DISPLAY
-- ============================================
-- This migration verifies that supplier statistics are properly
-- calculated and displayed in the supplier's original currency
-- ============================================

-- Check current supplier statistics
DO $$
DECLARE
  supplier_record RECORD;
  v_total_original NUMERIC;
  v_total_base NUMERIC;
BEGIN
  RAISE NOTICE '📊 SUPPLIER STATISTICS VERIFICATION';
  RAISE NOTICE '═══════════════════════════════════════════════';
  
  FOR supplier_record IN 
    SELECT 
      s.id,
      s.name,
      s.preferred_currency,
      s.country,
      s.total_order_value,
      COUNT(po.id) as po_count
    FROM lats_suppliers s
    LEFT JOIN lats_purchase_orders po ON po.supplier_id = s.id
    WHERE s.is_active = true 
      AND s.is_trade_in_customer != true
    GROUP BY s.id, s.name, s.preferred_currency, s.country, s.total_order_value
    HAVING COUNT(po.id) > 0
    ORDER BY s.name
  LOOP
    -- Calculate total in original currency
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_total_original
    FROM lats_purchase_orders
    WHERE supplier_id = supplier_record.id;
    
    -- Calculate total in base currency (TZS)
    SELECT COALESCE(SUM(total_amount_base_currency), 0)
    INTO v_total_base
    FROM lats_purchase_orders
    WHERE supplier_id = supplier_record.id;
    
    RAISE NOTICE '';
    RAISE NOTICE '🏢 Supplier: %', supplier_record.name;
    RAISE NOTICE '   Country: %', COALESCE(supplier_record.country, 'N/A');
    RAISE NOTICE '   Currency: %', COALESCE(supplier_record.preferred_currency, 'TZS');
    RAISE NOTICE '   Purchase Orders: %', supplier_record.po_count;
    RAISE NOTICE '   Total (Original Currency): % %', 
      v_total_original,
      COALESCE(supplier_record.preferred_currency, 'TZS');
    RAISE NOTICE '   Total (Base TZS): % TZS', v_total_base;
    RAISE NOTICE '   Stored Value: %', COALESCE(supplier_record.total_order_value, 0);
    
    -- Check if stored value matches original currency total
    IF ABS(COALESCE(supplier_record.total_order_value, 0) - v_total_original) > 0.01 THEN
      RAISE NOTICE '   ⚠️  WARNING: Stored value does not match calculated total!';
    ELSE
      RAISE NOTICE '   ✅ Stored value matches calculated total';
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '✅ Verification complete!';
  RAISE NOTICE '';
  RAISE NOTICE '📝 SUMMARY:';
  RAISE NOTICE '   - Frontend displays amounts in supplier''s currency';
  RAISE NOTICE '   - Database stores amounts in original currency';
  RAISE NOTICE '   - Base currency (TZS) used only for internal calculations';
END $$;

-- Show a sample of purchase orders with currency information
SELECT 
  s.name as "Supplier",
  s.preferred_currency as "Supplier Currency",
  po.po_number as "PO Number",
  po.currency as "PO Currency",
  po.total_amount as "Amount (Original)",
  po.exchange_rate as "Exchange Rate",
  po.total_amount_base_currency as "Amount (TZS)",
  po.order_date as "Order Date"
FROM lats_purchase_orders po
LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
WHERE s.is_active = true
  AND s.is_trade_in_customer != true
ORDER BY s.name, po.order_date DESC
LIMIT 20;

-- Final message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Currency display verification completed!';
  RAISE NOTICE '📌 Remember: Total Spent should display in supplier''s currency, not TZS';
END $$;

