#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function addColumns() {
  try {
    console.log('\n➕ Adding attributes and metadata columns...\n');
    
    // Add attributes column
    try {
      await sql`ALTER TABLE lats_products ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb`;
      console.log('✅ Added attributes column');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('✓ attributes column already exists');
      } else {
        throw e;
      }
    }
    
    // Add metadata column
    try {
      await sql`ALTER TABLE lats_products ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb`;
      console.log('✅ Added metadata column');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('✓ metadata column already exists');
      } else {
        throw e;
      }
    }
    
    // Verify
    console.log('\n🔍 Verifying...');
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_products'
      AND column_name IN ('attributes', 'metadata')
    `;
    
    console.log('\nFound columns:');
    result.forEach(c => console.log(`  ✓ ${c.column_name} (${c.data_type})`));
    
    if (result.length === 2) {
      console.log('\n✅ SUCCESS! Both columns are ready.\n');
    } else {
      console.log('\n⚠️ Only found', result.length, 'of 2 expected columns\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

addColumns();

