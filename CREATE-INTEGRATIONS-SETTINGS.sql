-- ============================================
-- CREATE INTEGRATIONS & API CREDENTIALS TABLE
-- ============================================
-- This table stores credentials for any third-party
-- integrations (SMS, Email, Payment Gateways, etc.)
-- ============================================

-- ============================================
-- TABLE: INTEGRATIONS SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS lats_pos_integrations_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- Removed FK constraint to auth.users
  business_id UUID,
  
  -- Integration Details
  integration_name TEXT NOT NULL, -- e.g., 'SMS_GATEWAY', 'EMAIL_SERVICE', 'PAYMENT_GATEWAY'
  integration_type TEXT NOT NULL, -- e.g., 'sms', 'email', 'payment', 'analytics', 'shipping'
  provider_name TEXT, -- e.g., 'Twilio', 'SendGrid', 'Stripe', 'M-Pesa'
  
  -- Status & Visibility
  is_enabled BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT false,
  is_test_mode BOOLEAN DEFAULT true,
  
  -- Credentials (stored as JSON for flexibility)
  credentials JSONB DEFAULT '{}'::JSONB,
  -- Example structure:
  -- {
  --   "api_key": "sk_test_xxxxx",
  --   "api_secret": "xxxxx",
  --   "username": "user@example.com",
  --   "password": "encrypted_password",
  --   "sender_id": "YourBrand",
  --   "webhook_url": "https://yourapp.com/webhook"
  -- }
  
  -- Configuration (integration-specific settings)
  config JSONB DEFAULT '{}'::JSONB,
  -- Example structure:
  -- {
  --   "default_sender": "+255123456789",
  --   "max_retries": 3,
  --   "timeout": 30000,
  --   "webhook_secret": "xxxxx"
  -- }
  
  -- Additional Info
  description TEXT,
  webhook_url TEXT,
  callback_url TEXT,
  environment TEXT DEFAULT 'test' CHECK (environment IN ('test', 'production', 'sandbox')),
  
  -- Usage Stats
  last_used_at TIMESTAMP WITH TIME ZONE,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one integration per type per user
  UNIQUE(user_id, business_id, integration_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON lats_pos_integrations_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_business_id ON lats_pos_integrations_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON lats_pos_integrations_settings(integration_type);
CREATE INDEX IF NOT EXISTS idx_integrations_enabled ON lats_pos_integrations_settings(is_enabled) WHERE is_enabled = true;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_integrations_settings_updated_at ON lats_pos_integrations_settings;
CREATE TRIGGER update_integrations_settings_updated_at
    BEFORE UPDATE ON lats_pos_integrations_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Optional - uncomment if using Supabase Auth)
-- ALTER TABLE lats_pos_integrations_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Uncomment if using Supabase Auth with auth.users table)
/*
CREATE POLICY IF NOT EXISTS "Users can view own integrations" 
  ON lats_pos_integrations_settings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own integrations" 
  ON lats_pos_integrations_settings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own integrations" 
  ON lats_pos_integrations_settings FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own integrations" 
  ON lats_pos_integrations_settings FOR DELETE 
  USING (auth.uid() = user_id);
*/

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ Integrations Settings Table Created Successfully!' as status;

-- Check if table exists
SELECT 
  table_name,
  '✅ EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'lats_pos_integrations_settings';

