-- Check 1: How many branches do you have?
SELECT 
  'Total Branches' as check_item,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 2 THEN '✅ Ready for transfers'
    ELSE '❌ Need at least 2 branches'
  END as status
FROM store_locations 
WHERE is_active = true;

-- Check 2: List all active branches
SELECT 
  name as branch_name,
  city,
  is_main,
  CASE 
    WHEN is_main THEN '🏢 Main Branch'
    ELSE '🏪 Branch'
  END as type
FROM store_locations 
WHERE is_active = true
ORDER BY is_main DESC, name;

-- Check 3: Check if you have products with stock
SELECT 
  COUNT(DISTINCT pv.id) as total_products_with_stock,
  COUNT(DISTINCT pv.branch_id) as branches_with_stock,
  SUM(pv.quantity) as total_stock_units
FROM product_variants pv
WHERE pv.quantity > 0;
