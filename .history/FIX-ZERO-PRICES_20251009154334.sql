-- ================================================================================
-- FIX ZERO PRICES IN POS SYSTEM
-- ================================================================================
-- This script fixes products with zero or null prices that cause
-- the "Invalid cart items found" error in the POS system
-- ================================================================================

-- BACKUP FIRST!
-- Create a backup table before making changes
CREATE TABLE IF NOT EXISTS lats_products_price_backup AS
SELECT id, name, unit_price, cost_price, created_at
FROM lats_products;

CREATE TABLE IF NOT EXISTS lats_product_variants_price_backup AS
SELECT id, product_id, variant_name, unit_price, cost_price, created_at
FROM lats_product_variants;

-- ================================================================================
-- OPTION 1: Set default prices for products with zero/null prices
-- ================================================================================
-- This sets a reasonable default price. Adjust the price as needed.

-- Fix products with null or zero unit_price
-- Set a default price if cost_price exists, otherwise set 1000 TZS
UPDATE lats_products
SET unit_price = CASE 
    WHEN cost_price > 0 THEN cost_price * 1.3  -- 30% markup
    ELSE 1000  -- Default minimum price
END,
updated_at = NOW()
WHERE unit_price IS NULL OR unit_price = 0 OR unit_price < 0;

-- Fix product variants with null or zero unit_price
-- Set price from product or use default
UPDATE lats_product_variants pv
SET unit_price = CASE 
    WHEN pv.cost_price > 0 THEN pv.cost_price * 1.3  -- 30% markup
    WHEN p.unit_price > 0 THEN p.unit_price  -- Use product price
    WHEN p.cost_price > 0 THEN p.cost_price * 1.3  -- Use product cost with markup
    ELSE 1000  -- Default minimum price
END,
updated_at = NOW()
FROM lats_products p
WHERE pv.product_id = p.id
  AND (pv.unit_price IS NULL OR pv.unit_price = 0 OR pv.unit_price < 0);

-- ================================================================================
-- OPTION 2: Fix specific product (Sony WH-1000XM5 Headphones)
-- ================================================================================
-- Set a proper price for the Sony headphones

-- Update the Sony WH-1000XM5 product
UPDATE lats_products
SET 
    unit_price = 350000,  -- 350,000 TZS (adjust as needed)
    cost_price = CASE WHEN cost_price = 0 OR cost_price IS NULL THEN 270000 ELSE cost_price END,
    updated_at = NOW()
WHERE name ILIKE '%Sony%WH-1000XM5%'
   OR name ILIKE '%Sony WH-1000XM5%';

-- Update the Sony WH-1000XM5 variants
UPDATE lats_product_variants pv
SET 
    unit_price = 350000,  -- 350,000 TZS (adjust as needed)
    cost_price = CASE WHEN pv.cost_price = 0 OR pv.cost_price IS NULL THEN 270000 ELSE pv.cost_price END,
    updated_at = NOW()
FROM lats_products p
WHERE pv.product_id = p.id
  AND (p.name ILIKE '%Sony%WH-1000XM5%' OR p.name ILIKE '%Sony WH-1000XM5%');

-- ================================================================================
-- VERIFICATION QUERIES
-- ================================================================================

-- Verify products now have prices
SELECT 
    'After Fix - Products' as check_type,
    COUNT(*) as total_products,
    COUNT(CASE WHEN unit_price > 0 THEN 1 END) as products_with_price,
    COUNT(CASE WHEN unit_price IS NULL OR unit_price = 0 THEN 1 END) as products_without_price
FROM lats_products;

-- Verify variants now have prices
SELECT 
    'After Fix - Variants' as check_type,
    COUNT(*) as total_variants,
    COUNT(CASE WHEN unit_price > 0 THEN 1 END) as variants_with_price,
    COUNT(CASE WHEN unit_price IS NULL OR unit_price = 0 THEN 1 END) as variants_without_price
FROM lats_product_variants;

-- Check the Sony product specifically
SELECT 
    'Sony WH-1000XM5 After Fix' as check_type,
    p.name,
    p.unit_price as product_price,
    p.cost_price as product_cost,
    pv.variant_name,
    pv.unit_price as variant_price,
    pv.cost_price as variant_cost
FROM lats_products p
LEFT JOIN lats_product_variants pv ON pv.product_id = p.id
WHERE p.name ILIKE '%Sony%WH-1000XM5%'
   OR p.name ILIKE '%Sony WH-1000XM5%';

-- ================================================================================
-- OPTIONAL: Rollback if needed
-- ================================================================================
-- Uncomment these lines if you need to rollback the changes

-- UPDATE lats_products p
-- SET unit_price = b.unit_price, cost_price = b.cost_price
-- FROM lats_products_price_backup b
-- WHERE p.id = b.id;

-- UPDATE lats_product_variants pv
-- SET unit_price = b.unit_price, cost_price = b.cost_price
-- FROM lats_product_variants_price_backup b
-- WHERE pv.id = b.id;

-- ================================================================================
-- CLEANUP BACKUP TABLES (after verifying fix works)
-- ================================================================================
-- Uncomment these lines after verifying the fix works

-- DROP TABLE IF EXISTS lats_products_price_backup;
-- DROP TABLE IF EXISTS lats_product_variants_price_backup;

