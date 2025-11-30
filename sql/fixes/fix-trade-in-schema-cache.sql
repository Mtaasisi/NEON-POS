-- ================================================
-- FIX TRADE-IN SCHEMA CACHE ISSUE
-- ================================================
-- This file fixes the PostgREST schema cache issue causing:
-- "Could not find a relationship between 'lats_trade_in_prices' and 'lats_products'"
-- ================================================

-- Step 1: Verify the foreign key relationship exists
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'lats_trade_in_prices'
    AND kcu.column_name = 'product_id';

-- Expected output: Should show the foreign key constraint linking product_id to lats_products(id)

-- Step 2: Verify the table and column exist
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'lats_trade_in_prices'
    AND column_name IN ('id', 'product_id', 'variant_id', 'branch_id')
ORDER BY ordinal_position;

-- Step 3: Check if PostgREST can see the relationship
-- This query checks the pg_constraint catalog which PostgREST uses
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS foreign_table_name,
    a.attname AS column_name,
    af.attname AS foreign_column_name
FROM pg_constraint AS c
JOIN pg_attribute AS a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute AS af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.contype = 'f'
    AND c.conrelid::regclass::text = 'lats_trade_in_prices'
    AND a.attname = 'product_id';

-- Step 4: Reload PostgREST schema cache
-- This sends a notification to PostgREST to reload its schema cache
-- Note: This requires appropriate permissions
NOTIFY pgrst, 'reload schema';

-- Step 5: Alternative - If the relationship still doesn't work, 
-- we can recreate the foreign key to force cache refresh
-- UNCOMMENT ONLY IF NEEDED:
/*
-- Drop and recreate the foreign key
ALTER TABLE lats_trade_in_prices 
    DROP CONSTRAINT IF EXISTS lats_trade_in_prices_product_id_fkey;

ALTER TABLE lats_trade_in_prices 
    ADD CONSTRAINT lats_trade_in_prices_product_id_fkey 
    FOREIGN KEY (product_id) 
    REFERENCES lats_products(id) 
    ON DELETE CASCADE;

-- Create index if not exists (for performance)
CREATE INDEX IF NOT EXISTS idx_trade_in_prices_product 
    ON lats_trade_in_prices(product_id);

-- Send reload notification
NOTIFY pgrst, 'reload schema';
*/

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Test query to verify the relationship works in SQL
SELECT 
    tip.id,
    tip.device_name,
    tip.device_model,
    tip.base_trade_in_price,
    p.id AS product_id,
    p.name AS product_name,
    p.sku AS product_sku
FROM lats_trade_in_prices tip
LEFT JOIN lats_products p ON tip.product_id = p.id
LIMIT 5;

-- Check if there are any trade-in prices defined
SELECT COUNT(*) as total_trade_in_prices FROM lats_trade_in_prices;

-- ================================================
-- EXPECTED RESULTS
-- ================================================
-- 1. Foreign key constraint should exist
-- 2. Columns should all exist and be of type UUID
-- 3. pg_constraint should show the relationship
-- 4. NOTIFY should succeed (no error)
-- 5. Test query should work without errors
-- ================================================

