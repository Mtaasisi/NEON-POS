-- Create Email Logs Table
-- Tracks all emails sent by the system

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Email details
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'queued', 'bounced', 'delivered')),
  
  -- Tracking
  message_id VARCHAR(255),
  error_message TEXT,
  provider_response JSONB,
  
  -- Context
  user_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  branch_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_message_id ON email_logs(message_id);

-- Comments
COMMENT ON TABLE email_logs IS 'Tracks all emails sent by the system';
COMMENT ON COLUMN email_logs.message_id IS 'Unique message ID from email provider';
COMMENT ON COLUMN email_logs.provider_response IS 'Full response from email provider';

-- Row Level Security
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Admin can see all logs
CREATE POLICY email_logs_admin_all 
ON email_logs 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM auth_users
    WHERE auth_users.id = auth.uid()
    AND auth_users.role = 'admin'
  )
);

-- Users can only see emails they sent
CREATE POLICY email_logs_user_own 
ON email_logs 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Anyone authenticated can insert
CREATE POLICY email_logs_insert 
ON email_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

GRANT SELECT, INSERT ON email_logs TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ Email logs table created successfully';
END $$;

