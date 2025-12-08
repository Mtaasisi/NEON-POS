#!/usr/bin/env node
/**
 * Check if webhook is receiving messages from WasenderAPI
 * Tests webhook endpoint and checks database
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Parse database URL to get Supabase URL
const dbUrl = new URL(DATABASE_URL);
const supabaseUrl = `https://${dbUrl.hostname.replace('-pooler', '').replace('.pooler', '')}`;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwLWlj eS1tb3VzZS1hZHNoamc1biIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzMzNDU2ODAwLCJleHAiOjE3MzUwNTIwMDB9.placeholder';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWebhookStatus() {
  console.log('🔍 Checking Webhook Status...\n');

  // 1. Check webhook health
  console.log('1️⃣ Testing webhook endpoint...');
  try {
    const response = await fetch('https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook');
    const data = await response.json();
    console.log('✅ Webhook is online:', data.status || 'healthy');
    console.log('   Database:', data.database_host || 'connected');
  } catch (error) {
    console.log('❌ Webhook health check failed:', error.message);
  }

  // 2. Check database for messages
  console.log('\n2️⃣ Checking database for messages...');
  try {
    const { data: messages, error } = await supabase
      .from('whatsapp_incoming_messages')
      .select('id, from_phone, message_text, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log('❌ Database query error:', error.message);
    } else {
      console.log(`✅ Found ${messages?.length || 0} recent messages`);
      if (messages && messages.length > 0) {
        console.log('\n📨 Recent messages:');
        messages.forEach((msg, i) => {
          console.log(`   ${i + 1}. From: ${msg.from_phone}`);
          console.log(`      Text: ${(msg.message_text || '').substring(0, 50)}...`);
          console.log(`      Time: ${msg.created_at}`);
        });
      } else {
        console.log('⚠️  No messages found in database');
        console.log('   This means either:');
        console.log('   - WasenderAPI is not sending webhooks');
        console.log('   - Webhook URL is not configured in WasenderAPI');
        console.log('   - Messages are not being processed');
      }
    }
  } catch (error) {
    console.log('❌ Database check failed:', error.message);
  }

  // 3. Check total message count
  console.log('\n3️⃣ Total messages in database...');
  try {
    const { count, error } = await supabase
      .from('whatsapp_incoming_messages')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Count query error:', error.message);
    } else {
      console.log(`✅ Total messages: ${count || 0}`);
    }
  } catch (error) {
    console.log('❌ Count check failed:', error.message);
  }

  // 4. Instructions
  console.log('\n📋 Next Steps:');
  console.log('   1. Verify webhook URL in WasenderAPI:');
  console.log('      https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook');
  console.log('   2. Ensure these events are enabled:');
  console.log('      ✅ messages.received');
  console.log('      ✅ messages.upsert');
  console.log('   3. Send a test message from your phone');
  console.log('   4. Check Netlify function logs for incoming requests');
  console.log('   5. Run this script again to verify message was stored');
}

checkWebhookStatus().catch(console.error);






