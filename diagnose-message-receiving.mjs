#!/usr/bin/env node
/**
 * Comprehensive Diagnostic: Why Messages Aren't Being Received
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const WEBHOOK_URL = 'https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║  🔍 DIAGNOSING: Why Messages Aren\'t Being Received  ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

async function diagnose() {
  const issues = [];
  const working = [];

  // 1. Check Webhook Endpoint
  console.log('1️⃣ Testing Webhook Endpoint...');
  try {
    const response = await fetch(WEBHOOK_URL);
    const data = await response.json();
    
    if (response.status === 200) {
      working.push('✅ Webhook endpoint is online');
      console.log('   ✅ Status: ONLINE');
      console.log('   📊 Database:', data.database_connected ? 'Connected' : 'Disconnected');
      
      if (!data.database_connected) {
        issues.push('⚠️ Database connection issue in webhook');
        console.log('   ⚠️  WARNING: Database not connected');
      }
    } else {
      issues.push('❌ Webhook endpoint returned error');
      console.log('   ❌ Status:', response.status);
    }
  } catch (error) {
    issues.push('❌ Webhook endpoint unreachable');
    console.log('   ❌ Error:', error.message);
  }

  // 2. Check Database Connection
  console.log('\n2️⃣ Testing Database Connection...');
  try {
    const { data, error } = await supabase
      .from('whatsapp_incoming_messages')
      .select('id')
      .limit(1);
    
    if (error) {
      issues.push('❌ Database query failed');
      console.log('   ❌ Error:', error.message);
    } else {
      working.push('✅ Database connection working');
      console.log('   ✅ Database: Connected');
    }
  } catch (error) {
    issues.push('❌ Database connection failed');
    console.log('   ❌ Error:', error.message);
  }

  // 3. Check Recent Messages
  console.log('\n3️⃣ Checking Recent Messages...');
  try {
    const { data: messages, error } = await supabase
      .from('whatsapp_incoming_messages')
      .select('id, from_phone, message_text, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.log('   ❌ Error:', error.message);
    } else {
      const now = new Date();
      const recentMessages = messages?.filter(msg => {
        const msgTime = new Date(msg.created_at);
        const hoursAgo = (now - msgTime) / (1000 * 60 * 60);
        return hoursAgo < 24; // Last 24 hours
      }) || [];

      console.log(`   📊 Total messages in database: ${messages?.length || 0}`);
      console.log(`   📊 Messages in last 24 hours: ${recentMessages.length}`);

      if (recentMessages.length === 0) {
        issues.push('⚠️ No messages received in last 24 hours');
        console.log('   ⚠️  WARNING: No recent messages found');
      } else {
        working.push(`✅ ${recentMessages.length} messages received recently`);
        console.log('\n   📨 Recent messages:');
        recentMessages.slice(0, 5).forEach((msg, i) => {
          const time = new Date(msg.created_at);
          const hoursAgo = ((now - time) / (1000 * 60 * 60)).toFixed(1);
          console.log(`      ${i + 1}. From: ${msg.from_phone}`);
          console.log(`         Text: ${(msg.message_text || '').substring(0, 40)}...`);
          console.log(`         Time: ${hoursAgo} hours ago`);
        });
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // 4. Test Webhook with Sample Message
  console.log('\n4️⃣ Testing Webhook with Sample Message...');
  try {
    const testPayload = {
      event: 'messages.received',
      data: {
        from: '255746605561@s.whatsapp.net',
        id: `diagnostic_test_${Date.now()}`,
        text: `Diagnostic test - ${new Date().toISOString()}`,
        type: 'text',
        timestamp: new Date().toISOString()
      }
    };

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    const data = await response.json();
    
    if (response.status === 200 && data.received) {
      working.push('✅ Webhook accepts POST requests');
      console.log('   ✅ Webhook accepted test message');
      
      // Wait and check if it was stored
      console.log('   ⏳ Waiting 3 seconds for processing...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const { data: stored, error: checkError } = await supabase
        .from('whatsapp_incoming_messages')
        .select('id')
        .eq('message_id', testPayload.data.id)
        .single();
      
      if (stored) {
        working.push('✅ Test message stored in database');
        console.log('   ✅ Test message stored successfully');
      } else {
        issues.push('⚠️ Test message not stored in database');
        console.log('   ⚠️  WARNING: Test message not found in database');
        if (checkError) {
          console.log('   ❌ Error:', checkError.message);
        }
      }
    } else {
      issues.push('❌ Webhook rejected test message');
      console.log('   ❌ Webhook response:', data);
    }
  } catch (error) {
    issues.push('❌ Failed to test webhook');
    console.log('   ❌ Error:', error.message);
  }

  // 5. Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  📋 DIAGNOSIS SUMMARY                                 ║');
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

  // 6. Recommendations
  console.log('📋 RECOMMENDATIONS:\n');
  
  if (issues.some(i => i.includes('No messages'))) {
    console.log('🔴 CRITICAL: WasenderAPI Webhook Not Configured');
    console.log('');
    console.log('   The most likely issue is that WasenderAPI is not sending');
    console.log('   webhooks to your endpoint. You need to configure it:');
    console.log('');
    console.log('   1. Go to: https://wasenderapi.com/whatsapp/37637/edit');
    console.log('   2. Find "Webhook URL" field');
    console.log('   3. Enter: ' + WEBHOOK_URL);
    console.log('   4. Enable these events:');
    console.log('      ✅ messages.received (REQUIRED)');
    console.log('      ✅ messages.upsert (REQUIRED)');
    console.log('   5. Enable webhook toggle');
    console.log('   6. Click Save');
    console.log('');
  }

  if (issues.some(i => i.includes('Database'))) {
    console.log('🟡 Database Connection Issue');
    console.log('');
    console.log('   The webhook endpoint has database connection issues.');
    console.log('   This has been fixed in the code but needs redeployment.');
    console.log('');
    console.log('   To fix:');
    console.log('   1. Deploy the updated webhook function');
    console.log('   2. Or wait for auto-deploy if enabled');
    console.log('');
  }

  console.log('🧪 Next Steps:');
  console.log('   1. Verify WasenderAPI webhook configuration (see above)');
  console.log('   2. Send a test message from your phone');
  console.log('   3. Check Netlify function logs:');
  console.log('      https://app.netlify.com/sites/inauzwaapp/functions');
  console.log('   4. Run this diagnostic again');
  console.log('');
}

diagnose().catch(error => {
  console.error('\n❌ Diagnostic failed:', error);
  process.exit(1);
});

