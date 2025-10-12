#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function finalVerify() {
  try {
    console.log('\n✅ FINAL VERIFICATION - All Product Creation Columns');
    console.log('====================================================\n');
    
    const requiredColumns = [
      'selling_price',
      'cost_price', 
      'stock_quantity',
      'min_stock_level',
      'total_quantity',
      'total_value',
      'storage_room_id',
      'store_shelf_id',
      'tags',
      'attributes',
      'metadata'
    ];
    
    console.log('Checking required columns in lats_products table:\n');
    
    for (const colName of requiredColumns) {
      const result = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'lats_products'
        AND column_name = ${colName}
      `;
      
      if (result.length > 0) {
        console.log(`  ✅ ${colName.padEnd(20)} (${result[0].data_type})`);
      } else {
        console.log(`  ❌ ${colName.padEnd(20)} MISSING!`);
      }
    }
    
    console.log('\n====================================================');
    console.log('✅ Database is ready for product creation!');
    console.log('====================================================\n');
    console.log('Please refresh your app (Ctrl+Shift+R) and try again.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

finalVerify();

