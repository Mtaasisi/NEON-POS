#!/usr/bin/env node
/**
 * CHECK PRODUCT IMAGES SCHEMA
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

console.log('🔍 Checking product_images table schema...\n');

try {
  const columns = await sql`
    SELECT 
      column_name, 
      data_type, 
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = 'product_images'
    ORDER BY ordinal_position
  `;
  
  console.log('Current columns in product_images table:');
  console.log('─────────────────────────────────────────────────────');
  columns.forEach(col => {
    console.log(`  ${col.column_name.padEnd(20)} | ${col.data_type.padEnd(15)} | Nullable: ${col.is_nullable}`);
  });
  
  console.log('\n✅ Schema check complete\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

