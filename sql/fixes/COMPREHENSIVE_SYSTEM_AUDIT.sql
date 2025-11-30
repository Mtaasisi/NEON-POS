-- ============================================================================
-- COMPREHENSIVE INVENTORY & POS SYSTEM AUDIT
-- ============================================================================
-- Complete validation, diagnosis, and health check of the entire system
-- ============================================================================

\echo ''
\echo '╔═══════════════════════════════════════════════════════════════════════════╗'
\echo '║               COMPREHENSIVE SYSTEM AUDIT - STARTING                       ║'
\echo '╚═══════════════════════════════════════════════════════════════════════════╝'
\echo ''

-- ============================================================================
-- SECTION 1: DATABASE SCHEMA VALIDATION
-- ============================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '1️⃣  DATABASE SCHEMA VALIDATION'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

-- Check if all required tables exist
\echo '📋 Checking Core Tables...'
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('lats_products', 'lats_product_variants', 'inventory_items', 
                        'lats_purchase_order_items', 'lats_stock_movements',
                        'lats_purchase_orders', 'lats_suppliers')
    THEN '✅ EXISTS'
    ELSE '⚠️  OPTIONAL'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'lats_%'
ORDER BY table_name;

\echo ''
\echo '🔗 Checking Foreign Key Constraints...'
SELECT 
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  '✅' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('lats_product_variants', 'inventory_items', 'lats_purchase_order_items', 'lats_stock_movements')
ORDER BY tc.table_name, tc.constraint_name;

\echo ''
\echo '📊 Checking Critical Columns...'
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  '✅' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lats_product_variants'
  AND column_name IN ('id', 'product_id', 'parent_variant_id', 'variant_type', 
                      'is_parent', 'quantity', 'variant_attributes')
ORDER BY column_name;

\echo ''
\echo '🔍 Checking Indexes...'
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef,
  '✅' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('lats_product_variants', 'lats_products', 'inventory_items')
  AND (indexname LIKE '%parent%' OR indexname LIKE '%imei%' OR indexname LIKE '%variant%')
ORDER BY tablename, indexname;

-- ============================================================================
-- SECTION 2: IMEI SYSTEM VALIDATION
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '2️⃣  IMEI SYSTEM VALIDATION'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '📱 Total Variant Types Distribution...'
SELECT 
  variant_type,
  COUNT(*) as count,
  SUM(quantity) as total_quantity
FROM lats_product_variants
WHERE is_active = TRUE
GROUP BY variant_type
ORDER BY count DESC;

\echo ''
\echo '👨‍👩‍👧‍👦 Parent-Child Relationships...'
SELECT 
  p.id as parent_id,
  p.name as parent_name,
  p.variant_type as parent_type,
  p.is_parent,
  p.quantity as parent_quantity,
  COUNT(c.id) as children_count,
  COALESCE(SUM(c.quantity), 0) as children_total_qty,
  CASE 
    WHEN p.quantity = COALESCE(SUM(c.quantity), 0) THEN '✅ MATCH'
    WHEN p.quantity > COALESCE(SUM(c.quantity), 0) THEN '⚠️  PARENT > CHILDREN'
    ELSE '❌ PARENT < CHILDREN'
  END as stock_status
FROM lats_product_variants p
LEFT JOIN lats_product_variants c 
  ON c.parent_variant_id = p.id 
  AND c.variant_type = 'imei_child'
  AND c.is_active = TRUE
WHERE (p.is_parent = TRUE OR p.variant_type = 'parent')
  OR EXISTS (
    SELECT 1 FROM lats_product_variants child 
    WHERE child.parent_variant_id = p.id
  )
GROUP BY p.id, p.name, p.variant_type, p.is_parent, p.quantity
ORDER BY stock_status, p.name;

\echo ''
\echo '🔍 Orphaned IMEI Children (No Parent)...'
SELECT 
  v.id,
  v.name,
  v.parent_variant_id,
  v.variant_type,
  v.variant_attributes->>'imei' as imei,
  '❌ ORPHANED' as status
FROM lats_product_variants v
WHERE v.variant_type = 'imei_child'
  AND v.parent_variant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lats_product_variants p
    WHERE p.id = v.parent_variant_id
  )
LIMIT 10;

\echo ''
\echo '🔄 Duplicate IMEI Detection...'
SELECT 
  variant_attributes->>'imei' as imei,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id) as variant_ids,
  ARRAY_AGG(name) as variant_names,
  '⚠️  DUPLICATE' as status
FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND variant_attributes ? 'imei'
  AND is_active = TRUE
GROUP BY variant_attributes->>'imei'
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

\echo ''
\echo '❌ Invalid IMEI Format (Not 15 Digits)...'
SELECT 
  id,
  name,
  variant_attributes->>'imei' as imei,
  LENGTH(variant_attributes->>'imei') as imei_length,
  '❌ INVALID' as status
FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND variant_attributes ? 'imei'
  AND (
    LENGTH(variant_attributes->>'imei') != 15
    OR variant_attributes->>'imei' !~ '^[0-9]+$'
  )
LIMIT 10;

\echo ''
\echo '📊 IMEI Status Distribution...'
SELECT 
  variant_attributes->>'imei_status' as imei_status,
  COUNT(*) as count,
  SUM(quantity) as total_quantity
FROM lats_product_variants
WHERE variant_type = 'imei_child'
GROUP BY variant_attributes->>'imei_status'
ORDER BY count DESC;

\echo ''
\echo '🏷️  IMEIs Without Status Set...'
SELECT 
  id,
  name,
  variant_attributes->>'imei' as imei,
  variant_attributes->>'imei_status' as status,
  '⚠️  NO STATUS' as issue
FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND variant_attributes ? 'imei'
  AND (
    NOT variant_attributes ? 'imei_status'
    OR variant_attributes->>'imei_status' IS NULL
    OR variant_attributes->>'imei_status' = ''
  )
LIMIT 10;

-- ============================================================================
-- SECTION 3: DATA INTEGRITY CHECKS
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '3️⃣  DATA INTEGRITY CHECKS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '⚠️  Negative Stock Quantities...'
SELECT 
  id,
  name,
  sku,
  quantity,
  '❌ NEGATIVE' as issue
FROM lats_product_variants
WHERE quantity < 0
LIMIT 10;

\echo ''
\echo '🔗 Variants Without Product Reference...'
SELECT 
  v.id,
  v.name,
  v.product_id,
  '❌ NO PRODUCT' as issue
FROM lats_product_variants v
WHERE v.product_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM lats_products p WHERE p.id = v.product_id
  )
LIMIT 10;

\echo ''
\echo '💰 Variants With Invalid Prices...'
SELECT 
  id,
  name,
  cost_price,
  selling_price,
  CASE 
    WHEN cost_price IS NULL THEN '⚠️  NO COST PRICE'
    WHEN selling_price IS NULL THEN '⚠️  NO SELLING PRICE'
    WHEN selling_price < cost_price THEN '⚠️  SELLING < COST'
    ELSE '❌ UNKNOWN ISSUE'
  END as issue
FROM lats_product_variants
WHERE cost_price IS NULL 
  OR selling_price IS NULL
  OR selling_price < cost_price
LIMIT 10;

\echo ''
\echo '📦 Product Stock vs Variant Stock Mismatch...'
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.stock_quantity as product_stock,
  COALESCE(SUM(v.quantity), 0) as variants_total_stock,
  ABS(p.stock_quantity - COALESCE(SUM(v.quantity), 0)) as difference,
  CASE 
    WHEN p.stock_quantity = COALESCE(SUM(v.quantity), 0) THEN '✅ MATCH'
    WHEN ABS(p.stock_quantity - COALESCE(SUM(v.quantity), 0)) <= 1 THEN '⚠️  MINOR DIFF'
    ELSE '❌ MAJOR DIFF'
  END as status
FROM lats_products p
LEFT JOIN lats_product_variants v 
  ON v.product_id = p.id 
  AND v.is_active = TRUE
  AND (v.parent_variant_id IS NULL OR v.variant_type != 'imei_child')
GROUP BY p.id, p.name, p.stock_quantity
HAVING p.stock_quantity != COALESCE(SUM(v.quantity), 0)
ORDER BY difference DESC
LIMIT 10;

-- ============================================================================
-- SECTION 4: TRIGGERS & FUNCTIONS VALIDATION
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '4️⃣  TRIGGERS & FUNCTIONS VALIDATION'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '⚙️  Active Triggers on Core Tables...'
SELECT 
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  action_timing as timing,
  '✅' as status
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('lats_product_variants', 'lats_products', 'inventory_items')
ORDER BY event_object_table, trigger_name, event_manipulation;

\echo ''
\echo '🔧 Critical Functions Status...'
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  '✅' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'add_imei_to_parent_variant',
    'mark_imei_as_sold',
    'get_available_imeis_for_pos',
    'update_parent_stock_from_children',
    'recalculate_all_parent_stocks'
  )
ORDER BY p.proname;

-- ============================================================================
-- SECTION 5: STOCK MOVEMENTS AUDIT
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '5️⃣  STOCK MOVEMENTS AUDIT'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '📊 Stock Movements by Type...'
SELECT 
  movement_type,
  COUNT(*) as count,
  SUM(quantity) as total_quantity
FROM lats_stock_movements
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY movement_type
ORDER BY count DESC;

\echo ''
\echo '⚠️  Stock Movements for Non-Existent Variants...'
SELECT 
  sm.id,
  sm.variant_id,
  sm.movement_type,
  sm.quantity,
  '❌ INVALID VARIANT' as issue
FROM lats_stock_movements sm
WHERE sm.variant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lats_product_variants v WHERE v.id = sm.variant_id
  )
LIMIT 10;

-- ============================================================================
-- SECTION 6: PURCHASE ORDERS VALIDATION
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '6️⃣  PURCHASE ORDERS VALIDATION'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '📦 Recent Purchase Orders...'
SELECT 
  po.id,
  po.order_number,
  po.status,
  COUNT(poi.id) as items_count,
  SUM(poi.quantity) as total_quantity,
  SUM(poi.quantity_received) as total_received,
  CASE 
    WHEN SUM(poi.quantity) = SUM(poi.quantity_received) THEN '✅ FULLY RECEIVED'
    WHEN SUM(poi.quantity_received) > 0 THEN '⚠️  PARTIALLY RECEIVED'
    ELSE '📋 NOT RECEIVED'
  END as receive_status
FROM lats_purchase_orders po
LEFT JOIN lats_purchase_order_items poi ON poi.purchase_order_id = po.id
WHERE po.created_at > NOW() - INTERVAL '30 days'
GROUP BY po.id, po.order_number, po.status
ORDER BY po.created_at DESC
LIMIT 10;

\echo ''
\echo '⚠️  PO Items Without Valid Variants...'
SELECT 
  poi.id,
  poi.purchase_order_id,
  poi.variant_id,
  poi.quantity,
  '❌ INVALID VARIANT' as issue
FROM lats_purchase_order_items poi
WHERE poi.variant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lats_product_variants v WHERE v.id = poi.variant_id
  )
LIMIT 10;

-- ============================================================================
-- SECTION 7: SUMMARY STATISTICS
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '7️⃣  SYSTEM SUMMARY STATISTICS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

SELECT 
  '📦 Total Products' as metric,
  COUNT(*)::text as value,
  '✅' as status
FROM lats_products
WHERE is_active = TRUE

UNION ALL

SELECT 
  '📊 Total Variants',
  COUNT(*)::text,
  '✅'
FROM lats_product_variants
WHERE is_active = TRUE

UNION ALL

SELECT 
  '👨‍👩‍👧‍👦 Parent Variants',
  COUNT(*)::text,
  '✅'
FROM lats_product_variants
WHERE (is_parent = TRUE OR variant_type = 'parent')
  AND is_active = TRUE

UNION ALL

SELECT 
  '📱 IMEI Children',
  COUNT(*)::text,
  '✅'
FROM lats_product_variants
WHERE variant_type = 'imei_child'
  AND is_active = TRUE

UNION ALL

SELECT 
  '💰 Total Stock Value',
  TO_CHAR(SUM(quantity * cost_price), '999,999,999.99'),
  '✅'
FROM lats_product_variants
WHERE is_active = TRUE
  AND (parent_variant_id IS NULL OR variant_type != 'imei_child')

UNION ALL

SELECT 
  '📦 Total Stock Units',
  SUM(quantity)::text,
  '✅'
FROM lats_product_variants
WHERE is_active = TRUE
  AND (parent_variant_id IS NULL OR variant_type != 'imei_child')

UNION ALL

SELECT 
  '🔄 Stock Movements (30d)',
  COUNT(*)::text,
  '✅'
FROM lats_stock_movements
WHERE created_at > NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
  '🛒 Purchase Orders (30d)',
  COUNT(*)::text,
  '✅'
FROM lats_purchase_orders
WHERE created_at > NOW() - INTERVAL '30 days';

\echo ''
\echo '╔═══════════════════════════════════════════════════════════════════════════╗'
\echo '║               COMPREHENSIVE SYSTEM AUDIT - COMPLETED                      ║'
\echo '╚═══════════════════════════════════════════════════════════════════════════╝'
\echo ''

