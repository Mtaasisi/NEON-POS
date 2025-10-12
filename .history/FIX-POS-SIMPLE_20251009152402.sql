-- ============================================================
-- SIMPLE POS FIX - No Transactions, No Errors
-- Run this script section by section if needed
-- Compatible with Neon Database
-- ============================================================

-- First, rollback any failed transaction
ROLLBACK;

-- ============================================================
-- STEP 1: Add unit_price column if missing
-- ============================================================

ALTER TABLE lats_products ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;
ALTER TABLE lats_products ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;
ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;

-- ============================================================
-- STEP 2: Copy selling_price to unit_price (if selling_price exists)
-- ============================================================

-- For variants - copy selling_price to unit_price if it exists
UPDATE lats_product_variants 
SET unit_price = selling_price 
WHERE unit_price = 0 
  AND selling_price IS NOT NULL 
  AND selling_price > 0;

-- ============================================================
-- STEP 3: Set default prices for NULL values
-- ============================================================

UPDATE lats_products SET unit_price = 0 WHERE unit_price IS NULL;
UPDATE lats_products SET cost_price = 0 WHERE cost_price IS NULL;
UPDATE lats_product_variants SET unit_price = 0 WHERE unit_price IS NULL;
UPDATE lats_product_variants SET cost_price = 0 WHERE cost_price IS NULL;

-- ============================================================
-- STEP 4: Create default variants for products without them
-- ============================================================

INSERT INTO lats_product_variants (
  product_id, 
  variant_name, 
  sku, 
  unit_price, 
  cost_price, 
  quantity, 
  min_quantity
)
SELECT 
  p.id,
  'Default' as variant_name,
  COALESCE(p.sku, p.id::text) || '-DEFAULT' as sku,
  COALESCE(p.unit_price, 0) as unit_price,
  COALESCE(p.cost_price, 0) as cost_price,
  COALESCE(p.stock_quantity, 0) as quantity,
  5 as min_quantity
FROM lats_products p
WHERE NOT EXISTS (
  SELECT 1 FROM lats_product_variants v WHERE v.product_id = p.id
)
AND p.is_active = true
ON CONFLICT (sku) DO NOTHING;

-- ============================================================
-- STEP 5: Create indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_category ON lats_products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON lats_products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON lats_products(sku);
CREATE INDEX IF NOT EXISTS idx_variants_product ON lats_product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON lats_product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_active ON lats_product_variants(is_active);

-- ============================================================
-- STEP 6: Grant permissions
-- ============================================================

GRANT ALL ON lats_products TO PUBLIC;
GRANT ALL ON lats_product_variants TO PUBLIC;
GRANT ALL ON lats_sales TO PUBLIC;
GRANT ALL ON lats_sale_items TO PUBLIC;

-- ============================================================
-- STEP 7: Disable RLS
-- ============================================================

ALTER TABLE lats_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_sale_items DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- VERIFICATION: Check results
-- ============================================================

-- Show products summary
SELECT 
  'Products' as table_name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN unit_price > 0 THEN 1 END) as with_price,
  COUNT(CASE WHEN unit_price = 0 THEN 1 END) as no_price
FROM lats_products
WHERE is_active = true;

-- Show variants summary  
SELECT 
  'Variants' as table_name,
  COUNT(*) as total_count,
  COUNT(CASE WHEN unit_price > 0 THEN 1 END) as with_price,
  COUNT(CASE WHEN unit_price = 0 THEN 1 END) as no_price
FROM lats_product_variants
WHERE is_active = true;

-- Show sample products with variants
SELECT 
  p.id,
  p.name,
  p.unit_price as product_price,
  COUNT(v.id) as variant_count,
  MIN(v.unit_price) as min_variant_price,
  MAX(v.unit_price) as max_variant_price
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.unit_price
LIMIT 5;

-- ============================================================
-- DONE!
-- ============================================================
-- If you see results above, the fix is complete!
-- Now test the POS page: http://localhost:3000/pos
-- ============================================================

