#!/usr/bin/env node
/**
 * Test if frontend can fetch WhatsApp messages
 */

import postgres from 'postgres';
import { config } from 'dotenv';

config();

const DB_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

console.log('\n🧪 Testing Frontend Message Fetch\n');
console.log('='.repeat(50));

async function testFetch() {
  try {
    console.log('📡 Connecting to database...');
    const sql = postgres(DB_URL, { ssl: 'require' });
    
    // Simulate the exact query the frontend uses
    console.log('\n📋 Running frontend query simulation...');
    console.log('Query: SELECT * FROM whatsapp_incoming_messages');
    console.log('       JOIN customers ON customer_id = customers.id');
    console.log('       ORDER BY created_at DESC LIMIT 100');
    
    const messages = await sql`
      SELECT 
        wim.*,
        json_build_object(
          'name', c.name,
          'phone', c.phone,
          'whatsapp', c.whatsapp
        ) as customers
      FROM whatsapp_incoming_messages wim
      LEFT JOIN customers c ON wim.customer_id = c.id
      ORDER BY wim.created_at DESC 
      LIMIT 100;
    `;
    
    console.log(`\n✅ Query successful! Found ${messages.length} messages\n`);
    
    if (messages.length > 0) {
      console.log('📥 Sample message:');
      const msg = messages[0];
      console.log('  ID:', msg.id);
      console.log('  From:', msg.from_phone);
      console.log('  Text:', msg.message_text?.substring(0, 50));
      console.log('  Type:', msg.message_type);
      console.log('  Read:', msg.is_read);
      console.log('  Replied:', msg.replied);
      console.log('  Customer:', msg.customers);
      console.log('  Created:', msg.created_at);
      
      console.log('\n✅ SUCCESS: Frontend should be able to fetch this data!');
      console.log('\n🔍 Next steps:');
      console.log('1. Open your browser console at: http://localhost:5173/whatsapp/inbox');
      console.log('2. Check for any JavaScript errors');
      console.log('3. Verify the page is loading messages from database');
    } else {
      console.log('⚠️  Query returned 0 messages (but we know there\'s 1 in DB)');
      console.log('This suggests a query issue or data mismatch');
    }
    
    await sql.end();
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

testFetch();

