-- ============================================
-- CREATE WHATSAPP TABLES AND VIEWS
-- ============================================

-- 1. Create whatsapp_instances table with proper schema
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  instance_id TEXT NOT NULL,
  api_token TEXT NOT NULL,
  instance_name TEXT,
  description TEXT,
  green_api_host TEXT DEFAULT 'https://api.green-api.com',
  green_api_url TEXT,
  state_instance TEXT DEFAULT 'notAuthorized',
  status TEXT DEFAULT 'inactive',
  phone_number TEXT,
  wid TEXT,
  country_instance TEXT,
  type_account TEXT,
  is_active BOOLEAN DEFAULT false,
  last_connected_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  profile_name TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the comprehensive view that the frontend expects
CREATE OR REPLACE VIEW whatsapp_instances_comprehensive AS
SELECT * FROM whatsapp_instances;

-- 3. Grant permissions
GRANT ALL ON whatsapp_instances TO authenticated;
GRANT ALL ON whatsapp_instances_comprehensive TO authenticated;

-- 4. Disable RLS for development
ALTER TABLE whatsapp_instances DISABLE ROW LEVEL SECURITY;

-- 5. Create message queue table if needed
CREATE TABLE IF NOT EXISTS green_api_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create campaigns table if needed
CREATE TABLE IF NOT EXISTS green_api_bulk_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions for new tables
GRANT ALL ON green_api_message_queue TO authenticated;
GRANT ALL ON green_api_bulk_campaigns TO authenticated;

ALTER TABLE green_api_message_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE green_api_bulk_campaigns DISABLE ROW LEVEL SECURITY;

SELECT '✅ WhatsApp tables and views created successfully!' as result;

