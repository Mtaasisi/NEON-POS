-- =====================================================
-- CREATE PURCHASE ORDER AUDIT LOG TABLE
-- =====================================================
-- This table tracks all changes to purchase orders for audit purposes

CREATE TABLE IF NOT EXISTS lats_purchase_order_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'create', 'approve', 'send', 'ship', 'receive_item', 'receive_complete', 'complete', 'cancel', etc.
  old_status TEXT, -- Previous status
  new_status TEXT, -- New status
  user_id UUID NOT NULL REFERENCES users(id),
  notes TEXT, -- Optional notes about the action
  metadata JSONB, -- Additional data about the action
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_log_po_id ON lats_purchase_order_audit_log(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON lats_purchase_order_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON lats_purchase_order_audit_log(user_id);

-- Add comment for documentation
COMMENT ON TABLE lats_purchase_order_audit_log IS 
'Audit log for tracking all changes and actions performed on purchase orders';

-- Grant permissions
GRANT SELECT, INSERT ON lats_purchase_order_audit_log TO authenticated;

