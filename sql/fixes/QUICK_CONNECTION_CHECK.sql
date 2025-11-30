-- ============================================
-- QUICK CONNECTION CHECK
-- ============================================
-- Run ALL these queries in order to verify your system

-- ============================================
-- CHECK 1: Database Function Exists? ✅
-- ============================================
SELECT 
  '✅ CHECK 1: Database Function' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING - Run migration!'
  END as status,
  COUNT(*) as function_count
FROM pg_proc
WHERE proname = 'add_imei_to_parent_variant';

-- ============================================
-- CHECK 2: Parent "128" Variant Exists? ✅
-- ============================================
SELECT 
  '✅ CHECK 2: Parent Variant' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ EXISTS'
    ELSE '❌ MISSING - Create variant!'
  END as status,
  COUNT(*) as variant_count,
  STRING_AGG(id::text, ', ') as variant_ids,
  STRING_AGG(variant_name, ', ') as variant_names
FROM lats_product_variants
WHERE (variant_name ILIKE '%128%' OR name ILIKE '%128%')
  AND (is_parent = TRUE OR variant_type = 'parent' OR variant_type = 'standard');

-- ============================================
-- CHECK 3: PO Items Have Correct variant_id? ✅
-- ============================================
SELECT 
  '✅ CHECK 3: PO Items' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ FOUND POs'
    ELSE '⚠️ NO ACTIVE POs'
  END as status,
  COUNT(*) as po_count,
  STRING_AGG(DISTINCT po.po_number, ', ') as po_numbers
FROM lats_purchase_orders po
JOIN lats_purchase_order_items poi ON poi.purchase_order_id = po.id
JOIN lats_product_variants pv ON pv.id = poi.variant_id
WHERE po.status IN ('sent', 'partial_received', 'received')
  AND (pv.variant_name ILIKE '%128%' OR pv.name ILIKE '%128%');

-- ============================================
-- CHECK 4: Any IMEIs Already Saved? ✅
-- ============================================
SELECT 
  '✅ CHECK 4: IMEI Children' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ FOUND ' || COUNT(*) || ' IMEIs'
    ELSE '⚠️ NO IMEIs YET'
  END as status,
  COUNT(*) as imei_count
FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND variant_attributes->>'imei' IS NOT NULL;

-- ============================================
-- CHECK 5: Parent-Child Links Correct? ✅
-- ============================================
WITH parent AS (
  SELECT id, variant_name, quantity 
  FROM lats_product_variants 
  WHERE (variant_name ILIKE '%128%' OR name ILIKE '%128%')
    AND (is_parent = TRUE OR variant_type = 'parent')
  LIMIT 1
),
children AS (
  SELECT 
    parent_variant_id, 
    COUNT(*) as count, 
    SUM(quantity) as total_qty
  FROM lats_product_variants
  WHERE variant_type = 'imei_child'
  GROUP BY parent_variant_id
)
SELECT 
  '✅ CHECK 5: Parent-Child Sync' as check_name,
  p.variant_name as parent_variant,
  p.quantity as parent_stock,
  COALESCE(c.count, 0) as child_count,
  COALESCE(c.total_qty, 0) as children_total,
  CASE 
    WHEN p.quantity = COALESCE(c.total_qty, 0) THEN '✅ SYNCED'
    WHEN c.count IS NULL THEN '⚠️ NO CHILDREN YET'
    ELSE '❌ OUT OF SYNC'
  END as status
FROM parent p
LEFT JOIN children c ON c.parent_variant_id = p.id;

-- ============================================
-- CHECK 6: Trigger Active? ✅
-- ============================================
SELECT 
  '✅ CHECK 6: Trigger' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ ACTIVE'
    ELSE '❌ MISSING - Run migration!'
  END as status,
  COUNT(*) as trigger_count
FROM pg_trigger
WHERE tgname = 'trigger_update_parent_stock';

-- ============================================
-- CHECK 7: View Current Structure ✅
-- ============================================
-- Shows the complete parent-child hierarchy
SELECT 
  '📊 CURRENT STRUCTURE' as section,
  CASE 
    WHEN parent_variant_id IS NULL THEN '🔷 PARENT'
    ELSE '  └── 🔸 CHILD'
  END as type,
  variant_name,
  variant_type,
  quantity,
  is_active,
  CASE 
    WHEN variant_attributes->>'imei' IS NOT NULL 
    THEN 'IMEI: ' || (variant_attributes->>'imei')
    ELSE 'No IMEI'
  END as imei_info
FROM lats_product_variants
WHERE 
  -- Parent "128" variants
  ((variant_name ILIKE '%128%' OR name ILIKE '%128%')
   AND (is_parent = TRUE OR variant_type = 'parent' OR variant_type = 'standard'))
  OR 
  -- Their children
  (parent_variant_id IN (
    SELECT id FROM lats_product_variants 
    WHERE (variant_name ILIKE '%128%' OR name ILIKE '%128%')
      AND (is_parent = TRUE OR variant_type = 'parent' OR variant_type = 'standard')
  ))
ORDER BY 
  parent_variant_id NULLS FIRST,
  created_at DESC;

-- ============================================
-- SUMMARY
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║           CONNECTION CHECK COMPLETE                ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Review the results above:';
  RAISE NOTICE '';
  RAISE NOTICE '   ✅ = Working correctly';
  RAISE NOTICE '   ⚠️  = Not critical, expected if no data yet';
  RAISE NOTICE '   ❌ = Issue found, needs fixing';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Next Steps:';
  RAISE NOTICE '   1. If any ❌ found, run: run_migration_simple.sql';
  RAISE NOTICE '   2. Create a test PO with "128" variant';
  RAISE NOTICE '   3. Try receiving with IMEI: 123456789012345';
  RAISE NOTICE '   4. Run this script again to verify';
  RAISE NOTICE '';
END $$;

