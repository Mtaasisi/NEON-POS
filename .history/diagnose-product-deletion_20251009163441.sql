-- ============================================================================
-- DIAGNOSE PRODUCT DELETION ISSUES
-- ============================================================================
-- This script helps identify why specific products cannot be deleted
-- Run this BEFORE running fix-product-deletion.sql to see the issues
-- ============================================================================

-- ============================================================================
-- 1. CHECK FOREIGN KEY CONSTRAINTS
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 CHECKING FOREIGN KEY CONSTRAINTS ON PRODUCTS';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;

-- Show all foreign key constraints that reference lats_products
SELECT 
  tc.table_name AS "Table",
  kcu.column_name AS "Column",
  tc.constraint_name AS "Constraint Name",
  rc.delete_rule AS "On Delete Rule"
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'product_id'
  AND EXISTS (
    SELECT 1 
    FROM information_schema.constraint_column_usage ccu 
    WHERE ccu.constraint_name = tc.constraint_name 
    AND ccu.table_name = 'lats_products'
  )
ORDER BY 
  CASE 
    WHEN rc.delete_rule = 'NO ACTION' THEN 1
    WHEN rc.delete_rule = 'RESTRICT' THEN 2
    WHEN rc.delete_rule = 'SET NULL' THEN 3
    WHEN rc.delete_rule = 'CASCADE' THEN 4
    ELSE 5
  END,
  tc.table_name;

-- ============================================================================
-- 2. COUNT PRODUCTS WITH DEPENDENCIES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 COUNTING PRODUCT DEPENDENCIES';
  RAISE NOTICE '=================================';
  RAISE NOTICE '';
END $$;

-- Products with stock movements
WITH product_dependencies AS (
  SELECT 
    p.id,
    p.name,
    p.sku,
    COUNT(DISTINCT sm.id) as stock_movements,
    COUNT(DISTINCT poi.id) as purchase_order_items,
    COUNT(DISTINCT si.id) as sale_items
  FROM lats_products p
  LEFT JOIN lats_stock_movements sm ON p.id = sm.product_id
  LEFT JOIN lats_purchase_order_items poi ON p.id = poi.product_id
  LEFT JOIN lats_sale_items si ON p.id = si.product_id
  GROUP BY p.id, p.name, p.sku
  HAVING 
    COUNT(DISTINCT sm.id) > 0 OR
    COUNT(DISTINCT poi.id) > 0 OR
    COUNT(DISTINCT si.id) > 0
)
SELECT 
  id AS "Product ID",
  name AS "Product Name",
  sku AS "SKU",
  stock_movements AS "Stock Movements",
  purchase_order_items AS "Purchase Orders",
  sale_items AS "Sale Items"
FROM product_dependencies
ORDER BY (stock_movements + purchase_order_items + sale_items) DESC
LIMIT 20;

-- ============================================================================
-- 3. SUMMARY STATISTICS
-- ============================================================================
DO $$
DECLARE
  total_products INTEGER;
  products_with_dependencies INTEGER;
  products_safe_to_delete INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📈 SUMMARY STATISTICS';
  RAISE NOTICE '=====================';
  RAISE NOTICE '';
  
  SELECT COUNT(*) INTO total_products FROM lats_products;
  
  SELECT COUNT(DISTINCT p.id) INTO products_with_dependencies
  FROM lats_products p
  WHERE EXISTS (SELECT 1 FROM lats_stock_movements WHERE product_id = p.id)
     OR EXISTS (SELECT 1 FROM lats_purchase_order_items WHERE product_id = p.id)
     OR EXISTS (SELECT 1 FROM lats_sale_items WHERE product_id = p.id);
  
  products_safe_to_delete := total_products - products_with_dependencies;
  
  RAISE NOTICE 'Total Products: %', total_products;
  RAISE NOTICE 'Products with Dependencies: % (%.1f%%)', 
    products_with_dependencies, 
    (products_with_dependencies::FLOAT / NULLIF(total_products, 0) * 100);
  RAISE NOTICE 'Products Safe to Delete: % (%.1f%%)', 
    products_safe_to_delete,
    (products_safe_to_delete::FLOAT / NULLIF(total_products, 0) * 100);
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- 4. IDENTIFY PROBLEMATIC CONSTRAINTS
-- ============================================================================
DO $$
DECLARE
  constraint_rec RECORD;
  has_issues BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '⚠️  PROBLEMATIC CONSTRAINTS (preventing deletion)';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '';
  
  FOR constraint_rec IN 
    SELECT 
      tc.table_name,
      tc.constraint_name,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints rc 
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'product_id'
      AND rc.delete_rule IN ('NO ACTION', 'RESTRICT')
      AND EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage ccu 
        WHERE ccu.constraint_name = tc.constraint_name 
        AND ccu.table_name = 'lats_products'
      )
  LOOP
    has_issues := TRUE;
    RAISE NOTICE '❌ Table: % | Constraint: % | Rule: %', 
      constraint_rec.table_name, 
      constraint_rec.constraint_name, 
      constraint_rec.delete_rule;
  END LOOP;
  
  IF NOT has_issues THEN
    RAISE NOTICE '✅ No problematic constraints found!';
    RAISE NOTICE 'Products should be deletable now.';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '💡 Solution: Run fix-product-deletion.sql to fix these constraints';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- 5. TEST QUERY - Find products that can be deleted
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ PRODUCTS SAFE TO DELETE (no dependencies)';
  RAISE NOTICE '=============================================';
  RAISE NOTICE '';
END $$;

SELECT 
  p.id AS "Product ID",
  p.name AS "Product Name",
  p.sku AS "SKU",
  p.is_active AS "Active"
FROM lats_products p
WHERE NOT EXISTS (SELECT 1 FROM lats_stock_movements WHERE product_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM lats_purchase_order_items WHERE product_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM lats_sale_items WHERE product_id = p.id)
ORDER BY p.created_at DESC
LIMIT 10;

-- ============================================================================
-- FINAL RECOMMENDATIONS
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📝 RECOMMENDATIONS';
  RAISE NOTICE '==================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Run fix-product-deletion.sql to update foreign key constraints';
  RAISE NOTICE '2. After running the fix, products can be deleted safely';
  RAISE NOTICE '3. Historical records (sales, purchases) will be preserved';
  RAISE NOTICE '4. Product references in history will become NULL';
  RAISE NOTICE '5. Reports will still work because product names are stored';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Always backup your database before making changes!';
  RAISE NOTICE '';
END $$;

