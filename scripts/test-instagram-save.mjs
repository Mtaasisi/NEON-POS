#!/usr/bin/env node
/**
 * Test script to save Instagram username and verify it exists in database
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

if (existsSync(join(process.cwd(), '.env'))) {
  dotenv.config({ path: join(process.cwd(), '.env') });
}

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found!');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const TEST_INSTAGRAM = '@test_instagram_user';

async function testInstagramSave() {
  try {
    console.log('🧪 Testing Instagram save functionality...\n');
    
    // Step 1: Get the settings record ID
    console.log('1️⃣ Finding settings record...');
    const settings = await sql`
      SELECT id FROM lats_pos_general_settings LIMIT 1
    `;
    
    if (settings.length === 0) {
      console.error('❌ No settings record found!');
      process.exit(1);
    }
    
    const settingsId = settings[0].id;
    console.log(`   ✅ Found settings ID: ${settingsId}\n`);
    
    // Step 2: Check if business_instagram column exists
    console.log('2️⃣ Checking if business_instagram column exists...');
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'lats_pos_general_settings'
        AND column_name = 'business_instagram'
    `;
    
    if (columns.length === 0) {
      console.log('   ⚠️  Column does not exist, adding it...');
      await sql`
        ALTER TABLE public.lats_pos_general_settings 
        ADD COLUMN business_instagram TEXT
      `;
      console.log('   ✅ Column added successfully\n');
    } else {
      console.log('   ✅ Column exists\n');
    }
    
    // Step 3: Save Instagram username
    console.log('3️⃣ Saving Instagram username...');
    console.log(`   Saving: ${TEST_INSTAGRAM}`);
    
    await sql`
      UPDATE lats_pos_general_settings
      SET business_instagram = ${TEST_INSTAGRAM}
      WHERE id = ${settingsId}
    `;
    
    console.log('   ✅ Saved successfully\n');
    
    // Step 4: Verify it was saved
    console.log('4️⃣ Verifying save...');
    const result = await sql`
      SELECT business_instagram
      FROM lats_pos_general_settings
      WHERE id = ${settingsId}
    `;
    
    if (result.length > 0 && result[0].business_instagram === TEST_INSTAGRAM) {
      console.log(`   ✅ Verification successful!`);
      console.log(`   ✅ Instagram username in database: ${result[0].business_instagram}\n`);
    } else {
      console.error('   ❌ Verification failed!');
      console.error(`   Expected: ${TEST_INSTAGRAM}`);
      console.error(`   Got: ${result[0]?.business_instagram || 'null'}\n`);
      process.exit(1);
    }
    
    console.log('✅ All tests passed! Instagram field is working correctly.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testInstagramSave();

