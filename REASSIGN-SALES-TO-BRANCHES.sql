-- ============================================
-- REASSIGN SALES TO BRANCHES FOR TESTING
-- ============================================
-- This script redistributes existing sales from Main Store
-- across all branches to test branch isolation
-- ============================================

-- First, rollback any pending transaction
ROLLBACK;

-- Show current distribution
SELECT 
  '📊 CURRENT SALES DISTRIBUTION (BEFORE)' as status,
  sl.name as branch_name,
  sl.code as branch_code,
  COUNT(ls.id) as sales_count
FROM store_locations sl
LEFT JOIN lats_sales ls ON ls.branch_id = sl.id
WHERE sl.is_active = true
GROUP BY sl.id, sl.name, sl.code
ORDER BY sales_count DESC;

-- ============================================
-- OPTION 1: DISTRIBUTE SALES EVENLY
-- ============================================
-- This will split the 20 sales across 3 branches
-- Main Store: 7 sales, ARUSHA: 7 sales, Airport: 6 sales
-- ============================================

DO $$
DECLARE
  main_store_id UUID;
  arusha_id UUID;
  airport_id UUID;
  sales_to_arusha UUID[];
  sales_to_airport UUID[];
BEGIN
  -- Get branch IDs
  SELECT id INTO main_store_id FROM store_locations WHERE code = 'MAIN-001';
  SELECT id INTO arusha_id FROM store_locations WHERE code = 'SADSAD';
  SELECT id INTO airport_id FROM store_locations WHERE code = 'APT-001';

  IF main_store_id IS NULL OR arusha_id IS NULL OR airport_id IS NULL THEN
    RAISE EXCEPTION '❌ Could not find all branches!';
  END IF;

  RAISE NOTICE '🏪 Branch IDs:';
  RAISE NOTICE '   Main Store: %', main_store_id;
  RAISE NOTICE '   ARUSHA: %', arusha_id;
  RAISE NOTICE '   Airport: %', airport_id;

  -- Get 7 sales to move to ARUSHA (middle sales by date)
  SELECT ARRAY_AGG(id) INTO sales_to_arusha
  FROM (
    SELECT id 
    FROM lats_sales 
    WHERE branch_id = main_store_id
    ORDER BY created_at DESC
    OFFSET 7
    LIMIT 7
  ) AS subquery;

  -- Get 6 sales to move to Airport (oldest sales)
  SELECT ARRAY_AGG(id) INTO sales_to_airport
  FROM (
    SELECT id 
    FROM lats_sales 
    WHERE branch_id = main_store_id
    ORDER BY created_at ASC
    LIMIT 6
  ) AS subquery;

  -- Move sales to ARUSHA
  IF sales_to_arusha IS NOT NULL THEN
    UPDATE lats_sales 
    SET branch_id = arusha_id,
        updated_at = NOW()
    WHERE id = ANY(sales_to_arusha);
    
    RAISE NOTICE '✅ Moved % sales to ARUSHA', array_length(sales_to_arusha, 1);
  ELSE
    RAISE NOTICE '⚠️ No sales to move to ARUSHA';
  END IF;

  -- Move sales to Airport
  IF sales_to_airport IS NOT NULL THEN
    UPDATE lats_sales 
    SET branch_id = airport_id,
        updated_at = NOW()
    WHERE id = ANY(sales_to_airport);
    
    RAISE NOTICE '✅ Moved % sales to Airport Branch', array_length(sales_to_airport, 1);
  ELSE
    RAISE NOTICE '⚠️ No sales to move to Airport';
  END IF;

  RAISE NOTICE '🎉 Sales redistribution complete!';
END $$;


-- ============================================
-- VERIFY NEW DISTRIBUTION
-- ============================================

SELECT 
  '✅ NEW SALES DISTRIBUTION (AFTER)' as status,
  sl.name as branch_name,
  sl.code as branch_code,
  sl.id as branch_id,
  COUNT(ls.id) as sales_count,
  ROUND(SUM(ls.total_amount)::numeric, 2) as total_amount,
  MIN(ls.created_at) as oldest_sale,
  MAX(ls.created_at) as newest_sale
FROM store_locations sl
LEFT JOIN lats_sales ls ON ls.branch_id = sl.id
WHERE sl.is_active = true
GROUP BY sl.id, sl.name, sl.code
ORDER BY sales_count DESC;


-- ============================================
-- SHOW SAMPLE SALES PER BRANCH
-- ============================================

SELECT 
  '📋 SAMPLE SALES BY BRANCH' as status,
  sl.name as branch_name,
  ls.sale_number,
  ls.total_amount,
  ls.payment_method,
  ls.created_at::date as sale_date
FROM lats_sales ls
JOIN store_locations sl ON sl.id = ls.branch_id
WHERE sl.is_active = true
ORDER BY sl.name, ls.created_at DESC;


-- ============================================
-- OPTIONAL: ROLLBACK SCRIPT (SAVE FOR LATER)
-- ============================================
-- If you want to undo this and put all sales back in Main Store:
--
-- DO $$
-- DECLARE
--   main_store_id UUID;
-- BEGIN
--   SELECT id INTO main_store_id FROM store_locations WHERE code = 'MAIN-001';
--   
--   UPDATE lats_sales 
--   SET branch_id = main_store_id,
--       updated_at = NOW()
--   WHERE branch_id != main_store_id;
--   
--   RAISE NOTICE '✅ All sales moved back to Main Store';
-- END $$;


-- ============================================
-- ✅ COMPLETE!
-- ============================================

SELECT '✅ Sales have been redistributed across branches!' as final_status;
SELECT '🔄 Please refresh your POS to see the changes.' as action_required;
SELECT '🏪 Switch to ARUSHA branch to view its 7 sales!' as next_step;


