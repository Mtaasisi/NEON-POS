#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const sql = neon(process.env.DATABASE_URL);

console.log('🔧 Fixing parent variant stocks...\n');

async function fixStocks() {
  try {
    // Run the recalculate function
    const results = await sql`SELECT * FROM recalculate_all_parent_stocks()`;
    
    console.log('📊 Parent Stock Fixes:\n');
    results.forEach(r => {
      const status = r.old_quantity === r.new_quantity ? '✅' : '🔄';
      console.log(`${status} ${r.parent_name}:`);
      console.log(`   Old: ${r.old_quantity} → New: ${r.new_quantity} (${r.children_count} children)`);
    });
    
    console.log('\n✅ All parent stocks synchronized!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixStocks();

