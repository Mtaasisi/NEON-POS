#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function verifyAllFixed() {
  console.log('\n📊 COMPREHENSIVE DATABASE VERIFICATION');
  console.log('======================================\n');
  
  try {
    // Check all required columns
    const columns = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'lats_products'
      ORDER BY ordinal_position
    `;
    
    const requiredColumns = {
      'selling_price': 'numeric',
      'cost_price': 'numeric',
      'stock_quantity': 'integer',
      'min_stock_level': 'integer',
      'total_quantity': 'integer',
      'total_value': 'numeric',
      'storage_room_id': 'uuid',
      'store_shelf_id': 'uuid',
      'tags': 'jsonb',
      'attributes': 'jsonb',
      'metadata': 'jsonb'
    };
    
    console.log('Checking required columns:\n');
    
    let allGood = true;
    for (const [colName, expectedType] of Object.entries(requiredColumns)) {
      const col = columns.find(c => c.column_name === colName);
      if (col) {
        const typeMatch = col.data_type === expectedType;
        console.log(`  ${typeMatch ? '✅' : '⚠️ '} ${colName.padEnd(20)} (${col.data_type})`);
        if (!typeMatch) {
          console.log(`     Expected: ${expectedType}, Got: ${col.data_type}`);
          allGood = false;
        }
      } else {
        console.log(`  ❌ ${colName.padEnd(20)} MISSING!`);
        allGood = false;
      }
    }
    
    if (allGood) {
      console.log('\n======================================');
      console.log('✅ ALL COLUMNS VERIFIED CORRECTLY!');
      console.log('======================================\n');
      console.log('Database schema is ready for production use.');
      console.log('All required columns are present with correct types.\n');
      console.log('🎉 You can now create products in your app!\n');
    } else {
      console.log('\n⚠️  Some issues detected. Please review above.\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyAllFixed();

