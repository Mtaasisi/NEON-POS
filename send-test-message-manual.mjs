#!/usr/bin/env node
/**
 * Send test message and check webhook - Manual API Key version
 */

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const WASENDER_API = 'https://wasenderapi.com/api';
const SESSION_ID = 37637;
const TEST_PHONE = '255746605561'; // Your phone number

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║  📤 SEND TEST MESSAGE & CHECK WEBHOOK                 ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

async function sendAndCheck() {
  // Get API key
  console.log('📋 Configuration:');
  console.log('   Session ID:', SESSION_ID);
  console.log('   Test Phone:', TEST_PHONE);
  console.log('   Webhook URL: https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook\n');

  const apiKey = await question('Enter your WasenderAPI Bearer Token (or press Enter to skip sending): ');
  
  if (!apiKey || apiKey.trim() === '') {
    console.log('\n⏭️  Skipping message send. Checking webhook status only...\n');
    await checkWebhookOnly();
    rl.close();
    return;
  }

  const testMessage = `Auto test - ${new Date().toLocaleString()}`;
  console.log(`\n📤 Sending test message: "${testMessage}"`);
  console.log('   To:', TEST_PHONE);
  console.log('   Session:', SESSION_ID);

  // Send message
  let messageSent = false;
  try {
    const response = await fetch(`${WASENDER_API}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        session: SESSION_ID,
        to: TEST_PHONE,
        text: testMessage
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      messageSent = true;
      console.log('   ✅ Message sent successfully!');
      console.log('   📝 Message ID:', data.data?.message_id || data.message_id || 'N/A');
    } else {
      console.log('   ❌ Send failed:', data.message || data.error || 'Unknown error');
      console.log('   📝 Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  if (!messageSent) {
    console.log('\n⚠️  Message not sent. Checking webhook status...\n');
    await checkWebhookOnly();
    rl.close();
    return;
  }

  // Wait for webhook
  console.log('\n⏳ Waiting 15 seconds for webhook to receive message...');
  for (let i = 15; i > 0; i--) {
    process.stdout.write(`\r   ${i} seconds remaining...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\r   ✅ Wait complete                    \n');

  // Check if received
  await checkWebhookOnly(testMessage);
  rl.close();
}

async function checkWebhookOnly(expectedText = null) {
  console.log('🔍 Checking Webhook Status...\n');

  // Check webhook health
  try {
    const webhookResponse = await fetch('https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook');
    const webhookData = await webhookResponse.json();
    
    console.log('📊 Webhook Health:');
    console.log('   Status:', webhookData.status || 'unknown');
    console.log('   Database Connected:', webhookData.database_connected ? '✅ YES' : '❌ NO');
    
    if (!webhookData.database_connected) {
      console.log('   ⚠️  Database connection issue in webhook');
    }
  } catch (error) {
    console.log('   ❌ Cannot reach webhook:', error.message);
  }

  // Check database for recent messages
  console.log('\n📨 Checking Database for Recent Messages...');
  try {
    const { data: messages, error } = await supabase
      .from('whatsapp_incoming_messages')
      .select('*')
      .eq('from_phone', TEST_PHONE)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.log('   ❌ Database error:', error.message);
    } else {
      const now = new Date();
      const recentMessages = messages?.filter(msg => {
        const msgTime = new Date(msg.created_at);
        const secondsAgo = (now - msgTime) / 1000;
        return secondsAgo < 60; // Last minute
      }) || [];

      console.log(`   📊 Found ${recentMessages.length} message(s) in last minute`);

      if (recentMessages.length > 0) {
        console.log('\n   📨 Recent Messages:');
        recentMessages.forEach((msg, i) => {
          const time = new Date(msg.created_at);
          const secondsAgo = Math.floor((now - time) / 1000);
          const isTest = expectedText && msg.message_text?.includes(expectedText.substring(0, 20));
          const marker = isTest ? '🧪' : '📨';
          console.log(`      ${marker} ${i + 1}. ${msg.message_text?.substring(0, 50)}...`);
          console.log(`         Time: ${secondsAgo} seconds ago`);
          console.log(`         ID: ${msg.message_id?.substring(0, 30)}...`);
        });

        if (expectedText) {
          const found = recentMessages.find(msg => 
            msg.message_text?.includes(expectedText.substring(0, 20))
          );
          if (found) {
            console.log('\n   ✅ TEST MESSAGE RECEIVED BY WEBHOOK!');
          } else {
            console.log('\n   ⚠️  Test message not found (but other messages received)');
          }
        }
      } else {
        console.log('\n   ❌ NO MESSAGES RECEIVED IN LAST MINUTE');
        console.log('   💡 This means:');
        console.log('      - WasenderAPI did not send webhook');
        console.log('      - OR webhook events are not enabled');
        console.log('      - OR webhook URL is not configured');
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // Diagnosis
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  🔍 DIAGNOSIS                                         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log('📋 If message was sent but NOT received:');
  console.log('   → WasenderAPI webhook events are NOT enabled');
  console.log('   → Fix: Enable messages.received and messages.upsert in WasenderAPI');
  console.log('');
  console.log('📋 If webhook database is disconnected:');
  console.log('   → Webhook function needs redeployment');
  console.log('   → Fix: Already deployed, may need to wait a moment');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('   1. Check WasenderAPI webhook events configuration');
  console.log('   2. Send a real message from your phone');
  console.log('   3. Run: node check-received-messages.mjs');
  console.log('');
}

sendAndCheck().catch(error => {
  console.error('\n❌ Test failed:', error);
  rl.close();
  process.exit(1);
});

