#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function addColumns() {
  try {
    console.log('\n🔧 Adding missing columns to lats_product_variants\n');
    
    // Add name column
    console.log('1️⃣ Adding name column...');
    try {
      await sql`ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Default'`;
      console.log('   ✅ name column added\n');
    } catch (e) {
      console.log('   Error:', e.message, '\n');
    }
    
    // Add selling_price column
    console.log('2️⃣ Adding selling_price column...');
    try {
      await sql`ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10, 2) DEFAULT 0`;
      console.log('   ✅ selling_price column added\n');
    } catch (e) {
      console.log('   Error:', e.message, '\n');
    }
    
    // Add attributes column
    console.log('3️⃣ Adding attributes column...');
    try {
      await sql`ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb`;
      console.log('   ✅ attributes column added\n');
    } catch (e) {
      console.log('   Error:', e.message, '\n');
    }
    
    // Add weight column
    console.log('4️⃣ Adding weight column...');
    try {
      await sql`ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS weight NUMERIC(10, 2)`;
      console.log('   ✅ weight column added\n');
    } catch (e) {
      console.log('   Error:', e.message, '\n');
    }
    
    // Add dimensions column
    console.log('5️⃣ Adding dimensions column...');
    try {
      await sql`ALTER TABLE lats_product_variants ADD COLUMN IF NOT EXISTS dimensions JSONB`;
      console.log('   ✅ dimensions column added\n');
    } catch (e) {
      console.log('   Error:', e.message, '\n');
    }
    
    // Verify
    console.log('6️⃣ Verifying columns...\n');
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'lats_product_variants'
      ORDER BY ordinal_position
    `;
    
    const requiredCols = ['name', 'selling_price', 'attributes', 'weight', 'dimensions'];
    requiredCols.forEach(col => {
      const exists = columns.some(c => c.column_name === col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });
    
    console.log('\n✅ Done!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

addColumns();

