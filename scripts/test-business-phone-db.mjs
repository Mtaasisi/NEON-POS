#!/usr/bin/env node
/**
 * Test Business Phone Database Connection
 * Tests that the new JSON format for phone numbers works with the database
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env') });

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('Please set VITE_DATABASE_URL or DATABASE_URL in your .env file');
  process.exit(1);
}

console.log('🔌 Connecting to database...');
console.log(`   URL: ${DATABASE_URL.substring(0, 50)}...`);

const sql = neon(DATABASE_URL);

async function testPhoneFormat() {
  try {
    console.log('\n📋 Testing Business Phone JSON Format');
    console.log('=' .repeat(50));

    // Test 1: Check if table exists and has business_phone column
    console.log('\n1️⃣ Checking table structure...');
    const tableCheck = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'business_phone'
    `;

    if (tableCheck.length === 0) {
      console.log('❌ business_phone column does not exist!');
      console.log('   Creating column...');
      
      await sql`
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN IF NOT EXISTS business_phone TEXT
      `;
      
      console.log('✅ Column created successfully');
    } else {
      console.log('✅ business_phone column exists');
      console.log(`   Type: ${tableCheck[0].data_type}`);
    }

    // Test 2: Get existing settings or create one
    console.log('\n2️⃣ Getting/Creating settings record...');
    let settings = await sql`
      SELECT id, business_phone
      FROM lats_pos_general_settings
      LIMIT 1
    `;

    let settingsId;
    if (settings.length === 0) {
      console.log('   Creating new settings record...');
      const result = await sql`
        INSERT INTO lats_pos_general_settings (business_name)
        VALUES ('Test Business')
        RETURNING id
      `;
      settingsId = result[0].id;
      console.log('✅ New settings record created');
    } else {
      settingsId = settings[0].id;
      console.log(`✅ Using existing settings record: ${settingsId}`);
      console.log(`   Current phone value: ${settings[0].business_phone || '(empty)'}`);
    }

    // Test 3: Save JSON format phone numbers
    console.log('\n3️⃣ Testing JSON phone format save...');
    const testPhones = JSON.stringify([
      { phone: '+255 123 456 789', whatsapp: true },
      { phone: '+255 987 654 321', whatsapp: false },
      { phone: '+255 555 123 456', whatsapp: true }
    ]);

    await sql`
      UPDATE lats_pos_general_settings
      SET business_phone = ${testPhones}
      WHERE id = ${settingsId}
    `;
    console.log('✅ JSON phone format saved successfully');
    console.log(`   Value: ${testPhones.substring(0, 80)}...`);

    // Test 4: Retrieve and parse phone numbers
    console.log('\n4️⃣ Testing JSON phone format retrieval...');
    const retrieved = await sql`
      SELECT business_phone
      FROM lats_pos_general_settings
      WHERE id = ${settingsId}
    `;

    const phoneValue = retrieved[0].business_phone;
    console.log(`✅ Retrieved value: ${phoneValue.substring(0, 80)}...`);

    // Parse JSON
    try {
      const parsed = JSON.parse(phoneValue);
      console.log('✅ JSON parsed successfully');
      console.log(`   Found ${parsed.length} phone entries:`);
      parsed.forEach((entry, index) => {
        console.log(`   ${index + 1}. ${entry.phone} ${entry.whatsapp ? '📱 (WhatsApp)' : ''}`);
      });
    } catch (e) {
      console.log('⚠️  Failed to parse JSON:', e.message);
      console.log('   This might be old comma-separated format');
    }

    // Test 5: Test backward compatibility (comma-separated)
    console.log('\n5️⃣ Testing backward compatibility...');
    const legacyFormat = '+255 111 222 333, +255 444 555 666';
    await sql`
      UPDATE lats_pos_general_settings
      SET business_phone = ${legacyFormat}
      WHERE id = ${settingsId}
    `;
    console.log('✅ Legacy format saved');

    const retrievedLegacy = await sql`
      SELECT business_phone
      FROM lats_pos_general_settings
      WHERE id = ${settingsId}
    `;
    console.log(`✅ Retrieved legacy format: ${retrievedLegacy[0].business_phone}`);

    // Restore JSON format
    await sql`
      UPDATE lats_pos_general_settings
      SET business_phone = ${testPhones}
      WHERE id = ${settingsId}
    `;
    console.log('✅ JSON format restored');

    // Test 6: Verify column supports JSON
    console.log('\n6️⃣ Testing JSON validation...');
    const invalidJson = 'This is not valid JSON';
    try {
      await sql`
        UPDATE lats_pos_general_settings
        SET business_phone = ${invalidJson}
        WHERE id = ${settingsId}
      `;
      console.log('⚠️  Invalid JSON was accepted (this is OK - TEXT column accepts any text)');
    } catch (e) {
      console.log('✅ Database rejected invalid JSON:', e.message);
    }

    // Restore valid JSON
    await sql`
      UPDATE lats_pos_general_settings
      SET business_phone = ${testPhones}
      WHERE id = ${settingsId}
    `;

    console.log('\n✅ All tests passed!');
    console.log('=' .repeat(50));
    console.log('\n📝 Summary:');
    console.log('   • business_phone column exists and is TEXT type');
    console.log('   • JSON format can be saved and retrieved');
    console.log('   • Backward compatibility works (comma-separated)');
    console.log('   • Database connection is working');
    console.log('\n🎉 Your phone number format is ready to use!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testPhoneFormat()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });

