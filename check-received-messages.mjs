#!/usr/bin/env node
/**
 * Check if text messages are being received
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║  📨 CHECKING FOR RECEIVED TEXT MESSAGES                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

async function checkMessages() {
  try {
    // Get all recent messages
    const { data: messages, error } = await supabase
      .from('whatsapp_incoming_messages')
      .select('id, message_id, from_phone, message_text, message_type, created_at, received_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.log('❌ Error fetching messages:', error.message);
      return;
    }

    const now = new Date();
    const recentMessages = messages?.filter(msg => {
      const msgTime = new Date(msg.created_at);
      const hoursAgo = (now - msgTime) / (1000 * 60 * 60);
      return hoursAgo < 24; // Last 24 hours
    }) || [];

    console.log(`📊 Total messages in database: ${messages?.length || 0}`);
    console.log(`📊 Messages in last 24 hours: ${recentMessages.length}\n`);

    if (recentMessages.length === 0) {
      console.log('⚠️  NO MESSAGES RECEIVED IN LAST 24 HOURS\n');
      console.log('This means:');
      console.log('   - WasenderAPI is not sending webhooks');
      console.log('   - OR webhook is not configured in WasenderAPI');
      console.log('   - OR messages are not being processed\n');
      
      if (messages && messages.length > 0) {
        console.log('📅 Last message received:');
        const lastMsg = messages[0];
        const lastTime = new Date(lastMsg.created_at);
        const daysAgo = ((now - lastTime) / (1000 * 60 * 60 * 24)).toFixed(1);
        console.log(`   Date: ${lastTime.toLocaleString()}`);
        console.log(`   Time ago: ${daysAgo} days ago`);
        console.log(`   From: ${lastMsg.from_phone}`);
        console.log(`   Text: ${(lastMsg.message_text || '').substring(0, 50)}...`);
      }
    } else {
      console.log(`✅ FOUND ${recentMessages.length} RECENT MESSAGES:\n`);
      
      recentMessages.forEach((msg, i) => {
        const time = new Date(msg.created_at);
        const hoursAgo = ((now - time) / (1000 * 60 * 60)).toFixed(1);
        const minutesAgo = ((now - time) / (1000 * 60)).toFixed(0);
        
        console.log(`📨 Message ${i + 1}:`);
        console.log(`   From: ${msg.from_phone}`);
        console.log(`   Type: ${msg.message_type || 'text'}`);
        console.log(`   Text: ${msg.message_text || '(no text)'}`);
        console.log(`   Time: ${time.toLocaleString()} (${hoursAgo < 1 ? minutesAgo + ' min' : hoursAgo + ' hours'} ago)`);
        console.log(`   ID: ${msg.message_id?.substring(0, 30)}...`);
        console.log('');
      });
    }

    // Check for text messages specifically
    const textMessages = messages?.filter(msg => 
      msg.message_type === 'text' || msg.message_type === null || !msg.message_type
    ) || [];

    console.log(`\n📝 Text messages: ${textMessages.length} out of ${messages?.length || 0} total`);

    // Check last hour specifically
    const lastHour = messages?.filter(msg => {
      const msgTime = new Date(msg.created_at);
      const minutesAgo = (now - msgTime) / (1000 * 60);
      return minutesAgo < 60;
    }) || [];

    if (lastHour.length > 0) {
      console.log(`\n⏰ Messages in last hour: ${lastHour.length}`);
      lastHour.forEach((msg, i) => {
        const time = new Date(msg.created_at);
        const minutesAgo = ((now - time) / (1000 * 60)).toFixed(0);
        console.log(`   ${i + 1}. From ${msg.from_phone}: ${(msg.message_text || '').substring(0, 40)}... (${minutesAgo} min ago)`);
      });
    } else {
      console.log(`\n⏰ No messages in last hour`);
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  📋 SUMMARY                                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    if (recentMessages.length === 0) {
      console.log('🔴 STATUS: NOT RECEIVING MESSAGES');
      console.log('\n📋 To fix:');
      console.log('   1. Configure WasenderAPI webhook:');
      console.log('      https://wasenderapi.com/whatsapp/37637/edit');
      console.log('   2. Set webhook URL to:');
      console.log('      https://inauzwaapp.netlify.app/.netlify/functions/whatsapp-webhook');
      console.log('   3. Enable messages.received and messages.upsert events');
      console.log('   4. Enable webhook toggle');
      console.log('   5. Save and send a test message');
    } else {
      console.log('✅ STATUS: RECEIVING MESSAGES');
      console.log(`\n   ${recentMessages.length} messages received in last 24 hours`);
      console.log('   Messages are being stored in database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

checkMessages().catch(console.error);

