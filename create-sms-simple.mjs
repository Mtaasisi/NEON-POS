#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const sql = neon(process.argv[2]);

const userId = '287ec561-d5f2-4113-840e-e9335b9d3f69';

const credentials = {
  api_key: 'Inauzwa',
  api_password: '@Masika10',
  sender_id: 'INAUZWA'
};

const config = {
  api_url: 'https://mshastra.com/sendurl.aspx',
  priority: 'High',
  country_code: 'ALL',
  max_retries: 3,
  timeout: 30000
};

console.log('🔧 Creating SMS Gateway...');

await sql`
  INSERT INTO lats_pos_integrations_settings (
    user_id,
    business_id,
    integration_name,
    integration_type,
    provider_name,
    is_enabled,
    is_active,
    is_test_mode,
    environment,
    credentials,
    config,
    description
  ) VALUES (
    ${userId},
    NULL,
    'SMS_GATEWAY',
    'sms',
    'MShastra',
    true,
    true,
    false,
    'production',
    ${JSON.stringify(credentials)}::jsonb,
    ${JSON.stringify(config)}::jsonb,
    'MShastra SMS Gateway - Inauzwa'
  )
`;

const result = await sql`
  SELECT * FROM lats_pos_integrations_settings 
  WHERE integration_name = 'SMS_GATEWAY'
`;

console.log('✅ SMS Gateway created!');
console.log('Enabled:', result[0].is_enabled);
console.log('Active:', result[0].is_active);
console.log('Environment:', result[0].environment);
console.log('\n⚠️  DO A HARD REFRESH: Cmd/Ctrl + Shift + R\n');

