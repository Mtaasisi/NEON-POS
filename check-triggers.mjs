#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const sql = neon(process.env.DATABASE_URL);

console.log('🔍 Checking for problematic triggers...\n');

async function checkTriggers() {
  try {
    const triggers = await sql`
      SELECT 
        t.trigger_name,
        t.event_manipulation,
        t.action_statement,
        t.action_timing
      FROM information_schema.triggers t
      WHERE t.event_object_table = 'lats_product_variants'
      ORDER BY t.trigger_name, t.event_manipulation
    `;
    
    console.log(`Found ${triggers.length} triggers on lats_product_variants:\n`);
    
    triggers.forEach(t => {
      console.log(`📌 ${t.trigger_name}`);
      console.log(`   Timing: ${t.action_timing}`);
      console.log(`   Event: ${t.event_manipulation}`);
      console.log(`   Action: ${t.action_statement.substring(0, 100)}...`);
      console.log();
    });
    
    // Look for any trigger that might be checking IMEI
    const imeiTriggers = triggers.filter(t => 
      t.trigger_name.toLowerCase().includes('imei') ||
      t.action_statement.toLowerCase().includes('imei')
    );
    
    if (imeiTriggers.length > 0) {
      console.log('\n⚠️  Found IMEI-related triggers:\n');
      imeiTriggers.forEach(t => {
        console.log(`   - ${t.trigger_name} (${t.action_timing} ${t.event_manipulation})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTriggers();

