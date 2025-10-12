#!/bin/bash

# Test the actual queries that the app is making
DB_URL='postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

echo "🧪 Testing actual queries from the app..."

psql "$DB_URL" << 'EOF'
-- Test 1: Customer query (from fetchAllCustomersSimple)
\echo '===== Test 1: Fetching customers ====='
SELECT COUNT(*) as customer_count FROM customers LIMIT 5;

-- Test 2: Auth user query (from AuthContext)
\echo '===== Test 2: Fetching auth_users ====='
SELECT id, email, role FROM auth_users WHERE email = 'admin@pos.com';

-- Test 3: Products query (from UnifiedInventoryPage)
\echo '===== Test 3: Fetching products ====='
SELECT COUNT(*) as product_count FROM lats_products;

-- Test 4: Categories query
\echo '===== Test 4: Fetching categories ====='
SELECT COUNT(*) as category_count FROM lats_categories;

-- Test 5: Suppliers query
\echo '===== Test 5: Fetching suppliers ====='
SELECT COUNT(*) as supplier_count FROM lats_suppliers;

-- Test 6: Check for any remaining RLS policies
\echo '===== Test 6: Checking for RLS policies ====='
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public' 
  AND (tablename LIKE 'lats_%' OR tablename = 'customers' OR tablename = 'auth_users')
ORDER BY tablename;

\echo '===== All tests complete ====='
EOF

