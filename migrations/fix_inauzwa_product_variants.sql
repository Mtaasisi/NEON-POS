-- ============================================================================
-- FIX INAUZWA PRODUCT VARIANTS
-- ============================================================================
-- This script specifically fixes the "inauzwa" product that has duplicate variants
-- from purchase order receiving
-- ============================================================================

-- Step 1: Check current state of inauzwa product
SELECT 
  p.name,
  p.stock_quantity,
  COUNT(v.id) as variant_count,
  SUM(v.quantity) as total_variant_quantity
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id AND v.is_active = true
WHERE p.name ILIKE '%inauzwa%'
GROUP BY p.id, p.name, p.stock_quantity;

-- Step 2: Check all variants for inauzwa product
SELECT 
  v.id,
  v.name,
  v.variant_name,
  v.quantity,
  v.cost_price,
  v.selling_price,
  v.is_active,
  v.variant_attributes->>'imei' as imei,
  v.created_at
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE p.name ILIKE '%inauzwa%'
ORDER BY v.created_at ASC;

-- Step 3: Fix the inauzwa product by merging duplicate variants
DO $$
DECLARE
  v_product_id UUID;
  v_primary_variant_id UUID;
  v_total_quantity INTEGER;
  v_variant_count INTEGER;
  v_variant RECORD;
BEGIN
  -- Get the inauzwa product ID
  SELECT id INTO v_product_id
  FROM lats_products
  WHERE name ILIKE '%inauzwa%'
  LIMIT 1;
  
  IF v_product_id IS NOT NULL THEN
    RAISE NOTICE 'Found inauzwa product: %', v_product_id;
    
    -- Count variants and calculate total quantity
    SELECT 
      COUNT(*) as variant_count,
      SUM(quantity) as total_quantity
    INTO v_variant_count, v_total_quantity
    FROM lats_product_variants
    WHERE product_id = v_product_id
      AND is_active = true
      AND variant_attributes->>'imei' IS NULL; -- Non-IMEI variants
    
    RAISE NOTICE 'Found % variants with total quantity: %', v_variant_count, v_total_quantity;
    
    IF v_variant_count > 1 THEN
      -- Get the primary variant (oldest one)
      SELECT id INTO v_primary_variant_id
      FROM lats_product_variants
      WHERE product_id = v_product_id
        AND is_active = true
        AND variant_attributes->>'imei' IS NULL
        AND quantity > 0
      ORDER BY created_at ASC
      LIMIT 1;
      
      RAISE NOTICE 'Primary variant ID: %', v_primary_variant_id;
      
      -- Update primary variant with total quantity
      UPDATE lats_product_variants
      SET 
        quantity = v_total_quantity,
        updated_at = NOW()
      WHERE id = v_primary_variant_id;
      
      -- Deactivate other variants (keep them for history but mark as inactive)
      UPDATE lats_product_variants
      SET 
        is_active = false,
        quantity = 0,
        updated_at = NOW()
      WHERE product_id = v_product_id
        AND id != v_primary_variant_id
        AND variant_attributes->>'imei' IS NULL
        AND quantity > 0;
      
      -- Update product stock quantity
      UPDATE lats_products
      SET 
        stock_quantity = v_total_quantity,
        updated_at = NOW()
      WHERE id = v_product_id;
      
      RAISE NOTICE 'Successfully merged % variants into primary variant with total quantity: %', 
        v_variant_count - 1, v_total_quantity;
    ELSE
      RAISE NOTICE 'No duplicate variants found to merge';
    END IF;
  ELSE
    RAISE NOTICE 'Inauzwa product not found';
  END IF;
END $$;

-- Step 4: Verify the fix
SELECT 
  p.name,
  p.stock_quantity,
  COUNT(v.id) as active_variant_count,
  SUM(v.quantity) as total_variant_quantity,
  COUNT(CASE WHEN v.is_active = false THEN 1 END) as inactive_variant_count
FROM lats_products p
LEFT JOIN lats_product_variants v ON v.product_id = p.id
WHERE p.name ILIKE '%inauzwa%'
GROUP BY p.id, p.name, p.stock_quantity;

-- Step 5: Show final variant state
SELECT 
  v.id,
  v.name,
  v.variant_name,
  v.quantity,
  v.cost_price,
  v.selling_price,
  v.is_active,
  v.variant_attributes->>'imei' as imei,
  v.created_at
FROM lats_product_variants v
JOIN lats_products p ON p.id = v.product_id
WHERE p.name ILIKE '%inauzwa%'
ORDER BY v.is_active DESC, v.created_at ASC;

-- ============================================================================
-- ADDITIONAL CLEANUP (OPTIONAL)
-- ============================================================================

-- If you want to completely remove inactive variants (be careful with this!)
-- Uncomment the following lines:

-- DELETE FROM lats_product_variants
-- WHERE product_id IN (
--   SELECT id FROM lats_products WHERE name ILIKE '%inauzwa%'
-- )
-- AND is_active = false
-- AND variant_attributes->>'imei' IS NULL;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
--
-- 1. Copy and paste this entire script into your database SQL editor
-- 2. Click "Run" or "Execute"
-- 3. Check the output to verify the fix worked
-- 4. Your inauzwa product should now have only one active variant
-- 5. Stock quantities should be correct and consistent
--
-- ============================================================================
