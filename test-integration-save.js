// Test script to check if SMS integration saving works
import { upsertIntegration, getIntegration } from './src/lib/integrationsApi.ts';

async function testIntegrationSave() {
  console.log('🧪 Testing SMS integration save...');

  // Create a test SMS integration
  const testIntegration = {
    integration_name: 'SMS_GATEWAY',
    integration_type: 'sms',
    provider_name: 'MShastra Test',
    is_enabled: true,
    is_active: true,
    credentials: {
      api_key: 'test_api_key_123',
      api_password: 'test_password_456',
      sender_id: 'TESTSMS'
    },
    config: {
      api_url: 'https://mshastra.com/sendurl.aspx',
      priority: 'High',
      country_code: 'ALL',
      max_retries: '3',
      timeout: '30000'
    },
    environment: 'production'
  };

  try {
    console.log('📤 Saving integration...');
    const saved = await upsertIntegration(testIntegration);
    console.log('✅ Integration saved:', saved);

    console.log('📥 Loading integration...');
    const loaded = await getIntegration('SMS_GATEWAY');
    console.log('✅ Integration loaded:', loaded);

    console.log('🔍 Checking if credentials match...');
    console.log('Expected api_key:', testIntegration.credentials.api_key);
    console.log('Loaded api_key:', loaded?.credentials?.api_key);
    console.log('Match:', testIntegration.credentials.api_key === loaded?.credentials?.api_key);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testIntegrationSave();
