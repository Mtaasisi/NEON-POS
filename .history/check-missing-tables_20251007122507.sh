#!/bin/bash

# Check what tables actually exist
DB_URL='postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

echo "🔍 Checking existing tables..."

psql "$DB_URL" << 'EOF'
-- List all tables
SELECT 
  table_name,
  'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check if critical tables exist
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auth_users') 
    THEN '✅ auth_users exists' 
    ELSE '❌ auth_users MISSING' 
  END as auth_users_check,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') 
    THEN '✅ customers exists' 
    ELSE '❌ customers MISSING' 
  END as customers_check,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lats_products') 
    THEN '✅ lats_products exists' 
    ELSE '❌ lats_products MISSING' 
  END as products_check;
EOF

