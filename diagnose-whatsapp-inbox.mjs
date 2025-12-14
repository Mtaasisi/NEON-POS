#!/usr/bin/env node
/**
 * WhatsApp Inbox Diagnostic Tool
 * Checks why messages aren't appearing in the inbox
 */

import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

const DB_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

console.log('\n🔍 WhatsApp Inbox Diagnostics\n');
console.log('='.repeat(50));

async function diagnose() {
  if (!DB_URL) {
    console.log('❌ ERROR: No DATABASE_URL found in environment');
    console.log('   Please check your .env file');
    return;
  }

  try {
    console.log('📡 Connecting to database...');
    const sql = postgres(DB_URL, { ssl: 'require' });
    
    console.log('✅ Database connected\n');
    
    // Check 1: Does the whatsapp_incoming_messages table exist?
    console.log('📋 Check 1: Table Existence');
    console.log('-'.repeat(50));
    try {
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'whatsapp_incoming_messages'
        );
      `;
      
      if (tableExists[0].exists) {
        console.log('✅ whatsapp_incoming_messages table EXISTS');
      } else {
        console.log('❌ whatsapp_incoming_messages table DOES NOT EXIST');
        console.log('   → Run migration: migrations/create_whatsapp_webhook_tables.sql');
        await sql.end();
        return;
      }
    } catch (error) {
      console.log('❌ Error checking table:', error.message);
      await sql.end();
      return;
    }
    
    // Check 2: How many messages are in the table?
    console.log('\n📊 Check 2: Message Count');
    console.log('-'.repeat(50));
    try {
      const [count] = await sql`
        SELECT COUNT(*) as total FROM whatsapp_incoming_messages;
      `;
      
      console.log(`📈 Total messages in database: ${count.total}`);
      
      if (count.total === 0) {
        console.log('\n⚠️  NO MESSAGES FOUND in database');
        console.log('   This could mean:');
        console.log('   1. Webhook is not configured with WasenderAPI');
        console.log('   2. Webhook URL is incorrect');
        console.log('   3. No WhatsApp messages have been received yet');
      }
    } catch (error) {
      console.log('❌ Error counting messages:', error.message);
    }
    
    // Check 3: Show recent messages (if any)
    console.log('\n📥 Check 3: Recent Messages (Last 5)');
    console.log('-'.repeat(50));
    try {
      const messages = await sql`
        SELECT 
          from_phone,
          message_text,
          message_type,
          is_read,
          replied,
          received_at,
          created_at
        FROM whatsapp_incoming_messages 
        ORDER BY created_at DESC 
        LIMIT 5;
      `;
      
      if (messages.length === 0) {
        console.log('📭 No messages in database');
      } else {
        console.log(`\n✅ Found ${messages.length} recent message(s):\n`);
        messages.forEach((msg, i) => {
          console.log(`${i + 1}. From: ${msg.from_phone}`);
          console.log(`   Text: ${msg.message_text?.substring(0, 50)}...`);
          console.log(`   Type: ${msg.message_type}`);
          console.log(`   Read: ${msg.is_read ? 'Yes' : 'No'}`);
          console.log(`   Replied: ${msg.replied ? 'Yes' : 'No'}`);
          console.log(`   Received: ${msg.received_at}`);
          console.log('');
        });
      }
    } catch (error) {
      console.log('❌ Error fetching messages:', error.message);
    }
    
    // Check 4: Check webhook configuration
    console.log('\n🔗 Check 4: Webhook Configuration');
    console.log('-'.repeat(50));
    try {
      // Check for webhook configuration in settings or integrations table
      const webhookSettings = await sql`
        SELECT * FROM integrations 
        WHERE service = 'whatsapp' 
        LIMIT 1;
      `.catch(() => null);
      
      if (webhookSettings && webhookSettings.length > 0) {
        console.log('✅ WhatsApp integration found:');
        console.log('   Status:', webhookSettings[0].status);
        if (webhookSettings[0].config) {
          console.log('   Config:', JSON.stringify(webhookSettings[0].config, null, 2));
        }
      } else {
        console.log('⚠️  No WhatsApp integration found in integrations table');
      }
    } catch (error) {
      console.log('ℹ️  Could not check integration settings:', error.message);
    }
    
    // Check 5: Check whatsapp_logs table (outgoing messages)
    console.log('\n📤 Check 5: Outgoing Messages');
    console.log('-'.repeat(50));
    try {
      const [outgoingCount] = await sql`
        SELECT COUNT(*) as total FROM whatsapp_logs;
      `;
      
      console.log(`📊 Total outgoing messages: ${outgoingCount.total}`);
      
      if (outgoingCount.total > 0) {
        const recentOutgoing = await sql`
          SELECT 
            phone_number,
            message,
            status,
            created_at
          FROM whatsapp_logs 
          ORDER BY created_at DESC 
          LIMIT 3;
        `;
        
        console.log(`\n✅ Recent outgoing messages (${recentOutgoing.length}):\n`);
        recentOutgoing.forEach((msg, i) => {
          console.log(`${i + 1}. To: ${msg.phone_number}`);
          console.log(`   Message: ${msg.message?.substring(0, 50)}...`);
          console.log(`   Status: ${msg.status}`);
          console.log(`   Sent: ${msg.created_at}`);
          console.log('');
        });
      }
    } catch (error) {
      console.log('❌ Error checking outgoing messages:', error.message);
    }
    
    // Summary and recommendations
    console.log('\n📝 Summary & Next Steps');
    console.log('='.repeat(50));
    
    const [messageCount] = await sql`
      SELECT COUNT(*) as total FROM whatsapp_incoming_messages;
    `;
    
    if (messageCount.total === 0) {
      console.log('\n❌ ISSUE: No incoming messages in database\n');
      console.log('🔧 Troubleshooting Steps:\n');
      console.log('1. Check if webhook is configured:');
      console.log('   → Go to: Admin Settings → Integrations → WhatsApp');
      console.log('   → Verify webhook URL is set in WasenderAPI');
      console.log('');
      console.log('2. Verify webhook URL:');
      console.log('   → Should be: https://dukani.site/api/whatsapp/webhook.php');
      console.log('   → OR your Railway/production URL');
      console.log('');
      console.log('3. Test webhook manually:');
      console.log('   → Send a WhatsApp message to your business number');
      console.log('   → Check server logs for incoming webhook');
      console.log('');
      console.log('4. Check webhook endpoint:');
      console.log('   → curl https://dukani.site/api/whatsapp/webhook.php');
      console.log('   → Should return: {"status":"healthy"}');
    } else {
      console.log('\n✅ SUCCESS: Messages are being received!');
      console.log(`   Total: ${messageCount.total} messages`);
      console.log('');
      console.log('📱 View in app:');
      console.log('   → http://localhost:5173/whatsapp/inbox');
    }
    
    await sql.end();
    console.log('\n' + '='.repeat(50));
    console.log('✅ Diagnostic complete\n');
    
  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error.message);
    console.error(error);
  }
}

diagnose();

