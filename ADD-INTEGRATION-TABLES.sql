-- ==============================================
-- ENHANCED INTEGRATIONS - DATABASE SCHEMA
-- ==============================================
-- Run this to add tables for robust integrations
-- Supports: SMS, WhatsApp, Mobile Money, Email
-- ==============================================

-- ==============================================
-- 1. SMS LOGS TABLE (Enhanced)
-- ==============================================
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- SMS Details
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  message_id TEXT,
  
  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, sent, delivered, failed, expired
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  
  -- Error Tracking
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Cost Tracking
  cost NUMERIC(10, 4) DEFAULT 0,
  currency TEXT DEFAULT 'TZS',
  
  -- Relations
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  transaction_id UUID,
  
  -- Provider Info
  provider TEXT DEFAULT 'mshastra',  -- mshastra, africastalking, twilio
  sender_id TEXT,
  
  -- Metadata
  template_name TEXT,
  variables JSONB,
  priority TEXT DEFAULT 'normal',  -- high, normal, low
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for SMS logs
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON sms_logs(phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_customer ON sms_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_message_id ON sms_logs(message_id);

-- ==============================================
-- 2. SMS TEMPLATES TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  template TEXT NOT NULL,
  variables TEXT[],  -- Array of variable names
  category TEXT,  -- receipt, alert, reminder, marketing
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default templates
INSERT INTO sms_templates (name, template, variables, category, description) VALUES
('receipt', 'Thank you for your purchase at {business_name}! Receipt #{receipt_number}. Total: {currency}{total}. Visit us again! {business_phone}', 
 ARRAY['business_name', 'receipt_number', 'currency', 'total', 'business_phone'], 'receipt', 'Transaction receipt'),

('payment_confirmation', 'Payment received! {currency}{amount} paid via {payment_method}. Receipt: {receipt_number}. Balance: {balance}. Thank you!',
 ARRAY['currency', 'amount', 'payment_method', 'receipt_number', 'balance'], 'receipt', 'Payment confirmation'),

('low_stock_alert', 'ALERT: {product_name} is low on stock. Only {quantity} remaining. Reorder now!',
 ARRAY['product_name', 'quantity'], 'alert', 'Low stock notification'),

('appointment_reminder', 'Reminder: Your appointment at {business_name} is on {date} at {time}. Location: {address}. Call {phone} to reschedule.',
 ARRAY['business_name', 'date', 'time', 'address', 'phone'], 'reminder', 'Appointment reminder'),

('loyalty_reward', 'Congratulations! You earned {points} loyalty points. Total: {total_points}. Redeem for discounts! {business_name}',
 ARRAY['points', 'total_points', 'business_name'], 'marketing', 'Loyalty points notification')
ON CONFLICT (name) DO NOTHING;

-- ==============================================
-- 3. SCHEDULED SMS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS scheduled_sms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  schedule_date TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'scheduled',  -- scheduled, sent, cancelled, failed
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  transaction_id UUID,
  template_name TEXT,
  variables JSONB,
  sent_at TIMESTAMP,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_sms_date ON scheduled_sms(schedule_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_sms_status ON scheduled_sms(status);

-- ==============================================
-- 4. WHATSAPP MESSAGES TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Message Details
  phone TEXT NOT NULL,
  message TEXT,
  media_url TEXT,
  media_type TEXT,  -- image, video, document, audio
  
  -- Status
  status TEXT DEFAULT 'pending',  -- pending, sent, delivered, read, failed
  message_id TEXT,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  
  -- Relations
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  transaction_id UUID,
  
  -- Provider Info
  provider TEXT DEFAULT 'greenapi',
  instance_id TEXT,
  
  -- Error Tracking
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Template Info
  template_name TEXT,
  template_variables JSONB,
  
  -- Direction
  direction TEXT DEFAULT 'outgoing',  -- outgoing, incoming
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_phone ON whatsapp_messages(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_customer ON whatsapp_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_created ON whatsapp_messages(created_at DESC);

-- ==============================================
-- 5. MOBILE MONEY TRANSACTIONS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS mobile_money_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Transaction Details
  transaction_ref TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,  -- mpesa, tigopesa, airtelmoney
  phone TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'TZS',
  
  -- Status
  status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed, reversed
  
  -- Provider Response
  provider_ref TEXT,  -- Provider's transaction ID
  provider_response JSONB,
  
  -- Timestamps
  initiated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- Relations
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  sale_id UUID,
  
  -- Business Info
  business_shortcode TEXT,
  account_reference TEXT,
  
  -- Error Tracking
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Reconciliation
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMP,
  reconciled_by UUID,
  
  -- Callback Info
  callback_received BOOLEAN DEFAULT false,
  callback_data JSONB,
  callback_received_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_money_ref ON mobile_money_transactions(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_mobile_money_status ON mobile_money_transactions(status);
CREATE INDEX IF NOT EXISTS idx_mobile_money_provider ON mobile_money_transactions(provider);
CREATE INDEX IF NOT EXISTS idx_mobile_money_phone ON mobile_money_transactions(phone);
CREATE INDEX IF NOT EXISTS idx_mobile_money_customer ON mobile_money_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_mobile_money_created ON mobile_money_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mobile_money_reconciled ON mobile_money_transactions(is_reconciled);

-- ==============================================
-- 6. EMAIL LOGS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Email Details
  to_email TEXT NOT NULL,
  from_email TEXT,
  subject TEXT,
  body TEXT,
  html_body TEXT,
  
  -- Attachments
  attachments JSONB,  -- Array of {filename, url, size}
  
  -- Status
  status TEXT DEFAULT 'pending',  -- pending, sent, delivered, bounced, failed
  message_id TEXT,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  
  -- Relations
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  transaction_id UUID,
  
  -- Provider Info
  provider TEXT DEFAULT 'smtp',
  
  -- Error Tracking
  error TEXT,
  bounce_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Template Info
  template_name TEXT,
  template_variables JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_email ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_customer ON email_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);

-- ==============================================
-- 7. INTEGRATION SETTINGS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type TEXT UNIQUE NOT NULL,  -- sms, whatsapp, mpesa, email, etc.
  
  -- Configuration
  is_enabled BOOLEAN DEFAULT false,
  provider TEXT,
  config JSONB,  -- Store API keys, URLs, etc. (encrypted in production!)
  
  -- Status
  status TEXT DEFAULT 'inactive',  -- active, inactive, error
  last_test_date TIMESTAMP,
  last_test_result TEXT,
  
  -- Usage Tracking
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  last_request_at TIMESTAMP,
  
  -- Balance/Credits
  balance NUMERIC(12, 2),
  balance_currency TEXT,
  low_balance_threshold NUMERIC(12, 2),
  last_balance_check TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default integration settings
INSERT INTO integration_settings (integration_type, is_enabled, provider, status) VALUES
('sms', true, 'mshastra', 'active'),
('whatsapp', true, 'greenapi', 'active'),
('mpesa', false, 'vodacom', 'inactive'),
('tigopesa', false, 'tigo', 'inactive'),
('airtelmoney', false, 'airtel', 'inactive'),
('email', false, 'smtp', 'inactive')
ON CONFLICT (integration_type) DO NOTHING;

-- ==============================================
-- 8. INTEGRATION WEBHOOKS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS integration_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Webhook Details
  integration_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  
  -- Processing
  is_processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  processing_result TEXT,
  error TEXT,
  
  -- Request Info
  ip_address TEXT,
  user_agent TEXT,
  headers JSONB,
  
  -- Verification
  signature TEXT,
  is_verified BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_type ON integration_webhooks(integration_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON integration_webhooks(is_processed);
CREATE INDEX IF NOT EXISTS idx_webhooks_created ON integration_webhooks(created_at DESC);

-- ==============================================
-- 9. VIEWS FOR INTEGRATION MONITORING
-- ==============================================

-- SMS Performance View
CREATE OR REPLACE VIEW sms_performance AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(AVG(cost), 2) as avg_cost,
  SUM(cost) as total_cost,
  provider
FROM sms_logs
WHERE status IN ('sent', 'delivered', 'failed')
GROUP BY DATE(created_at), provider
ORDER BY date DESC;

-- Mobile Money Summary View
CREATE OR REPLACE VIEW mobile_money_summary AS
SELECT 
  provider,
  COUNT(*) as total_transactions,
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  SUM(amount) FILTER (WHERE status = 'completed') as total_amount,
  ROUND(AVG(amount), 2) as avg_amount,
  COUNT(DISTINCT customer_id) as unique_customers
FROM mobile_money_transactions
GROUP BY provider;

-- WhatsApp Activity View
CREATE OR REPLACE VIEW whatsapp_activity AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  COUNT(*) FILTER (WHERE status = 'read') as read,
  COUNT(*) FILTER (WHERE direction = 'incoming') as incoming,
  COUNT(*) FILTER (WHERE direction = 'outgoing') as outgoing
FROM whatsapp_messages
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ==============================================
-- 10. FUNCTIONS FOR INTEGRATION MANAGEMENT
-- ==============================================

-- Function to update integration usage stats
CREATE OR REPLACE FUNCTION update_integration_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE integration_settings
  SET 
    total_requests = total_requests + 1,
    successful_requests = CASE 
      WHEN NEW.status IN ('sent', 'delivered', 'completed', 'success') 
      THEN successful_requests + 1 
      ELSE successful_requests 
    END,
    failed_requests = CASE 
      WHEN NEW.status IN ('failed', 'error', 'bounced') 
      THEN failed_requests + 1 
      ELSE failed_requests 
    END,
    last_request_at = NOW()
  WHERE integration_type = NEW.provider OR integration_type = NEW.integration_type;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to track integration usage
DROP TRIGGER IF EXISTS track_sms_usage ON sms_logs;
CREATE TRIGGER track_sms_usage
  AFTER INSERT OR UPDATE ON sms_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_stats();

DROP TRIGGER IF EXISTS track_whatsapp_usage ON whatsapp_messages;
CREATE TRIGGER track_whatsapp_usage
  AFTER INSERT OR UPDATE ON whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_stats();

DROP TRIGGER IF EXISTS track_mobile_money_usage ON mobile_money_transactions;
CREATE TRIGGER track_mobile_money_usage
  AFTER INSERT OR UPDATE ON mobile_money_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_stats();

-- Function to process scheduled SMS
CREATE OR REPLACE FUNCTION process_scheduled_sms()
RETURNS TABLE (processed_count INTEGER) AS $$
DECLARE
  scheduled_record RECORD;
  processed INTEGER := 0;
BEGIN
  -- Find SMS scheduled for now or earlier
  FOR scheduled_record IN
    SELECT * FROM scheduled_sms
    WHERE status = 'scheduled'
      AND schedule_date <= NOW()
    LIMIT 100  -- Process in batches
  LOOP
    -- Mark as sent (actual sending handled by application)
    UPDATE scheduled_sms
    SET status = 'sent', sent_at = NOW()
    WHERE id = scheduled_record.id;
    
    processed := processed + 1;
  END LOOP;
  
  RETURN QUERY SELECT processed;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================
SELECT '✅ Integration tables created successfully!' as status;
SELECT 'Added: SMS logs, templates, WhatsApp, Mobile Money, Email tracking' as info;
SELECT 'Views created: sms_performance, mobile_money_summary, whatsapp_activity' as info;
SELECT 'Functions created: update_integration_stats, process_scheduled_sms' as info;

