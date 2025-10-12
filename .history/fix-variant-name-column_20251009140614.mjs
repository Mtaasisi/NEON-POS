#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function fixVariantNameColumn() {
  try {
    console.log('\n🔧 Fixing variant_name column constraint\n');
    
    // Option 1: Make variant_name nullable and add default
    console.log('Making variant_name nullable with default value...');
    await sql`ALTER TABLE lats_product_variants ALTER COLUMN variant_name DROP NOT NULL`;
    await sql`ALTER TABLE lats_product_variants ALTER COLUMN variant_name SET DEFAULT 'Default'`;
    console.log('✅ variant_name is now nullable with default value\n');
    
    // Update any existing NULL values
    console.log('Updating any NULL variant_name values...');
    const result = await sql`UPDATE lats_product_variants SET variant_name = 'Default' WHERE variant_name IS NULL`;
    console.log(`✅ Updated ${result.length || 0} rows\n`);
    
    console.log('✅ Fixed!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixVariantNameColumn();

