-- ============================================
-- NEW SETTINGS TABLES FOR ADMIN SETTINGS
-- Date: October 12, 2025
-- Features: Store Management, API/Webhooks, Document Templates
-- ============================================

-- ============================================
-- 1. STORE LOCATIONS TABLE (Enhanced with Data Isolation)
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
  
  -- Data Isolation & Sharing Configuration
  data_isolation_mode TEXT DEFAULT 'shared' CHECK (data_isolation_mode IN ('shared', 'isolated', 'hybrid')),
  share_products BOOLEAN DEFAULT true,
  share_customers BOOLEAN DEFAULT true,
  share_inventory BOOLEAN DEFAULT false,
  share_suppliers BOOLEAN DEFAULT true,
  share_categories BOOLEAN DEFAULT true,
  share_employees BOOLEAN DEFAULT false,
  
  -- Transfer & Sync Options
  allow_stock_transfer BOOLEAN DEFAULT true,
  auto_sync_products BOOLEAN DEFAULT true,
  auto_sync_prices BOOLEAN DEFAULT true,
  require_approval_for_transfers BOOLEAN DEFAULT false,
  
  -- Pricing & Tax
  pricing_model TEXT DEFAULT 'centralized' CHECK (pricing_model IN ('centralized', 'location-specific')),
  tax_rate_override NUMERIC(5,2),
  
  -- Permissions
  can_view_other_branches BOOLEAN DEFAULT false,
  can_transfer_to_branches TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_locations_code ON store_locations(code);
CREATE INDEX IF NOT EXISTS idx_store_locations_active ON store_locations(is_active);

-- ============================================
-- 2. API KEYS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- ============================================
-- 3. WEBHOOK ENDPOINTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- ============================================
-- 4. WEBHOOK LOGS TABLE
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

-- ============================================
-- 5. DOCUMENT TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- ============================================
-- 6. API REQUEST LOGS (for rate limiting)
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

-- ============================================
-- 7. LOYALTY PROGRAM SETTINGS (in settings table)
-- Already using the settings table with key 'loyalty_program'
-- No additional table needed
-- ============================================

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

-- Insert a main store location if none exists
INSERT INTO store_locations (name, code, address, city, country, is_main, is_active)
SELECT 
  'Main Store',
  'MAIN-001',
  'Main Street',
  'Arusha',
  'Tanzania',
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM store_locations WHERE is_main = true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users
GRANT ALL ON store_locations TO authenticated;
GRANT ALL ON api_keys TO authenticated;
GRANT ALL ON webhook_endpoints TO authenticated;
GRANT ALL ON webhook_logs TO authenticated;
GRANT ALL ON document_templates TO authenticated;
GRANT ALL ON api_request_logs TO authenticated;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ NEW SETTINGS TABLES CREATED SUCCESSFULLY!';
  RAISE NOTICE '📦 Tables Created:';
  RAISE NOTICE '   - store_locations (Enhanced store/branch management)';
  RAISE NOTICE '   - api_keys (API key management)';
  RAISE NOTICE '   - webhook_endpoints (Webhook configuration)';
  RAISE NOTICE '   - webhook_logs (Webhook execution logs)';
  RAISE NOTICE '   - document_templates (Invoice/Quote templates)';
  RAISE NOTICE '   - api_request_logs (API usage tracking)';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Features Now Available:';
  RAISE NOTICE '   ✓ Multi-store/branch management';
  RAISE NOTICE '   ✓ API key generation & management';
  RAISE NOTICE '   ✓ Webhook endpoints configuration';
  RAISE NOTICE '   ✓ Document template customization';
  RAISE NOTICE '   ✓ Loyalty program configuration (via settings table)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '   1. Configure your stores in Store Management settings';
  RAISE NOTICE '   2. Generate API keys for external integrations';
  RAISE NOTICE '   3. Set up webhooks for real-time notifications';
  RAISE NOTICE '   4. Customize document templates for your business';
  RAISE NOTICE '   5. Configure loyalty program rules';
END $$;

