-- ============================================================================
-- Test Your Exact Scenario: iPhone 6 with 128GB and 256GB Variants + IMEIs
-- ============================================================================
-- This simulates your complete workflow in the database
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create Product (iPhone 6)
-- ============================================================================

INSERT INTO lats_products (
  id,
  name,
  description,
  sku,
  category_id,
  is_active,
  created_at
) VALUES (
  gen_random_uuid(),
  'iPhone 6 Test',
  'Testing IMEI workflow with variant names',
  'IP6-TEST-001',
  (SELECT id FROM lats_categories LIMIT 1),  -- Use first category
  true,
  NOW()
)
RETURNING id AS product_id
\gset

-- Show created product
SELECT 'Created Product:' as step, :product_id as product_id;

-- ============================================================================
-- STEP 2: Create Parent Variants (128GB and 256GB)
-- ============================================================================

-- Create 128GB variant
INSERT INTO lats_product_variants (
  id,
  product_id,
  variant_name,           -- ✅ NEW: User-defined name
  name,                   -- ✅ OLD: For NOT NULL constraint
  sku,
  cost_price,
  selling_price,
  quantity,
  min_quantity,
  is_active,
  is_parent,              -- ✅ Will be set to true when IMEI added
  variant_type,
  variant_attributes,     -- ✅ NEW: Empty initially
  attributes,             -- ✅ OLD: For backward compatibility
  created_at
) VALUES (
  gen_random_uuid(),
  :product_id,
  '128GB Storage',        -- ✅ Your custom name
  '128GB Storage',        -- Same for old column
  'IP6-128GB',
  800.00,
  1200.00,
  0,                      -- Will be updated from children
  2,
  true,
  false,                  -- Will become true when IMEIs added
  'standard',
  '{}'::jsonb,
  '{}'::jsonb,
  NOW()
)
RETURNING id AS variant_128gb_id
\gset

-- Create 256GB variant
INSERT INTO lats_product_variants (
  id,
  product_id,
  variant_name,
  name,
  sku,
  cost_price,
  selling_price,
  quantity,
  min_quantity,
  is_active,
  is_parent,
  variant_type,
  variant_attributes,
  attributes,
  created_at
) VALUES (
  gen_random_uuid(),
  :product_id,
  '256GB Storage',        -- ✅ Your custom name
  '256GB Storage',
  'IP6-256GB',
  900.00,
  1400.00,
  0,
  2,
  true,
  false,
  'standard',
  '{}'::jsonb,
  '{}'::jsonb,
  NOW()
)
RETURNING id AS variant_256gb_id
\gset

-- Show created variants
SELECT 
  '✅ Step 2: Created Parent Variants' as step,
  :variant_128gb_id as variant_128gb,
  :variant_256gb_id as variant_256gb;

SELECT 
  variant_name,
  sku,
  quantity,
  is_parent,
  variant_type
FROM lats_product_variants
WHERE id IN (:variant_128gb_id, :variant_256gb_id);

-- ============================================================================
-- STEP 3: Simulate PO Receiving - Add IMEIs to 128GB Variant
-- ============================================================================

SELECT '📦 Step 3a: Adding IMEIs to 128GB variant...' as step;

-- Mark 128GB as parent (normally done by convertToParentVariant function)
UPDATE lats_product_variants
SET 
  is_parent = true,
  variant_type = 'parent',
  updated_at = NOW()
WHERE id = :variant_128gb_id;

-- Add IMEI 1 to 128GB
SELECT * FROM add_imei_to_parent_variant(
  :variant_128gb_id::UUID,
  '123456789012345'::TEXT,
  NULL,  -- serial_number
  NULL,  -- mac_address
  800.00,
  1200.00,
  'new',
  'Received from PO - 128GB Device 1'
) AS child_128gb_1
\gset

-- Add IMEI 2 to 128GB
SELECT * FROM add_imei_to_parent_variant(
  :variant_128gb_id::UUID,
  '234567890123456'::TEXT,
  NULL,
  NULL,
  800.00,
  1200.00,
  'new',
  'Received from PO - 128GB Device 2'
) AS child_128gb_2
\gset

SELECT '✅ Added 2 IMEIs to 128GB variant' as result;

-- ============================================================================
-- STEP 4: Add IMEIs to 256GB Variant
-- ============================================================================

SELECT '📦 Step 3b: Adding IMEIs to 256GB variant...' as step;

-- Mark 256GB as parent
UPDATE lats_product_variants
SET 
  is_parent = true,
  variant_type = 'parent',
  updated_at = NOW()
WHERE id = :variant_256gb_id;

-- Add IMEI 3 to 256GB
SELECT * FROM add_imei_to_parent_variant(
  :variant_256gb_id::UUID,
  '345678901234567'::TEXT,
  NULL,
  NULL,
  900.00,
  1400.00,
  'new',
  'Received from PO - 256GB Device 1'
) AS child_256gb_1
\gset

-- Add IMEI 4 to 256GB
SELECT * FROM add_imei_to_parent_variant(
  :variant_256gb_id::UUID,
  '456789012345678'::TEXT,
  NULL,
  NULL,
  900.00,
  1400.00,
  'new',
  'Received from PO - 256GB Device 2'
) AS child_256gb_2
\gset

SELECT '✅ Added 2 IMEIs to 256GB variant' as result;

-- ============================================================================
-- STEP 5: VERIFY RESULTS
-- ============================================================================

SELECT '🔍 VERIFICATION: Complete Structure' as step;

-- Show parent variants with updated quantities
SELECT 
  '✅ PARENT VARIANTS' as type,
  variant_name,
  sku,
  quantity,
  is_parent,
  variant_type,
  parent_variant_id
FROM lats_product_variants
WHERE id IN (:variant_128gb_id, :variant_256gb_id)
ORDER BY variant_name;

-- Show all child IMEI variants
SELECT 
  '✅ CHILD IMEI VARIANTS' as type,
  parent_variant_id,
  COALESCE(variant_attributes->>'imei', attributes->>'imei', name) as imei,
  variant_type,
  quantity,
  cost_price,
  selling_price,
  COALESCE(variant_attributes->>'parent_variant_name', 'N/A') as parent_name_stored
FROM lats_product_variants
WHERE parent_variant_id IN (:variant_128gb_id, :variant_256gb_id)
ORDER BY parent_variant_id, created_at;

-- Show complete tree structure
SELECT 
  CASE 
    WHEN parent_variant_id IS NULL THEN '📦 PARENT: ' || variant_name
    ELSE '  └─ CHILD: ' || COALESCE(variant_attributes->>'imei', attributes->>'imei', name)
  END as tree_structure,
  quantity as qty,
  variant_type as type
FROM lats_product_variants
WHERE product_id = :product_id
ORDER BY 
  COALESCE(parent_variant_id, id),
  parent_variant_id NULLS FIRST,
  created_at;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count check
SELECT 
  'COUNTS' as metric,
  COUNT(*) FILTER (WHERE parent_variant_id IS NULL) as parents,
  COUNT(*) FILTER (WHERE parent_variant_id IS NOT NULL) as children
FROM lats_product_variants
WHERE product_id = :product_id;

-- Parent stock verification
SELECT 
  'PARENT STOCK' as metric,
  v.variant_name,
  v.quantity as parent_qty,
  COUNT(child.id) as child_count
FROM lats_product_variants v
LEFT JOIN lats_product_variants child ON child.parent_variant_id = v.id
WHERE v.product_id = :product_id
  AND v.parent_variant_id IS NULL
GROUP BY v.id, v.variant_name, v.quantity;

-- What ProductModal API would return (simulated)
SELECT 
  '🖥️  WHAT UI SEES (ProductModal)' as display,
  variant_name,
  quantity,
  sku
FROM lats_product_variants
WHERE product_id = :product_id
  AND parent_variant_id IS NULL  -- ✅ Children filtered out
ORDER BY variant_name;

-- What POS would show for IMEI selection
SELECT 
  '🛒 WHAT POS SEES' as display,
  parent.variant_name as parent_shown,
  COALESCE(child.variant_attributes->>'imei', child.attributes->>'imei', child.name) as imei_available,
  child.selling_price
FROM lats_product_variants parent
LEFT JOIN lats_product_variants child ON child.parent_variant_id = parent.id
WHERE parent.product_id = :product_id
  AND parent.parent_variant_id IS NULL
  AND (child.id IS NULL OR child.quantity > 0)
ORDER BY parent.variant_name, child.created_at;

-- ============================================================================
-- CLEANUP (Optional - comment out if you want to keep test data)
-- ============================================================================

-- Uncomment to cleanup test data:
-- DELETE FROM lats_product_variants WHERE product_id = :product_id;
-- DELETE FROM lats_products WHERE id = :product_id;
-- SELECT '🧹 Test data cleaned up' as cleanup;

ROLLBACK;  -- Change to COMMIT to keep test data

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
/*

✅ PARENT VARIANTS (2):
  - 128GB Storage (quantity: 2, is_parent: true)
  - 256GB Storage (quantity: 2, is_parent: true)

✅ CHILD IMEI VARIANTS (4):
  - Under 128GB:
    - IMEI: 123456789012345
    - IMEI: 234567890123456
  - Under 256GB:
    - IMEI: 345678901234567
    - IMEI: 456789012345678

✅ ProductModal Shows:
  - 128GB Storage (2 units)
  - 256GB Storage (2 units)
  - Children hidden

✅ POS Shows:
  - Select "128GB Storage" → See 2 IMEIs
  - Select "256GB Storage" → See 2 IMEIs

*/

