-- ================================================
-- FIX TRADE-IN POSTGREST SCHEMA CACHE ISSUE
-- ================================================
-- This fixes the PostgREST error:
-- "Could not find a relationship between 'lats_trade_in_prices' and 'lats_products'"
-- "Could not find a relationship between 'lats_trade_in_transactions' and 'lats_customers'"
-- ================================================

-- Step 1: Drop and recreate foreign keys for lats_trade_in_prices
-- This forces PostgREST to recognize the relationships

-- Drop existing constraints
ALTER TABLE lats_trade_in_prices 
    DROP CONSTRAINT IF EXISTS lats_trade_in_prices_product_id_fkey CASCADE;

ALTER TABLE lats_trade_in_prices 
    DROP CONSTRAINT IF EXISTS lats_trade_in_prices_variant_id_fkey CASCADE;

ALTER TABLE lats_trade_in_prices 
    DROP CONSTRAINT IF EXISTS lats_trade_in_prices_branch_id_fkey CASCADE;

ALTER TABLE lats_trade_in_prices 
    DROP CONSTRAINT IF EXISTS lats_trade_in_prices_created_by_fkey CASCADE;

ALTER TABLE lats_trade_in_prices 
    DROP CONSTRAINT IF EXISTS lats_trade_in_prices_updated_by_fkey CASCADE;

-- Recreate foreign keys with proper naming
ALTER TABLE lats_trade_in_prices 
    ADD CONSTRAINT lats_trade_in_prices_product_id_fkey 
    FOREIGN KEY (product_id) 
    REFERENCES lats_products(id) 
    ON DELETE CASCADE;

ALTER TABLE lats_trade_in_prices 
    ADD CONSTRAINT lats_trade_in_prices_variant_id_fkey 
    FOREIGN KEY (variant_id) 
    REFERENCES lats_product_variants(id) 
    ON DELETE CASCADE;

ALTER TABLE lats_trade_in_prices 
    ADD CONSTRAINT lats_trade_in_prices_branch_id_fkey 
    FOREIGN KEY (branch_id) 
    REFERENCES lats_branches(id) 
    ON DELETE SET NULL;

ALTER TABLE lats_trade_in_prices 
    ADD CONSTRAINT lats_trade_in_prices_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES auth_users(id) 
    ON DELETE SET NULL;

ALTER TABLE lats_trade_in_prices 
    ADD CONSTRAINT lats_trade_in_prices_updated_by_fkey 
    FOREIGN KEY (updated_by) 
    REFERENCES auth_users(id) 
    ON DELETE SET NULL;

-- Step 2: Drop and recreate foreign keys for lats_trade_in_transactions

-- Drop existing constraints
ALTER TABLE lats_trade_in_transactions 
    DROP CONSTRAINT IF EXISTS lats_trade_in_transactions_customer_id_fkey CASCADE;

ALTER TABLE lats_trade_in_transactions 
    DROP CONSTRAINT IF EXISTS lats_trade_in_transactions_branch_id_fkey CASCADE;

ALTER TABLE lats_trade_in_transactions 
    DROP CONSTRAINT IF EXISTS lats_trade_in_transactions_new_product_id_fkey CASCADE;

ALTER TABLE lats_trade_in_transactions 
    DROP CONSTRAINT IF EXISTS lats_trade_in_transactions_new_variant_id_fkey CASCADE;

ALTER TABLE lats_trade_in_transactions 
    DROP CONSTRAINT IF EXISTS lats_trade_in_transactions_sale_id_fkey CASCADE;

ALTER TABLE lats_trade_in_transactions 
    DROP CONSTRAINT IF EXISTS lats_trade_in_transactions_created_by_fkey CASCADE;

ALTER TABLE lats_trade_in_transactions 
    DROP CONSTRAINT IF EXISTS lats_trade_in_transactions_approved_by_fkey CASCADE;

-- Recreate foreign keys with proper naming
ALTER TABLE lats_trade_in_transactions 
    ADD CONSTRAINT lats_trade_in_transactions_customer_id_fkey 
    FOREIGN KEY (customer_id) 
    REFERENCES lats_customers(id) 
    ON DELETE RESTRICT;

ALTER TABLE lats_trade_in_transactions 
    ADD CONSTRAINT lats_trade_in_transactions_branch_id_fkey 
    FOREIGN KEY (branch_id) 
    REFERENCES lats_branches(id) 
    ON DELETE SET NULL;

ALTER TABLE lats_trade_in_transactions 
    ADD CONSTRAINT lats_trade_in_transactions_new_product_id_fkey 
    FOREIGN KEY (new_product_id) 
    REFERENCES lats_products(id) 
    ON DELETE SET NULL;

ALTER TABLE lats_trade_in_transactions 
    ADD CONSTRAINT lats_trade_in_transactions_new_variant_id_fkey 
    FOREIGN KEY (new_variant_id) 
    REFERENCES lats_product_variants(id) 
    ON DELETE SET NULL;

ALTER TABLE lats_trade_in_transactions 
    ADD CONSTRAINT lats_trade_in_transactions_sale_id_fkey 
    FOREIGN KEY (sale_id) 
    REFERENCES lats_sales(id) 
    ON DELETE SET NULL;

ALTER TABLE lats_trade_in_transactions 
    ADD CONSTRAINT lats_trade_in_transactions_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES auth_users(id) 
    ON DELETE SET NULL;

ALTER TABLE lats_trade_in_transactions 
    ADD CONSTRAINT lats_trade_in_transactions_approved_by_fkey 
    FOREIGN KEY (approved_by) 
    REFERENCES auth_users(id) 
    ON DELETE SET NULL;

-- Step 3: Recreate indexes for performance
DROP INDEX IF EXISTS idx_trade_in_prices_product;
DROP INDEX IF EXISTS idx_trade_in_prices_variant;
DROP INDEX IF EXISTS idx_trade_in_prices_branch;
DROP INDEX IF EXISTS idx_trade_in_prices_active;

CREATE INDEX idx_trade_in_prices_product ON lats_trade_in_prices(product_id);
CREATE INDEX idx_trade_in_prices_variant ON lats_trade_in_prices(variant_id);
CREATE INDEX idx_trade_in_prices_branch ON lats_trade_in_prices(branch_id);
CREATE INDEX idx_trade_in_prices_active ON lats_trade_in_prices(is_active);

DROP INDEX IF EXISTS idx_trade_in_transactions_customer;
DROP INDEX IF EXISTS idx_trade_in_transactions_branch;
DROP INDEX IF EXISTS idx_trade_in_transactions_status;
DROP INDEX IF EXISTS idx_trade_in_transactions_new_product;

CREATE INDEX idx_trade_in_transactions_customer ON lats_trade_in_transactions(customer_id);
CREATE INDEX idx_trade_in_transactions_branch ON lats_trade_in_transactions(branch_id);
CREATE INDEX idx_trade_in_transactions_status ON lats_trade_in_transactions(status);
CREATE INDEX idx_trade_in_transactions_new_product ON lats_trade_in_transactions(new_product_id);

-- Step 4: Also fix lats_trade_in_contracts relationships
ALTER TABLE lats_trade_in_contracts 
    DROP CONSTRAINT IF EXISTS lats_trade_in_contracts_transaction_id_fkey CASCADE;

ALTER TABLE lats_trade_in_contracts 
    DROP CONSTRAINT IF EXISTS lats_trade_in_contracts_customer_id_fkey CASCADE;

ALTER TABLE lats_trade_in_contracts 
    ADD CONSTRAINT lats_trade_in_contracts_transaction_id_fkey 
    FOREIGN KEY (transaction_id) 
    REFERENCES lats_trade_in_transactions(id) 
    ON DELETE CASCADE;

ALTER TABLE lats_trade_in_contracts 
    ADD CONSTRAINT lats_trade_in_contracts_customer_id_fkey 
    FOREIGN KEY (customer_id) 
    REFERENCES lats_customers(id) 
    ON DELETE RESTRICT;

-- Step 5: Verify all relationships are in place
SELECT 
    'lats_trade_in_prices' AS table_name,
    COUNT(*) AS foreign_key_count
FROM information_schema.table_constraints
WHERE table_name = 'lats_trade_in_prices'
    AND constraint_type = 'FOREIGN KEY'
UNION ALL
SELECT 
    'lats_trade_in_transactions' AS table_name,
    COUNT(*) AS foreign_key_count
FROM information_schema.table_constraints
WHERE table_name = 'lats_trade_in_transactions'
    AND constraint_type = 'FOREIGN KEY'
UNION ALL
SELECT 
    'lats_trade_in_contracts' AS table_name,
    COUNT(*) AS foreign_key_count
FROM information_schema.table_constraints
WHERE table_name = 'lats_trade_in_contracts'
    AND constraint_type = 'FOREIGN KEY';

-- Step 6: Test the relationships work
SELECT 
    tip.id,
    tip.device_name,
    p.name AS product_name,
    pv.variant_name,
    b.name AS branch_name
FROM lats_trade_in_prices tip
LEFT JOIN lats_products p ON tip.product_id = p.id
LEFT JOIN lats_product_variants pv ON tip.variant_id = pv.id
LEFT JOIN lats_branches b ON tip.branch_id = b.id
LIMIT 5;

SELECT 
    tit.id,
    tit.transaction_number,
    c.name AS customer_name,
    b.name AS branch_name,
    p.name AS new_product_name
FROM lats_trade_in_transactions tit
LEFT JOIN lats_customers c ON tit.customer_id = c.id
LEFT JOIN lats_branches b ON tit.branch_id = b.id
LEFT JOIN lats_products p ON tit.new_product_id = p.id
LIMIT 5;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
SELECT '✅ Trade-in foreign key relationships recreated successfully!' AS status;
SELECT '⚠️ Please refresh your application to reload the schema cache.' AS next_step;

