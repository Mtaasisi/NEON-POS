#!/usr/bin/env node

/**
 * Find WasenderAPI Session Information
 * Tries different API endpoints to discover the correct session information
 */

import fetch from 'node-fetch';

// The API key from your database
const API_KEY = 'f864609fa10f4062f5ce346b1bfe830ae49ca286226e0462c65b1a550b2a29d2';
const API_URL = 'https://wasenderapi.com/api';

console.log('\n🔍 Discovering WasenderAPI Session Information...\n');

async function discoverEndpoints() {
  console.log('📋 Testing different API endpoints...\n');

  // List of possible endpoints to try
  const endpoints = [
    { name: 'Sessions List', url: '/whatsapp/sessions', method: 'GET' },
    { name: 'Account Info', url: '/account', method: 'GET' },
    { name: 'Account Profile', url: '/profile', method: 'GET' },
    { name: 'Sessions', url: '/sessions', method: 'GET' },
    { name: 'User Sessions', url: '/user/sessions', method: 'GET' },
    { name: 'Device List', url: '/devices', method: 'GET' },
    { name: 'WhatsApp Devices', url: '/whatsapp/devices', method: 'GET' },
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`🔗 Testing: ${endpoint.name}`);
      console.log(`   URL: ${API_URL}${endpoint.url}`);
      
      const response = await fetch(`${API_URL}${endpoint.url}`, {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`   Status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Success!`);
        console.log(`   Response:`, JSON.stringify(data, null, 2));
        console.log('');
        
        // If we found sessions, show them
        if (Array.isArray(data)) {
          console.log(`\n📱 Found ${data.length} session(s):\n`);
          data.forEach((session, index) => {
            console.log(`   Session ${index + 1}:`);
            console.log(`   - ID: ${session.id || session.session_id || session.sessionId || 'N/A'}`);
            console.log(`   - Name: ${session.name || session.session_name || 'N/A'}`);
            console.log(`   - Status: ${session.status || session.state || 'N/A'}`);
            console.log(`   - Connected: ${session.connected || session.is_connected || 'N/A'}`);
            console.log('');
          });
        }
        
        return; // Stop after first success
      } else if (response.status === 401) {
        console.log(`   ❌ Authentication Failed - Invalid API Key`);
        console.log('');
        return; // Stop if auth fails
      } else {
        console.log(`   ⚠️ Not found or not accessible`);
        console.log('');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log('');
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 Manual Steps to Find Your Session ID:\n');
  console.log('1. Login to WasenderAPI:');
  console.log('   👉 https://wasenderapi.com/login\n');
  console.log('2. Look for one of these sections:');
  console.log('   - "Sessions" or "My Sessions"');
  console.log('   - "WhatsApp Devices"');
  console.log('   - "Connected Devices"\n');
  console.log('3. You should see your WhatsApp session listed');
  console.log('4. Copy the Session ID (it might be a number or string)\n');
  console.log('5. Then run:');
  console.log('   node quick-configure-whatsapp.mjs YOUR_API_KEY YOUR_SESSION_ID\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

discoverEndpoints();

