-- ============================================
-- WhatsApp Anti-Ban Settings Table
-- ============================================
-- Stores user-specific anti-ban settings for WhatsApp bulk messaging
-- Settings persist across sessions and are loaded automatically

CREATE TABLE IF NOT EXISTS whatsapp_antiban_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  
  -- Basic Protection Settings
  use_personalization BOOLEAN DEFAULT TRUE,
  random_delay BOOLEAN DEFAULT TRUE,
  vary_length BOOLEAN DEFAULT TRUE,
  skip_recently_contacted BOOLEAN DEFAULT TRUE,
  use_invisible_chars BOOLEAN DEFAULT TRUE,
  use_emoji_variation BOOLEAN DEFAULT TRUE,
  
  -- Timing Controls
  min_delay INT DEFAULT 3 COMMENT 'Minimum delay between messages in seconds',
  max_delay INT DEFAULT 8 COMMENT 'Maximum delay between messages in seconds',
  batch_delay INT DEFAULT 60 COMMENT 'Delay between batches in seconds',
  
  -- Rate Limits
  batch_size INT DEFAULT 20 COMMENT 'Number of messages per batch',
  max_per_hour INT DEFAULT 30 COMMENT 'Maximum messages per hour',
  daily_limit INT DEFAULT 100 COMMENT 'Maximum messages per day',
  
  -- Smart Features
  respect_quiet_hours BOOLEAN DEFAULT TRUE,
  use_presence BOOLEAN DEFAULT FALSE COMMENT 'Show typing indicator',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Ensure one settings record per user
  UNIQUE KEY unique_user_settings (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX idx_user_id ON whatsapp_antiban_settings(user_id);
CREATE INDEX idx_updated_at ON whatsapp_antiban_settings(updated_at);

