#!/usr/bin/env node
/**
 * Verify Phone Number Save to Database
 * Tests that phone numbers can be saved and retrieved correctly
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
if (existsSync(join(process.cwd(), '.env'))) {
  dotenv.config({ path: join(process.cwd(), '.env') });
}

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || process.argv[2];

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found!');
  process.exit(1);
}

console.log('🔌 Connecting to database...\n');

const sql = neon(DATABASE_URL);

async function verifyPhoneSave() {
  try {
    // Get settings record
    let settings = await sql`
      SELECT id, business_name, business_phone
      FROM lats_pos_general_settings
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (settings.length === 0) {
      console.log('⚠️  No settings record found. Creating one...');
      const result = await sql`
        INSERT INTO lats_pos_general_settings (business_name)
        VALUES ('Test Business')
        RETURNING id, business_name, business_phone
      `;
      settings = result;
    }

    const settingsId = settings[0].id;
    console.log(`📋 Using settings record: ${settingsId}`);
    console.log(`   Current phone value: ${settings[0].business_phone || '(empty)'}\n`);

    // Test save with JSON format
    console.log('💾 Testing save with JSON format...');
    const testPhones = JSON.stringify([
      { phone: '+255 123 456 789', whatsapp: true },
      { phone: '+255 987 654 321', whatsapp: false },
      { phone: '+255 555 111 222', whatsapp: true }
    ]);

    const updateResult = await sql`
      UPDATE lats_pos_general_settings
      SET business_phone = ${testPhones},
          updated_at = NOW()
      WHERE id = ${settingsId}
      RETURNING id, business_phone
    `;

    console.log('✅ Save completed!');
    console.log(`   Saved value: ${updateResult[0].business_phone.substring(0, 150)}...\n`);

    // Verify retrieval
    console.log('🔍 Verifying retrieval...');
    const retrieved = await sql`
      SELECT business_phone
      FROM lats_pos_general_settings
      WHERE id = ${settingsId}
    `;

    const phoneValue = retrieved[0].business_phone;
    console.log(`✅ Retrieved value: ${phoneValue.substring(0, 150)}...`);

    // Parse and verify
    try {
      const parsed = JSON.parse(phoneValue);
      console.log(`✅ JSON parsed successfully - ${parsed.length} entries:`);
      parsed.forEach((entry, idx) => {
        console.log(`   ${idx + 1}. ${entry.phone} ${entry.whatsapp ? '📱 (WhatsApp)' : ''}`);
      });
    } catch (e) {
      console.log('⚠️  Failed to parse as JSON:', e.message);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Database save/retrieve verification complete!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

verifyPhoneSave();

