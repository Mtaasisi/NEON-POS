-- ============================================
-- Advanced Settings Table for WhatsApp Features
-- ============================================
-- Unified settings table for all advanced features
-- Supports user-specific and system-wide settings

CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope TEXT NOT NULL CHECK (scope IN ('user', 'system', 'branch')),
    category TEXT NOT NULL, -- e.g., 'whatsapp', 'pos', 'general'
    setting_key TEXT NOT NULL,
    user_id UUID, -- NULL for system/branch settings
    branch_id UUID, -- NULL for system/user settings
    setting_value_text TEXT, -- For simple string values
    setting_value_json JSONB, -- For complex objects
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_settings_scope_category ON settings(scope, category);
CREATE INDEX IF NOT EXISTS idx_settings_user_category ON settings(user_id, category) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at DESC);

-- Unique constraint to prevent duplicates
ALTER TABLE settings DROP CONSTRAINT IF EXISTS unique_settings_key;
ALTER TABLE settings ADD CONSTRAINT unique_settings_key
    UNIQUE (scope, category, setting_key, user_id, branch_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_settings_updated_at ON settings;
CREATE TRIGGER trigger_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_settings_updated_at();

-- Insert default anti-ban settings
INSERT INTO settings (scope, category, setting_key, setting_value_json)
VALUES ('system', 'whatsapp', 'antiban_settings', '{
    "usePersonalization": true,
    "randomDelay": true,
    "minDelay": 3,
    "maxDelay": 8,
    "varyMessageLength": true,
    "skipRecentlyContacted": true,
    "useInvisibleChars": true,
    "useEmojiVariation": true,
    "batchSize": 20,
    "batchDelay": 60,
    "maxPerHour": 30,
    "dailyLimit": 100,
    "respectQuietHours": true
}')
ON CONFLICT (scope, category, setting_key, user_id, branch_id) DO NOTHING;
