-- ================================================================================
-- 🔧 COMPREHENSIVE FIX FOR INVENTORY AND POS ISSUES
-- ================================================================================
-- This script fixes all database issues preventing products from showing
-- ================================================================================

\echo '🚀 Starting comprehensive database fix...'
\echo ''

-- ================================================================================
-- STEP 1: FIX PRODUCT_IMAGES TABLE - ADD MISSING THUMBNAIL_URL COLUMN
-- ================================================================================

\echo '📸 Step 1: Fixing product_images table...'

-- Create product_images table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES lats_products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name TEXT,
  file_size INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  uploaded_by UUID,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add thumbnail_url column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_images'
        AND column_name = 'thumbnail_url'
    ) THEN
        ALTER TABLE product_images ADD COLUMN thumbnail_url TEXT;
        RAISE NOTICE '✅ Added thumbnail_url column to product_images table';
    ELSE
        RAISE NOTICE '✅ thumbnail_url column already exists in product_images table';
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

\echo '✅ product_images table fixed!'
\echo ''

-- ================================================================================
-- STEP 2: CREATE GENERAL_SETTINGS TABLE
-- ================================================================================

\echo '⚙️  Step 2: Creating general_settings table...'

-- Create the general_settings table (lats_pos_general_settings)
CREATE TABLE IF NOT EXISTS lats_pos_general_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID,
  
  -- Business Information
  business_name TEXT DEFAULT 'My Store',
  business_address TEXT,
  business_phone TEXT,
  business_email TEXT,
  business_website TEXT,
  business_logo TEXT,
  
  -- Interface Settings
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'sw', 'fr')),
  currency TEXT DEFAULT 'TZS',
  timezone TEXT DEFAULT 'Africa/Dar_es_Salaam',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  time_format TEXT DEFAULT '24' CHECK (time_format IN ('12', '24')),
  show_product_images BOOLEAN DEFAULT true,
  show_stock_levels BOOLEAN DEFAULT true,
  show_prices BOOLEAN DEFAULT true,
  show_barcodes BOOLEAN DEFAULT true,
  products_per_page INTEGER DEFAULT 20,
  auto_complete_search BOOLEAN DEFAULT true,
  confirm_delete BOOLEAN DEFAULT true,
  show_confirmations BOOLEAN DEFAULT true,
  enable_sound_effects BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, business_id)
);

-- Also create the alias view for backward compatibility
CREATE OR REPLACE VIEW general_settings AS
SELECT * FROM lats_pos_general_settings;

\echo '✅ general_settings table created!'
\echo ''

-- ================================================================================
-- STEP 3: FIX PRODUCTS - ACTIVATE AND CREATE VARIANTS
-- ================================================================================

\echo '📦 Step 3: Fixing products...'

-- 3.1: Activate all inactive products
UPDATE lats_products
SET is_active = true
WHERE is_active = false OR is_active IS NULL;

\echo '✅ Activated all products'

-- 3.2: Ensure all products have a category
DO $$
DECLARE
    default_category_id uuid;
    uncategorized_count integer;
BEGIN
    -- Check if 'Uncategorized' category exists
    SELECT id INTO default_category_id
    FROM lats_categories
    WHERE LOWER(name) = 'uncategorized'
    LIMIT 1;
    
    -- If not, create it
    IF default_category_id IS NULL THEN
        INSERT INTO lats_categories (name, description, color, icon, is_active)
        VALUES ('Uncategorized', 'Products without a specific category', '#808080', '📦', true)
        RETURNING id INTO default_category_id;
        
        RAISE NOTICE '✅ Created Uncategorized category: %', default_category_id;
    END IF;
    
    -- Assign uncategorized products to the default category
    UPDATE lats_products
    SET category_id = default_category_id
    WHERE category_id IS NULL OR category_id NOT IN (SELECT id FROM lats_categories);
    
    GET DIAGNOSTICS uncategorized_count = ROW_COUNT;
    RAISE NOTICE '✅ Fixed % products with missing categories', uncategorized_count;
END $$;

-- 3.3: Create default variants for products that don't have any
DO $$
DECLARE
    product_record RECORD;
    variant_count integer := 0;
BEGIN
    FOR product_record IN (
        SELECT DISTINCT p.id, p.name, p.sku
        FROM lats_products p
        LEFT JOIN lats_product_variants v ON p.id = v.product_id
        WHERE v.id IS NULL
    ) LOOP
        -- Create a default variant for this product
        INSERT INTO lats_product_variants (
            product_id,
            variant_name,
            sku,
            unit_price,
            cost_price,
            quantity,
            min_quantity,
            is_active
        )
        VALUES (
            product_record.id,
            'Standard',
            product_record.sku || '-STD',
            0,
            0,
            0,
            0,
            true
        )
        ON CONFLICT DO NOTHING;
        
        variant_count := variant_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Created % default variants for products without variants', variant_count;
END $$;

-- 3.4: Update total_quantity for all products based on their variants
UPDATE lats_products p
SET total_quantity = COALESCE((
    SELECT SUM(quantity)
    FROM lats_product_variants
    WHERE product_id = p.id
), 0);

\echo '✅ Updated total quantities for all products'
\echo ''

-- ================================================================================
-- STEP 4: VERIFICATION
-- ================================================================================

\echo '🔍 Step 4: Verification...'
\echo ''

-- Show product status
SELECT 
    '📊 Product Status:' as summary,
    COUNT(*) FILTER (WHERE is_active = true) as active_products,
    COUNT(*) FILTER (WHERE category_id IS NOT NULL) as products_with_category,
    COUNT(*) as total_products
FROM lats_products;

-- Show products with variants
SELECT 
    '📦 Products with Variants:' as summary,
    COUNT(DISTINCT product_id) as products_with_variants
FROM lats_product_variants;

-- Show product_images table status
SELECT 
    '📸 Product Images Table:' as summary,
    COUNT(*) as total_images,
    COUNT(*) FILTER (WHERE thumbnail_url IS NOT NULL) as images_with_thumbnails
FROM product_images;

-- Check if general_settings table exists
SELECT 
    '⚙️  General Settings Table:' as summary,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_pos_general_settings') 
        THEN 'EXISTS ✅'
        ELSE 'MISSING ❌'
    END as status;

\echo ''
\echo '✅ ALL FIXES COMPLETE!'
\echo ''
\echo '🎉 Next steps:'
\echo '   1. Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)'
\echo '   2. Products should now appear in inventory and POS!'
\echo ''

-- Show active products that should now be visible
\echo '📋 Active products ready to show:'
\echo ''

SELECT 
    p.name,
    p.sku,
    c.name as category,
    p.total_quantity as stock,
    (SELECT COUNT(*) FROM lats_product_variants WHERE product_id = p.id) as variants,
    (SELECT COUNT(*) FROM product_images WHERE product_id = p.id) as images
FROM lats_products p
LEFT JOIN lats_categories c ON p.category_id = c.id
WHERE p.is_active = true
ORDER BY p.created_at DESC
LIMIT 20;

