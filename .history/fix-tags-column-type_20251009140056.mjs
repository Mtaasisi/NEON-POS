#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function fixTagsColumn() {
  try {
    console.log('\n🔧 Fixing tags column type mismatch');
    console.log('=====================================\n');
    
    console.log('Current issue: tags is TEXT[] but app sends JSONB');
    console.log('Solution: Change tags column from TEXT[] to JSONB\n');
    
    // Check current type
    console.log('1️⃣ Checking current column type...');
    const currentType = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_products' AND column_name = 'tags'
    `;
    
    if (currentType.length > 0) {
      console.log(`   Current type: ${currentType[0].data_type}\n`);
    }
    
    // Change column type from TEXT[] to JSONB
    console.log('2️⃣ Dropping existing default value...');
    await sql`
      ALTER TABLE lats_products 
      ALTER COLUMN tags DROP DEFAULT
    `;
    console.log('   ✅ Default dropped\n');
    
    console.log('3️⃣ Converting tags column to JSONB...');
    // Convert existing data to JSONB format
    await sql`
      ALTER TABLE lats_products 
      ALTER COLUMN tags TYPE JSONB 
      USING CASE 
        WHEN tags IS NULL THEN '[]'::jsonb
        WHEN tags = '{}' THEN '[]'::jsonb
        ELSE array_to_json(tags)::jsonb
      END
    `;
    console.log('   ✅ Column type changed to JSONB\n');
    
    // Set new default value
    console.log('4️⃣ Setting new JSONB default value...');
    await sql`
      ALTER TABLE lats_products 
      ALTER COLUMN tags SET DEFAULT '[]'::jsonb
    `;
    console.log('   ✅ Default value set\n');
    
    // Verify the change
    console.log('5️⃣ Verifying change...');
    const newType = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_products' AND column_name = 'tags'
    `;
    
    if (newType.length > 0) {
      console.log(`   New type: ${newType[0].data_type}`);
    }
    
    console.log('\n=====================================');
    console.log('✅ Tags column fixed successfully!');
    console.log('=====================================\n');
    console.log('The tags column is now JSONB and will accept');
    console.log('the data format your app is sending.\n');
    console.log('Please refresh your app and try again! 🎉\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

fixTagsColumn();

