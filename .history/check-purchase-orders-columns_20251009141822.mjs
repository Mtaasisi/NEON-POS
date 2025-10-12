#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function checkColumns() {
  try {
    console.log('\n🔍 Checking lats_purchase_orders table structure');
    console.log('================================================\n');
    
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'lats_purchase_orders'
      ORDER BY ordinal_position
    `;
    
    console.log('Columns in lats_purchase_orders:');
    columns.forEach(c => {
      console.log(`  - ${c.column_name} (${c.data_type}) ${c.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
    console.log('');
    
    // Test a simple query
    console.log('Testing simple query...');
    const result = await sql`SELECT * FROM lats_purchase_orders LIMIT 1`;
    console.log(`✅ Query successful: ${result.length} rows\n`);
    
    if (result.length > 0) {
      console.log('Sample row keys:', Object.keys(result[0]));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkColumns();

