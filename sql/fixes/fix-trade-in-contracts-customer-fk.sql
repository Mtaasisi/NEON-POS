-- Fix trade-in contracts to reference the correct customers table
-- The lats_trade_in_contracts table referenced lats_customers but the app uses customers table

-- Drop the old foreign key constraint
ALTER TABLE lats_trade_in_contracts 
DROP CONSTRAINT IF EXISTS lats_trade_in_contracts_customer_id_fkey;

-- Add the correct foreign key constraint referencing customers table
ALTER TABLE lats_trade_in_contracts 
ADD CONSTRAINT lats_trade_in_contracts_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- Verify the fix
SELECT 
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
    AND tc.table_name = 'lats_trade_in_contracts'
    AND kcu.column_name = 'customer_id';

