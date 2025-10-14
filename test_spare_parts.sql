-- ============================================================================
-- TEST SCRIPT: Verify MacBook LCD Spare Parts Import
-- ============================================================================

-- 1. Check if the MacBook LCD Screens category exists
SELECT 'Category Check:' as test_type, 
       name, 
       description, 
       is_active,
       created_at
FROM lats_categories 
WHERE name = 'MacBook LCD Screens';

-- 2. Count total spare parts in the database
SELECT 'Total Spare Parts Count:' as test_type,
       COUNT(*) as total_count
FROM lats_spare_parts;

-- 3. Check MacBook LCD spare parts specifically
SELECT 'MacBook LCD Spare Parts:' as test_type,
       COUNT(*) as macbook_lcd_count
FROM lats_spare_parts sp
JOIN lats_categories c ON sp.category_id = c.id
WHERE c.name = 'MacBook LCD Screens';

-- 4. List all MacBook LCD spare parts with details
SELECT 'MacBook LCD Details:' as test_type,
       sp.name,
       sp.part_number,
       sp.brand,
       sp.condition,
       sp.cost_price,
       sp.selling_price,
       sp.quantity,
       sp.min_quantity,
       sp.location,
       sp.is_active,
       c.name as category_name
FROM lats_spare_parts sp
JOIN lats_categories c ON sp.category_id = c.id
WHERE c.name = 'MacBook LCD Screens'
ORDER BY sp.name;

-- 5. Check for any spare parts with missing category
SELECT 'Missing Category Check:' as test_type,
       COUNT(*) as parts_without_category
FROM lats_spare_parts 
WHERE category_id IS NULL;

-- 6. Summary of spare parts by brand
SELECT 'Spare Parts by Brand:' as test_type,
       brand,
       COUNT(*) as count,
       SUM(quantity) as total_quantity,
       AVG(cost_price) as avg_cost,
       AVG(selling_price) as avg_selling
FROM lats_spare_parts
WHERE brand IS NOT NULL
GROUP BY brand
ORDER BY count DESC;

-- 7. Check spare parts with low stock (quantity <= min_quantity)
SELECT 'Low Stock Alert:' as test_type,
       name,
       part_number,
       quantity,
       min_quantity,
       (min_quantity - quantity) as shortfall
FROM lats_spare_parts
WHERE quantity <= min_quantity
ORDER BY shortfall DESC;
