-- ================================================
-- ADD EXCHANGE RATES TO INTEGRATION SETTINGS
-- ================================================
-- This migration adds exchange rate configuration to integration_settings table
-- ================================================

-- Insert default exchange rates if not exists
INSERT INTO integration_settings (
  integration_type,
  is_enabled,
  provider,
  config,
  status,
  updated_at
) VALUES (
  'exchange_rates',
  true,
  'manual',
  jsonb_build_object(
    'USD_TZS', 2500,
    'TZS_USD', 0.0004,
    'EUR_TZS', 2700,
    'TZS_EUR', 0.00037,
    'GBP_TZS', 3200,
    'TZS_GBP', 0.00031,
    'KES_TZS', 18,
    'TZS_KES', 0.056,
    'CNY_TZS', 350,
    'TZS_CNY', 0.0029,
    'last_updated', now()::text
  ),
  'active',
  now()
)
ON CONFLICT (integration_type) 
DO UPDATE SET
  updated_at = now()
WHERE integration_settings.integration_type = 'exchange_rates'
  AND integration_settings.config IS NULL;

-- Add comment
COMMENT ON TABLE integration_settings IS 'Stores integration configurations including exchange rates';

-- Verify the insertion
SELECT 
  integration_type,
  is_enabled,
  provider,
  status,
  config->'USD_TZS' as usd_to_tzs_rate,
  config->'EUR_TZS' as eur_to_tzs_rate,
  updated_at
FROM integration_settings
WHERE integration_type = 'exchange_rates';

