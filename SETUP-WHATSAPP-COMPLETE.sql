-- ============================================
-- COMPLETE WHATSAPP DATABASE SETUP
-- ============================================
-- This creates all necessary WhatsApp tables and columns

-- 1. Create whatsapp_instances table with ALL required columns
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  instance_id TEXT NOT NULL UNIQUE,
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
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add settings column if table exists but column doesn't
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_instances') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_instances' AND column_name = 'settings') THEN
        ALTER TABLE whatsapp_instances ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE '✅ Added settings column to existing whatsapp_instances table';
    END IF;
END $$;

-- 3. Create comprehensive view
CREATE OR REPLACE VIEW whatsapp_instances_comprehensive AS
SELECT * FROM whatsapp_instances;

-- 4. Create message queue table
CREATE TABLE IF NOT EXISTS green_api_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  media_url TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create campaigns table
CREATE TABLE IF NOT EXISTS green_api_bulk_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  recipients JSONB DEFAULT '[]'::jsonb,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create message templates table
CREATE TABLE IF NOT EXISTS whatsapp_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create templates table (Green API templates)
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT UNIQUE,
  template_name TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  category TEXT,
  status TEXT DEFAULT 'active',
  header_text TEXT,
  body_text TEXT,
  footer_text TEXT,
  buttons JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create messages log table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  message_id TEXT,
  chat_id TEXT,
  from_number TEXT,
  to_number TEXT,
  message_type TEXT DEFAULT 'text',
  message_content TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'sent',
  is_incoming BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user ON whatsapp_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_state ON whatsapp_instances(state_instance);
CREATE INDEX IF NOT EXISTS idx_message_queue_status ON green_api_message_queue(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON green_api_bulk_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_messages_instance ON whatsapp_messages(instance_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON whatsapp_messages(timestamp);

-- 10. Grant permissions
GRANT ALL ON whatsapp_instances TO authenticated;
GRANT ALL ON whatsapp_instances_comprehensive TO authenticated;
GRANT ALL ON green_api_message_queue TO authenticated;
GRANT ALL ON green_api_bulk_campaigns TO authenticated;
GRANT ALL ON whatsapp_message_templates TO authenticated;
GRANT ALL ON whatsapp_templates TO authenticated;
GRANT ALL ON whatsapp_messages TO authenticated;

-- 11. Disable RLS for development (enable in production with proper policies)
ALTER TABLE whatsapp_instances DISABLE ROW LEVEL SECURITY;
ALTER TABLE green_api_message_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE green_api_bulk_campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;

-- 12. Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 13. Add triggers for updated_at
DROP TRIGGER IF EXISTS update_whatsapp_instances_updated_at ON whatsapp_instances;
CREATE TRIGGER update_whatsapp_instances_updated_at 
    BEFORE UPDATE ON whatsapp_instances 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_message_queue_updated_at ON green_api_message_queue;
CREATE TRIGGER update_message_queue_updated_at 
    BEFORE UPDATE ON green_api_message_queue 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON green_api_bulk_campaigns;
CREATE TRIGGER update_campaigns_updated_at 
    BEFORE UPDATE ON green_api_bulk_campaigns 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON whatsapp_message_templates;
CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON whatsapp_message_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Verification
SELECT '
====================================
✅ WHATSAPP SETUP COMPLETE!
====================================

Created/Verified Tables:
1. ✅ whatsapp_instances (with settings column)
2. ✅ green_api_message_queue
3. ✅ green_api_bulk_campaigns
4. ✅ whatsapp_message_templates
5. ✅ whatsapp_templates
6. ✅ whatsapp_messages

Features:
- Green API Settings support (JSONB column)
- Message queuing
- Bulk campaigns
- Template management
- Message logging
- Auto-update timestamps
- Proper indexes

Next Steps:
1. Check status: Run VERIFY-WHATSAPP-DATABASE.sql
2. Add instances via WhatsApp Connection Manager
3. Configure Green API settings in WhatsApp Chat

====================================
' as result;

-- Show table counts
SELECT 'whatsapp_instances' as table_name, COUNT(*) as record_count FROM whatsapp_instances
UNION ALL
SELECT 'green_api_message_queue', COUNT(*) FROM green_api_message_queue
UNION ALL
SELECT 'green_api_bulk_campaigns', COUNT(*) FROM green_api_bulk_campaigns
UNION ALL
SELECT 'whatsapp_message_templates', COUNT(*) FROM whatsapp_message_templates
UNION ALL
SELECT 'whatsapp_templates', COUNT(*) FROM whatsapp_templates
UNION ALL
SELECT 'whatsapp_messages', COUNT(*) FROM whatsapp_messages;

