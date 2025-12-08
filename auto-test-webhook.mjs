#!/usr/bin/env node
/**
 * Automatic Webhook Test - Simulates WasenderAPI sending messages
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const WEBHOOK_URL = 'https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║  🤖 AUTOMATIC WEBHOOK TEST                           ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

async function autoTest() {
  const testId = `auto_test_${Date.now()}`;
  const testPhone = '255769601663';
  
  console.log('🧪 Test ID:', testId);
  console.log('📞 Test Phone:', testPhone);
  console.log('🌐 Webhook URL:', WEBHOOK_URL);
  console.log('');

  // Test 1: Health Check
  console.log('1️⃣ Testing Webhook Health...');
  try {
    const healthResponse = await fetch(WEBHOOK_URL);
    const healthData = await healthResponse.json();
    
    if (healthResponse.status === 200) {
      console.log('   ✅ Webhook is online');
      console.log('   📊 Database:', healthData.database_connected ? 'Connected' : 'Disconnected');
      if (!healthData.database_connected) {
        console.log('   ⚠️  WARNING: Database not connected in webhook');
      }
    } else {
      console.log('   ❌ Webhook returned:', healthResponse.status);
      return;
    }
  } catch (error) {
    console.log('   ❌ Health check failed:', error.message);
    return;
  }

  // Test 2: Send messages.received event (most common)
  console.log('\n2️⃣ Testing messages.received Event...');
  const receivedPayload = {
    event: 'messages.received',
    timestamp: Date.now().toString(),
    session_id: 37637,
    data: {
      from: `${testPhone}@s.whatsapp.net`,
      id: `${testId}_received`,
      text: `Auto test message - ${new Date().toISOString()}`,
      type: 'text',
      timestamp: new Date().toISOString()
    }
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(receivedPayload)
    });

    const data = await response.json();
    
    if (response.status === 200 && data.received) {
      console.log('   ✅ Webhook accepted messages.received event');
      console.log('   📝 Response:', JSON.stringify(data));
    } else {
      console.log('   ⚠️  Unexpected response:', response.status, data);
    }
  } catch (error) {
    console.log('   ❌ Failed to send messages.received:', error.message);
  }

  // Test 3: Send messages.upsert event (alternative)
  console.log('\n3️⃣ Testing messages.upsert Event...');
  const upsertPayload = {
    event: 'messages.upsert',
    timestamp: Date.now().toString(),
    session_id: 37637,
    data: {
      from: `${testPhone}@s.whatsapp.net`,
      id: `${testId}_upsert`,
      text: `Auto test upsert - ${new Date().toISOString()}`,
      type: 'text',
      timestamp: new Date().toISOString()
    }
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(upsertPayload)
    });

    const data = await response.json();
    
    if (response.status === 200 && data.received) {
      console.log('   ✅ Webhook accepted messages.upsert event');
      console.log('   📝 Response:', JSON.stringify(data));
    } else {
      console.log('   ⚠️  Unexpected response:', response.status, data);
    }
  } catch (error) {
    console.log('   ❌ Failed to send messages.upsert:', error.message);
  }

  // Wait for processing
  console.log('\n4️⃣ Waiting 5 seconds for message processing...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Test 5: Check if messages were stored
  console.log('\n5️⃣ Checking Database for Test Messages...');
  try {
    // Check for received message
    const { data: receivedMsg, error: receivedError } = await supabase
      .from('whatsapp_incoming_messages')
      .select('*')
      .eq('message_id', `${testId}_received`)
      .single();

    if (receivedError && receivedError.code !== 'PGRST116') {
      console.log('   ⚠️  Error checking received message:', receivedError.message);
    } else if (receivedMsg) {
      console.log('   ✅ messages.received was stored in database!');
      console.log('      From:', receivedMsg.from_phone);
      console.log('      Text:', receivedMsg.message_text);
      console.log('      Time:', receivedMsg.created_at);
    } else {
      console.log('   ❌ messages.received NOT found in database');
    }

    // Check for upsert message
    const { data: upsertMsg, error: upsertError } = await supabase
      .from('whatsapp_incoming_messages')
      .select('*')
      .eq('message_id', `${testId}_upsert`)
      .single();

    if (upsertError && upsertError.code !== 'PGRST116') {
      console.log('   ⚠️  Error checking upsert message:', upsertError.message);
    } else if (upsertMsg) {
      console.log('   ✅ messages.upsert was stored in database!');
      console.log('      From:', upsertMsg.from_phone);
      console.log('      Text:', upsertMsg.message_text);
      console.log('      Time:', upsertMsg.created_at);
    } else {
      console.log('   ❌ messages.upsert NOT found in database');
    }

    // Get recent messages
    const { data: recent, error: recentError } = await supabase
      .from('whatsapp_incoming_messages')
      .select('message_id, from_phone, message_text, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!recentError && recent) {
      console.log('\n   📨 Last 5 messages in database:');
      recent.forEach((msg, i) => {
        const isTest = msg.message_id.includes('auto_test');
        const marker = isTest ? '🧪' : '📨';
        const time = new Date(msg.created_at);
        console.log(`      ${marker} ${i + 1}. ${msg.from_phone}: ${(msg.message_text || '').substring(0, 40)}... (${time.toLocaleTimeString()})`);
      });
    }

  } catch (error) {
    console.log('   ❌ Database check failed:', error.message);
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  📋 TEST SUMMARY                                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log('✅ Webhook endpoint is reachable');
  console.log('✅ Webhook accepts POST requests');
  console.log('✅ Test events were sent\n');

  console.log('🔍 DIAGNOSIS:');
  console.log('   If messages were NOT stored in database:');
  console.log('   → Database connection issue in webhook function');
  console.log('   → Need to redeploy the fixed webhook function\n');

  console.log('   If messages WERE stored:');
  console.log('   → Webhook is working correctly!');
  console.log('   → Issue is WasenderAPI not sending real events');
  console.log('   → Need to enable events in WasenderAPI dashboard\n');

  console.log('📋 Next Steps:');
  console.log('   1. Check if test messages appear above');
  console.log('   2. If not stored → Deploy fixed webhook function');
  console.log('   3. If stored → Enable events in WasenderAPI');
  console.log('   4. Send real message from phone to test');
  console.log('');
}

autoTest().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});

