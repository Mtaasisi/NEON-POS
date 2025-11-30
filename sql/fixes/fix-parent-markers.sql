-- ============================================
-- FIX: MARK PARENT VARIANTS CORRECTLY
-- ============================================
-- This ensures variants with IMEI children are marked as parents

-- Step 1: Check current state
DO $$
DECLARE
  v_variants_needing_fix INT;
BEGIN
  SELECT COUNT(*)
  INTO v_variants_needing_fix
  FROM lats_product_variants parent
  WHERE EXISTS (
    SELECT 1
    FROM lats_product_variants child
    WHERE child.parent_variant_id = parent.id
      AND child.variant_type = 'imei_child'
  )
  AND (parent.is_parent IS NULL OR parent.is_parent = FALSE OR parent.variant_type IS NULL OR parent.variant_type != 'parent');
  
  RAISE NOTICE '🔍 Found % variants that need to be marked as parents', v_variants_needing_fix;
END $$;

-- Step 2: Mark variants as parents if they have children
UPDATE lats_product_variants parent
SET 
  is_parent = TRUE,
  variant_type = 'parent',
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1
  FROM lats_product_variants child
  WHERE child.parent_variant_id = parent.id
    AND child.variant_type = 'imei_child'
)
AND (parent.is_parent IS NULL OR parent.is_parent = FALSE OR parent.variant_type IS NULL OR parent.variant_type != 'parent');

-- Step 3: Verify the fix for your specific product
DO $$
DECLARE
  v_result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 VERIFICATION: Your Product Variants';
  RAISE NOTICE '========================================';
  
  FOR v_result IN
    SELECT 
      p.name as product_name,
      v.variant_name,
      v.is_parent,
      v.variant_type,
      v.quantity,
      (SELECT COUNT(*) 
       FROM lats_product_variants child 
       WHERE child.parent_variant_id = v.id 
       AND child.variant_type = 'imei_child') as child_count
    FROM lats_product_variants v
    JOIN lats_products p ON v.product_id = p.id
    WHERE p.name ILIKE '%Mtaa%'
      AND v.parent_variant_id IS NULL
    ORDER BY p.name, v.variant_name
  LOOP
    RAISE NOTICE '├─ Product: %', v_result.product_name;
    RAISE NOTICE '│  Variant: %', v_result.variant_name;
    RAISE NOTICE '│  is_parent: %', v_result.is_parent;
    RAISE NOTICE '│  variant_type: %', v_result.variant_type;
    RAISE NOTICE '│  quantity: %', v_result.quantity;
    RAISE NOTICE '│  child_count: %', v_result.child_count;
    RAISE NOTICE '│';
    
    IF v_result.child_count > 0 AND (v_result.is_parent IS NULL OR v_result.is_parent = FALSE) THEN
      RAISE NOTICE '│  ⚠️  WARNING: Has children but not marked as parent!';
    ELSIF v_result.child_count > 0 AND v_result.is_parent = TRUE THEN
      RAISE NOTICE '│  ✅ Correctly marked as parent with % children', v_result.child_count;
    ELSE
      RAISE NOTICE '│  ℹ️  Standard variant (no children)';
    END IF;
    RAISE NOTICE '└─────────────────────────────────────';
    RAISE NOTICE '';
  END LOOP;
END $$;

-- Step 4: Show all parent-child relationships
SELECT 
  p.name as product_name,
  parent.id as parent_id,
  parent.variant_name as parent_variant,
  parent.is_parent,
  parent.variant_type as parent_type,
  parent.quantity as parent_quantity,
  child.id as child_id,
  child.variant_attributes->>'imei' as child_imei,
  child.quantity as child_quantity,
  child.is_active as child_active
FROM lats_products p
JOIN lats_product_variants parent ON parent.product_id = p.id
LEFT JOIN lats_product_variants child ON child.parent_variant_id = parent.id
WHERE p.name ILIKE '%Mtaa%'
  AND (parent.is_parent = TRUE OR parent.variant_type = 'parent')
ORDER BY p.name, parent.variant_name, child.created_at;

