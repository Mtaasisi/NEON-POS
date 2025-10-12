#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

console.log('\n🔧 Adding tags column to lats_products');
console.log('=====================================\n');

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function addTagsColumn() {
  try {
    console.log('📡 Connecting to Neon database...\n');

    console.log('Adding tags column...');
    await sql`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'lats_products' 
              AND column_name = 'tags'
          ) THEN
              ALTER TABLE lats_products 
              ADD COLUMN tags TEXT[] DEFAULT '{}';
              
              COMMENT ON COLUMN lats_products.tags IS 'Product tags for filtering and search';
              RAISE NOTICE '✅ Added tags to lats_products';
          ELSE
              RAISE NOTICE '✓ lats_products.tags already exists';
          END IF;
      END $$;
    `;
    console.log('   ✅ Done\n');

    // Verify
    const verification = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_products' 
      AND column_name = 'tags'
    `;

    if (verification.length > 0) {
      console.log('=====================================');
      console.log('✅ Tags column added successfully!');
      console.log('=====================================\n');
      console.log('Please refresh your app and try again.\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

addTagsColumn();

