-- Create User Sessions Table
-- Tracks active user sessions for security and session management

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  
  device_info TEXT,
  ip_address INET,
  user_agent TEXT,
  
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity DESC);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Auto-cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE user_sessions
  SET is_active = false
  WHERE expires_at < CURRENT_TIMESTAMP
  AND is_active = true;
  
  DELETE FROM user_sessions
  WHERE is_active = false
  AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE user_sessions IS 'Tracks active user sessions for security and session management';

-- Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can see their own sessions
CREATE POLICY user_sessions_own 
ON user_sessions 
FOR ALL 
TO authenticated 
USING (user_id = auth.uid());

-- Admin can see all sessions
CREATE POLICY user_sessions_admin 
ON user_sessions 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM auth_users
    WHERE auth_users.id = auth.uid()
    AND auth_users.role = 'admin'
  )
);

GRANT SELECT, INSERT, UPDATE ON user_sessions TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ User sessions table created successfully';
END $$;

