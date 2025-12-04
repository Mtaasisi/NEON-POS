-- WhatsApp Sessions Table
-- Stores WhatsApp session information from WasenderAPI for local reference

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id SERIAL PRIMARY KEY,
  wasender_session_id INTEGER NOT NULL UNIQUE, -- ID from WasenderAPI
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'DISCONNECTED', -- connected, DISCONNECTED, connecting, qr_ready
  account_protection BOOLEAN DEFAULT true,
  log_messages BOOLEAN DEFAULT true,
  webhook_url TEXT,
  webhook_enabled BOOLEAN DEFAULT false,
  webhook_events JSONB,
  api_key TEXT,
  webhook_secret TEXT,
  session_data JSONB, -- Store additional session metadata
  user_info JSONB, -- WhatsApp account info (name, profile picture, etc.)
  last_connected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status ON whatsapp_sessions(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_wasender_id ON whatsapp_sessions(wasender_session_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_whatsapp_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_whatsapp_sessions_updated_at
BEFORE UPDATE ON whatsapp_sessions
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_sessions_updated_at();

-- Session logs table (for tracking connection events)
CREATE TABLE IF NOT EXISTS whatsapp_session_logs (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- connected, disconnected, qr_generated, error, etc.
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_session_logs_session ON whatsapp_session_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_session_logs_event ON whatsapp_session_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_session_logs_created ON whatsapp_session_logs(created_at DESC);

COMMENT ON TABLE whatsapp_sessions IS 'Stores WhatsApp Business session information from WasenderAPI';
COMMENT ON TABLE whatsapp_session_logs IS 'Logs for WhatsApp session connection events and status changes';

