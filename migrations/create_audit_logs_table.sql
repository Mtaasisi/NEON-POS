-- Create Audit Logs Table
-- Comprehensive audit trail for all user actions and system events

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User information
  user_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  
  -- Action details
  action VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- Record information
  table_name VARCHAR(100),
  record_id VARCHAR(100),
  
  -- Data changes (JSONB for flexible storage)
  old_values JSONB,
  new_values JSONB,
  
  -- Context information
  branch_id UUID,
  branch_name VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for fast querying
  CONSTRAINT audit_logs_action_check CHECK (action IN (
    'CREATE', 'UPDATE', 'DELETE', 'VIEW',
    'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
    'EXPORT', 'IMPORT', 'BACKUP', 'RESTORE',
    'PERMISSION_CHANGE', 'SETTINGS_CHANGE',
    'PAYMENT_CREATE', 'PAYMENT_UPDATE', 'PAYMENT_DELETE',
    'SALE_CREATE', 'SALE_VOID', 'SALE_REFUND',
    'INVENTORY_ADJUST', 'STOCK_TRANSFER',
    'CUSTOM'
  )),
  
  CONSTRAINT audit_logs_category_check CHECK (category IN (
    'auth', 'user_management', 'customer', 'product', 'inventory',
    'sale', 'payment', 'device', 'settings', 'report', 'system'
  ))
);

-- Create indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_branch_id ON audit_logs(branch_id);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);

-- Create GIN index for JSONB columns for fast searching
CREATE INDEX idx_audit_logs_old_values ON audit_logs USING GIN (old_values);
CREATE INDEX idx_audit_logs_new_values ON audit_logs USING GIN (new_values);
CREATE INDEX idx_audit_logs_metadata ON audit_logs USING GIN (metadata);

-- Create a function to automatically clean up old audit logs (keep last 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup monthly (requires pg_cron extension)
-- Uncomment if you have pg_cron extension enabled:
-- SELECT cron.schedule('cleanup-audit-logs', '0 0 1 * *', 'SELECT cleanup_old_audit_logs()');

-- Row Level Security (RLS) policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin can see all logs
CREATE POLICY audit_logs_admin_all 
ON audit_logs 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM auth_users
    WHERE auth_users.id = auth.uid()
    AND auth_users.role = 'admin'
  )
);

-- Users can only see their own logs
CREATE POLICY audit_logs_user_own 
ON audit_logs 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Only system/admin can insert audit logs
CREATE POLICY audit_logs_insert 
ON audit_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all user actions and system events';
COMMENT ON COLUMN audit_logs.user_id IS 'ID of the user who performed the action';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed';
COMMENT ON COLUMN audit_logs.category IS 'Category of the action for grouping';
COMMENT ON COLUMN audit_logs.table_name IS 'Database table affected (if applicable)';
COMMENT ON COLUMN audit_logs.record_id IS 'ID of the affected record';
COMMENT ON COLUMN audit_logs.old_values IS 'Previous values before the change (for updates and deletes)';
COMMENT ON COLUMN audit_logs.new_values IS 'New values after the change (for creates and updates)';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the client';
COMMENT ON COLUMN audit_logs.user_agent IS 'Browser/client user agent string';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional contextual data about the action';

-- Grant permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;
GRANT DELETE ON audit_logs TO authenticated; -- Only for admins via RLS

-- Create a view for easier querying
CREATE OR REPLACE VIEW audit_logs_summary AS
SELECT 
  al.id,
  al.created_at,
  al.user_name,
  al.user_role,
  al.action,
  al.category,
  al.description,
  al.table_name,
  al.record_id,
  al.branch_name,
  CASE 
    WHEN al.old_values IS NOT NULL AND al.new_values IS NOT NULL THEN 'Modified'
    WHEN al.new_values IS NOT NULL THEN 'Created'
    WHEN al.old_values IS NOT NULL THEN 'Deleted'
    ELSE 'Action'
  END as change_type,
  jsonb_object_keys(al.new_values) as changed_fields_count
FROM audit_logs al
ORDER BY al.created_at DESC;

COMMENT ON VIEW audit_logs_summary IS 'Simplified view of audit logs for reporting';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Audit logs table created successfully';
  RAISE NOTICE '📊 Indexes created for optimal performance';
  RAISE NOTICE '🔒 RLS policies enabled';
  RAISE NOTICE '📝 View created: audit_logs_summary';
END $$;

