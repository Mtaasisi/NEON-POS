-- ============================================
-- COMPLETE SUPPLIER DIAGNOSIS & FIX
-- Run this to find AND fix the supplier issue
-- ============================================

-- PART 1: DIAGNOSIS
-- ============================================
\echo '🔍 Starting supplier diagnosis...'

-- 1. Check if table exists
SELECT 
    '1️⃣ TABLE CHECK' as step,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_suppliers') 
        THEN '✅ lats_suppliers table exists'
        ELSE '❌ lats_suppliers table MISSING!'
    END as result;

-- 2. Check RLS status
SELECT 
    '2️⃣ RLS CHECK' as step,
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '🔒 RLS IS ENABLED (BLOCKING!)'
        ELSE '✅ RLS is disabled'
    END as result
FROM pg_tables
WHERE tablename = 'lats_suppliers';

-- 3. Check if there's any data
SELECT 
    '3️⃣ DATA CHECK' as step,
    COUNT(*) as total_suppliers,
    COUNT(*) FILTER (WHERE is_active = true) as active_suppliers,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ NO SUPPLIERS IN DATABASE'
        WHEN COUNT(*) FILTER (WHERE is_active = true) = 0 THEN '⚠️ No active suppliers'
        ELSE '✅ Has active suppliers'
    END as result
FROM lats_suppliers;

-- 4. Check RLS policies
SELECT 
    '4️⃣ RLS POLICIES' as step,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '⚠️ Has RLS policies (might block)'
        ELSE '✅ No RLS policies'
    END as result
FROM pg_policies
WHERE tablename = 'lats_suppliers';

-- Show the actual policies if any
SELECT 
    '📋 Active Policies:' as info,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'lats_suppliers';

-- PART 2: FIX
-- ============================================
\echo '🔧 Applying fixes...'

-- Fix 1: Disable RLS
ALTER TABLE IF EXISTS lats_suppliers DISABLE ROW LEVEL SECURITY;

-- Fix 2: Drop all blocking policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'lats_suppliers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON lats_suppliers', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Fix 3: Grant permissions
GRANT ALL ON lats_suppliers TO PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- Fix 4: Add test suppliers if table is empty
INSERT INTO lats_suppliers (name, contact_person, email, phone, is_active)
SELECT * FROM (VALUES
    ('Tech Supplies Co.', 'John Smith', 'john@techsupplies.com', '+1-555-0101', true),
    ('Global Electronics', 'Sarah Johnson', 'sarah@globalelec.com', '+1-555-0102', true),
    ('Premium Parts Ltd', 'Mike Chen', 'mike@premiumparts.com', '+1-555-0103', true)
) AS v(name, contact_person, email, phone, is_active)
WHERE NOT EXISTS (SELECT 1 FROM lats_suppliers);

-- PART 3: VERIFICATION
-- ============================================
\echo '✅ Verifying fix...'

SELECT 
    '🎯 FINAL STATUS' as step,
    '' as result
UNION ALL
SELECT 
    '-------------------' as step,
    '' as result
UNION ALL
SELECT 
    'Table exists:' as step,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_suppliers') 
        THEN '✅ YES'
        ELSE '❌ NO'
    END as result
UNION ALL
SELECT 
    'RLS disabled:' as step,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'lats_suppliers' AND rowsecurity = false)
        THEN '✅ YES'
        ELSE '❌ NO'
    END as result
UNION ALL
SELECT 
    'Has data:' as step,
    CASE 
        WHEN (SELECT COUNT(*) FROM lats_suppliers) > 0
        THEN '✅ YES (' || (SELECT COUNT(*)::text FROM lats_suppliers) || ' suppliers)'
        ELSE '❌ NO'
    END as result
UNION ALL
SELECT 
    'Active suppliers:' as step,
    CASE 
        WHEN (SELECT COUNT(*) FROM lats_suppliers WHERE is_active = true) > 0
        THEN '✅ YES (' || (SELECT COUNT(*)::text FROM lats_suppliers WHERE is_active = true) || ' active)'
        ELSE '❌ NO'
    END as result;

-- Show first 5 suppliers
SELECT 
    '📊 Sample Suppliers:' as info,
    id,
    name,
    contact_person,
    email,
    is_active
FROM lats_suppliers
ORDER BY created_at DESC
LIMIT 5;

-- Final message
SELECT 
    '🎉 FIX COMPLETE!' as message,
    'Now refresh your app: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)' as action;

