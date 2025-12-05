#!/usr/bin/env node
/**
 * Mark all messages as UNREAD so they show up in inbox
 */

import postgres from 'postgres';
import { config } from 'dotenv';

config();

const DB_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

console.log('\n📬 Marking Messages as UNREAD\n');
console.log('='.repeat(50));

async function markUnread() {
  try {
    const sql = postgres(DB_URL, { ssl: 'require' });
    
    console.log('Updating messages...');
    
    const updated = await sql`
      UPDATE whatsapp_incoming_messages 
      SET is_read = false
      WHERE is_read = true
      RETURNING id, from_phone, message_text;
    `;
    
    console.log(`\n✅ Marked ${updated.length} message(s) as UNREAD:\n`);
    
    updated.forEach((msg, i) => {
      console.log(`${i + 1}. From: ${msg.from_phone}`);
      console.log(`   Text: ${msg.message_text?.substring(0, 50)}...`);
      console.log('');
    });
    
    console.log('='.repeat(50));
    console.log('\n✅ Done! Messages are now marked as UNREAD');
    console.log('   Refresh your inbox page to see them!');
    console.log('\n   👉 http://localhost:5173/whatsapp/inbox');
    
    await sql.end();
    
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
  }
}

markUnread();

