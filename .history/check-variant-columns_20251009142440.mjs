#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function checkVariantColumns() {
  try {
    console.log('\n🔍 Checking lats_product_variants column structure');
    console.log('=================================================\n');
    
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'lats_product_variants'
      ORDER BY ordinal_position
    `;
    
    console.log('Columns in lats_product_variants:');
    columns.forEach(c => {
      console.log(`  - ${c.column_name} (${c.data_type}) ${c.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
    console.log('');
    
    // Test query with the columns that the frontend is trying to use
    console.log('Testing frontend query columns...');
    
    try {
      const testQuery = await sql`
        SELECT 
          id, 
          product_id, 
          variant_name, 
          sku, 
          cost_price, 
          unit_price,
          selling_price,
          quantity, 
          min_quantity
        FROM lats_product_variants 
        LIMIT 1
      `;
      console.log('   ✅ Query successful - all columns exist');
      if (testQuery.length > 0) {
        console.log('   Sample data:', testQuery[0]);
      }
    } catch (e) {
      console.log('   ❌ Query failed:', e.message);
    }
    console.log('');
    
    // Check what data is actually in the variants
    console.log('Sample variant data:');
    const sampleData = await sql`
      SELECT 
        id,
        name,
        sku,
        selling_price,
        unit_price,
        cost_price,
        quantity
      FROM lats_product_variants 
      LIMIT 3
    `;
    
    sampleData.forEach((v, i) => {
      console.log(`   Variant ${i + 1}:`);
      console.log(`     ID: ${v.id}`);
      console.log(`     Name: ${v.name}`);
      console.log(`     SKU: ${v.sku}`);
      console.log(`     selling_price: ${v.selling_price}`);
      console.log(`     unit_price: ${v.unit_price}`);
      console.log(`     cost_price: ${v.cost_price}`);
      console.log(`     quantity: ${v.quantity}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkVariantColumns();

