#!/bin/bash

# ================================================
# Branch Isolation Test Suite
# ================================================

echo "🧪 Testing Branch Isolation Implementation..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL environment variable is not set."
    read -p "Enter your DATABASE_URL: " DATABASE_URL
    export DATABASE_URL
fi

echo "📋 Running Tests..."
echo ""

# ================================================
# Test 1: Check Database Schema
# ================================================
echo "════════════════════════════════════════════════"
echo "TEST 1: Database Schema Verification"
echo "════════════════════════════════════════════════"

echo ""
echo "Checking if branch_id columns exist..."
echo ""

psql "$DATABASE_URL" << 'EOF'
-- Check devices table
SELECT 
    'devices' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'devices' AND column_name = 'branch_id'
        ) THEN '✅ PASS - branch_id column exists'
        ELSE '❌ FAIL - branch_id column missing'
    END as status;

-- Check users table
SELECT 
    'users' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'branch_id'
        ) THEN '✅ PASS - branch_id column exists'
        ELSE '❌ FAIL - branch_id column missing'
    END as status;

-- Check customer_payments table
SELECT 
    'customer_payments' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'customer_payments' AND column_name = 'branch_id'
        ) THEN '✅ PASS - branch_id column exists'
        ELSE '❌ FAIL - branch_id column missing'
    END as status;
EOF

# ================================================
# Test 2: Check Data Distribution
# ================================================
echo ""
echo "════════════════════════════════════════════════"
echo "TEST 2: Data Distribution by Branch"
echo "════════════════════════════════════════════════"
echo ""

psql "$DATABASE_URL" << 'EOF'
-- Devices by branch
SELECT 
    '📱 DEVICES' as type,
    COALESCE(b.name, 'No Branch Assigned') as branch_name,
    COUNT(d.id) as count
FROM lats_branches b
LEFT JOIN devices d ON d.branch_id = b.id
GROUP BY b.name
ORDER BY branch_name;

-- Technicians by branch
SELECT 
    '👨‍🔧 TECHNICIANS' as type,
    COALESCE(b.name, 'No Branch Assigned') as branch_name,
    COUNT(u.id) as count
FROM lats_branches b
LEFT JOIN users u ON u.branch_id = b.id AND u.role IN ('technician', 'tech')
GROUP BY b.name
ORDER BY branch_name;

-- Payments by branch
SELECT 
    '💰 PAYMENTS' as type,
    COALESCE(b.name, 'No Branch Assigned') as branch_name,
    COUNT(cp.id) as count
FROM lats_branches b
LEFT JOIN customer_payments cp ON cp.branch_id = b.id
GROUP BY b.name
ORDER BY branch_name;
EOF

# ================================================
# Test 3: Check Isolation Integrity
# ================================================
echo ""
echo "════════════════════════════════════════════════"
echo "TEST 3: Isolation Integrity Check"
echo "════════════════════════════════════════════════"
echo ""

psql "$DATABASE_URL" << 'EOF'
-- Check for NULL branch_ids (potential isolation breaks)
SELECT 
    'devices' as table_name,
    COUNT(*) as records_without_branch,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS - All devices have branch_id'
        ELSE '⚠️  WARNING - Some devices missing branch_id'
    END as status
FROM devices 
WHERE branch_id IS NULL;

SELECT 
    'users' as table_name,
    COUNT(*) as records_without_branch,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS - All users have branch_id'
        ELSE '⚠️  WARNING - Some users missing branch_id'
    END as status
FROM users 
WHERE branch_id IS NULL AND is_active = true;

SELECT 
    'customer_payments' as table_name,
    COUNT(*) as records_without_branch,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS - All payments have branch_id'
        ELSE '⚠️  WARNING - Some payments missing branch_id'
    END as status
FROM customer_payments 
WHERE branch_id IS NULL;
EOF

# ================================================
# Test 4: Check Indexes
# ================================================
echo ""
echo "════════════════════════════════════════════════"
echo "TEST 4: Performance Indexes Check"
echo "════════════════════════════════════════════════"
echo ""

psql "$DATABASE_URL" << 'EOF'
-- Check if indexes exist
SELECT 
    'idx_devices_branch_id' as index_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'idx_devices_branch_id'
        ) THEN '✅ PASS - Index exists'
        ELSE '❌ FAIL - Index missing'
    END as status;

SELECT 
    'idx_users_branch_id' as index_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'idx_users_branch_id'
        ) THEN '✅ PASS - Index exists'
        ELSE '❌ FAIL - Index missing'
    END as status;

SELECT 
    'idx_customer_payments_branch_id' as index_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'idx_customer_payments_branch_id'
        ) THEN '✅ PASS - Index exists'
        ELSE '❌ FAIL - Index missing'
    END as status;
EOF

# ================================================
# Test 5: Sample Queries (What Users Will See)
# ================================================
echo ""
echo "════════════════════════════════════════════════"
echo "TEST 5: Sample Branch Isolation Queries"
echo "════════════════════════════════════════════════"
echo ""

echo "Testing: What a user in Main Branch would see..."
echo ""

psql "$DATABASE_URL" << 'EOF'
-- Get default branch ID
WITH default_branch AS (
    SELECT id FROM lats_branches WHERE name = 'Main Branch' LIMIT 1
)
SELECT 
    '📊 Main Branch View' as query_type,
    'Devices' as resource,
    COUNT(d.id) as visible_count
FROM devices d
CROSS JOIN default_branch db
WHERE d.branch_id = db.id;

WITH default_branch AS (
    SELECT id FROM lats_branches WHERE name = 'Main Branch' LIMIT 1
)
SELECT 
    '📊 Main Branch View' as query_type,
    'Technicians' as resource,
    COUNT(u.id) as visible_count
FROM users u
CROSS JOIN default_branch db
WHERE u.branch_id = db.id 
AND u.role IN ('technician', 'tech')
AND u.is_active = true;

WITH default_branch AS (
    SELECT id FROM lats_branches WHERE name = 'Main Branch' LIMIT 1
)
SELECT 
    '📊 Main Branch View' as query_type,
    'Payments' as resource,
    COUNT(cp.id) as visible_count
FROM customer_payments cp
CROSS JOIN default_branch db
WHERE cp.branch_id = db.id;
EOF

# ================================================
# Summary
# ================================================
echo ""
echo "════════════════════════════════════════════════"
echo "🎯 TEST SUMMARY"
echo "════════════════════════════════════════════════"
echo ""
echo "If all tests show ✅ PASS, your isolation is working correctly!"
echo ""
echo "Next Steps:"
echo "  1. Check the provider.supabase.ts toggle settings"
echo "  2. Test in browser by switching branches"
echo "  3. Verify data appears correctly in UI"
echo ""
echo "📖 See COMPLETE-ISOLATION-QUICK-REFERENCE.md for usage guide"
echo ""

