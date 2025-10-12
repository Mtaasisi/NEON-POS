-- ============================================================================
-- DIAGNOSTIC: Check what columns actually exist in your Neon database
-- ============================================================================
-- Run this in your Neon SQL Editor to see the ACTUAL column names
-- Copy the connection string from your error logs:
-- psql 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

-- Check customers table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'customers'
ORDER BY ordinal_position;

-- Check auth_users table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'auth_users'
ORDER BY ordinal_position;

-- Check devices table columns  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'devices'
ORDER BY ordinal_position;

-- Check all lats_pos_* settings tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'lats_pos_%'
ORDER BY table_name;

-- Check lats products table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'lats_products'
ORDER BY ordinal_position;

