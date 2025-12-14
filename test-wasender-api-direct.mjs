#!/usr/bin/env node

/**
 * Test WasenderAPI Credentials Directly
 * No database connection needed - just tests the API
 */

import fetch from 'node-fetch';

// These are the credentials found in your database
const API_KEY = 'f864609fa10f4062f5ce346b1bfe830ae49ca286226e0462c65b1a550b2a29d2';
const SESSION_ID = '37637';
const API_URL = 'https://wasenderapi.com/api';

console.log('\n🔍 Testing WasenderAPI Connection...\n');
console.log('📋 Configuration:');
console.log('   API Key:', API_KEY.substring(0, 8) + '...' + API_KEY.substring(API_KEY.length - 4));
console.log('   Session ID:', SESSION_ID);
console.log('   API URL:', API_URL);
console.log('');

async function testAPI() {
  try {
    // Test 1: Check session status
    console.log('🔗 Test 1: Checking session status...');
    const statusUrl = `${API_URL}/whatsapp/sessions/${SESSION_ID}/status`;
    console.log('   URL:', statusUrl);
    
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('   Status Code:', response.status);

    if (response.status === 401) {
      console.log('\n❌ Authentication Failed!');
      console.log('   The API key is invalid or expired.');
      console.log('\n📋 To fix this:');
      console.log('   1. Login to https://wasenderapi.com');
      console.log('   2. Navigate to: https://wasenderapi.com/whatsapp/manage/37637');
      console.log('   3. Copy your new API Key (Bearer Token)');
      console.log('   4. Update your configuration:');
      console.log('      node quick-configure-whatsapp.mjs YOUR_NEW_API_KEY 37637');
      return;
    }

    if (response.status === 404) {
      console.log('\n❌ Session Not Found!');
      console.log('   Session ID 37637 does not exist.');
      console.log('\n📋 To fix this:');
      console.log('   1. Login to https://wasenderapi.com');
      console.log('   2. Check your WhatsApp sessions');
      console.log('   3. Get the correct Session ID');
      console.log('   4. Update your configuration:');
      console.log('      node quick-configure-whatsapp.mjs YOUR_API_KEY CORRECT_SESSION_ID');
      return;
    }

    if (response.ok) {
      const data = await response.json();
      console.log('   Response:', JSON.stringify(data, null, 2));
      console.log('\n✅ API Connection Successful!');
      console.log('   Your credentials are valid.');
      
      // Test 2: Check if session is connected
      if (data.connected || data.status === 'connected' || data.state === 'CONNECTED') {
        console.log('\n✅ WhatsApp Session is Connected!');
        console.log('   You can send messages now.');
        console.log('\n🚀 Next Steps:');
        console.log('   1. The credentials are already in your database');
        console.log('   2. Refresh your browser: http://localhost:5173');
        console.log('   3. Go to Customers page');
        console.log('   4. Click any customer and use the WhatsApp button');
      } else {
        console.log('\n⚠️ WhatsApp Session is Not Connected');
        console.log('   Session Status:', data.status || data.state || 'Unknown');
        console.log('\n📋 To fix this:');
        console.log('   1. Go to https://wasenderapi.com/whatsapp/manage/37637');
        console.log('   2. Connect your WhatsApp by scanning the QR code');
        console.log('   3. Wait for the session to connect');
        console.log('   4. Try again');
      }
    } else {
      const errorText = await response.text();
      console.log('   Response:', errorText);
      console.log('\n⚠️ Unexpected API Response (Status ' + response.status + ')');
      console.log('   Check your WasenderAPI account');
    }

  } catch (error) {
    console.error('\n❌ Network Error:', error.message);
    console.error('   Could not connect to WasenderAPI');
    console.error('\n💡 Possible causes:');
    console.error('   - No internet connection');
    console.error('   - WasenderAPI is down');
    console.error('   - Firewall blocking the request');
  }
}

testAPI();

