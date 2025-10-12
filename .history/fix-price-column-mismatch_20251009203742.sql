-- ================================================================================
-- FIX PRICE COLUMN NAME MISMATCH
-- ================================================================================
-- This script fixes the column name mismatch between frontend and database:
-- - Frontend was saving to 'selling_price' 
-- - Database uses 'unit_price'
-- - This causes prices not to show up after saving
-- ================================================================================

-- Step 1: Check current column names
SELECT 
    'CURRENT COLUMNS - lats_products' as check_type,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'lats_products'
  AND column_name IN ('unit_price', 'selling_price')
ORDER BY column_name;

SELECT 
    'CURRENT COLUMNS - lats_product_variants' as check_type,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
  AND column_name IN ('unit_price', 'selling_price')
ORDER BY column_name;

-- ================================================================================
-- Step 2: Ensure unit_price column exists in lats_products
-- ================================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' AND column_name = 'unit_price'
  ) THEN
    ALTER TABLE lats_products ADD COLUMN unit_price NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added unit_price column to lats_products';
  ELSE
    RAISE NOTICE '✓ unit_price column already exists in lats_products';
  END IF;
END $$;

-- ================================================================================
-- Step 3: Ensure unit_price column exists in lats_product_variants
-- ================================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' AND column_name = 'unit_price'
  ) THEN
    ALTER TABLE lats_product_variants ADD COLUMN unit_price NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added unit_price column to lats_product_variants';
  ELSE
    RAISE NOTICE '✓ unit_price column already exists in lats_product_variants';
  END IF;
END $$;

-- ================================================================================
-- Step 4: Copy data from selling_price to unit_price (if selling_price exists)
-- ================================================================================

-- For lats_products table
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' AND column_name = 'selling_price'
  ) THEN
    -- Copy non-zero prices from selling_price to unit_price
    UPDATE lats_products 
    SET unit_price = selling_price
    WHERE selling_price IS NOT NULL 
      AND selling_price > 0
      AND (unit_price IS NULL OR unit_price = 0);
    
    RAISE NOTICE '✅ Copied prices from selling_price to unit_price in lats_products';
  ELSE
    RAISE NOTICE '✓ No selling_price column in lats_products to copy from';
  END IF;
END $$;

-- For lats_product_variants table
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' AND column_name = 'selling_price'
  ) THEN
    -- Copy non-zero prices from selling_price to unit_price
    UPDATE lats_product_variants 
    SET unit_price = selling_price
    WHERE selling_price IS NOT NULL 
      AND selling_price > 0
      AND (unit_price IS NULL OR unit_price = 0);
    
    RAISE NOTICE '✅ Copied prices from selling_price to unit_price in lats_product_variants';
  ELSE
    RAISE NOTICE '✓ No selling_price column in lats_product_variants to copy from';
  END IF;
END $$;

-- ================================================================================
-- Step 5: Verify the fix
-- ================================================================================

-- Check products with prices
SELECT 
    'PRODUCTS WITH PRICES' as check_type,
    COUNT(*) as total_products,
    COUNT(CASE WHEN unit_price > 0 THEN 1 END) as products_with_unit_price,
    COUNT(CASE WHEN unit_price IS NULL OR unit_price = 0 THEN 1 END) as products_without_price
FROM lats_products;

-- Check variants with prices
SELECT 
    'VARIANTS WITH PRICES' as check_type,
    COUNT(*) as total_variants,
    COUNT(CASE WHEN unit_price > 0 THEN 1 END) as variants_with_unit_price,
    COUNT(CASE WHEN unit_price IS NULL OR unit_price = 0 THEN 1 END) as variants_without_price
FROM lats_product_variants;

-- Show sample products with their prices
SELECT 
    'SAMPLE PRODUCTS' as check_type,
    id,
    name,
    sku,
    unit_price,
    cost_price
FROM lats_products
ORDER BY created_at DESC
LIMIT 10;

-- Show sample variants with their prices
SELECT 
    'SAMPLE VARIANTS' as check_type,
    pv.id,
    pv.sku,
    pv.name as variant_name,
    pv.unit_price,
    pv.cost_price,
    p.name as product_name
FROM lats_product_variants pv
LEFT JOIN lats_products p ON p.id = pv.product_id
ORDER BY pv.created_at DESC
LIMIT 10;

-- ================================================================================
-- Step 6: OPTIONAL - Drop selling_price columns (uncomment if you want to remove)
-- ================================================================================
-- Only run this after verifying unit_price has all the data and system works

-- DO $$ 
-- BEGIN
--   IF EXISTS (
--     SELECT 1 FROM information_schema.columns 
--     WHERE table_name = 'lats_products' AND column_name = 'selling_price'
--   ) THEN
--     ALTER TABLE lats_products DROP COLUMN selling_price;
--     RAISE NOTICE '✅ Dropped selling_price column from lats_products';
--   END IF;
-- END $$;

-- DO $$ 
-- BEGIN
--   IF EXISTS (
--     SELECT 1 FROM information_schema.columns 
--     WHERE table_name = 'lats_product_variants' AND column_name = 'selling_price'
--   ) THEN
--     ALTER TABLE lats_product_variants DROP COLUMN selling_price;
--     RAISE NOTICE '✅ Dropped selling_price column from lats_product_variants';
--   END IF;
-- END $$;

-- ================================================================================
-- Summary
-- ================================================================================
-- This script:
-- 1. Ensures unit_price column exists in both tables
-- 2. Copies any data from selling_price to unit_price (if selling_price exists)
-- 3. Verifies the data migration
-- 4. Optionally drops the old selling_price columns (commented out for safety)
--
-- After running this script:
-- - All prices will be in the unit_price column
-- - Frontend (now fixed) will save to unit_price
-- - Frontend will read from unit_price
-- - Prices will display correctly
-- ================================================================================

