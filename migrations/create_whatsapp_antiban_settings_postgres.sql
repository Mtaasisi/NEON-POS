-- ============================================
-- WhatsApp Anti-Ban Settings Table (PostgreSQL)
-- ============================================
-- Stores user-specific anti-ban settings for WhatsApp bulk messaging
-- Settings persist across sessions and are loaded automatically

CREATE TABLE IF NOT EXISTS whatsapp_antiban_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER DEFAULT NULL,
  
  -- Basic Protection Settings
  use_personalization BOOLEAN DEFAULT TRUE,
  random_delay BOOLEAN DEFAULT TRUE,
  vary_length BOOLEAN DEFAULT TRUE,
  skip_recently_contacted BOOLEAN DEFAULT TRUE,
  use_invisible_chars BOOLEAN DEFAULT TRUE,
  use_emoji_variation BOOLEAN DEFAULT TRUE,
  
  -- Timing Controls
  min_delay INTEGER DEFAULT 3, -- Minimum delay between messages in seconds
  max_delay INTEGER DEFAULT 8, -- Maximum delay between messages in seconds
  batch_delay INTEGER DEFAULT 60, -- Delay between batches in seconds
  
  -- Rate Limits
  batch_size INTEGER DEFAULT 20, -- Number of messages per batch
  max_per_hour INTEGER DEFAULT 30, -- Maximum messages per hour
  daily_limit INTEGER DEFAULT 100, -- Maximum messages per day
  
  -- Smart Features
  respect_quiet_hours BOOLEAN DEFAULT TRUE,
  use_presence BOOLEAN DEFAULT FALSE, -- Show typing indicator
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one settings record per user
  CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- ============================================
-- Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_antiban_user_id ON whatsapp_antiban_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_antiban_updated_at ON whatsapp_antiban_settings(updated_at);

-- ============================================
-- Create trigger for updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_antiban_settings_updated_at 
  BEFORE UPDATE ON whatsapp_antiban_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Default Settings for System (user_id = NULL)
-- ============================================
INSERT INTO whatsapp_antiban_settings (
  user_id,
  use_personalization,
  random_delay,
  min_delay,
  max_delay,
  batch_size,
  batch_delay,
  max_per_hour,
  daily_limit,
  skip_recently_contacted,
  respect_quiet_hours,
  use_invisible_chars,
  use_emoji_variation,
  vary_length,
  use_presence
) VALUES (
  NULL,  -- System-wide default
  TRUE,  -- use_personalization
  TRUE,  -- random_delay
  3,     -- min_delay
  8,     -- max_delay
  20,    -- batch_size
  60,    -- batch_delay
  30,    -- max_per_hour
  100,   -- daily_limit
  TRUE,  -- skip_recently_contacted
  TRUE,  -- respect_quiet_hours
  TRUE,  -- use_invisible_chars
  TRUE,  -- use_emoji_variation
  TRUE,  -- vary_length
  FALSE  -- use_presence
) ON CONFLICT (user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- Success message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ WhatsApp Anti-Ban Settings table created successfully!';
END $$;

