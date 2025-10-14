-- ============================================
-- FIX ALL ADMIN SETTINGS TABLES
-- This script creates all missing tables for Admin Settings features
-- Date: October 12, 2025
-- ============================================

-- ============================================
-- 1. STORE LOCATIONS TABLE
-- ============================================
DROP TABLE IF EXISTS store_locations CASCADE;

CREATE TABLE store_locations (
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

CREATE INDEX idx_store_locations_code ON store_locations(code);
CREATE INDEX idx_store_locations_active ON store_locations(is_active);
CREATE INDEX idx_store_locations_is_main ON store_locations(is_main);

ALTER TABLE store_locations DISABLE ROW LEVEL SECURITY;
GRANT ALL ON store_locations TO PUBLIC;

-- ============================================
-- 2. API KEYS TABLE
-- ============================================
DROP TABLE IF EXISTS api_keys CASCADE;

CREATE TABLE api_keys (
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

CREATE INDEX idx_api_keys_key ON api_keys(key);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;
GRANT ALL ON api_keys TO PUBLIC;

-- ============================================
-- 3. WEBHOOK ENDPOINTS TABLE
-- ============================================
DROP TABLE IF EXISTS webhook_endpoints CASCADE;

CREATE TABLE webhook_endpoints (
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

CREATE INDEX idx_webhook_endpoints_user ON webhook_endpoints(user_id);
CREATE INDEX idx_webhook_endpoints_active ON webhook_endpoints(is_active);

ALTER TABLE webhook_endpoints DISABLE ROW LEVEL SECURITY;
GRANT ALL ON webhook_endpoints TO PUBLIC;

-- ============================================
-- 4. WEBHOOK LOGS TABLE
-- ============================================
DROP TABLE IF EXISTS webhook_logs CASCADE;

CREATE TABLE webhook_logs (
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

CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at);

ALTER TABLE webhook_logs DISABLE ROW LEVEL SECURITY;
GRANT ALL ON webhook_logs TO PUBLIC;

-- ============================================
-- 5. DOCUMENT TEMPLATES TABLE
-- ============================================
DROP TABLE IF EXISTS document_templates CASCADE;

CREATE TABLE document_templates (
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

CREATE INDEX idx_document_templates_user ON document_templates(user_id);
CREATE INDEX idx_document_templates_type ON document_templates(type);
CREATE INDEX idx_document_templates_default ON document_templates(is_default);

ALTER TABLE document_templates DISABLE ROW LEVEL SECURITY;
GRANT ALL ON document_templates TO PUBLIC;

-- ============================================
-- 6. API REQUEST LOGS TABLE
-- ============================================
DROP TABLE IF EXISTS api_request_logs CASCADE;

CREATE TABLE api_request_logs (
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

CREATE INDEX idx_api_logs_key ON api_request_logs(api_key_id);
CREATE INDEX idx_api_logs_created ON api_request_logs(created_at);
CREATE INDEX idx_api_logs_ip ON api_request_logs(ip_address);

ALTER TABLE api_request_logs DISABLE ROW LEVEL SECURITY;
GRANT ALL ON api_request_logs TO PUBLIC;

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

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
-- INSERT DEFAULT DATA
-- ============================================

-- Insert a main store location
INSERT INTO store_locations (name, code, address, city, country, is_main, is_active, phone, email)
VALUES 
  ('Main Store', 'MAIN-001', 'Main Street', 'Arusha', 'Tanzania', true, true, '+255 000 000 000', 'info@inauzwa.com')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
DECLARE
  store_count INTEGER;
  api_key_count INTEGER;
  webhook_count INTEGER;
  template_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO store_count FROM store_locations;
  SELECT COUNT(*) INTO api_key_count FROM api_keys;
  SELECT COUNT(*) INTO webhook_count FROM webhook_endpoints;
  SELECT COUNT(*) INTO template_count FROM document_templates;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ALL ADMIN SETTINGS TABLES CREATED SUCCESSFULLY!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Tables Created:';
  RAISE NOTICE '   ✓ store_locations (% records)', store_count;
  RAISE NOTICE '   ✓ api_keys (% records)', api_key_count;
  RAISE NOTICE '   ✓ webhook_endpoints (% records)', webhook_count;
  RAISE NOTICE '   ✓ webhook_logs';
  RAISE NOTICE '   ✓ document_templates (% records)', template_count;
  RAISE NOTICE '   ✓ api_request_logs';
  RAISE NOTICE '';
  RAISE NOTICE '🔓 Permissions Granted:';
  RAISE NOTICE '   ✓ RLS disabled on all tables';
  RAISE NOTICE '   ✓ Full access granted to PUBLIC (all users)';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Features Now Available:';
  RAISE NOTICE '   ✓ Multi-store/branch management';
  RAISE NOTICE '   ✓ API key generation & management';
  RAISE NOTICE '   ✓ Webhook endpoints configuration';
  RAISE NOTICE '   ✓ Document template customization';
  RAISE NOTICE '';
  RAISE NOTICE '✨ Your Admin Settings page should now work without errors!';
  RAISE NOTICE '';
END $$;

