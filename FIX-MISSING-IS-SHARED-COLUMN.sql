-- ============================================
-- FIX MISSING is_shared COLUMN
-- ============================================
-- This script ensures the is_shared column exists
-- which is needed for branch filtering
-- ============================================

BEGIN;

-- Check and add is_shared column to lats_products
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_products' AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE lats_products ADD COLUMN is_shared BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ Added is_shared column to lats_products';
  ELSE
    RAISE NOTICE '✓ is_shared column already exists in lats_products';
  END IF;
END $$;

-- Check and add is_shared column to lats_product_variants
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE lats_product_variants ADD COLUMN is_shared BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ Added is_shared column to lats_product_variants';
  ELSE
    RAISE NOTICE '✓ is_shared column already exists in lats_product_variants';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_is_shared ON lats_products(is_shared);
CREATE INDEX IF NOT EXISTS idx_variants_is_shared ON lats_product_variants(is_shared);

-- Set default values for existing products
-- By default, make all existing products shared (visible to all branches)
UPDATE lats_products 
SET is_shared = true
WHERE is_shared IS NULL;

UPDATE lats_product_variants 
SET is_shared = true
WHERE is_shared IS NULL;

COMMIT;

-- Verification
SELECT '✅ COLUMN FIX COMPLETE!' as status;

SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('lats_products', 'lats_product_variants')
  AND column_name IN ('is_shared', 'branch_id')
ORDER BY table_name, column_name;

SELECT '✅ Please refresh your browser now!' as action;

