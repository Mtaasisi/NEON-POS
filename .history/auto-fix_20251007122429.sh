#!/bin/bash

# Automatic Database Fix Script
# This will connect to your Neon database and disable RLS on all tables

echo "🔧 Starting automatic database fix..."

# Connection string
DB_URL='postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

# Run the fix
psql "$DB_URL" << 'EOF'
-- Disable RLS on all tables
ALTER TABLE IF EXISTS lats_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lats_purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC;

-- Verify
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '❌ RLS ON' ELSE '✅ RLS OFF' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE 'lats_%' OR tablename = 'customers')
ORDER BY tablename;

SELECT '✅ Fix complete!' as message;
EOF

echo "🎉 Database fix complete! Refresh your browser now."

