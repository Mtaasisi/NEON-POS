// Debug script to check integration status
import { getIntegration, getAllIntegrations } from './src/lib/integrationsApi.ts';

async function debugIntegrations() {
  console.log('🔍 Debugging integrations...');

  try {
    // Check all integrations
    console.log('\n📋 All integrations:');
    const allIntegrations = await getAllIntegrations();
    console.log('Found integrations:', allIntegrations.map(i => ({
      name: i.integration_name,
      enabled: i.is_enabled,
      credentials: Object.keys(i.credentials || {}),
      config: Object.keys(i.config || {})
    })));

    // Check SMS integration specifically
    console.log('\n📱 SMS Integration:');
    const smsIntegration = await getIntegration('SMS_GATEWAY');
    console.log('SMS integration:', smsIntegration ? {
      name: smsIntegration.integration_name,
      enabled: smsIntegration.is_enabled,
      credentials: smsIntegration.credentials,
      config: smsIntegration.config
    } : 'NOT FOUND');

    // Check WhatsApp integration specifically
    console.log('\n💬 WhatsApp Integration:');
    const whatsappIntegration = await getIntegration('WHATSAPP_WASENDER');
    console.log('WhatsApp integration:', whatsappIntegration ? {
      name: whatsappIntegration.integration_name,
      enabled: whatsappIntegration.is_enabled,
      credentials: whatsappIntegration.credentials,
      config: whatsappIntegration.config
    } : 'NOT FOUND');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugIntegrations();
