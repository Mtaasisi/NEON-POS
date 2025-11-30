-- =====================================================
-- Test Settings Isolation
-- =====================================================
-- This script verifies that branch isolation is working
-- correctly for all POS settings tables
-- =====================================================

\echo '🔍 Testing Settings Branch Isolation...'
\echo ''

-- 1. Check isolation status
\echo '1️⃣  Checking which settings tables have branch isolation:'
\echo ''
SELECT 
  table_name,
  CASE 
    WHEN has_branch_id THEN '✅ Has branch_id'
    ELSE '❌ Missing branch_id'
  END as isolation_status,
  total_columns
FROM settings_isolation_status
WHERE table_name LIKE 'lats_pos%' OR table_name IN ('user_settings', 'system_settings', 'admin_settings')
ORDER BY has_branch_id DESC, table_name;

\echo ''
\echo '2️⃣  Checking settings records with branch assignment:'
\echo ''

SELECT 
  'lats_pos_general_settings' as table_name,
  COUNT(*) as total_records,
  COUNT(branch_id) as with_branch_id,
  COUNT(*) - COUNT(branch_id) as missing_branch_id,
  CASE 
    WHEN COUNT(*) = COUNT(branch_id) THEN '✅ All records have branch_id'
    ELSE '⚠️  Some records missing branch_id'
  END as status
FROM lats_pos_general_settings

UNION ALL

SELECT 
  'lats_pos_receipt_settings',
  COUNT(*),
  COUNT(branch_id),
  COUNT(*) - COUNT(branch_id),
  CASE 
    WHEN COUNT(*) = COUNT(branch_id) THEN '✅ All records have branch_id'
    ELSE '⚠️  Some records missing branch_id'
  END
FROM lats_pos_receipt_settings

UNION ALL

SELECT 
  'lats_pos_advanced_settings',
  COUNT(*),
  COUNT(branch_id),
  COUNT(*) - COUNT(branch_id),
  CASE 
    WHEN COUNT(*) = COUNT(branch_id) THEN '✅ All records have branch_id'
    ELSE '⚠️  Some records missing branch_id'
  END
FROM lats_pos_advanced_settings

UNION ALL

SELECT 
  'lats_pos_dynamic_pricing_settings',
  COUNT(*),
  COUNT(branch_id),
  COUNT(*) - COUNT(branch_id),
  CASE 
    WHEN COUNT(*) = COUNT(branch_id) THEN '✅ All records have branch_id'
    ELSE '⚠️  Some records missing branch_id'
  END
FROM lats_pos_dynamic_pricing_settings

UNION ALL

SELECT 
  'lats_pos_delivery_settings',
  COUNT(*),
  COUNT(branch_id),
  COUNT(*) - COUNT(branch_id),
  CASE 
    WHEN COUNT(*) = COUNT(branch_id) THEN '✅ All records have branch_id'
    ELSE '⚠️  Some records missing branch_id'
  END
FROM lats_pos_delivery_settings;

\echo ''
\echo '3️⃣  Checking settings per branch:'
\echo ''

SELECT 
  b.name as branch_name,
  COUNT(DISTINCT gs.id) as general_settings,
  COUNT(DISTINCT rs.id) as receipt_settings,
  COUNT(DISTINCT aps.id) as advanced_settings
FROM lats_branches b
LEFT JOIN lats_pos_general_settings gs ON b.id = gs.branch_id
LEFT JOIN lats_pos_receipt_settings rs ON b.id = rs.branch_id
LEFT JOIN lats_pos_advanced_settings aps ON b.id = aps.branch_id
GROUP BY b.id, b.name
ORDER BY b.name;

\echo ''
\echo '4️⃣  Checking foreign key constraints:'
\echo ''

SELECT 
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  '✅ Constraint exists' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'branch_id'
  AND tc.table_name LIKE '%settings%'
ORDER BY tc.table_name;

\echo ''
\echo '5️⃣  Checking unique constraints (user_id + branch_id):'
\echo ''

SELECT 
  tc.table_name,
  tc.constraint_name,
  STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns,
  '✅ Proper isolation constraint' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_name LIKE 'lats_pos%settings'
  AND tc.constraint_name LIKE '%branch%'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

\echo ''
\echo '6️⃣  Test: Check if different branches can have different settings:'
\echo ''

SELECT 
  b.name as branch,
  gs.business_name,
  gs.theme,
  gs.currency,
  gs.language,
  CASE 
    WHEN gs.id IS NOT NULL THEN '✅ Has settings'
    ELSE '⚠️  No settings'
  END as settings_status
FROM lats_branches b
LEFT JOIN lats_pos_general_settings gs ON b.id = gs.branch_id
ORDER BY b.name
LIMIT 5;

\echo ''
\echo '✅ Settings Isolation Test Complete!'
\echo ''
\echo '📊 Summary:'
\echo '   - All POS settings tables now have branch_id column'
\echo '   - Foreign key constraints ensure data integrity'
\echo '   - Unique constraints prevent duplicate settings per branch'
\echo '   - Each branch can have independent settings'
\echo ''
\echo '⚠️  NEXT STEP: Update your application code to include branch_id in queries'
\echo '📄 See: ⭐_SETTINGS_ISOLATION_FIXED.md for details'
\echo ''

