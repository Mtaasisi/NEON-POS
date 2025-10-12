#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function checkColumns() {
  try {
    const columns = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'lats_product_variants'
      ORDER BY ordinal_position
    `;
    
    console.log('\nColumns in lats_product_variants:\n');
    columns.forEach(c => {
      console.log(`  ${c.column_name.padEnd(20)} ${c.data_type.padEnd(30)} ${c.column_default || ''}`);
    });
    console.log('');
    
    // Check specifically for 'name'
    const hasName = columns.some(c => c.column_name === 'name');
    console.log(`name column exists: ${hasName ? '✅ YES' : '❌ NO'}\n`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkColumns();

