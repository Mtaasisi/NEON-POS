#!/usr/bin/env node

/**
 * Test WhatsApp API Credentials
 * Verifies if the WasenderAPI credentials in the database are valid
 */

import { config } from 'dotenv';
import fetch from 'node-fetch';
config();

const dbUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

async function testCredentials() {
  console.log('\n🔍 Testing WhatsApp API Credentials...\n');

  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: dbUrl });

    // Get credentials from database
    const result = await pool.query(`
      SELECT 
        integration_name,
        provider_name,
        is_enabled,
        is_active,
        credentials,
        config
      FROM lats_pos_integrations_settings
      WHERE integration_name = 'WHATSAPP_WASENDER'
    `);

    if (result.rows.length === 0) {
      console.log('❌ WhatsApp integration not found in database');
      console.log('\n💡 Run this to configure:');
      console.log('   node quick-configure-whatsapp.mjs YOUR_API_KEY 37637');
      await pool.end();
      process.exit(1);
    }

    const integration = result.rows[0];
    const credentials = integration.credentials;
    const configData = integration.config;

    console.log('📋 Current Configuration:');
    console.log('   Integration:', integration.integration_name);
    console.log('   Provider:', integration.provider_name);
    console.log('   Enabled:', integration.is_enabled ? '✅ YES' : '❌ NO');
    console.log('   Active:', integration.is_active ? '✅ YES' : '❌ NO');
    console.log('   API Key:', credentials.api_key ? credentials.api_key.substring(0, 8) + '...' + credentials.api_key.substring(credentials.api_key.length - 4) : '❌ Missing');
    console.log('   Session ID:', credentials.session_id || credentials.whatsapp_session || '❌ Missing');
    console.log('   API URL:', configData.api_url || 'https://wasenderapi.com/api');
    console.log('');

    if (!credentials.api_key || !credentials.session_id) {
      console.log('❌ Missing credentials. Cannot test API connection.');
      await pool.end();
      process.exit(1);
    }

    // Test API connection
    console.log('🔗 Testing API Connection...');
    const apiUrl = configData.api_url || 'https://wasenderapi.com/api';
    const sessionId = credentials.session_id || credentials.whatsapp_session;
    const apiKey = credentials.api_key || credentials.bearer_token;

    try {
      // Test with a simple session status check
      const response = await fetch(`${apiUrl}/whatsapp/sessions/${sessionId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('   Status Code:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('   Response:', JSON.stringify(data, null, 2));
        console.log('\n✅ API Connection Successful!');
        console.log('   Your WhatsApp integration is properly configured.');
      } else {
        const errorText = await response.text();
        console.log('   Response:', errorText);
        
        if (response.status === 401) {
          console.log('\n❌ Authentication Failed!');
          console.log('   Your API key is invalid or expired.');
          console.log('\n📋 To fix this:');
          console.log('   1. Login to https://wasenderapi.com');
          console.log('   2. Go to https://wasenderapi.com/whatsapp/manage/' + sessionId);
          console.log('   3. Copy your new API Key');
          console.log('   4. Run: node quick-configure-whatsapp.mjs NEW_API_KEY ' + sessionId);
        } else if (response.status === 404) {
          console.log('\n❌ Session Not Found!');
          console.log('   Session ID ' + sessionId + ' does not exist or is invalid.');
          console.log('\n📋 To fix this:');
          console.log('   1. Login to https://wasenderapi.com');
          console.log('   2. Create a new WhatsApp session or find your existing session');
          console.log('   3. Copy your API Key and Session ID');
          console.log('   4. Run: node quick-configure-whatsapp.mjs API_KEY SESSION_ID');
        } else {
          console.log('\n⚠️ API Error (Status ' + response.status + ')');
          console.log('   Check your WasenderAPI account at https://wasenderapi.com');
        }
      }
    } catch (fetchError) {
      console.log('\n❌ Network Error:', fetchError.message);
      console.log('   Could not connect to WasenderAPI');
      console.log('   Check your internet connection or API URL');
    }

    await pool.end();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testCredentials();

