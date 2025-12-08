#!/usr/bin/env node
/**
 * Send test message via WasenderAPI and check if webhook receives it
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const WASENDER_API = 'https://wasenderapi.com/api';
const SESSION_ID = 37637;
const TEST_PHONE = '255746605561'; // Your phone number for testing

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║  📤 SEND & CHECK MESSAGE TEST                        ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

async function sendAndCheck() {
  const issues = [];
  const working = [];
  const testMessageId = `test_${Date.now()}`;
  const testMessage = `Auto test message - ${new Date().toLocaleString()}`;

  // Step 1: Get WasenderAPI credentials
  console.log('1️⃣ Getting WasenderAPI Credentials...');
  let apiKey = null;
  let sessionId = SESSION_ID;

  try {
    const { data: integration, error } = await supabase
      .from('lats_pos_integrations_settings')
      .select('credentials, config')
      .eq('integration_name', 'WHATSAPP_WASENDER')
      .eq('is_enabled', true)
      .single();

    if (error || !integration) {
      issues.push('❌ WhatsApp integration not found or not enabled');
      console.log('   ❌ Integration not found in database');
      console.log('   💡 You may need to configure it in Admin Settings');
    } else {
      let credentials = integration.credentials;
      if (typeof credentials === 'string') {
        credentials = JSON.parse(credentials);
      }

      apiKey = credentials?.api_key || credentials?.bearer_token || null;
      sessionId = credentials?.session_id || credentials?.whatsapp_session || SESSION_ID;

      if (apiKey) {
        working.push('✅ WasenderAPI credentials found');
        console.log('   ✅ API Key found');
        console.log('   ✅ Session ID:', sessionId);
      } else {
        issues.push('❌ API Key not found in integration credentials');
        console.log('   ❌ API Key missing');
      }
    }
  } catch (error) {
    issues.push('❌ Error getting credentials: ' + error.message);
    console.log('   ❌ Error:', error.message);
  }

  if (!apiKey) {
    console.log('\n⚠️  Cannot proceed without API key');
    console.log('   Please configure WasenderAPI in Admin Settings → Integrations');
    return;
  }

  // Step 2: Send message via WasenderAPI
  console.log('\n2️⃣ Sending Test Message via WasenderAPI...');
  console.log('   To:', TEST_PHONE);
  console.log('   Message:', testMessage);
  console.log('   Session:', sessionId);

  let messageSent = false;
  let wasenderMessageId = null;

  try {
    const response = await fetch(`${WASENDER_API}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        session: sessionId,
        to: TEST_PHONE,
        text: testMessage
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      messageSent = true;
      wasenderMessageId = data.data?.message_id || data.message_id || null;
      working.push('✅ Message sent via WasenderAPI');
      console.log('   ✅ Message sent successfully');
      console.log('   📝 Message ID:', wasenderMessageId || 'N/A');
    } else {
      issues.push('❌ Failed to send message: ' + (data.message || data.error || 'Unknown error'));
      console.log('   ❌ Send failed:', data.message || data.error || 'Unknown error');
      console.log('   📝 Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    issues.push('❌ Error sending message: ' + error.message);
    console.log('   ❌ Error:', error.message);
  }

  if (!messageSent) {
    console.log('\n⚠️  Message not sent, cannot test webhook reception');
    return;
  }

  // Step 3: Wait for webhook to receive
  console.log('\n3️⃣ Waiting for Webhook to Receive Message...');
  console.log('   Waiting 15 seconds for WasenderAPI to send webhook...');
  
  for (let i = 15; i > 0; i--) {
    process.stdout.write(`\r   ${i} seconds remaining...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\r   ✅ Wait complete                    ');

  // Step 4: Check if message was received by webhook
  console.log('\n4️⃣ Checking if Webhook Received Message...');
  
  try {
    // Check database for the message
    const { data: messages, error } = await supabase
      .from('whatsapp_incoming_messages')
      .select('*')
      .eq('from_phone', TEST_PHONE)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      issues.push('❌ Database query error: ' + error.message);
      console.log('   ❌ Error querying database:', error.message);
    } else {
      const now = new Date();
      const recentMessages = messages?.filter(msg => {
        const msgTime = new Date(msg.created_at);
        const secondsAgo = (now - msgTime) / 1000;
        return secondsAgo < 30; // Last 30 seconds
      }) || [];

      if (recentMessages.length > 0) {
        const foundMessage = recentMessages.find(msg => 
          msg.message_text?.includes('Auto test message') || 
          msg.message_text?.includes(testMessage.substring(0, 20))
        );

        if (foundMessage) {
          working.push('✅ Message received by webhook and stored');
          console.log('   ✅ Message found in database!');
          console.log('   📝 Message ID:', foundMessage.message_id);
          console.log('   📝 Text:', foundMessage.message_text);
          console.log('   📝 Time:', foundMessage.created_at);
        } else {
          issues.push('⚠️ Recent messages found but test message not identified');
          console.log('   ⚠️  Recent messages found but test message not identified');
          console.log('   📨 Recent messages:');
          recentMessages.forEach((msg, i) => {
            console.log(`      ${i + 1}. ${msg.message_text?.substring(0, 50)}... (${new Date(msg.created_at).toLocaleTimeString()})`);
          });
        }
      } else {
        issues.push('❌ Message not received by webhook');
        console.log('   ❌ No recent messages found in database');
        console.log('   💡 This means:');
        console.log('      - WasenderAPI did not send webhook');
        console.log('      - OR webhook events are not enabled');
        console.log('      - OR webhook URL is not configured correctly');
      }
    }
  } catch (error) {
    issues.push('❌ Error checking database: ' + error.message);
    console.log('   ❌ Error:', error.message);
  }

  // Step 5: Check webhook configuration
  console.log('\n5️⃣ Checking Webhook Configuration...');
  
  try {
    const webhookResponse = await fetch('https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook');
    const webhookData = await webhookResponse.json();
    
    if (webhookData.database_connected) {
      working.push('✅ Webhook database connection working');
      console.log('   ✅ Webhook is online and database connected');
    } else {
      issues.push('⚠️ Webhook database connection issue');
      console.log('   ⚠️  Webhook online but database not connected');
    }
  } catch (error) {
    issues.push('❌ Webhook endpoint unreachable');
    console.log('   ❌ Cannot reach webhook:', error.message);
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  📋 TEST SUMMARY                                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  if (working.length > 0) {
    console.log('✅ What\'s Working:');
    working.forEach(item => console.log(`   ${item}`));
    console.log('');
  }

  if (issues.length > 0) {
    console.log('⚠️  Issues Found:');
    issues.forEach(item => console.log(`   ${item}`));
    console.log('');
  }

  // Recommendations
  console.log('📋 RECOMMENDATIONS:\n');
  
  if (issues.some(i => i.includes('not received'))) {
    console.log('🔴 CRITICAL: Webhook Events Not Enabled');
    console.log('');
    console.log('   The message was sent but webhook did not receive it.');
    console.log('   This means WasenderAPI events are not enabled.');
    console.log('');
    console.log('   Fix:');
    console.log('   1. Go to: https://wasenderapi.com/whatsapp/37637/edit');
    console.log('   2. Find "Webhook Events" section');
    console.log('   3. Enable: messages.received ✅');
    console.log('   4. Enable: messages.upsert ✅');
    console.log('   5. Save configuration');
    console.log('');
  }

  if (issues.some(i => i.includes('API Key'))) {
    console.log('🔴 CRITICAL: API Key Missing');
    console.log('');
    console.log('   Configure WasenderAPI in Admin Settings → Integrations');
    console.log('');
  }

  console.log('🧪 Next Steps:');
  console.log('   1. Fix any issues identified above');
  console.log('   2. Run this test again: node send-and-check-message.mjs');
  console.log('   3. Send a real message from your phone');
  console.log('   4. Check: node check-received-messages.mjs');
  console.log('');
}

sendAndCheck().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});

