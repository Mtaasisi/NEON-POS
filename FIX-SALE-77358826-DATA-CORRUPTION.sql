-- ================================================================================
-- FIX SALE #SALE-77358826-03CI DATA CORRUPTION
-- ================================================================================
-- This script diagnoses and fixes the following issues:
-- 1. Customer "Samuel masika" has unrealistic total_spent (TSh 3,018,851,250)
-- 2. Customer marked as NEW but has BRONZE loyalty level and huge history
-- 3. Samsung Galaxy S24 priced at only TSh 1,250 (unrealistic)
-- 4. Only 2 loyalty points despite supposedly spending billions
-- ================================================================================

-- ================================================================================
-- PART 1: DIAGNOSIS - Examine the problematic sale
-- ================================================================================

SELECT 
  '=== SALE DIAGNOSIS ===' as section;

-- Get the specific sale details
SELECT 
  'Sale Details' as info_type,
  id,
  sale_number,
  customer_id,
  total_amount,
  final_amount,
  payment_method,
  status,
  created_at
FROM lats_sales
WHERE sale_number = 'SALE-77358826-03CI';

-- Get sale items for this sale
SELECT 
  'Sale Items' as info_type,
  si.id,
  si.product_name,
  si.sku,
  si.quantity,
  si.unit_price,
  si.total_price,
  si.cost_price,
  si.profit
FROM lats_sale_items si
JOIN lats_sales s ON si.sale_id = s.id
WHERE s.sale_number = 'SALE-77358826-03CI';

-- ================================================================================
-- PART 2: CUSTOMER DIAGNOSIS - Examine customer data
-- ================================================================================

SELECT 
  '=== CUSTOMER DIAGNOSIS ===' as section;

-- Get customer details
SELECT 
  'Customer Details' as info_type,
  id,
  name,
  phone,
  city,
  loyalty_level,
  total_spent,
  points,
  last_visit,
  joined_date,
  created_at
FROM customers
WHERE phone = '+255712378850' OR name ILIKE '%Samuel masika%';

-- Get all sales for this customer to calculate REAL total spent
SELECT 
  'Customer Sales History' as info_type,
  sale_number,
  total_amount,
  final_amount,
  status,
  created_at
FROM lats_sales
WHERE customer_id = (
  SELECT id FROM customers 
  WHERE phone = '+255712378850' 
  LIMIT 1
)
ORDER BY created_at DESC;

-- Calculate actual total spent
SELECT 
  'Actual Total Spent Calculation' as info_type,
  COUNT(*) as total_sales,
  SUM(COALESCE(final_amount, total_amount, 0)) as actual_total_spent,
  MIN(created_at) as first_sale,
  MAX(created_at) as last_sale
FROM lats_sales
WHERE customer_id = (
  SELECT id FROM customers 
  WHERE phone = '+255712378850' 
  LIMIT 1
)
AND status = 'completed';

-- ================================================================================
-- PART 3: PRODUCT DIAGNOSIS - Check if Samsung Galaxy S24 has correct pricing
-- ================================================================================

SELECT 
  '=== PRODUCT DIAGNOSIS ===' as section;

-- Check the product/variant pricing in the database
SELECT 
  'Product Price Check' as info_type,
  p.id,
  p.name,
  p.sku,
  p.unit_price as product_unit_price,
  pv.id as variant_id,
  pv.name as variant_name,
  pv.sku as variant_sku,
  pv.unit_price as variant_unit_price,
  p.cost_price
FROM lats_products p
LEFT JOIN lats_product_variants pv ON pv.product_id = p.id
WHERE p.sku = 'SAMSUNG-S24-PREMIUM' 
   OR p.name ILIKE '%Samsung Galaxy S24%'
   OR pv.sku = 'SAMSUNG-S24-PREMIUM';

-- ================================================================================
-- PART 4: FIX - Recalculate customer total_spent and points
-- ================================================================================

SELECT 
  '=== STARTING FIX PROCESS ===' as section;

-- First, store customer ID in a variable for easier reference
DO $$
DECLARE
  v_customer_id UUID;
  v_actual_total_spent NUMERIC;
  v_correct_points INTEGER;
  v_loyalty_level TEXT;
  v_sale_id UUID;
  v_product_id UUID;
  v_variant_id UUID;
BEGIN
  -- Get customer ID
  SELECT id INTO v_customer_id
  FROM customers
  WHERE phone = '+255712378850'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RAISE NOTICE '❌ Customer not found with phone +255712378850';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Found customer ID: %', v_customer_id;

  -- Calculate ACTUAL total spent from completed sales
  SELECT COALESCE(SUM(COALESCE(final_amount, total_amount, 0)), 0)
  INTO v_actual_total_spent
  FROM lats_sales
  WHERE customer_id = v_customer_id
    AND status = 'completed';

  RAISE NOTICE '📊 Calculated actual total spent: TSh %', v_actual_total_spent;
  RAISE NOTICE '📊 Current (wrong) total spent: TSh 3,018,851,250';

  -- Calculate correct loyalty points (1 point per 1000 TZS)
  v_correct_points := FLOOR(v_actual_total_spent / 1000);
  
  RAISE NOTICE '🎯 Calculated correct points: %', v_correct_points;
  RAISE NOTICE '🎯 Current (wrong) points: 2';

  -- Determine correct loyalty level based on total spent
  IF v_actual_total_spent >= 10000000 THEN
    v_loyalty_level := 'platinum';
  ELSIF v_actual_total_spent >= 5000000 THEN
    v_loyalty_level := 'gold';
  ELSIF v_actual_total_spent >= 1000000 THEN
    v_loyalty_level := 'silver';
  ELSE
    v_loyalty_level := 'bronze';
  END IF;

  RAISE NOTICE '🏆 Calculated correct loyalty level: %', v_loyalty_level;

  -- Update customer with correct values
  UPDATE customers
  SET 
    total_spent = v_actual_total_spent,
    points = v_correct_points,
    loyalty_level = v_loyalty_level,
    updated_at = NOW()
  WHERE id = v_customer_id;

  RAISE NOTICE '✅ Updated customer record with correct values';

  -- ================================================================================
  -- PART 5: FIX - Check and fix Samsung Galaxy S24 pricing if needed
  -- ================================================================================

  -- Get the sale ID
  SELECT id INTO v_sale_id
  FROM lats_sales
  WHERE sale_number = 'SALE-77358826-03CI';

  IF v_sale_id IS NOT NULL THEN
    RAISE NOTICE '✅ Found sale ID: %', v_sale_id;

    -- Check if the Samsung Galaxy S24 has correct pricing in products table
    SELECT p.id, pv.id INTO v_product_id, v_variant_id
    FROM lats_products p
    LEFT JOIN lats_product_variants pv ON pv.product_id = p.id
    WHERE p.sku = 'SAMSUNG-S24-PREMIUM' OR pv.sku = 'SAMSUNG-S24-PREMIUM'
    LIMIT 1;

    IF v_product_id IS NOT NULL THEN
      -- Update product price to a realistic value (e.g., 2,500,000 TZS for Samsung S24)
      UPDATE lats_products
      SET unit_price = 2500000
      WHERE id = v_product_id
        AND unit_price < 100000; -- Only update if price is unrealistically low

      -- Update variant price if exists
      IF v_variant_id IS NOT NULL THEN
        UPDATE lats_product_variants
        SET unit_price = 2500000
        WHERE id = v_variant_id
          AND unit_price < 100000;
      END IF;

      RAISE NOTICE '⚠️  Note: Samsung Galaxy S24 product pricing has been checked';
      RAISE NOTICE '⚠️  If pricing was unrealistic (<100,000), it has been updated to 2,500,000 TZS';
      RAISE NOTICE '⚠️  The historical sale SALE-77358826-03CI remains as-is (1,250 TZS)';
      RAISE NOTICE '⚠️  This prevents data manipulation but ensures future sales use correct pricing';
    END IF;
  END IF;

END $$;

-- ================================================================================
-- PART 6: VERIFICATION - Show updated values
-- ================================================================================

SELECT 
  '=== VERIFICATION - CUSTOMER AFTER FIX ===' as section;

SELECT 
  'Updated Customer Details' as info_type,
  name,
  phone,
  loyalty_level,
  total_spent,
  points,
  last_visit,
  updated_at
FROM customers
WHERE phone = '+255712378850';

-- Show customer sales summary
SELECT 
  'Customer Sales Summary' as info_type,
  COUNT(*) as total_sales,
  SUM(COALESCE(final_amount, total_amount, 0)) as total_spent,
  AVG(COALESCE(final_amount, total_amount, 0)) as avg_sale_amount,
  MIN(created_at) as first_purchase,
  MAX(created_at) as last_purchase
FROM lats_sales
WHERE customer_id = (
  SELECT id FROM customers WHERE phone = '+255712378850' LIMIT 1
)
AND status = 'completed';

-- Check product pricing after fix
SELECT 
  'Product Pricing After Fix' as info_type,
  p.name,
  p.sku,
  p.unit_price,
  pv.name as variant_name,
  pv.sku as variant_sku,
  pv.unit_price as variant_price
FROM lats_products p
LEFT JOIN lats_product_variants pv ON pv.product_id = p.id
WHERE p.sku = 'SAMSUNG-S24-PREMIUM' OR pv.sku = 'SAMSUNG-S24-PREMIUM';

-- ================================================================================
-- PART 7: RECOMMENDATIONS
-- ================================================================================

SELECT 
  '=== RECOMMENDATIONS ===' as section,
  'The following has been fixed:' as message
UNION ALL
SELECT 
  '',
  '1. ✅ Customer total_spent recalculated from actual completed sales'
UNION ALL
SELECT 
  '',
  '2. ✅ Customer loyalty points recalculated (1 point per 1000 TZS)'
UNION ALL
SELECT 
  '',
  '3. ✅ Customer loyalty level adjusted based on actual spending'
UNION ALL
SELECT 
  '',
  '4. ✅ Samsung Galaxy S24 pricing checked and updated if needed'
UNION ALL
SELECT 
  '',
  ''
UNION ALL
SELECT 
  '',
  '⚠️  IMPORTANT NOTES:'
UNION ALL
SELECT 
  '',
  '- Historical sale SALE-77358826-03CI remains unchanged (1,250 TZS)'
UNION ALL
SELECT 
  '',
  '- This prevents data manipulation and maintains audit trail'
UNION ALL
SELECT 
  '',
  '- Future Samsung S24 sales will use the corrected price (2,500,000 TZS)'
UNION ALL
SELECT 
  '',
  ''
UNION ALL
SELECT 
  '',
  '🔍 INVESTIGATION NEEDED:'
UNION ALL
SELECT 
  '',
  '- How did the customer total_spent get corrupted to 3 billion TZS?'
UNION ALL
SELECT 
  '',
  '- Was there a data migration issue or calculation bug?'
UNION ALL
SELECT 
  '',
  '- Check application logs around the customer creation/update time'
UNION ALL
SELECT 
  '',
  '- Consider adding database constraints to prevent unrealistic values';

-- ================================================================================
-- OPTIONAL: If you want to investigate more customers with similar issues
-- ================================================================================

-- Find other customers with suspiciously high total_spent vs actual sales
SELECT 
  '=== OTHER POTENTIALLY CORRUPTED CUSTOMERS ===' as section;

WITH customer_actual_totals AS (
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.total_spent as recorded_total,
    COALESCE(SUM(COALESCE(s.final_amount, s.total_amount, 0)), 0) as actual_total,
    c.points as recorded_points,
    FLOOR(COALESCE(SUM(COALESCE(s.final_amount, s.total_amount, 0)), 0) / 1000) as calculated_points
  FROM customers c
  LEFT JOIN lats_sales s ON s.customer_id = c.id AND s.status = 'completed'
  GROUP BY c.id, c.name, c.phone, c.total_spent, c.points
)
SELECT 
  'Customers with Mismatched Data' as issue_type,
  name,
  phone,
  recorded_total,
  actual_total,
  recorded_total - actual_total as difference,
  recorded_points,
  calculated_points,
  CASE 
    WHEN ABS(recorded_total - actual_total) > 1000 THEN '❌ MISMATCH'
    ELSE '✅ OK'
  END as status
FROM customer_actual_totals
WHERE ABS(recorded_total - actual_total) > 1000
ORDER BY ABS(recorded_total - actual_total) DESC
LIMIT 20;

-- ================================================================================
-- END OF FIX SCRIPT
-- ================================================================================

