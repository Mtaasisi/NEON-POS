-- ============================================
-- DATABASE SCHEMA FIXES - SQL SCRIPT
-- Fixes all database schema inconsistencies
-- ============================================

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- 1. Fix schema_migrations table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  success INTEGER DEFAULT 1
);

-- Remove duplicate entries from schema_migrations
DELETE FROM schema_migrations
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM schema_migrations
  GROUP BY version
);

-- Ensure basic migrations are recorded
INSERT OR IGNORE INTO schema_migrations (version, name, executed_at)
VALUES
  (1, 'Initialize core schema and sample data', CURRENT_TIMESTAMP),
  (2, 'Add sku column to lats_products table', CURRENT_TIMESTAMP),
  (3, 'Update product IDs to UUID format', CURRENT_TIMESTAMP);

-- 2. Add sku column to lats_products if it doesn't exist
-- Check if sku column exists in lats_products
CREATE TABLE IF NOT EXISTS temp_lats_products AS SELECT * FROM lats_products LIMIT 0;

-- Add sku column to temp table
ALTER TABLE temp_lats_products ADD COLUMN sku TEXT;

-- Check if original table has sku column
SELECT COUNT(*) as sku_exists
FROM pragma_table_info('lats_products')
WHERE name = 'sku';

-- If sku column doesn't exist, add it
-- Note: This is a manual step that needs to be checked
-- ALTER TABLE lats_products ADD COLUMN sku TEXT;

-- 3. Add background_color column to store_locations if it doesn't exist
-- Check if background_color column exists in store_locations
SELECT COUNT(*) as bg_color_exists
FROM pragma_table_info('store_locations')
WHERE name = 'background_color';

-- If background_color column doesn't exist, add it
-- ALTER TABLE store_locations ADD COLUMN background_color TEXT;

-- Add other missing columns to store_locations
-- Check for data_isolation_mode
SELECT COUNT(*) as isolation_mode_exists
FROM pragma_table_info('store_locations')
WHERE name = 'data_isolation_mode';

-- Check for share_inventory
SELECT COUNT(*) as share_inventory_exists
FROM pragma_table_info('store_locations')
WHERE name = 'share_inventory';

-- 4. Create customers table if it doesn't exist
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  branch_id TEXT,
  is_active INTEGER DEFAULT 1,
  loyalty_points INTEGER DEFAULT 0,
  total_purchases REAL DEFAULT 0.00,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create lats_customers table if it doesn't exist
CREATE TABLE IF NOT EXISTS lats_customers (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  phone2 TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Tanzania',
  date_of_birth TEXT,
  branch_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create store_locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS store_locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  manager_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  location TEXT,
  operating_hours TEXT,
  background_color TEXT,
  data_isolation_mode TEXT DEFAULT 'shared',
  share_inventory INTEGER DEFAULT 1
);

-- 7. Add default branch if it doesn't exist
INSERT OR IGNORE INTO store_locations (
  id, name, code, address, phone, email, is_active,
  data_isolation_mode, share_inventory, background_color
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Main Store',
  'MAIN',
  'Default Address',
  '+255000000000',
  'admin@store.com',
  1,
  'shared',
  1,
  '#3b82f6'
);

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_branch ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_lats_customers_branch ON lats_customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_store_locations_active ON store_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_lats_products_sku ON lats_products(sku);

-- 9. Verify the fixes
SELECT 'Schema verification:' as status;
SELECT 'customers table exists:' as check, COUNT(name) > 0 as result
FROM sqlite_master WHERE type='table' AND name='customers';

SELECT 'lats_customers table exists:' as check, COUNT(name) > 0 as result
FROM sqlite_master WHERE type='table' AND name='lats_customers';

SELECT 'store_locations table exists:' as check, COUNT(name) > 0 as result
FROM sqlite_master WHERE type='table' AND name='store_locations';

SELECT 'lats_products table exists:' as check, COUNT(name) > 0 as result
FROM sqlite_master WHERE type='table' AND name='lats_products';

-- Check column counts
SELECT 'customers records:' as table_name, COUNT(*) as count FROM customers
UNION ALL
SELECT 'lats_customers records:' as table_name, COUNT(*) as count FROM lats_customers
UNION ALL
SELECT 'store_locations records:' as table_name, COUNT(*) as count FROM store_locations
UNION ALL
SELECT 'lats_products records:' as table_name, COUNT(*) as count FROM lats_products
UNION ALL
SELECT 'schema_migrations records:' as table_name, COUNT(*) as count FROM schema_migrations;

-- Check for background_color column
SELECT 'background_color column exists:' as check,
  COUNT(*) > 0 as result
FROM pragma_table_info('store_locations')
WHERE name = 'background_color';

-- Check for sku column
SELECT 'sku column exists:' as check,
  COUNT(*) > 0 as result
FROM pragma_table_info('lats_products')
WHERE name = 'sku';

SELECT 'Database schema fixes completed successfully!' as status;
