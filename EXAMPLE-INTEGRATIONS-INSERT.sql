-- ============================================
-- EXAMPLE INTEGRATIONS DATA
-- ============================================
-- Copy and modify these examples for your needs
-- Replace 'YOUR_USER_ID' with your actual user_id
-- ============================================

-- Get your user_id first
-- SELECT id FROM auth.users WHERE email = 'your@email.com';

-- ============================================
-- EXAMPLE 1: SMS GATEWAY (Twilio)
-- ============================================

INSERT INTO lats_pos_integrations_settings (
  user_id,
  business_id,
  integration_name,
  integration_type,
  provider_name,
  is_enabled,
  is_test_mode,
  environment,
  credentials,
  config,
  description
) VALUES (
  'YOUR_USER_ID', -- Replace with your actual user_id
  NULL,
  'SMS_GATEWAY',
  'sms',
  'Twilio',
  true,
  true,
  'test',
  jsonb_build_object(
    'account_sid', 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'auth_token', 'your_auth_token_here',
    'messaging_service_sid', 'MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  ),
  jsonb_build_object(
    'default_sender', '+1234567890',
    'max_retries', 3,
    'timeout', 30000,
    'enable_delivery_receipt', true
  ),
  'Twilio SMS Gateway for sending receipts and notifications'
)
ON CONFLICT (user_id, business_id, integration_name) 
DO UPDATE SET
  credentials = EXCLUDED.credentials,
  config = EXCLUDED.config,
  updated_at = NOW();

-- ============================================
-- EXAMPLE 2: EMAIL SERVICE (SendGrid)
-- ============================================

INSERT INTO lats_pos_integrations_settings (
  user_id,
  business_id,
  integration_name,
  integration_type,
  provider_name,
  is_enabled,
  is_test_mode,
  environment,
  credentials,
  config,
  description
) VALUES (
  'YOUR_USER_ID',
  NULL,
  'EMAIL_SERVICE',
  'email',
  'SendGrid',
  true,
  false,
  'production',
  jsonb_build_object(
    'api_key', 'SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'sender_email', 'noreply@yourbusiness.com',
    'sender_name', 'Your Business Name'
  ),
  jsonb_build_object(
    'enable_tracking', true,
    'enable_click_tracking', true,
    'template_id', 'd-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'max_retries', 2
  ),
  'SendGrid for sending receipts and marketing emails'
)
ON CONFLICT (user_id, business_id, integration_name) 
DO UPDATE SET
  credentials = EXCLUDED.credentials,
  config = EXCLUDED.config,
  updated_at = NOW();

-- ============================================
-- EXAMPLE 3: PAYMENT GATEWAY (M-Pesa)
-- ============================================

INSERT INTO lats_pos_integrations_settings (
  user_id,
  business_id,
  integration_name,
  integration_type,
  provider_name,
  is_enabled,
  is_test_mode,
  environment,
  credentials,
  config,
  description,
  callback_url
) VALUES (
  'YOUR_USER_ID',
  NULL,
  'MPESA_PAYMENT',
  'payment',
  'M-Pesa (Vodacom)',
  true,
  true,
  'sandbox',
  jsonb_build_object(
    'consumer_key', 'xxxxxxxxxxxxxxxxxxxxxxxx',
    'consumer_secret', 'xxxxxxxxxxxxxxxxxxxxxxxx',
    'business_short_code', '174379',
    'passkey', 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'initiator_name', 'testapi',
    'security_credential', 'encrypted_password_here'
  ),
  jsonb_build_object(
    'transaction_type', 'CustomerPayBillOnline',
    'callback_url', 'https://yourapp.com/api/mpesa/callback',
    'timeout_url', 'https://yourapp.com/api/mpesa/timeout',
    'result_url', 'https://yourapp.com/api/mpesa/result',
    'enable_validation', true
  ),
  'M-Pesa payment integration for mobile money',
  'https://yourapp.com/api/mpesa/callback'
)
ON CONFLICT (user_id, business_id, integration_name) 
DO UPDATE SET
  credentials = EXCLUDED.credentials,
  config = EXCLUDED.config,
  updated_at = NOW();

-- ============================================
-- EXAMPLE 4: PAYMENT GATEWAY (Stripe)
-- ============================================

INSERT INTO lats_pos_integrations_settings (
  user_id,
  business_id,
  integration_name,
  integration_type,
  provider_name,
  is_enabled,
  is_test_mode,
  environment,
  credentials,
  config,
  description
) VALUES (
  'YOUR_USER_ID',
  NULL,
  'STRIPE_PAYMENT',
  'payment',
  'Stripe',
  true,
  true,
  'test',
  jsonb_build_object(
    'publishable_key', 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxx',
    'secret_key', 'sk_test_YOUR_SECRET_KEY_HERE',
    'webhook_secret', 'whsec_xxxxxxxxxxxxxxxxxxxxxxxx'
  ),
  jsonb_build_object(
    'currency', 'usd',
    'capture_method', 'automatic',
    'enable_saved_cards', true,
    'statement_descriptor', 'YOUR_BUSINESS'
  ),
  'Stripe payment gateway for card payments'
)
ON CONFLICT (user_id, business_id, integration_name) 
DO UPDATE SET
  credentials = EXCLUDED.credentials,
  config = EXCLUDED.config,
  updated_at = NOW();

-- ============================================
-- EXAMPLE 5: ANALYTICS (Google Analytics)
-- ============================================

INSERT INTO lats_pos_integrations_settings (
  user_id,
  business_id,
  integration_name,
  integration_type,
  provider_name,
  is_enabled,
  is_test_mode,
  environment,
  credentials,
  config,
  description
) VALUES (
  'YOUR_USER_ID',
  NULL,
  'GOOGLE_ANALYTICS',
  'analytics',
  'Google Analytics',
  false,
  false,
  'production',
  jsonb_build_object(
    'tracking_id', 'UA-XXXXXXXXX-X',
    'measurement_id', 'G-XXXXXXXXXX',
    'api_secret', 'your_api_secret'
  ),
  jsonb_build_object(
    'enable_ecommerce', true,
    'enable_enhanced_ecommerce', true,
    'anonymize_ip', true
  ),
  'Google Analytics for tracking user behavior'
)
ON CONFLICT (user_id, business_id, integration_name) 
DO UPDATE SET
  credentials = EXCLUDED.credentials,
  config = EXCLUDED.config,
  updated_at = NOW();

-- ============================================
-- EXAMPLE 6: SHIPPING (Custom Delivery Service)
-- ============================================

INSERT INTO lats_pos_integrations_settings (
  user_id,
  business_id,
  integration_name,
  integration_type,
  provider_name,
  is_enabled,
  is_test_mode,
  environment,
  credentials,
  config,
  description
) VALUES (
  'YOUR_USER_ID',
  NULL,
  'DELIVERY_SERVICE',
  'shipping',
  'Local Delivery API',
  false,
  true,
  'test',
  jsonb_build_object(
    'api_key', 'your_api_key_here',
    'merchant_id', 'MERCHANT_12345'
  ),
  jsonb_build_object(
    'base_url', 'https://api.delivery-service.com',
    'enable_tracking', true,
    'default_vehicle_type', 'bike',
    'pickup_location', 'Your Store Address'
  ),
  'Third-party delivery service integration'
)
ON CONFLICT (user_id, business_id, integration_name) 
DO UPDATE SET
  credentials = EXCLUDED.credentials,
  config = EXCLUDED.config,
  updated_at = NOW();

-- ============================================
-- VERIFICATION
-- ============================================

-- View all integrations
SELECT 
  integration_name,
  integration_type,
  provider_name,
  is_enabled,
  is_test_mode,
  environment,
  created_at
FROM lats_pos_integrations_settings
ORDER BY integration_type, integration_name;

SELECT '✅ Example integrations inserted successfully!' as status;

