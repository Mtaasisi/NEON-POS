-- ============================================
-- OPTIMIZE PURCHASE ORDER PAYMENTS QUERIES
-- ============================================
-- This migration adds indexes for faster payment fetching

-- Add index on purchase_order_id for faster lookups
-- This will dramatically speed up queries that filter by purchase_order_id
CREATE INDEX IF NOT EXISTS idx_po_payments_purchase_order_id 
  ON purchase_order_payments(purchase_order_id);

-- Add composite index for common query pattern (filter + sort)
-- This optimizes the query: WHERE purchase_order_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_po_payments_purchase_order_created 
  ON purchase_order_payments(purchase_order_id, created_at DESC);

-- Add index on payment_date for date-based filtering
CREATE INDEX IF NOT EXISTS idx_po_payments_payment_date 
  ON purchase_order_payments(payment_date);

-- Add index on status for filtering by payment status
CREATE INDEX IF NOT EXISTS idx_po_payments_status 
  ON purchase_order_payments(status);

-- Analyze the table to update query planner statistics
ANALYZE purchase_order_payments;

-- Add comments for documentation
COMMENT ON INDEX idx_po_payments_purchase_order_id IS 'Speeds up payment lookups by purchase order ID';
COMMENT ON INDEX idx_po_payments_purchase_order_created IS 'Optimizes common query pattern: filter by PO + sort by date';
COMMENT ON INDEX idx_po_payments_payment_date IS 'Enables fast date-range queries on payments';
COMMENT ON INDEX idx_po_payments_status IS 'Speeds up filtering payments by status';

-- Verify indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'purchase_order_payments'
ORDER BY indexname;

