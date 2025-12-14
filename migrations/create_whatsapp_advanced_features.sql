-- ============================================
-- WhatsApp Advanced Features - Complete Schema
-- ============================================

-- 1. Campaign Analytics & History
CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  media_url TEXT,
  media_type VARCHAR(50),
  
  -- Recipients
  total_recipients INTEGER NOT NULL,
  recipients_data JSONB, -- Store full recipient list
  
  -- Results
  sent_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  
  -- Settings used
  settings JSONB, -- Store all anti-ban settings
  
  -- Timing
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_seconds INTEGER,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- draft, sending, completed, failed, paused
  
  -- User
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_campaigns_created_by ON whatsapp_campaigns(created_by);
CREATE INDEX idx_campaigns_status ON whatsapp_campaigns(status);
CREATE INDEX idx_campaigns_created_at ON whatsapp_campaigns(created_at DESC);

-- 2. Blacklist / Opt-Out Management
CREATE TABLE IF NOT EXISTS whatsapp_blacklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(50) NOT NULL UNIQUE,
  reason VARCHAR(100), -- manual, stop_command, spam_report, etc.
  opted_out_at TIMESTAMP DEFAULT NOW(),
  
  -- Customer link (no FK constraint as customers might be a view)
  customer_id UUID,
  
  -- Notes
  notes TEXT,
  added_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_blacklist_phone ON whatsapp_blacklist(phone);
CREATE INDEX idx_blacklist_customer_id ON whatsapp_blacklist(customer_id);

-- 3. Media Library
CREATE TABLE IF NOT EXISTS whatsapp_media_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50), -- image, video, document, audio
  file_size INTEGER, -- in bytes
  mime_type VARCHAR(100),
  
  -- Organization
  folder VARCHAR(255) DEFAULT 'General',
  tags TEXT[] DEFAULT '{}'::TEXT[], -- Array of tags for searching
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  
  -- Metadata
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- for video/audio in seconds
  thumbnail_url TEXT,
  
  -- User
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_media_library_folder ON whatsapp_media_library(folder);
CREATE INDEX idx_media_library_file_type ON whatsapp_media_library(file_type);
CREATE INDEX idx_media_library_uploaded_by ON whatsapp_media_library(uploaded_by);

-- 4. Smart Reply Templates
CREATE TABLE IF NOT EXISTS whatsapp_reply_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- pricing, location, hours, general
  
  -- Trigger
  keywords TEXT[] DEFAULT '{}'::TEXT[], -- Array of trigger keywords
  
  -- Response
  message TEXT NOT NULL,
  media_id UUID REFERENCES whatsapp_media_library(id),
  
  -- Auto-send settings
  auto_send BOOLEAN DEFAULT false,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  
  -- User
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reply_templates_category ON whatsapp_reply_templates(category);
CREATE INDEX idx_reply_templates_auto_send ON whatsapp_reply_templates(auto_send);

-- 5. A/B Testing Campaigns
CREATE TABLE IF NOT EXISTS whatsapp_ab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  
  -- Test configuration
  variants JSONB NOT NULL, -- Array of variants with messages
  test_size DECIMAL(3,2) DEFAULT 0.10, -- 10% for testing
  metric VARCHAR(50) DEFAULT 'response_rate', -- response_rate, conversion_rate, etc.
  
  -- Results
  winner_variant VARCHAR(10), -- A, B, C, etc.
  results JSONB, -- Detailed results per variant
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- draft, testing, completed
  test_started_at TIMESTAMP,
  test_completed_at TIMESTAMP,
  winner_sent_at TIMESTAMP,
  
  -- User
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Scheduled Campaigns (Future sends)
CREATE TABLE IF NOT EXISTS whatsapp_scheduled_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES whatsapp_campaigns(id),
  
  -- Schedule settings
  schedule_type VARCHAR(50), -- once, recurring_daily, recurring_weekly, drip
  scheduled_for TIMESTAMP NOT NULL,
  timezone VARCHAR(100) DEFAULT 'Africa/Dar_es_Salaam',
  
  -- Recurring settings (if applicable)
  recurrence_pattern JSONB, -- {days: [1,3,5], time: "09:00"}
  
  -- Drip campaign settings
  drip_sequence JSONB, -- [{delay: 0, message: '...'}, {delay: 86400, message: '...'}]
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, cancelled
  executed_at TIMESTAMP,
  
  -- User
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scheduled_campaigns_scheduled_for ON whatsapp_scheduled_campaigns(scheduled_for);
CREATE INDEX idx_scheduled_campaigns_status ON whatsapp_scheduled_campaigns(status);

-- 7. Customer Segments (for targeting)
CREATE TABLE IF NOT EXISTS whatsapp_customer_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Filter criteria (stored as JSON)
  filters JSONB NOT NULL,
  -- Example: {tags: ['VIP'], last_purchase_days: 30, total_orders: {min: 5}}
  
  -- Cached count
  customer_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMP,
  
  -- User
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. API Health Logs
CREATE TABLE IF NOT EXISTS whatsapp_api_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Status
  status VARCHAR(50), -- healthy, degraded, down
  response_time_ms INTEGER,
  
  -- Limits
  rate_limit_remaining INTEGER,
  rate_limit_total INTEGER,
  credits_remaining INTEGER,
  
  -- Issues
  warnings JSONB, -- Array of warning messages
  errors JSONB, -- Array of errors
  
  checked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_health_checked_at ON whatsapp_api_health(checked_at DESC);

-- 9. Campaign Analytics (detailed metrics)
CREATE TABLE IF NOT EXISTS whatsapp_campaign_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES whatsapp_campaigns(id),
  
  -- Engagement metrics
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_read INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  
  -- Timing metrics
  avg_response_time_seconds INTEGER,
  first_reply_at TIMESTAMP,
  last_reply_at TIMESTAMP,
  
  -- Revenue (if trackable)
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  
  -- Links (if present)
  total_clicks INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  
  -- Calculated metrics
  open_rate DECIMAL(5,2),
  response_rate DECIMAL(5,2),
  conversion_rate DECIMAL(5,2),
  
  calculated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_campaign_metrics_campaign_id ON whatsapp_campaign_metrics(campaign_id);

-- 10. Failed Messages Queue (for smart retry)
CREATE TABLE IF NOT EXISTS whatsapp_failed_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES whatsapp_campaigns(id),
  
  -- Message details
  recipient_phone VARCHAR(50) NOT NULL,
  recipient_name VARCHAR(255),
  message TEXT NOT NULL,
  media_url TEXT,
  
  -- Failure info
  error_message TEXT,
  error_code VARCHAR(50),
  failed_at TIMESTAMP DEFAULT NOW(),
  
  -- Retry tracking
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP,
  last_retry_at TIMESTAMP,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, retrying, success, abandoned
  resolved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_failed_queue_status ON whatsapp_failed_queue(status);
CREATE INDEX idx_failed_queue_next_retry ON whatsapp_failed_queue(next_retry_at);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to check if a phone is blacklisted
CREATE OR REPLACE FUNCTION is_phone_blacklisted(phone_number VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM whatsapp_blacklist 
    WHERE phone = phone_number
  );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate campaign metrics
CREATE OR REPLACE FUNCTION calculate_campaign_metrics(campaign_uuid UUID)
RETURNS void AS $$
DECLARE
  sent_count INT;
  replied_count INT;
BEGIN
  -- Get counts
  SELECT sent_count, replied_count INTO sent_count, replied_count
  FROM whatsapp_campaigns
  WHERE id = campaign_uuid;
  
  -- Insert or update metrics
  INSERT INTO whatsapp_campaign_metrics (
    campaign_id,
    total_sent,
    total_replied,
    response_rate,
    calculated_at
  ) VALUES (
    campaign_uuid,
    sent_count,
    replied_count,
    CASE WHEN sent_count > 0 THEN (replied_count::DECIMAL / sent_count::DECIMAL * 100) ELSE 0 END,
    NOW()
  )
  ON CONFLICT (campaign_id) DO UPDATE SET
    total_sent = EXCLUDED.total_sent,
    total_replied = EXCLUDED.total_replied,
    response_rate = EXCLUDED.response_rate,
    calculated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to increment media library usage count
CREATE OR REPLACE FUNCTION increment_media_usage(media_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_media_library
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Sample Data / Initial Setup
-- ============================================

-- Create default media library folders
INSERT INTO whatsapp_media_library (name, file_name, file_url, file_type, folder, uploaded_by)
VALUES 
  ('Sample Placeholder', 'placeholder.jpg', 'https://placehold.co/800x600/e2e8f0/64748b?text=Sample+Image', 'image', 'General', NULL)
ON CONFLICT DO NOTHING;

-- Create default reply templates
INSERT INTO whatsapp_reply_templates (name, category, keywords, message, auto_send)
VALUES 
  ('Pricing Inquiry', 'pricing', ARRAY['price', 'cost', 'how much'], 'Hi {name}! Our prices start at 50,000 TSH. What would you like to know more about?', false),
  ('Business Hours', 'hours', ARRAY['hours', 'open', 'close', 'when'], 'We are open Monday-Saturday, 9am-6pm. Closed Sundays. 🕒', false),
  ('Location', 'location', ARRAY['location', 'where', 'address'], 'We are located at [Your Address]. Come visit us! 📍', false)
ON CONFLICT DO NOTHING;

-- Grant permissions (adjust based on your RLS policies)
-- ALTER TABLE whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE whatsapp_blacklist ENABLE ROW LEVEL SECURITY;
-- ... etc

-- ============================================
-- Complete! Schema ready for advanced features
-- ============================================

