#!/usr/bin/env node
/**
 * Check WasenderAPI webhook configuration
 */

import { config } from 'dotenv';
import fetch from 'node-fetch';

config();

const API_KEY = process.env.WASENDER_API_KEY || process.env.VITE_WASENDER_API_KEY;

console.log('\n🔍 Checking WasenderAPI Webhook Configuration\n');
console.log('='.repeat(50));

if (!API_KEY) {
  console.log('❌ ERROR: WASENDER_API_KEY not found in .env file');
  console.log('   Please add: WASENDER_API_KEY=your_api_key');
  process.exit(1);
}

console.log('✅ API Key found:', API_KEY.substring(0, 20) + '...');

async function checkWebhook() {
  try {
    console.log('\n📡 Fetching webhook configuration from WasenderAPI...');
    
    const response = await fetch('https://wasenderapi.com/api/webhook', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('\n✅ Webhook Configuration:\n');
    console.log('Webhook URL:', data.webhookUrl || data.url || 'Not configured');
    console.log('Events:', data.events || 'Not configured');
    console.log('Status:', data.enabled || data.status || 'Unknown');
    
    console.log('\n📋 Full Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Check if webhook URL is correct
    console.log('\n🔍 Webhook URL Analysis:');
    const webhookUrl = data.webhookUrl || data.url;
    
    if (!webhookUrl) {
      console.log('❌ NO WEBHOOK URL CONFIGURED!');
      console.log('\n🔧 You need to set the webhook URL:');
      console.log('   Option 1 (Production): https://dukani.site/api/whatsapp/webhook.php');
      console.log('   Option 2 (Local via ngrok): https://your-ngrok-url.ngrok.io/api/whatsapp/webhook');
      console.log('\n   Run: node setup-whatsapp-webhook.mjs');
    } else {
      console.log('✅ Webhook URL is set:', webhookUrl);
      
      // Test if webhook URL is accessible
      console.log('\n🧪 Testing webhook URL accessibility...');
      try {
        const testResponse = await fetch(webhookUrl, {
          method: 'GET',
          timeout: 5000
        });
        
        if (testResponse.ok) {
          console.log('✅ Webhook URL is ACCESSIBLE');
          const testData = await testResponse.json();
          console.log('   Response:', JSON.stringify(testData, null, 2));
        } else {
          console.log('⚠️  Webhook URL returned:', testResponse.status, testResponse.statusText);
        }
      } catch (testError) {
        console.log('❌ Webhook URL is NOT ACCESSIBLE');
        console.log('   Error:', testError.message);
        console.log('\n💡 Possible issues:');
        console.log('   - Server is down');
        console.log('   - Incorrect URL');
        console.log('   - Firewall blocking');
        console.log('   - Need to use ngrok for local development');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 This could mean:');
    console.error('   - Invalid API key');
    console.error('   - WasenderAPI service issue');
    console.error('   - Network connectivity problem');
  }
}

checkWebhook();

