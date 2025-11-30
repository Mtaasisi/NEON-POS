#!/usr/bin/env node
/**
 * Full test: Save Instagram and verify in database using app's connection method
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
const TEST_INSTAGRAM = '@care_instagram_test';

async function fullTest() {
  try {
    console.log('🧪 Full Instagram Save Test\n');
    console.log(`Using connection: ${DATABASE_URL.substring(0, 60)}...\n`);
    
    // Step 1: Verify columns exist
    console.log('1️⃣ Verifying columns exist...');
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'lats_pos_general_settings'
        AND column_name IN ('business_instagram', 'business_tiktok', 'business_whatsapp')
      ORDER BY column_name
    `;
    
    if (columns.length === 0) {
      console.log('   ⚠️  Columns do not exist, adding them...');
      await sql`
        ALTER TABLE public.lats_pos_general_settings 
        ADD COLUMN IF NOT EXISTS business_instagram TEXT,
        ADD COLUMN IF NOT EXISTS business_tiktok TEXT,
        ADD COLUMN IF NOT EXISTS business_whatsapp TEXT
      `;
      console.log('   ✅ Columns added\n');
    } else {
      console.log('   ✅ Columns exist:');
      columns.forEach(col => {
        console.log(`      - ${col.column_name} (${col.data_type})`);
      });
      console.log();
    }
    
    // Step 2: Get settings record
    console.log('2️⃣ Finding settings record...');
    const settings = await sql`
      SELECT id, business_name, business_instagram 
      FROM lats_pos_general_settings 
      LIMIT 1
    `;
    
    if (settings.length === 0) {
      console.error('   ❌ No settings record found!');
      process.exit(1);
    }
    
    const settingsId = settings[0].id;
    console.log(`   ✅ Found record ID: ${settingsId}`);
    console.log(`   Current business_name: ${settings[0].business_name || 'N/A'}`);
    console.log(`   Current Instagram: ${settings[0].business_instagram || 'null'}\n`);
    
    // Step 3: Save Instagram
    console.log(`3️⃣ Saving Instagram username: ${TEST_INSTAGRAM}...`);
    const updateResult = await sql`
      UPDATE lats_pos_general_settings
      SET business_instagram = ${TEST_INSTAGRAM},
          updated_at = NOW()
      WHERE id = ${settingsId}
      RETURNING id, business_instagram, business_tiktok, business_whatsapp
    `;
    
    if (updateResult.length === 0) {
      console.error('   ❌ Update failed - no rows affected');
      process.exit(1);
    }
    
    console.log('   ✅ Save successful!\n');
    
    // Step 4: Verify
    console.log('4️⃣ Verifying in database...');
    const verify = await sql`
      SELECT business_instagram, business_tiktok, business_whatsapp
      FROM lats_pos_general_settings
      WHERE id = ${settingsId}
    `;
    
    if (verify.length > 0) {
      console.log('   ✅ Verification successful:');
      console.log(`      Instagram: ${verify[0].business_instagram || 'null'}`);
      console.log(`      TikTok: ${verify[0].business_tiktok || 'null'}`);
      console.log(`      WhatsApp: ${verify[0].business_whatsapp || 'null'}\n`);
      
      if (verify[0].business_instagram === TEST_INSTAGRAM) {
        console.log('✅ TEST PASSED: Instagram username saved and verified successfully!');
      } else {
        console.error('❌ TEST FAILED: Instagram value does not match');
        process.exit(1);
      }
    } else {
      console.error('   ❌ Verification failed - record not found');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fullTest();

