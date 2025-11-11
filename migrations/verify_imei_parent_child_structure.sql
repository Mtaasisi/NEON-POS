-- ============================================
-- VERIFY IMEI PARENT-CHILD STRUCTURE
-- ============================================
-- This query verifies that all IMEIs are properly linked
-- as children of their parent variants (e.g., "128")

-- ============================================
-- CHECK 1: View Parent-Child Relationships
-- ============================================
-- This shows the hierarchy: Parent → Children (IMEIs)

SELECT 
  -- Parent Variant Info
  parent.id as parent_id,
  parent.variant_name as parent_variant,
  parent.variant_type as parent_type,
  parent.is_parent,
  parent.quantity as parent_total_stock,
  
  -- Product Info
  p.name as product_name,
  
  -- Count of Children
  (SELECT COUNT(*) 
   FROM lats_product_variants child 
   WHERE child.parent_variant_id = parent.id 
     AND child.variant_type = 'imei_child'
  ) as total_imei_children,
  
  -- Available Children (active)
  (SELECT COUNT(*) 
   FROM lats_product_variants child 
   WHERE child.parent_variant_id = parent.id 
     AND child.variant_type = 'imei_child'
     AND child.is_active = TRUE
     AND child.quantity > 0
  ) as available_imeis

FROM lats_product_variants parent
LEFT JOIN lats_products p ON p.id = parent.product_id
WHERE parent.is_parent = TRUE 
  OR parent.variant_type = 'parent'
ORDER BY p.name, parent.variant_name;

-- ============================================
-- CHECK 2: View All IMEIs Under "128" Variant
-- ============================================
-- Replace 'parent-uuid-here' with your actual parent variant ID
-- Or use variant_name to filter

SELECT 
  parent.variant_name as parent_variant,
  child.id as child_id,
  child.variant_name as child_variant_name,
  child.variant_attributes->>'imei' as imei,
  child.variant_attributes->>'serial_number' as serial_number,
  child.variant_attributes->>'condition' as condition,
  child.cost_price,
  child.selling_price,
  child.quantity,
  child.is_active,
  child.variant_attributes->>'added_at' as added_date,
  child.created_at
FROM lats_product_variants child
JOIN lats_product_variants parent ON parent.id = child.parent_variant_id
WHERE child.variant_type = 'imei_child'
  AND parent.variant_name ILIKE '%128%'  -- Filter for "128" variant
ORDER BY child.created_at DESC;

-- ============================================
-- CHECK 3: Find Orphaned IMEIs (Should be EMPTY)
-- ============================================
-- This checks if there are any IMEI variants without a parent
-- Result should be 0 rows

SELECT 
  id,
  variant_name,
  variant_attributes->>'imei' as imei,
  parent_variant_id,
  'ORPHANED - NO PARENT!' as status
FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND (parent_variant_id IS NULL OR parent_variant_id NOT IN (
    SELECT id FROM lats_product_variants WHERE is_parent = TRUE
  ));

-- ============================================
-- CHECK 4: Verify Parent Stock Calculation
-- ============================================
-- This ensures parent stock = sum of children

WITH parent_calc AS (
  SELECT 
    parent.id,
    parent.variant_name,
    parent.quantity as parent_stock,
    COALESCE(SUM(child.quantity), 0) as calculated_stock
  FROM lats_product_variants parent
  LEFT JOIN lats_product_variants child 
    ON child.parent_variant_id = parent.id 
    AND child.variant_type = 'imei_child'
  WHERE parent.is_parent = TRUE
  GROUP BY parent.id, parent.variant_name, parent.quantity
)
SELECT 
  variant_name,
  parent_stock,
  calculated_stock,
  CASE 
    WHEN parent_stock = calculated_stock THEN '✅ CORRECT'
    ELSE '❌ MISMATCH!'
  END as status
FROM parent_calc
WHERE variant_name ILIKE '%128%';

-- ============================================
-- CHECK 5: Get Specific Parent Variant ID
-- ============================================
-- Use this to find the UUID of your "128" variant

SELECT 
  id,
  product_id,
  variant_name,
  name,
  sku,
  quantity,
  is_parent,
  variant_type,
  created_at
FROM lats_product_variants
WHERE variant_name ILIKE '%128%'
  AND (is_parent = TRUE OR variant_type = 'parent')
ORDER BY created_at DESC;

-- ============================================
-- CHECK 6: Complete Hierarchy View
-- ============================================
-- Tree view of Product → Parent Variant → Child IMEIs

SELECT 
  p.name as product,
  parent.variant_name as parent_variant,
  parent.quantity as parent_stock,
  child.variant_attributes->>'imei' as imei,
  child.quantity as child_qty,
  child.is_active,
  CASE 
    WHEN child.id IS NOT NULL THEN '  ├── IMEI: ' || (child.variant_attributes->>'imei')
    ELSE parent.variant_name
  END as hierarchy_view
FROM lats_product_variants parent
LEFT JOIN lats_products p ON p.id = parent.product_id
LEFT JOIN lats_product_variants child 
  ON child.parent_variant_id = parent.id 
  AND child.variant_type = 'imei_child'
WHERE parent.variant_name ILIKE '%128%'
  AND parent.is_parent = TRUE
ORDER BY p.name, parent.variant_name, child.created_at;

-- ============================================
-- CHECK 7: Use Database Function (If Available)
-- ============================================
-- This uses the built-in function to get children

-- First, get the parent ID
DO $$
DECLARE
  v_parent_id UUID;
BEGIN
  -- Find the "128" parent variant
  SELECT id INTO v_parent_id
  FROM lats_product_variants
  WHERE variant_name ILIKE '%128%'
    AND is_parent = TRUE
  LIMIT 1;
  
  IF v_parent_id IS NOT NULL THEN
    RAISE NOTICE 'Parent "128" variant ID: %', v_parent_id;
    RAISE NOTICE 'Use this query to see all children:';
    RAISE NOTICE 'SELECT * FROM get_child_imeis(''%'');', v_parent_id;
  ELSE
    RAISE NOTICE 'No parent variant found with name containing "128"';
  END IF;
END $$;

-- Then use the function (replace with actual UUID):
-- SELECT * FROM get_child_imeis('your-parent-uuid-here');

-- ============================================
-- EXPECTED STRUCTURE
-- ============================================
-- Product: iPhone X
--   └── Parent Variant: "128" (parent_variant_id: NULL, is_parent: TRUE)
--       ├── Child IMEI: 123456789012345 (parent_variant_id: points to "128")
--       ├── Child IMEI: 234567890123456 (parent_variant_id: points to "128")
--       ├── Child IMEI: 345678901234567 (parent_variant_id: points to "128")
--       └── Child IMEI: 456789012345678 (parent_variant_id: points to "128")

