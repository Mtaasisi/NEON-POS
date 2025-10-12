-- ================================================================================
-- SYSTEM-WIDE FIX: Recalculate ALL Customer Total Spent & Points
-- ================================================================================
-- This script fixes data corruption for ALL customers by:
-- 1. Recalculating total_spent from actual completed sales
-- 2. Recalculating loyalty points (1 point per 1000 TZS)
-- 3. Adjusting loyalty levels based on actual spending
-- 4. Identifying customers with significant discrepancies
-- ================================================================================

-- PART 1: Diagnosis - Find all corrupted customer records
-- ================================================================================

SELECT '=== DIAGNOSIS: Finding Corrupted Customer Records ===' as section;

WITH customer_analysis AS (
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.total_spent as recorded_total,
    c.points as recorded_points,
    c.loyalty_level as recorded_loyalty,
    COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) ELSE 0 END), 0) as actual_total,
    FLOOR(COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) ELSE 0 END), 0) / 1000) as calculated_points,
    COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as total_sales
  FROM customers c
  LEFT JOIN lats_sales s ON s.customer_id = c.id
  GROUP BY c.id, c.name, c.phone, c.total_spent, c.points, c.loyalty_level
)
SELECT 
  'Corrupted Records Found' as type,
  COUNT(*) as total_corrupted,
  SUM(CASE WHEN ABS(recorded_total - actual_total) > 1000000 THEN 1 ELSE 0 END) as severe_corruption,
  SUM(CASE WHEN ABS(recorded_total - actual_total) > 10000 AND ABS(recorded_total - actual_total) <= 1000000 THEN 1 ELSE 0 END) as moderate_corruption,
  SUM(CASE WHEN ABS(recorded_total - actual_total) > 1000 AND ABS(recorded_total - actual_total) <= 10000 THEN 1 ELSE 0 END) as minor_corruption
FROM customer_analysis
WHERE ABS(recorded_total - actual_total) > 1000;

-- Show top 10 most corrupted records
SELECT 
  'Top 10 Most Corrupted' as type,
  ca.name,
  ca.phone,
  ca.recorded_total as wrong_total,
  ca.actual_total as correct_total,
  (ca.recorded_total - ca.actual_total) as difference,
  ca.recorded_points as wrong_points,
  ca.calculated_points as correct_points,
  ca.total_sales
FROM (
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.total_spent as recorded_total,
    c.points as recorded_points,
    COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) ELSE 0 END), 0) as actual_total,
    FLOOR(COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) ELSE 0 END), 0) / 1000) as calculated_points,
    COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as total_sales
  FROM customers c
  LEFT JOIN lats_sales s ON s.customer_id = c.id
  GROUP BY c.id, c.name, c.phone, c.total_spent, c.points
) ca
WHERE ABS(ca.recorded_total - ca.actual_total) > 1000
ORDER BY ABS(ca.recorded_total - ca.actual_total) DESC
LIMIT 10;

-- ================================================================================
-- PART 2: BACKUP - Create backup before fixing
-- ================================================================================

SELECT '=== CREATING BACKUP ===' as section;

-- Create backup table if it doesn't exist
CREATE TABLE IF NOT EXISTS customers_backup_before_fix (
  backup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  customer_id UUID,
  name TEXT,
  phone TEXT,
  old_total_spent NUMERIC,
  old_points INTEGER,
  old_loyalty_level TEXT,
  backup_reason TEXT
);

-- Backup corrupted customers
INSERT INTO customers_backup_before_fix (
  customer_id, name, phone, old_total_spent, old_points, old_loyalty_level, backup_reason
)
SELECT 
  c.id,
  c.name,
  c.phone,
  c.total_spent,
  c.points,
  c.loyalty_level,
  'Total spent corruption fix - ' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
FROM customers c
WHERE EXISTS (
  SELECT 1
  FROM (
    SELECT 
      c2.id,
      c2.total_spent as recorded_total,
      COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) ELSE 0 END), 0) as actual_total
    FROM customers c2
    LEFT JOIN lats_sales s ON s.customer_id = c2.id
    GROUP BY c2.id, c2.total_spent
  ) subq
  WHERE subq.id = c.id
    AND ABS(subq.recorded_total - subq.actual_total) > 1000
);

SELECT 
  '✅ Backup Created' as status,
  COUNT(*) as records_backed_up
FROM customers_backup_before_fix
WHERE backup_date > NOW() - INTERVAL '1 minute';

-- ================================================================================
-- PART 3: FIX - Update all customer records
-- ================================================================================

SELECT '=== FIXING ALL CUSTOMER RECORDS ===' as section;

DO $$
DECLARE
  v_customer RECORD;
  v_actual_total NUMERIC;
  v_correct_points INTEGER;
  v_loyalty_level TEXT;
  v_fixed_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  -- Loop through all customers with discrepancies
  FOR v_customer IN (
    SELECT 
      c.id,
      c.name,
      c.phone,
      c.total_spent as recorded_total,
      COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) ELSE 0 END), 0) as actual_total
    FROM customers c
    LEFT JOIN lats_sales s ON s.customer_id = c.id
    GROUP BY c.id, c.name, c.phone, c.total_spent
    HAVING ABS(c.total_spent - COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) ELSE 0 END), 0)) > 1000
  )
  LOOP
    v_actual_total := v_customer.actual_total;
    
    -- Calculate correct points (1 per 1000 TZS)
    v_correct_points := FLOOR(v_actual_total / 1000);
    
    -- Determine loyalty level based on actual spending
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
    WHERE id = v_customer.id;
    
    v_fixed_count := v_fixed_count + 1;
    
    -- Log significant corrections
    IF ABS(v_customer.recorded_total - v_actual_total) > 1000000 THEN
      RAISE NOTICE 'Fixed: % (%) - Total: TSh % → TSh %', 
        v_customer.name, 
        v_customer.phone,
        v_customer.recorded_total, 
        v_actual_total;
    END IF;
  END LOOP;
  
  RAISE NOTICE '=====================================';
  RAISE NOTICE '✅ FIX COMPLETE';
  RAISE NOTICE '📊 Fixed % customer records', v_fixed_count;
  RAISE NOTICE '=====================================';
END $$;

-- ================================================================================
-- PART 4: VERIFICATION - Show fix results
-- ================================================================================

SELECT '=== VERIFICATION: After Fix ===' as section;

-- Check if any corrupted records remain
WITH customer_check AS (
  SELECT 
    c.id,
    c.name,
    c.total_spent as recorded_total,
    COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) ELSE 0 END), 0) as actual_total
  FROM customers c
  LEFT JOIN lats_sales s ON s.customer_id = c.id
  GROUP BY c.id, c.name, c.total_spent
  HAVING ABS(c.total_spent - COALESCE(SUM(CASE WHEN s.status = 'completed' THEN COALESCE(s.final_amount, s.total_amount, 0) ELSE 0 END), 0)) > 1000
)
SELECT 
  'Remaining Corrupted Records' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✅ ALL FIXED' ELSE '⚠️ SOME REMAIN' END as status
FROM customer_check;

-- Show sample of fixed records
SELECT 
  'Sample Fixed Records' as type,
  b.name,
  b.phone,
  b.old_total_spent as before_total,
  c.total_spent as after_total,
  b.old_points as before_points,
  c.points as after_points,
  b.old_loyalty_level as before_loyalty,
  c.loyalty_level as after_loyalty
FROM customers_backup_before_fix b
JOIN customers c ON c.id = b.customer_id
WHERE b.backup_date > NOW() - INTERVAL '1 minute'
ORDER BY ABS(b.old_total_spent - c.total_spent) DESC
LIMIT 10;

-- Summary statistics
SELECT 
  'Fix Summary Statistics' as type,
  COUNT(*) as total_fixed,
  SUM(b.old_total_spent) as total_wrong_amount,
  SUM(c.total_spent) as total_correct_amount,
  SUM(b.old_total_spent - c.total_spent) as total_correction,
  AVG(ABS(b.old_total_spent - c.total_spent)) as avg_correction
FROM customers_backup_before_fix b
JOIN customers c ON c.id = b.customer_id
WHERE b.backup_date > NOW() - INTERVAL '1 minute';

-- ================================================================================
-- PART 5: CLEANUP - Optional cleanup of backup table
-- ================================================================================

-- Uncomment the following to remove old backups (keep only last 30 days)
-- DELETE FROM customers_backup_before_fix
-- WHERE backup_date < NOW() - INTERVAL '30 days';

SELECT '=== FIX COMPLETE ===' as section;
SELECT 
  '✅ All customer records have been recalculated' as status
UNION ALL
SELECT '✅ Loyalty points corrected (1 point per 1000 TZS)'
UNION ALL
SELECT '✅ Loyalty levels adjusted based on actual spending'
UNION ALL
SELECT '✅ Backup created in customers_backup_before_fix table'
UNION ALL
SELECT ''
UNION ALL
SELECT '📋 To view backup: SELECT * FROM customers_backup_before_fix ORDER BY backup_date DESC;';

-- ================================================================================
-- END OF SYSTEM-WIDE FIX
-- ================================================================================

