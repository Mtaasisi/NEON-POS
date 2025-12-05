#!/usr/bin/env node
/**
 * Check why messages aren't showing in inbox UI
 */

import postgres from 'postgres';
import { config } from 'dotenv';

config();

const DB_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

console.log('\n🔍 WhatsApp Inbox Filter Analysis\n');
console.log('='.repeat(50));

async function analyze() {
  try {
    const sql = postgres(DB_URL, { ssl: 'require' });
    
    console.log('📊 Message Statistics:\n');
    
    // Total messages
    const [total] = await sql`SELECT COUNT(*) as count FROM whatsapp_incoming_messages`;
    console.log(`Total messages: ${total.count}`);
    
    // Unread messages
    const [unread] = await sql`SELECT COUNT(*) as count FROM whatsapp_incoming_messages WHERE is_read = false`;
    console.log(`Unread messages: ${unread.count}`);
    
    // Read messages
    const [read] = await sql`SELECT COUNT(*) as count FROM whatsapp_incoming_messages WHERE is_read = true`;
    console.log(`Read messages: ${read.count}`);
    
    // Unreplied messages
    const [unreplied] = await sql`SELECT COUNT(*) as count FROM whatsapp_incoming_messages WHERE replied = false`;
    console.log(`Unreplied messages: ${unreplied.count}`);
    
    console.log('\n📝 Message Details:\n');
    
    const messages = await sql`
      SELECT 
        from_phone,
        message_text,
        is_read,
        replied,
        customer_id,
        created_at
      FROM whatsapp_incoming_messages 
      ORDER BY created_at DESC;
    `;
    
    messages.forEach((msg, i) => {
      console.log(`Message ${i + 1}:`);
      console.log(`  Phone: ${msg.from_phone}`);
      console.log(`  Text: ${msg.message_text?.substring(0, 40)}...`);
      console.log(`  Status: ${msg.is_read ? '✅ READ' : '📬 UNREAD'}`);
      console.log(`  Replied: ${msg.replied ? 'Yes' : 'No'}`);
      console.log(`  Has Customer: ${msg.customer_id ? 'Yes' : 'No'}`);
      console.log(`  Created: ${msg.created_at}`);
      console.log('');
    });
    
    console.log('='.repeat(50));
    console.log('\n💡 Inbox Filter Behavior:');
    console.log('   - "All" filter: Shows ALL messages (' + total.count + ')');
    console.log('   - "Unread" filter: Shows only UNREAD messages (' + unread.count + ')');
    console.log('   - "Need Reply" filter: Shows unreplied messages (' + unreplied.count + ')');
    
    if (unread.count === 0 && total.count > 0) {
      console.log('\n⚠️  ISSUE FOUND:');
      console.log('   Your message is marked as READ, so it won\'t show in "Unread" filter!');
      console.log('\n🔧 SOLUTION:');
      console.log('   1. Open: http://localhost:5173/whatsapp/inbox');
      console.log('   2. Click the "All" filter button (not "Unread")');
      console.log('   3. Your message should appear!');
      console.log('\n   OR mark the message as unread:');
      console.log('   Run: node mark-message-unread.mjs');
    } else if (total.count === 0) {
      console.log('\n⚠️  No messages found in database');
    } else {
      console.log('\n✅ Messages should be visible in the inbox!');
    }
    
    await sql.end();
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
  }
}

analyze();

