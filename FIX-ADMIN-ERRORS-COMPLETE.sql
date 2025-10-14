-- ============================================
-- FIX ADMIN SETTINGS ERRORS - COMPLETE SOLUTION
-- This script fixes all Admin Settings page errors
-- Date: October 12, 2025
-- ============================================

-- ============================================
-- 1. GENERAL SETTINGS TABLE (Key-Value Store)
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
GRANT ALL ON settings TO PUBLIC;

-- ============================================
-- 2. STORE LOCATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS store_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  zip_code TEXT,
  country TEXT NOT NULL DEFAULT 'Tanzania',
  phone TEXT,
  email TEXT,
  manager_name TEXT,
  is_main BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  opening_time TIME DEFAULT '09:00',
  closing_time TIME DEFAULT '18:00',
  inventory_sync_enabled BOOLEAN DEFAULT true,
  pricing_model TEXT DEFAULT 'centralized' CHECK (pricing_model IN ('centralized', 'location-specific')),
  tax_rate_override NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_locations_code ON store_locations(code);
CREATE INDEX IF NOT EXISTS idx_store_locations_active ON store_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_store_locations_is_main ON store_locations(is_main);

ALTER TABLE store_locations DISABLE ROW LEVEL SECURITY;
GRANT ALL ON store_locations TO PUBLIC;

-- ============================================
-- 3. API KEYS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  scopes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;
GRANT ALL ON api_keys TO PUBLIC;

-- ============================================
-- 4. WEBHOOK ENDPOINTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  secret TEXT NOT NULL,
  retry_attempts INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  last_triggered TIMESTAMP WITH TIME ZONE,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user ON webhook_endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active ON webhook_endpoints(is_active);

ALTER TABLE webhook_endpoints DISABLE ROW LEVEL SECURITY;
GRANT ALL ON webhook_endpoints TO PUBLIC;

-- ============================================
-- 5. WEBHOOK LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at);

ALTER TABLE webhook_logs DISABLE ROW LEVEL SECURITY;
GRANT ALL ON webhook_logs TO PUBLIC;

-- ============================================
-- 6. DOCUMENT TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  type TEXT NOT NULL CHECK (type IN ('invoice', 'quote', 'purchase_order', 'repair_order', 'receipt')),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  variables TEXT[] DEFAULT '{}',
  paper_size TEXT DEFAULT 'A4' CHECK (paper_size IN ('A4', 'Letter', 'Thermal-80mm', 'Thermal-58mm')),
  orientation TEXT DEFAULT 'portrait' CHECK (orientation IN ('portrait', 'landscape')),
  header_html TEXT,
  footer_html TEXT,
  css_styles TEXT,
  logo_url TEXT,
  show_logo BOOLEAN DEFAULT true,
  show_business_info BOOLEAN DEFAULT true,
  show_customer_info BOOLEAN DEFAULT true,
  show_payment_info BOOLEAN DEFAULT true,
  show_terms BOOLEAN DEFAULT true,
  terms_text TEXT,
  show_signature BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_templates_user ON document_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(type);
CREATE INDEX IF NOT EXISTS idx_document_templates_default ON document_templates(is_default);

ALTER TABLE document_templates DISABLE ROW LEVEL SECURITY;
GRANT ALL ON document_templates TO PUBLIC;

-- ============================================
-- 7. API REQUEST LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_key ON api_request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_logs_ip ON api_request_logs(ip_address);

ALTER TABLE api_request_logs DISABLE ROW LEVEL SECURITY;
GRANT ALL ON api_request_logs TO PUBLIC;

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

-- Settings Update Trigger
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_settings ON settings;
CREATE TRIGGER trigger_update_settings
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- Store Locations Update Trigger
CREATE OR REPLACE FUNCTION update_store_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_store_locations ON store_locations;
CREATE TRIGGER trigger_update_store_locations
  BEFORE UPDATE ON store_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_store_locations_updated_at();

-- API Keys Update Trigger
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_api_keys ON api_keys;
CREATE TRIGGER trigger_update_api_keys
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_keys_updated_at();

-- Webhook Endpoints Update Trigger
CREATE OR REPLACE FUNCTION update_webhook_endpoints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_webhook_endpoints ON webhook_endpoints;
CREATE TRIGGER trigger_update_webhook_endpoints
  BEFORE UPDATE ON webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_endpoints_updated_at();

-- Document Templates Update Trigger
CREATE OR REPLACE FUNCTION update_document_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_document_templates ON document_templates;
CREATE TRIGGER trigger_update_document_templates
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_document_templates_updated_at();

-- ============================================
-- ADD AUTO BACKUP COLUMNS TO lats_pos_general_settings
-- ============================================

DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Checking for automatic backup fields in lats_pos_general_settings...';

    -- Check if table exists first
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'lats_pos_general_settings'
    ) THEN
        RAISE NOTICE '✅ lats_pos_general_settings table found';

        -- Add auto_backup_enabled column
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lats_pos_general_settings' 
            AND column_name = 'auto_backup_enabled'
        ) THEN
            ALTER TABLE lats_pos_general_settings 
            ADD COLUMN auto_backup_enabled BOOLEAN DEFAULT false;
            RAISE NOTICE '  ✅ Added auto_backup_enabled column';
        ELSE
            RAISE NOTICE '  ⏭️  auto_backup_enabled column already exists';
        END IF;

        -- Add auto_backup_frequency column
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lats_pos_general_settings' 
            AND column_name = 'auto_backup_frequency'
        ) THEN
            ALTER TABLE lats_pos_general_settings 
            ADD COLUMN auto_backup_frequency TEXT DEFAULT 'daily'
            CHECK (auto_backup_frequency IN ('daily', 'weekly', 'monthly'));
            RAISE NOTICE '  ✅ Added auto_backup_frequency column';
        ELSE
            RAISE NOTICE '  ⏭️  auto_backup_frequency column already exists';
        END IF;

        -- Add auto_backup_time column
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lats_pos_general_settings' 
            AND column_name = 'auto_backup_time'
        ) THEN
            ALTER TABLE lats_pos_general_settings 
            ADD COLUMN auto_backup_time TEXT DEFAULT '02:00';
            RAISE NOTICE '  ✅ Added auto_backup_time column';
        ELSE
            RAISE NOTICE '  ⏭️  auto_backup_time column already exists';
        END IF;

        -- Add auto_backup_type column
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lats_pos_general_settings' 
            AND column_name = 'auto_backup_type'
        ) THEN
            ALTER TABLE lats_pos_general_settings 
            ADD COLUMN auto_backup_type TEXT DEFAULT 'full'
            CHECK (auto_backup_type IN ('full', 'schema-only', 'data-only'));
            RAISE NOTICE '  ✅ Added auto_backup_type column';
        ELSE
            RAISE NOTICE '  ⏭️  auto_backup_type column already exists';
        END IF;

        -- Add last_auto_backup column
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lats_pos_general_settings' 
            AND column_name = 'last_auto_backup'
        ) THEN
            ALTER TABLE lats_pos_general_settings 
            ADD COLUMN last_auto_backup TIMESTAMP WITH TIME ZONE;
            RAISE NOTICE '  ✅ Added last_auto_backup column';
        ELSE
            RAISE NOTICE '  ⏭️  last_auto_backup column already exists';
        END IF;

    ELSE
        RAISE NOTICE '⚠️  lats_pos_general_settings table does not exist - skipping auto backup columns';
    END IF;

    RAISE NOTICE '✅ Auto backup fields check completed!';
    RAISE NOTICE '';
END $$;

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert a main store location if none exists
INSERT INTO store_locations (name, code, address, city, country, is_main, is_active, phone, email)
SELECT 
  'Main Store',
  'MAIN-001',
  'Main Street',
  'Arusha',
  'Tanzania',
  true,
  true,
  '+255 000 000 000',
  'info@inauzwa.com'
WHERE NOT EXISTS (
  SELECT 1 FROM store_locations WHERE is_main = true
);

-- Insert default rate limit settings if not exists
INSERT INTO settings (key, value, description)
SELECT 
  'api_rate_limits',
  '{"requestsPerMinute": 60, "requestsPerHour": 1000, "requestsPerDay": 10000}',
  'API rate limiting configuration'
WHERE NOT EXISTS (
  SELECT 1 FROM settings WHERE key = 'api_rate_limits'
);

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
DECLARE
  store_count INTEGER;
  api_key_count INTEGER;
  webhook_count INTEGER;
  template_count INTEGER;
  settings_count INTEGER;
  has_general_settings BOOLEAN;
  has_auto_backup BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO store_count FROM store_locations;
  SELECT COUNT(*) INTO api_key_count FROM api_keys;
  SELECT COUNT(*) INTO webhook_count FROM webhook_endpoints;
  SELECT COUNT(*) INTO template_count FROM document_templates;
  SELECT COUNT(*) INTO settings_count FROM settings;
  
  -- Check if lats_pos_general_settings exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'lats_pos_general_settings'
  ) INTO has_general_settings;
  
  -- Check if auto backup columns exist
  IF has_general_settings THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'lats_pos_general_settings' 
      AND column_name = 'auto_backup_enabled'
    ) INTO has_auto_backup;
  ELSE
    has_auto_backup := false;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ALL ADMIN SETTINGS FIXES APPLIED SUCCESSFULLY!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Tables Created/Verified:';
  RAISE NOTICE '   ✓ settings (% records)', settings_count;
  RAISE NOTICE '   ✓ store_locations (% records)', store_count;
  RAISE NOTICE '   ✓ api_keys (% records)', api_key_count;
  RAISE NOTICE '   ✓ webhook_endpoints (% records)', webhook_count;
  RAISE NOTICE '   ✓ webhook_logs';
  RAISE NOTICE '   ✓ document_templates (% records)', template_count;
  RAISE NOTICE '   ✓ api_request_logs';
  
  IF has_general_settings THEN
    IF has_auto_backup THEN
      RAISE NOTICE '   ✓ lats_pos_general_settings (auto backup columns added)';
    ELSE
      RAISE NOTICE '   ⚠️  lats_pos_general_settings exists but auto backup columns not added';
    END IF;
  ELSE
    RAISE NOTICE '   ⚠️  lats_pos_general_settings table not found (create it first)';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🔓 Permissions Granted:';
  RAISE NOTICE '   ✓ RLS disabled on all tables';
  RAISE NOTICE '   ✓ Full access granted to PUBLIC (all users)';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Features Now Available:';
  RAISE NOTICE '   ✓ General settings (key-value store)';
  RAISE NOTICE '   ✓ Multi-store/branch management';
  RAISE NOTICE '   ✓ API key generation & management';
  RAISE NOTICE '   ✓ Webhook endpoints configuration';
  RAISE NOTICE '   ✓ Document template customization';
  
  IF has_auto_backup THEN
    RAISE NOTICE '   ✓ Automatic database backup scheduling';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✨ Your Admin Settings page errors should now be fixed!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '   1. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)';
  RAISE NOTICE '   2. Clear browser cache if needed';
  RAISE NOTICE '   3. Navigate to Admin Settings in your app';
  RAISE NOTICE '   4. Verify no console errors';
  RAISE NOTICE '   5. Start configuring your settings!';
  RAISE NOTICE '';
END $$;

