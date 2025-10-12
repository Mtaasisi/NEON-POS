-- ================================================================================
-- QUICK FIX: Sale #SALE-77358826-03CI Data Corruption
-- ================================================================================
-- This script quickly fixes the customer data corruption without extensive diagnosis
-- Run this if you just want to fix the issue immediately
-- ================================================================================

-- Fix customer "Samuel masika" (+255712378850)
DO $$
DECLARE
  v_customer_id UUID;
  v_actual_total NUMERIC;
  v_correct_points INTEGER;
  v_loyalty_level TEXT;
BEGIN
  -- Get customer
  SELECT id INTO v_customer_id
  FROM customers
  WHERE phone = '+255712378850';

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  -- Calculate actual total from completed sales
  SELECT COALESCE(SUM(COALESCE(final_amount, total_amount, 0)), 0)
  INTO v_actual_total
  FROM lats_sales
  WHERE customer_id = v_customer_id AND status = 'completed';

  -- Calculate points (1 per 1000 TZS)
  v_correct_points := FLOOR(v_actual_total / 1000);

  -- Determine loyalty level
  IF v_actual_total >= 10000000 THEN
    v_loyalty_level := 'platinum';
  ELSIF v_actual_total >= 5000000 THEN
    v_loyalty_level := 'gold';
  ELSIF v_actual_total >= 1000000 THEN
    v_loyalty_level := 'silver';
  ELSE
    v_loyalty_level := 'bronze';
  END IF;

  -- Update customer
  UPDATE customers
  SET 
    total_spent = v_actual_total,
    points = v_correct_points,
    loyalty_level = v_loyalty_level,
    updated_at = NOW()
  WHERE id = v_customer_id;

  RAISE NOTICE '✅ FIXED: Samuel masika';
  RAISE NOTICE 'Total Spent: TSh 3,018,851,250 → TSh %', v_actual_total;
  RAISE NOTICE 'Points: 2 → %', v_correct_points;
  RAISE NOTICE 'Loyalty Level: %', v_loyalty_level;
END $$;

-- Fix Samsung Galaxy S24 pricing for future sales
UPDATE lats_products
SET unit_price = 2500000
WHERE (sku = 'SAMSUNG-S24-PREMIUM' OR name ILIKE '%Samsung Galaxy S24%')
  AND unit_price < 100000;

UPDATE lats_product_variants
SET unit_price = 2500000
WHERE sku = 'SAMSUNG-S24-PREMIUM'
  AND unit_price < 100000;

-- Verify the fix
SELECT 
  '✅ VERIFICATION' as status,
  name,
  phone,
  total_spent,
  points,
  loyalty_level
FROM customers
WHERE phone = '+255712378850';

