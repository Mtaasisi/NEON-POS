-- ============================================================================
-- CORRECTED VERIFICATION QUERIES
-- ============================================================================
-- These queries verify that the database functions were created correctly

-- ============================================================================
-- 1. Check if functions exist
-- ============================================================================
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('add_imei_to_parent_variant', 'log_purchase_order_audit')
ORDER BY routine_name;

-- ============================================================================
-- 2. Check function parameters (CORRECTED QUERY)
-- ============================================================================
SELECT 
  r.routine_name,
  p.parameter_name,
  p.data_type,
  p.ordinal_position
FROM information_schema.routines r
JOIN information_schema.parameters p 
  ON r.specific_name = p.specific_name
WHERE r.routine_schema = 'public'
  AND r.routine_name IN ('add_imei_to_parent_variant', 'log_purchase_order_audit')
  AND p.parameter_mode = 'IN'
ORDER BY r.routine_name, p.ordinal_position;

-- ============================================================================
-- 3. Check function signatures (grouped)
-- ============================================================================
SELECT 
  r.routine_name,
  string_agg(
    p.parameter_name || ' ' || p.data_type,
    ', ' 
    ORDER BY p.ordinal_position
  ) as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p 
  ON r.specific_name = p.specific_name
  AND p.parameter_mode = 'IN'
WHERE r.routine_schema = 'public'
  AND r.routine_name IN ('add_imei_to_parent_variant', 'log_purchase_order_audit')
GROUP BY r.routine_name
ORDER BY r.routine_name;

-- ============================================================================
-- 4. Check if audit tables exist
-- ============================================================================
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('purchase_order_audit', 'lats_purchase_order_audit_log')
ORDER BY table_name;

-- ============================================================================
-- 5. Quick function test (add_imei_to_parent_variant)
-- ============================================================================
-- Note: This will fail if you don't have a valid parent variant ID
-- Replace 'YOUR_PARENT_VARIANT_ID' with an actual UUID from your database
/*
SELECT * FROM add_imei_to_parent_variant(
  'YOUR_PARENT_VARIANT_ID'::uuid,
  '123456789012345',  -- Test IMEI (15 digits)
  'TEST-SN-001',      -- Serial number
  NULL,               -- MAC address
  1000,               -- Cost price (NUMERIC)
  1500,               -- Selling price (NUMERIC)
  'new',              -- Condition
  'Test IMEI entry'   -- Notes
);
*/

-- ============================================================================
-- 6. Quick function test (log_purchase_order_audit)
-- ============================================================================
-- Note: This will fail if you don't have a valid PO ID
-- Replace 'YOUR_PO_ID' with an actual UUID from your database
/*
SELECT log_purchase_order_audit(
  'YOUR_PO_ID'::uuid,
  'Test Action',
  'Test details - verifying function works',
  'system'  -- Test with 'system' string (should handle gracefully)
);
*/

-- ============================================================================
-- SUCCESS INDICATORS
-- ============================================================================
-- Expected results:
-- Query 1: Should return 2 rows (one for each function)
-- Query 2: Should return multiple rows showing all parameters
-- Query 3: Should return 2 rows with full parameter lists
-- Query 4: Should return 1-2 rows (audit table(s))
-- Query 5 & 6: Uncomment and test with real IDs

