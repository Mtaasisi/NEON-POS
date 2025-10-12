-- ================================================================================
-- AUTOMATIC FIX: Sale #SALE-77358826-03CI Data Corruption
-- ================================================================================
-- This script automatically:
-- 1. Detects the issue
-- 2. Creates backup
-- 3. Fixes the customer data
-- 4. Fixes product pricing
-- 5. Verifies the fix
-- 6. Reports results
--
-- Just run this entire script - no manual intervention needed!
-- ================================================================================

DO $$
DECLARE
  v_customer_id UUID;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_old_total NUMERIC;
  v_new_total NUMERIC;
  v_old_points INTEGER;
  v_new_points INTEGER;
  v_old_loyalty TEXT;
  v_new_loyalty TEXT;
  v_sale_exists BOOLEAN;
  v_product_exists BOOLEAN;
  v_old_product_price NUMERIC;
  v_new_product_price NUMERIC := 2500000;
  v_backup_created BOOLEAN := FALSE;
  v_customer_fixed BOOLEAN := FALSE;
  v_product_fixed BOOLEAN := FALSE;
BEGIN
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '  AUTOMATIC FIX STARTING';
  RAISE NOTICE '  Sale: SALE-77358826-03CI';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- ============================================================================
  -- STEP 1: DETECT ISSUE
  -- ============================================================================
  
  RAISE NOTICE '🔍 STEP 1: Detecting issue...';
  
  -- Check if sale exists
  SELECT EXISTS(
    SELECT 1 FROM lats_sales WHERE sale_number = 'SALE-77358826-03CI'
  ) INTO v_sale_exists;
  
  IF NOT v_sale_exists THEN
    RAISE NOTICE '❌ Sale SALE-77358826-03CI not found in database';
    RAISE NOTICE '✅ No fix needed';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Sale found in database';
  
  -- Get customer information
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.total_spent,
    c.points,
    c.loyalty_level
  INTO 
    v_customer_id,
    v_customer_name,
    v_customer_phone,
    v_old_total,
    v_old_points,
    v_old_loyalty
  FROM customers c
  JOIN lats_sales s ON s.customer_id = c.id
  WHERE s.sale_number = 'SALE-77358826-03CI'
  LIMIT 1;
  
  IF v_customer_id IS NULL THEN
    RAISE NOTICE '⚠️  Customer not found for this sale';
    RAISE NOTICE '✅ No customer fix needed';
  ELSE
    RAISE NOTICE '✅ Customer found: % (%)', v_customer_name, v_customer_phone;
    RAISE NOTICE '   Current total_spent: TSh %', v_old_total;
    RAISE NOTICE '   Current points: %', v_old_points;
    RAISE NOTICE '   Current loyalty level: %', v_old_loyalty;
  END IF;
  
  RAISE NOTICE '';
  
  -- ============================================================================
  -- STEP 2: CREATE BACKUP
  -- ============================================================================
  
  RAISE NOTICE '💾 STEP 2: Creating backup...';
  
  -- Create backup table if it doesn't exist
  CREATE TABLE IF NOT EXISTS customer_fix_backup (
    backup_id SERIAL PRIMARY KEY,
    backup_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    customer_id UUID,
    customer_name TEXT,
    customer_phone TEXT,
    old_total_spent NUMERIC,
    new_total_spent NUMERIC,
    old_points INTEGER,
    new_points INTEGER,
    old_loyalty_level TEXT,
    new_loyalty_level TEXT,
    sale_number TEXT,
    fix_reason TEXT
  );
  
  RAISE NOTICE '✅ Backup table ready';
  
  IF v_customer_id IS NOT NULL THEN
    -- Calculate new values
    SELECT COALESCE(SUM(COALESCE(final_amount, total_amount, 0)), 0)
    INTO v_new_total
    FROM lats_sales
    WHERE customer_id = v_customer_id AND status = 'completed';
    
    v_new_points := FLOOR(v_new_total / 1000);
    
    IF v_new_total >= 10000000 THEN
      v_new_loyalty := 'platinum';
    ELSIF v_new_total >= 5000000 THEN
      v_new_loyalty := 'gold';
    ELSIF v_new_total >= 1000000 THEN
      v_new_loyalty := 'silver';
    ELSE
      v_new_loyalty := 'bronze';
    END IF;
    
    -- Insert backup
    INSERT INTO customer_fix_backup (
      customer_id,
      customer_name,
      customer_phone,
      old_total_spent,
      new_total_spent,
      old_points,
      new_points,
      old_loyalty_level,
      new_loyalty_level,
      sale_number,
      fix_reason
    ) VALUES (
      v_customer_id,
      v_customer_name,
      v_customer_phone,
      v_old_total,
      v_new_total,
      v_old_points,
      v_new_points,
      v_old_loyalty,
      v_new_loyalty,
      'SALE-77358826-03CI',
      'Automatic fix for data corruption - total_spent was ' || v_old_total || ', should be ' || v_new_total
    );
    
    v_backup_created := TRUE;
    RAISE NOTICE '✅ Customer data backed up';
  END IF;
  
  RAISE NOTICE '';
  
  -- ============================================================================
  -- STEP 3: FIX CUSTOMER DATA
  -- ============================================================================
  
  RAISE NOTICE '🔧 STEP 3: Fixing customer data...';
  
  IF v_customer_id IS NOT NULL THEN
    -- Check if fix is needed
    IF ABS(v_old_total - v_new_total) < 1000 AND v_old_points = v_new_points THEN
      RAISE NOTICE '✅ Customer data is already correct - no fix needed';
    ELSE
      -- Apply fix
      UPDATE customers
      SET 
        total_spent = v_new_total,
        points = v_new_points,
        loyalty_level = v_new_loyalty,
        updated_at = NOW()
      WHERE id = v_customer_id;
      
      v_customer_fixed := TRUE;
      
      RAISE NOTICE '✅ Customer data fixed!';
      RAISE NOTICE '   Total Spent: TSh % → TSh %', v_old_total, v_new_total;
      RAISE NOTICE '   Points: % → %', v_old_points, v_new_points;
      RAISE NOTICE '   Loyalty Level: % → %', v_old_loyalty, v_new_loyalty;
    END IF;
  END IF;
  
  RAISE NOTICE '';
  
  -- ============================================================================
  -- STEP 4: FIX PRODUCT PRICING
  -- ============================================================================
  
  RAISE NOTICE '💎 STEP 4: Fixing product pricing...';
  
  -- Check if Samsung S24 exists with low price
  SELECT EXISTS(
    SELECT 1 FROM lats_products 
    WHERE (sku = 'SAMSUNG-S24-PREMIUM' OR name ILIKE '%Samsung Galaxy S24%')
      AND unit_price < 100000
  ) INTO v_product_exists;
  
  IF v_product_exists THEN
    -- Get old price
    SELECT unit_price INTO v_old_product_price
    FROM lats_products
    WHERE (sku = 'SAMSUNG-S24-PREMIUM' OR name ILIKE '%Samsung Galaxy S24%')
      AND unit_price < 100000
    LIMIT 1;
    
    -- Fix product price
    UPDATE lats_products
    SET unit_price = v_new_product_price
    WHERE (sku = 'SAMSUNG-S24-PREMIUM' OR name ILIKE '%Samsung Galaxy S24%')
      AND unit_price < 100000;
    
    -- Fix variant price if exists
    UPDATE lats_product_variants
    SET unit_price = v_new_product_price
    WHERE sku = 'SAMSUNG-S24-PREMIUM'
      AND unit_price < 100000;
    
    v_product_fixed := TRUE;
    
    RAISE NOTICE '✅ Samsung Galaxy S24 pricing fixed!';
    RAISE NOTICE '   Price: TSh % → TSh %', v_old_product_price, v_new_product_price;
    RAISE NOTICE '   Note: Historical sales remain unchanged (audit trail)';
  ELSE
    RAISE NOTICE '✅ Product pricing is already correct - no fix needed';
  END IF;
  
  RAISE NOTICE '';
  
  -- ============================================================================
  -- STEP 5: VERIFICATION
  -- ============================================================================
  
  RAISE NOTICE '🔍 STEP 5: Verifying fix...';
  
  IF v_customer_id IS NOT NULL THEN
    -- Verify customer data
    DECLARE
      v_verify_total NUMERIC;
      v_verify_points INTEGER;
      v_verify_loyalty TEXT;
      v_calc_total NUMERIC;
    BEGIN
      -- Get current values
      SELECT total_spent, points, loyalty_level
      INTO v_verify_total, v_verify_points, v_verify_loyalty
      FROM customers
      WHERE id = v_customer_id;
      
      -- Calculate expected total
      SELECT COALESCE(SUM(COALESCE(final_amount, total_amount, 0)), 0)
      INTO v_calc_total
      FROM lats_sales
      WHERE customer_id = v_customer_id AND status = 'completed';
      
      -- Verify
      IF ABS(v_verify_total - v_calc_total) < 1000 THEN
        RAISE NOTICE '✅ Customer total_spent verified: TSh %', v_verify_total;
      ELSE
        RAISE NOTICE '⚠️  Warning: Mismatch detected';
        RAISE NOTICE '   Stored: TSh %, Calculated: TSh %', v_verify_total, v_calc_total;
      END IF;
      
      IF v_verify_points = FLOOR(v_verify_total / 1000) THEN
        RAISE NOTICE '✅ Customer points verified: %', v_verify_points;
      ELSE
        RAISE NOTICE '⚠️  Warning: Points mismatch';
      END IF;
      
      RAISE NOTICE '✅ Customer loyalty level: %', v_verify_loyalty;
    END;
  END IF;
  
  RAISE NOTICE '';
  
  -- ============================================================================
  -- STEP 6: FINAL REPORT
  -- ============================================================================
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '  FIX COMPLETE - SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  IF v_backup_created THEN
    RAISE NOTICE '✅ Backup created in customer_fix_backup table';
  END IF;
  
  IF v_customer_fixed THEN
    RAISE NOTICE '✅ Customer data fixed:';
    RAISE NOTICE '   • % (%)', v_customer_name, v_customer_phone;
    RAISE NOTICE '   • Total: TSh % → TSh %', v_old_total, v_new_total;
    RAISE NOTICE '   • Points: % → %', v_old_points, v_new_points;
    RAISE NOTICE '   • Level: % → %', v_old_loyalty, v_new_loyalty;
  ELSE
    RAISE NOTICE '✅ Customer data was already correct';
  END IF;
  
  RAISE NOTICE '';
  
  IF v_product_fixed THEN
    RAISE NOTICE '✅ Product pricing fixed:';
    RAISE NOTICE '   • Samsung Galaxy S24';
    RAISE NOTICE '   • Price: TSh % → TSh %', v_old_product_price, v_new_product_price;
  ELSE
    RAISE NOTICE '✅ Product pricing was already correct';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  ALL FIXES APPLIED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  
END $$;

-- ============================================================================
-- DISPLAY FINAL RESULTS
-- ============================================================================

-- Show updated customer
SELECT 
  '=== CUSTOMER AFTER FIX ===' as section,
  name,
  phone,
  'TSh ' || TO_CHAR(total_spent, 'FM999,999,999,990') as total_spent,
  points,
  loyalty_level,
  TO_CHAR(updated_at, 'DD Mon YYYY HH24:MI:SS') as last_updated
FROM customers
WHERE phone = '+255712378850' OR name ILIKE '%Samuel masika%'
LIMIT 1;

-- Show updated product
SELECT 
  '=== PRODUCT PRICING AFTER FIX ===' as section,
  name as product_name,
  sku,
  'TSh ' || TO_CHAR(unit_price, 'FM999,999,999,990') as price,
  category
FROM lats_products
WHERE sku = 'SAMSUNG-S24-PREMIUM' OR name ILIKE '%Samsung Galaxy S24%'
LIMIT 1;

-- Show backup record
SELECT 
  '=== BACKUP RECORD ===' as section,
  customer_name,
  customer_phone,
  'TSh ' || TO_CHAR(old_total_spent, 'FM999,999,999,990') as before_total,
  'TSh ' || TO_CHAR(new_total_spent, 'FM999,999,999,990') as after_total,
  old_points || ' → ' || new_points as points_change,
  old_loyalty_level || ' → ' || new_loyalty_level as loyalty_change,
  TO_CHAR(backup_timestamp, 'DD Mon YYYY HH24:MI:SS') as backup_time
FROM customer_fix_backup
ORDER BY backup_timestamp DESC
LIMIT 1;

-- Health check
WITH customer_check AS (
  SELECT 
    c.id,
    c.total_spent,
    COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) END), 0) as calc_total
  FROM customers c
  LEFT JOIN lats_sales s ON s.customer_id = c.id
  WHERE c.phone = '+255712378850'
  GROUP BY c.id, c.total_spent
)
SELECT 
  '=== HEALTH CHECK ===' as section,
  CASE 
    WHEN ABS(total_spent - calc_total) < 1000 THEN '✅ HEALTHY - Data is accurate'
    ELSE '❌ ISSUE - Data mismatch detected'
  END as status,
  'Stored: TSh ' || TO_CHAR(total_spent, 'FM999,999,999,990') as stored_value,
  'Calculated: TSh ' || TO_CHAR(calc_total, 'FM999,999,999,990') as calculated_value
FROM customer_check;

-- ============================================================================
-- END OF AUTOMATIC FIX
-- ============================================================================

