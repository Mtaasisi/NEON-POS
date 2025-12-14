-- ================================================
-- FIX: Add category column to lats_products table
-- ================================================
-- This fixes the error: column "category" does not exist
-- Used by: SalesByCategoryChart.tsx and TopProductsWidget.tsx
-- ================================================

-- Add category text column to lats_products if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_products' 
        AND column_name = 'category'
    ) THEN
        -- Add the category text column
        ALTER TABLE lats_products 
        ADD COLUMN category TEXT;
        
        RAISE NOTICE '✅ Added category column to lats_products';
    ELSE
        RAISE NOTICE '⚠️ category column already exists in lats_products';
    END IF;
END $$;

-- Populate category text from category_id join
UPDATE lats_products p
SET category = c.name
FROM lats_categories c
WHERE p.category_id = c.id
AND p.category IS NULL;

-- Set default for products without a category
UPDATE lats_products
SET category = 'Uncategorized'
WHERE category IS NULL;

-- Create a trigger to automatically update category text when category_id changes
CREATE OR REPLACE FUNCTION sync_product_category()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.category_id IS NOT NULL THEN
        SELECT name INTO NEW.category
        FROM lats_categories
        WHERE id = NEW.category_id;
    ELSE
        NEW.category := 'Uncategorized';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_sync_product_category ON lats_products;
CREATE TRIGGER trigger_sync_product_category
    BEFORE INSERT OR UPDATE OF category_id ON lats_products
    FOR EACH ROW
    EXECUTE FUNCTION sync_product_category();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_products_category_text ON lats_products(category);

-- Verify the fix
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'lats_products' AND column_name = 'category';
    
    IF col_count > 0 THEN
        RAISE NOTICE '================================================';
        RAISE NOTICE '✅ SUCCESS: category column exists in lats_products';
        RAISE NOTICE '================================================';
    ELSE
        RAISE EXCEPTION '❌ FAILED: category column was not created';
    END IF;
END $$;

