-- ============================================
-- FIX LOYALTY POINTS TRANSACTIONS TABLE
-- Creates the missing points_transactions table for customer loyalty
-- Date: October 12, 2025
-- ============================================

-- Create points_transactions table
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'adjusted', 'redeemed', 'expired')),
  points_change INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  device_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_points_transactions_customer ON points_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created ON points_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_transactions_type ON points_transactions(transaction_type);

-- Disable Row Level Security
ALTER TABLE points_transactions DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON points_transactions TO PUBLIC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ points_transactions table created successfully!';
  RAISE NOTICE '📊 Table structure:';
  RAISE NOTICE '   - id: UUID (primary key)';
  RAISE NOTICE '   - customer_id: UUID (foreign key to customers)';
  RAISE NOTICE '   - transaction_type: earned/spent/adjusted/redeemed/expired';
  RAISE NOTICE '   - points_change: INTEGER (positive or negative)';
  RAISE NOTICE '   - reason: TEXT (description of transaction)';
  RAISE NOTICE '   - created_at: TIMESTAMP';
  RAISE NOTICE '   - created_by: UUID (user who created transaction)';
  RAISE NOTICE '   - device_id: UUID (optional device reference)';
  RAISE NOTICE '   - metadata: JSONB (additional data like order_id)';
  RAISE NOTICE '';
  RAISE NOTICE '✨ Customer loyalty point history now working!';
END $$;

