-- ============================================
-- SCHEDULED BULK MESSAGES SYSTEM
-- Supports both SMS and WhatsApp
-- Can run in background (server) or browser
-- ============================================

-- Main scheduled messages table
CREATE TABLE IF NOT EXISTS scheduled_bulk_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and ownership
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  branch_id UUID,
  
  -- Message details
  name VARCHAR(255) NOT NULL,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('sms', 'whatsapp')),
  message_content TEXT NOT NULL,
  
  -- Media (for WhatsApp)
  media_url TEXT,
  media_type VARCHAR(20) CHECK (media_type IN ('image', 'video', 'document', 'audio')),
  view_once BOOLEAN DEFAULT false,
  
  -- Recipients
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {phone, name, customerId}
  total_recipients INTEGER NOT NULL DEFAULT 0,
  
  -- Scheduling configuration
  schedule_type VARCHAR(30) NOT NULL CHECK (schedule_type IN ('once', 'recurring_daily', 'recurring_weekly', 'recurring_monthly', 'recurring_custom')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(100) DEFAULT 'Africa/Dar_es_Salaam',
  
  -- Recurring settings
  recurrence_pattern JSONB, -- {days: [1,3,5], time: "09:00", end_date: "2025-12-31"}
  recurrence_end_date TIMESTAMPTZ,
  
  -- Execution settings
  execution_mode VARCHAR(20) NOT NULL CHECK (execution_mode IN ('server', 'browser')),
  auto_execute BOOLEAN DEFAULT true,
  
  -- Anti-ban settings (for WhatsApp)
  settings JSONB DEFAULT '{
    "use_personalization": true,
    "random_delay": true,
    "min_delay": 3000,
    "max_delay": 8000,
    "use_presence": true,
    "batch_size": 50
  }'::jsonb,
  
  -- Status tracking
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  
  -- Execution tracking
  last_executed_at TIMESTAMPTZ,
  next_execution_at TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0,
  
  -- Results
  progress JSONB DEFAULT '{
    "current": 0,
    "total": 0,
    "success": 0,
    "failed": 0,
    "pending": 0
  }'::jsonb,
  
  failed_recipients JSONB DEFAULT '[]'::jsonb,
  
  -- Error tracking
  error_message TEXT,
  last_error_at TIMESTAMPTZ,
  
  -- Campaign linking (optional)
  campaign_id TEXT, -- Links to whatsapp_bulk_campaigns or sms_campaigns
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_user_id ON scheduled_bulk_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_branch_id ON scheduled_bulk_messages(branch_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_bulk_messages(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled_for ON scheduled_bulk_messages(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_next_execution ON scheduled_bulk_messages(next_execution_at) WHERE status IN ('pending', 'scheduled');
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_message_type ON scheduled_bulk_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_execution_mode ON scheduled_bulk_messages(execution_mode);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_created_at ON scheduled_bulk_messages(created_at DESC);

-- Execution history table
CREATE TABLE IF NOT EXISTS scheduled_message_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_message_id UUID REFERENCES scheduled_bulk_messages(id) ON DELETE CASCADE,
  
  -- Execution details
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  execution_duration INTEGER, -- in seconds
  
  -- Results
  total_sent INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) CHECK (status IN ('success', 'partial', 'failed')),
  
  -- Details
  failed_recipients JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  
  -- Context
  executed_by VARCHAR(20) CHECK (executed_by IN ('server', 'browser', 'manual')),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_executions_scheduled_message_id ON scheduled_message_executions(scheduled_message_id);
CREATE INDEX IF NOT EXISTS idx_executions_executed_at ON scheduled_message_executions(executed_at DESC);

-- Message templates for quick scheduling
CREATE TABLE IF NOT EXISTS bulk_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and ownership
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID,
  
  -- Template details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('sms', 'whatsapp', 'both')),
  content TEXT NOT NULL,
  
  -- Classification
  category VARCHAR(50), -- marketing, reminder, announcement, etc.
  tags TEXT[],
  
  -- Media (for WhatsApp)
  media_url TEXT,
  media_type VARCHAR(20),
  
  -- Usage stats
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_favorite BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON bulk_message_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_message_type ON bulk_message_templates(message_type);
CREATE INDEX IF NOT EXISTS idx_templates_category ON bulk_message_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON bulk_message_templates(is_active);

-- Recipient lists for quick selection
CREATE TABLE IF NOT EXISTS message_recipient_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and ownership
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID,
  
  -- List details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Recipients
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  
  -- Classification
  category VARCHAR(50), -- vip, inactive, new_customers, etc.
  tags TEXT[],
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recipient_lists_user_id ON message_recipient_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_recipient_lists_is_active ON message_recipient_lists(is_active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scheduled_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_scheduled_messages_timestamp
  BEFORE UPDATE ON scheduled_bulk_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_messages_updated_at();

CREATE TRIGGER update_templates_timestamp
  BEFORE UPDATE ON bulk_message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_messages_updated_at();

CREATE TRIGGER update_recipient_lists_timestamp
  BEFORE UPDATE ON message_recipient_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_messages_updated_at();

-- Function to get next execution time for recurring messages
CREATE OR REPLACE FUNCTION calculate_next_execution(
  p_schedule_type VARCHAR,
  p_last_executed_at TIMESTAMPTZ,
  p_scheduled_for TIMESTAMPTZ,
  p_recurrence_pattern JSONB
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_next_execution TIMESTAMPTZ;
  v_base_time TIMESTAMPTZ;
BEGIN
  -- Use last execution time or scheduled time as base
  v_base_time := COALESCE(p_last_executed_at, p_scheduled_for);
  
  CASE p_schedule_type
    WHEN 'once' THEN
      v_next_execution := NULL; -- No next execution for one-time messages
      
    WHEN 'recurring_daily' THEN
      v_next_execution := v_base_time + INTERVAL '1 day';
      
    WHEN 'recurring_weekly' THEN
      v_next_execution := v_base_time + INTERVAL '1 week';
      
    WHEN 'recurring_monthly' THEN
      v_next_execution := v_base_time + INTERVAL '1 month';
      
    WHEN 'recurring_custom' THEN
      -- Use custom pattern from JSONB
      -- This is a simplified version, you can expand based on your needs
      v_next_execution := v_base_time + (p_recurrence_pattern->>'interval')::INTERVAL;
      
    ELSE
      v_next_execution := NULL;
  END CASE;
  
  RETURN v_next_execution;
END;
$$ LANGUAGE plpgsql;

-- Function to get messages ready for execution
CREATE OR REPLACE FUNCTION get_messages_ready_for_execution(
  p_execution_mode VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  message_type VARCHAR,
  scheduled_for TIMESTAMPTZ,
  execution_mode VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sbm.id,
    sbm.name,
    sbm.message_type,
    sbm.scheduled_for,
    sbm.execution_mode
  FROM scheduled_bulk_messages sbm
  WHERE sbm.status IN ('pending', 'scheduled')
    AND sbm.auto_execute = true
    AND sbm.scheduled_for <= NOW()
    AND (p_execution_mode IS NULL OR sbm.execution_mode = p_execution_mode)
  ORDER BY sbm.scheduled_for ASC;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE scheduled_bulk_messages IS 'Main table for scheduled bulk SMS and WhatsApp messages';
COMMENT ON TABLE scheduled_message_executions IS 'History of scheduled message executions';
COMMENT ON TABLE bulk_message_templates IS 'Reusable message templates for bulk sending';
COMMENT ON TABLE message_recipient_lists IS 'Saved recipient lists for quick selection';

COMMENT ON COLUMN scheduled_bulk_messages.execution_mode IS 'server = runs on backend, browser = runs in client browser';
COMMENT ON COLUMN scheduled_bulk_messages.schedule_type IS 'Type of schedule: once, recurring_daily, recurring_weekly, recurring_monthly, recurring_custom';
COMMENT ON COLUMN scheduled_bulk_messages.recurrence_pattern IS 'JSON config for recurring messages: {days: [1,3,5], time: "09:00", end_date: "2025-12-31"}';

