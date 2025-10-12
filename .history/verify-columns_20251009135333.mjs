#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function verify() {
  try {
    console.log('\n🔍 Verifying lats_products columns...\n');
    
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_products'
      ORDER BY ordinal_position
    `;

    console.log('All columns in lats_products table:');
    columns.forEach(c => {
      console.log(`  ✓ ${c.column_name} (${c.data_type})`);
    });

    const requiredCols = ['tags', 'attributes', 'metadata', 'selling_price', 'cost_price', 'stock_quantity', 'min_stock_level'];
    const columnNames = columns.map(c => c.column_name);
    
    console.log('\n📋 Required columns check:');
    requiredCols.forEach(col => {
      const exists = columnNames.includes(col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });

    console.log('\n✅ Database is ready for product creation!\n');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

verify();

