-- ============================================================================
-- DIAGNOSE STOCK TRANSFER JOIN ISSUE
-- ============================================================================
-- This script checks for foreign key relationships and column structures
-- ============================================================================

-- Check 1: What columns exist in lats_product_variants?
SELECT 
  '📋 lats_product_variants COLUMNS' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_product_variants'
ORDER BY ordinal_position;

-- Check 2: What foreign keys exist on lats_product_variants?
SELECT
  '🔗 lats_product_variants FOREIGN KEYS' as check_type,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'lats_product_variants';

-- Check 3: Sample data from branch_transfers
SELECT 
  '📦 SAMPLE TRANSFER' as check_type,
  id,
  from_branch_id,
  to_branch_id,
  entity_type,
  entity_id,
  status,
  created_at
FROM branch_transfers
ORDER BY created_at DESC
LIMIT 5;

-- Check 4: Try to join transfer with variant (test the join)
SELECT 
  '🔍 TEST JOIN' as check_type,
  bt.id as transfer_id,
  bt.entity_id,
  bt.entity_type,
  v.id as variant_id,
  v.variant_name,
  v.sku,
  v.product_id
FROM branch_transfers bt
LEFT JOIN lats_product_variants v ON bt.entity_id = v.id
WHERE bt.transfer_type = 'stock'
LIMIT 5;

-- Check 5: Check RLS status on all involved tables
SELECT 
  '🔒 RLS STATUS' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('branch_transfers', 'lats_product_variants', 'lats_products', 'store_locations');

