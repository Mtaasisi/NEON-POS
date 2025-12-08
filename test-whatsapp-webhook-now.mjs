#!/usr/bin/env node
/**
 * Comprehensive WhatsApp Webhook Test
 * Tests webhook endpoint and verifies message reception
 */

const WEBHOOK_URL = 'https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook';

async function testWebhook() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  🧪 WHATSAPP WEBHOOK TEST - COMPREHENSIVE CHECK      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Test 1: Health Check (GET)
  console.log('1️⃣ Testing Webhook Health (GET)...');
  try {
    const healthResponse = await fetch(WEBHOOK_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const healthData = await healthResponse.json();
    console.log('   Status:', healthResponse.status);
    console.log('   Response:', JSON.stringify(healthData, null, 2));
    
    if (healthData.database_connected) {
      console.log('   ✅ Database connection: OK');
      console.log('   📊 Database Host:', healthData.database_host || 'N/A');
    } else {
      console.log('   ⚠️  Database connection: FAILED');
    }
  } catch (error) {
    console.log('   ❌ Health check failed:', error.message);
  }

  // Test 2: Send Test Message (POST)
  console.log('\n2️⃣ Sending Test Message (POST)...');
  const testMessageId = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const testPayload = {
    event: 'messages.received',
    data: {
      from: '255746605561@s.whatsapp.net',
      id: testMessageId,
      text: `Test message from webhook test - ${new Date().toISOString()}`,
      type: 'text',
      timestamp: new Date().toISOString()
    }
  };

  try {
    const postResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const postData = await postResponse.json();
    console.log('   Status:', postResponse.status);
    console.log('   Response:', JSON.stringify(postData, null, 2));
    
    if (postResponse.status === 200 && postData.received) {
      console.log('   ✅ Webhook accepted the message');
      console.log('   📝 Message ID:', testMessageId);
    } else {
      console.log('   ⚠️  Webhook response unexpected');
    }
  } catch (error) {
    console.log('   ❌ POST test failed:', error.message);
  }

  // Test 3: Wait and check database
  console.log('\n3️⃣ Waiting 3 seconds for message processing...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 4: Check database via Supabase
  console.log('\n4️⃣ Checking Database for Test Message...');
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    // Use production Supabase connection
    const supabaseUrl = 'https://jxhzveborezjhsmzsgbc.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for our test message
    const { data: testMessage, error: testError } = await supabase
      .from('whatsapp_incoming_messages')
      .select('*')
      .eq('message_id', testMessageId)
      .single();

    if (testError && testError.code !== 'PGRST116') {
      console.log('   ⚠️  Error checking test message:', testError.message);
    } else if (testMessage) {
      console.log('   ✅ Test message found in database!');
      console.log('   📝 Message Text:', testMessage.message_text);
      console.log('   📞 From Phone:', testMessage.from_phone);
      console.log('   🕐 Created At:', testMessage.created_at);
    } else {
      console.log('   ⚠️  Test message not found in database yet');
      console.log('   💡 This could mean:');
      console.log('      - Message is still processing');
      console.log('      - Database connection issue in webhook');
      console.log('      - Message was filtered/ignored');
    }

    // Get recent messages
    console.log('\n5️⃣ Recent Messages in Database...');
    const { data: recentMessages, error: recentError } = await supabase
      .from('whatsapp_incoming_messages')
      .select('message_id, from_phone, message_text, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.log('   ⚠️  Error fetching recent messages:', recentError.message);
    } else {
      console.log(`   📊 Found ${recentMessages?.length || 0} recent messages:`);
      if (recentMessages && recentMessages.length > 0) {
        recentMessages.forEach((msg, i) => {
          const isTest = msg.message_id === testMessageId;
          const marker = isTest ? '🧪' : '📨';
          console.log(`   ${marker} ${i + 1}. ID: ${msg.message_id.substring(0, 20)}...`);
          console.log(`      From: ${msg.from_phone}`);
          console.log(`      Text: ${(msg.message_text || '').substring(0, 50)}${msg.message_text?.length > 50 ? '...' : ''}`);
          console.log(`      Time: ${msg.created_at}`);
        });
      } else {
        console.log('   ⚠️  No messages found in database');
      }
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from('whatsapp_incoming_messages')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`\n   📈 Total messages in database: ${count || 0}`);
    }

  } catch (error) {
    console.log('   ❌ Database check failed:', error.message);
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  📋 TEST SUMMARY & NEXT STEPS                         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log('✅ Webhook URL:');
  console.log(`   ${WEBHOOK_URL}\n`);
  console.log('📋 To verify WasenderAPI configuration:');
  console.log('   1. Go to WasenderAPI dashboard');
  console.log('   2. Check webhook URL is set to:');
  console.log(`      ${WEBHOOK_URL}`);
  console.log('   3. Ensure these events are enabled:');
  console.log('      ✅ messages.received');
  console.log('      ✅ messages.upsert\n');
  console.log('🧪 To test with real message:');
  console.log('   1. Send a WhatsApp message to your business number');
  console.log('   2. Wait 5-10 seconds');
  console.log('   3. Run this script again to check database\n');
  console.log('📊 To check Netlify logs:');
  console.log('   1. Go to: https://app.netlify.com/projects/inauzwaapp/functions');
  console.log('   2. Click on "whatsapp-webhook"');
  console.log('   3. View logs for incoming requests\n');
}

testWebhook().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});

