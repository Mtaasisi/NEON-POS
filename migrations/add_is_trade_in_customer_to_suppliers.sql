-- Add is_trade_in_customer flag to lats_suppliers table
-- This allows us to distinguish trade-in customers from real suppliers
-- and filter them out from supplier management pages

-- Add the column if it doesn't exist
ALTER TABLE lats_suppliers 
ADD COLUMN IF NOT EXISTS is_trade_in_customer BOOLEAN DEFAULT false;

-- Update existing trade-in suppliers (those with names starting with "Trade-In:")
UPDATE lats_suppliers 
SET is_trade_in_customer = true 
WHERE name LIKE 'Trade-In:%';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_suppliers_is_trade_in_customer 
ON lats_suppliers(is_trade_in_customer);

-- Verify the update
SELECT 
  COUNT(*) as total_suppliers,
  COUNT(*) FILTER (WHERE is_trade_in_customer = true) as trade_in_customers,
  COUNT(*) FILTER (WHERE is_trade_in_customer = false) as real_suppliers
FROM lats_suppliers;

