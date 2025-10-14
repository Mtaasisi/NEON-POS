-- ============================================
-- INSERT GOOGLE MAPS AND GEMINI AI INTEGRATIONS
-- ============================================
-- This script adds Google Maps and Gemini AI to the integrations table
-- so they can be managed from the admin settings page
-- ============================================

-- ============================================
-- 1. INSERT GOOGLE MAPS INTEGRATION
-- ============================================

INSERT INTO lats_pos_integrations_settings (
  user_id,
  business_id,
  integration_name,
  integration_type,
  provider_name,
  is_enabled,
  is_active,
  is_test_mode,
  credentials,
  config,
  description,
  environment,
  total_requests,
  successful_requests,
  failed_requests,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users LIMIT 1), -- Use first user
  NULL,
  'GOOGLE_MAPS',
  'maps',
  'Google Maps',
  true, -- enabled
  true, -- active
  false, -- not test mode
  jsonb_build_object(
    'api_key', 'AIzaSyBka_sgKe9_75RvzWOfqsuiNSsyZSzV4P8'
  ),
  jsonb_build_object(
    'default_lat', '-6.7924',
    'default_lng', '39.2083',
    'default_zoom', 13,
    'enable_geofencing', true,
    'geofence_radius', 100
  ),
  'Location services, maps, and geofencing for attendance tracking',
  'production',
  0,
  0,
  0,
  NOW(),
  NOW()
)
ON CONFLICT (user_id, business_id, integration_name) 
DO UPDATE SET
  credentials = EXCLUDED.credentials,
  config = EXCLUDED.config,
  is_enabled = EXCLUDED.is_enabled,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================
-- 2. INSERT GEMINI AI INTEGRATION
-- ============================================

INSERT INTO lats_pos_integrations_settings (
  user_id,
  business_id,
  integration_name,
  integration_type,
  provider_name,
  is_enabled,
  is_active,
  is_test_mode,
  credentials,
  config,
  description,
  environment,
  total_requests,
  successful_requests,
  failed_requests,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users LIMIT 1), -- Use first user
  NULL,
  'GEMINI_AI',
  'ai',
  'Google Gemini',
  true, -- enabled
  true, -- active
  false, -- not test mode
  jsonb_build_object(
    'api_key', 'AIzaSyBRGcampOXapiMREewVIvuksNfhBYkKCXw'
  ),
  jsonb_build_object(
    'model', 'gemini-1.5-flash',
    'temperature', 0.7,
    'max_tokens', 1000
  ),
  'AI-powered features including SMS generation, customer responses, and inventory analysis',
  'production',
  0,
  0,
  0,
  NOW(),
  NOW()
)
ON CONFLICT (user_id, business_id, integration_name) 
DO UPDATE SET
  credentials = EXCLUDED.credentials,
  config = EXCLUDED.config,
  is_enabled = EXCLUDED.is_enabled,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================
-- VERIFY THE INSERTIONS
-- ============================================

SELECT 
  integration_name,
  provider_name,
  integration_type,
  is_enabled,
  is_active,
  credentials->>'api_key' as api_key_preview,
  jsonb_pretty(config) as configuration,
  created_at,
  updated_at
FROM lats_pos_integrations_settings
WHERE integration_name IN ('GOOGLE_MAPS', 'GEMINI_AI')
ORDER BY integration_name;

-- ============================================
-- NOTES:
-- ============================================
-- 
-- 1. Both integrations are now stored in the database
-- 2. They can be managed from Admin → Settings → Integrations
-- 3. The services will check database first, then .env file
-- 4. To disable, set is_enabled = false in the admin panel
-- 5. API keys are stored in the credentials JSONB field
-- 6. Configuration options are in the config JSONB field
-- 
-- ============================================

