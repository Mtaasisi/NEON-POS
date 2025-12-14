-- ============================================
-- FIX SUPPLIER STATS CURRENCY CONVERSION
-- ============================================
-- This migration ensures that all purchase orders have proper
-- total_amount_base_currency values for accurate supplier statistics
-- ============================================

-- Check current state
DO $$
DECLARE
  v_total_pos INTEGER;
  v_with_base_amount INTEGER;
  v_null_base_amount INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE total_amount_base_currency IS NOT NULL),
    COUNT(*) FILTER (WHERE total_amount_base_currency IS NULL)
  INTO v_total_pos, v_with_base_amount, v_null_base_amount
  FROM lats_purchase_orders;
  
  RAISE NOTICE '📊 Purchase Order Currency Status:';
  RAISE NOTICE '   Total POs: %', v_total_pos;
  RAISE NOTICE '   With base amount: %', v_with_base_amount;
  RAISE NOTICE '   Missing base amount: %', v_null_base_amount;
END $$;

-- Fix purchase orders with missing total_amount_base_currency
DO $$
DECLARE
  po_record RECORD;
  v_base_amount NUMERIC;
  v_updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔧 Fixing purchase orders with missing base currency amounts...';
  
  FOR po_record IN 
    SELECT 
      id,
      po_number,
      currency,
      total_amount,
      exchange_rate,
      total_amount_base_currency
    FROM lats_purchase_orders
    WHERE total_amount_base_currency IS NULL
       OR (currency IS NOT NULL AND currency != 'TZS' AND total_amount_base_currency = total_amount)
  LOOP
    -- Calculate base amount
    IF po_record.currency IS NULL OR po_record.currency = 'TZS' THEN
      v_base_amount := po_record.total_amount;
    ELSE
      -- Convert to TZS using exchange rate
      v_base_amount := po_record.total_amount * COALESCE(po_record.exchange_rate, 1.0);
    END IF;
    
    -- Update the purchase order
    UPDATE lats_purchase_orders
    SET 
      total_amount_base_currency = v_base_amount,
      exchange_rate = COALESCE(exchange_rate, 1.0),
      base_currency = 'TZS',
      updated_at = NOW()
    WHERE id = po_record.id;
    
    v_updated_count := v_updated_count + 1;
    
    RAISE NOTICE '✅ Fixed PO %: % % (rate: %) = % TZS',
      po_record.po_number,
      po_record.total_amount,
      COALESCE(po_record.currency, 'TZS'),
      COALESCE(po_record.exchange_rate, 1.0),
      v_base_amount;
  END LOOP;
  
  IF v_updated_count > 0 THEN
    RAISE NOTICE '✅ Updated % purchase orders with correct base currency amounts', v_updated_count;
  ELSE
    RAISE NOTICE '✅ All purchase orders already have correct base currency amounts';
  END IF;
END $$;

-- Verify the fix
SELECT 
  COUNT(*) as "Total POs",
  COUNT(*) FILTER (WHERE currency = 'TZS') as "TZS Currency",
  COUNT(*) FILTER (WHERE currency IS NULL) as "NULL Currency",
  COUNT(*) FILTER (WHERE currency NOT IN ('TZS') AND currency IS NOT NULL) as "Foreign Currency",
  COUNT(*) FILTER (WHERE total_amount_base_currency IS NOT NULL) as "With Base Amount",
  COUNT(*) FILTER (WHERE total_amount_base_currency IS NULL) as "Missing Base Amount"
FROM lats_purchase_orders;

-- Show sample of purchase orders grouped by supplier
SELECT 
  s.name as "Supplier",
  COUNT(po.id) as "Total Orders",
  po.currency as "Currency",
  SUM(po.total_amount) as "Total (Original)",
  SUM(po.total_amount_base_currency) as "Total (TZS)",
  AVG(po.total_amount_base_currency) as "Avg Order (TZS)"
FROM lats_purchase_orders po
LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
GROUP BY s.name, po.currency
ORDER BY SUM(po.total_amount_base_currency) DESC
LIMIT 10;

-- Add a helpful comment
COMMENT ON COLUMN lats_purchase_orders.total_amount_base_currency IS 
  'Total amount converted to base currency (TZS). This should always be used for supplier statistics and totals to ensure accurate calculations across multi-currency purchase orders.';

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '✅ Supplier stats currency conversion fix completed!';
END $$;

