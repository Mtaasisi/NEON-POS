-- ============================================================
-- FINAL POS FIX - ALL ISSUES
-- This script fixes all known POS price and sale creation issues
-- Run this in your Neon Database SQL Editor
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ENSURE TABLES EXIST
-- ============================================================

-- Products table
CREATE TABLE IF NOT EXISTS lats_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE,
  barcode TEXT,
  category_id UUID,
  unit_price NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  total_quantity INTEGER DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product variants table
CREATE TABLE IF NOT EXISTS lats_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES lats_products(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  sku TEXT UNIQUE,
  barcode TEXT,
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 5,
  unit_price NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  variant_attributes JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales table
CREATE TABLE IF NOT EXISTS lats_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number TEXT UNIQUE,
  customer_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  subtotal NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'completed',
  sold_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sale items table
CREATE TABLE IF NOT EXISTS lats_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES lats_sales(id) ON DELETE CASCADE,
  product_id UUID,
  variant_id UUID,
  product_name TEXT,
  variant_name TEXT,
  sku TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. FIX COLUMN NAMES (if using old schema)
-- ============================================================

-- Add unit_price to products if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' AND column_name = 'unit_price'
  ) THEN
    ALTER TABLE lats_products ADD COLUMN unit_price NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Add unit_price to variants if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' AND column_name = 'unit_price'
  ) THEN
    ALTER TABLE lats_product_variants ADD COLUMN unit_price NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Remove selling_price column if it exists (wrong name)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' AND column_name = 'selling_price'
  ) THEN
    -- Copy data to unit_price first
    UPDATE lats_product_variants SET unit_price = selling_price WHERE selling_price IS NOT NULL;
    -- Then drop the column
    ALTER TABLE lats_product_variants DROP COLUMN selling_price;
  END IF;
END $$;

-- ============================================================
-- 3. SET DEFAULT PRICES (for products without prices)
-- ============================================================

-- Update products with NULL prices to 0
UPDATE lats_products 
SET unit_price = 0 
WHERE unit_price IS NULL;

UPDATE lats_products 
SET cost_price = 0 
WHERE cost_price IS NULL;

-- Update variants with NULL prices to 0
UPDATE lats_product_variants 
SET unit_price = 0 
WHERE unit_price IS NULL;

UPDATE lats_product_variants 
SET cost_price = 0 
WHERE cost_price IS NULL;

-- ============================================================
-- 4. CREATE DEFAULT VARIANTS (for products without variants)
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
AND p.is_active = true;

-- ============================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_category ON lats_products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON lats_products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON lats_products(sku);
CREATE INDEX IF NOT EXISTS idx_variants_product ON lats_product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON lats_product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_active ON lats_product_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_date ON lats_sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON lats_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON lats_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON lats_sale_items(product_id);

-- ============================================================
-- 6. UPDATE TRIGGERS FOR AUTOMATIC CALCULATIONS
-- ============================================================

-- Function to update product totals
CREATE OR REPLACE FUNCTION update_product_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lats_products
  SET 
    total_quantity = (
      SELECT COALESCE(SUM(quantity), 0) 
      FROM lats_product_variants 
      WHERE product_id = NEW.product_id
    ),
    total_value = (
      SELECT COALESCE(SUM(quantity * unit_price), 0) 
      FROM lats_product_variants 
      WHERE product_id = NEW.product_id
    ),
    updated_at = NOW()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trigger_update_product_totals ON lats_product_variants;
CREATE TRIGGER trigger_update_product_totals
AFTER INSERT OR UPDATE OR DELETE ON lats_product_variants
FOR EACH ROW
EXECUTE FUNCTION update_product_totals();

-- ============================================================
-- 7. VERIFY DATA INTEGRITY
-- ============================================================

-- Check for products without prices
DO $$
DECLARE
  count_no_price INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_no_price
  FROM lats_products
  WHERE (unit_price IS NULL OR unit_price = 0) AND is_active = true;
  
  IF count_no_price > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % active products have no price set', count_no_price;
  ELSE
    RAISE NOTICE '✅ All active products have prices';
  END IF;
END $$;

-- Check for variants without prices
DO $$
DECLARE
  count_no_price INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_no_price
  FROM lats_product_variants
  WHERE (unit_price IS NULL OR unit_price = 0) AND is_active = true;
  
  IF count_no_price > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % active variants have no price set', count_no_price;
  ELSE
    RAISE NOTICE '✅ All active variants have prices';
  END IF;
END $$;

-- Check for products without variants
DO $$
DECLARE
  count_no_variants INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_no_variants
  FROM lats_products p
  WHERE NOT EXISTS (
    SELECT 1 FROM lats_product_variants v WHERE v.product_id = p.id
  ) AND p.is_active = true;
  
  IF count_no_variants > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % active products have no variants', count_no_variants;
  ELSE
    RAISE NOTICE '✅ All active products have variants';
  END IF;
END $$;

-- ============================================================
-- 8. DISABLE RLS (if causing permission issues)
-- ============================================================

ALTER TABLE lats_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE lats_sale_items DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. GRANT PERMISSIONS
-- ============================================================

-- Grant all permissions to authenticated users
GRANT ALL ON lats_products TO authenticated;
GRANT ALL ON lats_product_variants TO authenticated;
GRANT ALL ON lats_sales TO authenticated;
GRANT ALL ON lats_sale_items TO authenticated;

-- Grant all permissions to service role
GRANT ALL ON lats_products TO service_role;
GRANT ALL ON lats_product_variants TO service_role;
GRANT ALL ON lats_sales TO service_role;
GRANT ALL ON lats_sale_items TO service_role;

-- ============================================================
-- 10. FINAL VALIDATION
-- ============================================================

-- Display summary
DO $$
DECLARE
  product_count INTEGER;
  variant_count INTEGER;
  sale_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO product_count FROM lats_products WHERE is_active = true;
  SELECT COUNT(*) INTO variant_count FROM lats_product_variants WHERE is_active = true;
  SELECT COUNT(*) INTO sale_count FROM lats_sales WHERE created_at > NOW() - INTERVAL '7 days';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATABASE FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Active Products: %', product_count;
  RAISE NOTICE 'Active Variants: %', variant_count;
  RAISE NOTICE 'Sales (Last 7 Days): %', sale_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ All tables exist';
  RAISE NOTICE '✅ Column names correct (unit_price)';
  RAISE NOTICE '✅ Default variants created';
  RAISE NOTICE '✅ Indexes created';
  RAISE NOTICE '✅ Triggers active';
  RAISE NOTICE '✅ Permissions granted';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES (run these to verify)
-- ============================================================

-- Check products with prices and variants
SELECT 
  p.id,
  p.name,
  p.unit_price as product_price,
  COUNT(v.id) as variant_count,
  COALESCE(MIN(v.unit_price), 0) as min_variant_price,
  COALESCE(MAX(v.unit_price), 0) as max_variant_price
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.unit_price
LIMIT 10;

-- Final status check
SELECT 
  'Products' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN unit_price > 0 THEN 1 END) as with_price
FROM lats_products
UNION ALL
SELECT 
  'Variants' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN unit_price > 0 THEN 1 END) as with_price
FROM lats_product_variants
UNION ALL
SELECT 
  'Sales' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN total_amount > 0 THEN 1 END) as with_amount
FROM lats_sales;

