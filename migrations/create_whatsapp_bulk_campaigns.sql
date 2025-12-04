-- WhatsApp Bulk Campaigns Table
-- Stores campaign data for server-side processing

CREATE TABLE IF NOT EXISTS whatsapp_bulk_campaigns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  progress JSONB NOT NULL DEFAULT '{"current": 0, "total": 0, "success": 0, "failed": 0}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'document', 'audio')),
  failed_recipients JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_user_id ON whatsapp_bulk_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_status ON whatsapp_bulk_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_created_at ON whatsapp_bulk_campaigns(created_at DESC);

-- Campaign notifications table (optional - for in-app notifications)
CREATE TABLE IF NOT EXISTS campaign_notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  campaign_id TEXT REFERENCES whatsapp_bulk_campaigns(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON campaign_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON campaign_notifications(is_read);

-- Function to clean up old completed campaigns (optional)
CREATE OR REPLACE FUNCTION cleanup_old_campaigns()
RETURNS void AS $$
BEGIN
  DELETE FROM whatsapp_bulk_campaigns
  WHERE status IN ('completed', 'cancelled')
  AND completed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE whatsapp_bulk_campaigns IS 'Stores WhatsApp bulk send campaigns that run server-side in the cloud, independent of client connection';
COMMENT ON TABLE campaign_notifications IS 'In-app notifications for campaign status updates';

