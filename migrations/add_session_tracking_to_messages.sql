-- Add session tracking to outgoing messages
-- This allows tracking which WhatsApp session was used to send each message

-- Add session_id to whatsapp_logs table
ALTER TABLE whatsapp_logs 
ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES whatsapp_sessions(id) ON DELETE SET NULL;

-- Add session_id to whatsapp_incoming_messages table
ALTER TABLE whatsapp_incoming_messages 
ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES whatsapp_sessions(id) ON DELETE SET NULL;

-- Create index for faster session-based queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_session ON whatsapp_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_session ON whatsapp_incoming_messages(session_id);

-- Create user preferences table for active session selection
CREATE TABLE IF NOT EXISTS user_whatsapp_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  active_session_id INTEGER REFERENCES whatsapp_sessions(id) ON DELETE SET NULL,
  auto_select_session BOOLEAN DEFAULT true, -- Auto-select first connected session
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_whatsapp_prefs_user ON user_whatsapp_preferences(user_id);

-- Update timestamp trigger for preferences
CREATE OR REPLACE FUNCTION update_user_whatsapp_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_whatsapp_preferences_updated_at
BEFORE UPDATE ON user_whatsapp_preferences
FOR EACH ROW
EXECUTE FUNCTION update_user_whatsapp_preferences_updated_at();

COMMENT ON TABLE user_whatsapp_preferences IS 'Stores user preferences for WhatsApp session selection';
COMMENT ON COLUMN whatsapp_logs.session_id IS 'WhatsApp session used to send this message';
COMMENT ON COLUMN whatsapp_incoming_messages.session_id IS 'WhatsApp session that received this message';

