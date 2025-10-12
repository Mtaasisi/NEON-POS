-- ============================================================================
-- FIX PRODUCT DELETION ISSUES
-- ============================================================================
-- This script fixes foreign key constraints that prevent products from being deleted
-- Run this in your Neon Database SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FIX lats_stock_movements foreign key
-- ============================================================================
-- Drop existing constraint and recreate with SET NULL (preserve history)
DO $$
BEGIN
  -- Drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lats_stock_movements_product_id_fkey'
    AND table_name = 'lats_stock_movements'
  ) THEN
    ALTER TABLE lats_stock_movements 
    DROP CONSTRAINT lats_stock_movements_product_id_fkey;
    RAISE NOTICE '✅ Dropped old lats_stock_movements_product_id_fkey constraint';
  END IF;

  -- Add new constraint with SET NULL to preserve history
  ALTER TABLE lats_stock_movements 
  ADD CONSTRAINT lats_stock_movements_product_id_fkey 
  FOREIGN KEY (product_id) 
  REFERENCES lats_products(id) 
  ON DELETE SET NULL;
  
  RAISE NOTICE '✅ Added lats_stock_movements_product_id_fkey with ON DELETE SET NULL';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Issue with lats_stock_movements: %', SQLERRM;
END $$;

-- ============================================================================
-- 2. FIX lats_purchase_order_items foreign key
-- ============================================================================
-- Drop existing constraint and recreate with SET NULL (preserve purchase history)
DO $$
BEGIN
  -- Drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lats_purchase_order_items_product_id_fkey'
    AND table_name = 'lats_purchase_order_items'
  ) THEN
    ALTER TABLE lats_purchase_order_items 
    DROP CONSTRAINT lats_purchase_order_items_product_id_fkey;
    RAISE NOTICE '✅ Dropped old lats_purchase_order_items_product_id_fkey constraint';
  END IF;

  -- Add new constraint with SET NULL to preserve purchase order history
  ALTER TABLE lats_purchase_order_items 
  ADD CONSTRAINT lats_purchase_order_items_product_id_fkey 
  FOREIGN KEY (product_id) 
  REFERENCES lats_products(id) 
  ON DELETE SET NULL;
  
  RAISE NOTICE '✅ Added lats_purchase_order_items_product_id_fkey with ON DELETE SET NULL';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Issue with lats_purchase_order_items: %', SQLERRM;
END $$;

-- ============================================================================
-- 3. FIX lats_sale_items foreign key
-- ============================================================================
-- Drop existing constraint and recreate with SET NULL (preserve sales history)
DO $$
BEGIN
  -- Drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lats_sale_items_product_id_fkey'
    AND table_name = 'lats_sale_items'
  ) THEN
    ALTER TABLE lats_sale_items 
    DROP CONSTRAINT lats_sale_items_product_id_fkey;
    RAISE NOTICE '✅ Dropped old lats_sale_items_product_id_fkey constraint';
  END IF;

  -- Add new constraint with SET NULL to preserve sales history
  -- Note: lats_sale_items already has product_name, so losing the FK is acceptable
  ALTER TABLE lats_sale_items 
  ADD CONSTRAINT lats_sale_items_product_id_fkey 
  FOREIGN KEY (product_id) 
  REFERENCES lats_products(id) 
  ON DELETE SET NULL;
  
  RAISE NOTICE '✅ Added lats_sale_items_product_id_fkey with ON DELETE SET NULL';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Issue with lats_sale_items: %', SQLERRM;
END $$;

-- ============================================================================
-- 4. VERIFY ALL PRODUCT-RELATED CONSTRAINTS
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '📋 Current product foreign key constraints:';
  
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Checking all tables that reference lats_products...';
END $$;

-- Show all foreign key constraints that reference lats_products
SELECT 
  tc.table_name,
  kcu.column_name,
  tc.constraint_name,
  rc.update_rule,
  rc.delete_rule
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
ORDER BY tc.table_name;

COMMIT;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ Product deletion constraints fixed!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Changes made:';
  RAISE NOTICE '  1. lats_stock_movements: product_id → ON DELETE SET NULL';
  RAISE NOTICE '  2. lats_purchase_order_items: product_id → ON DELETE SET NULL';
  RAISE NOTICE '  3. lats_sale_items: product_id → ON DELETE SET NULL';
  RAISE NOTICE '';
  RAISE NOTICE '💡 What this means:';
  RAISE NOTICE '  - Products can now be deleted';
  RAISE NOTICE '  - Historical records are preserved';
  RAISE NOTICE '  - Product references become NULL in history tables';
  RAISE NOTICE '  - Product names are stored in sale_items, so reports still work';
  RAISE NOTICE '';
END $$;

