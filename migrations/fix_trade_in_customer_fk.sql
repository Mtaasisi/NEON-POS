-- Fix trade-in transactions to reference the correct customers table
-- The original migration referenced lats_customers but the app uses customers table

-- Drop the old foreign key constraint
ALTER TABLE lats_trade_in_transactions 
DROP CONSTRAINT IF EXISTS lats_trade_in_transactions_customer_id_fkey;

-- Add the correct foreign key constraint referencing customers table
ALTER TABLE lats_trade_in_transactions 
ADD CONSTRAINT lats_trade_in_transactions_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- Also update the SELECT query joins in tradeInApi.ts to use customers instead of lats_customers

