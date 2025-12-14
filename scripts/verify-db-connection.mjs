#!/usr/bin/env node
/**
 * Quick Database Connection Verification
 * Verifies the database connection and table structure
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
if (existsSync(join(process.cwd(), '.env'))) {
  dotenv.config({ path: join(process.cwd(), '.env') });
}

// Get database URL from environment or use provided connection string
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || process.argv[2];

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found!');
  console.error('\nUsage:');
  console.error('  node scripts/verify-db-connection.mjs');
  console.error('  node scripts/verify-db-connection.mjs "postgresql://..."');
  console.error('\nOr set VITE_DATABASE_URL in your .env file');
  process.exit(1);
}

console.log('🔌 Verifying database connection...');
console.log(`   URL: ${DATABASE_URL.substring(0, 60)}...\n`);

const sql = neon(DATABASE_URL);

async function verifyConnection() {
  try {
    // Test 1: Connection
    console.log('1️⃣ Testing database connection...');
    const version = await sql`SELECT version()`;
    console.log('✅ Connected successfully');
    console.log(`   PostgreSQL: ${version[0].version.split(',')[0]}\n`);

    // Test 2: Check if table exists
    console.log('2️⃣ Checking lats_pos_general_settings table...');
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'lats_pos_general_settings'
      )
    `;

    if (!tableExists[0].exists) {
      console.log('❌ Table does not exist!');
      console.log('   Please run migrations first.');
      process.exit(1);
    }
    console.log('✅ Table exists\n');

    // Test 3: Check business_phone column
    console.log('3️⃣ Checking business_phone column...');
    const columnInfo = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'lats_pos_general_settings'
        AND column_name = 'business_phone'
    `;

    if (columnInfo.length === 0) {
      console.log('⚠️  business_phone column does not exist');
      console.log('   Creating column...');
      await sql`
        ALTER TABLE lats_pos_general_settings
        ADD COLUMN IF NOT EXISTS business_phone TEXT
      `;
      console.log('✅ Column created\n');
    } else {
      console.log('✅ Column exists');
      console.log(`   Type: ${columnInfo[0].data_type}`);
      console.log(`   Nullable: ${columnInfo[0].is_nullable}\n`);
    }

    // Test 4: Check all business columns
    console.log('4️⃣ Checking all business information columns...');
    const allColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'lats_pos_general_settings'
        AND column_name LIKE 'business_%'
      ORDER BY column_name
    `;

    const requiredColumns = [
      'business_name',
      'business_phone',
      'business_email',
      'business_website',
      'business_address',
      'business_logo'
    ];

    console.log('   Existing columns:');
    allColumns.forEach(col => {
      const required = requiredColumns.includes(col.column_name);
      const icon = required ? '✅' : 'ℹ️ ';
      console.log(`   ${icon} ${col.column_name} (${col.data_type})`);
    });

    // Check missing columns
    const existingNames = allColumns.map(c => c.column_name);
    const missing = requiredColumns.filter(name => !existingNames.includes(name));

    if (missing.length > 0) {
      console.log('\n   Creating missing columns...');
      for (const col of missing) {
        if (col === 'business_logo') {
          await sql`
            ALTER TABLE lats_pos_general_settings
            ADD COLUMN IF NOT EXISTS ${sql(col)} TEXT
          `;
        } else {
          await sql`
            ALTER TABLE lats_pos_general_settings
            ADD COLUMN IF NOT EXISTS ${sql(col)} TEXT
          `;
        }
        console.log(`   ✅ Created ${col}`);
      }
    }

    console.log('\n✅ All required columns exist\n');

    // Test 5: Test JSON format save/retrieve
    console.log('5️⃣ Testing JSON phone format...');
    let settings = await sql`
      SELECT id, business_phone
      FROM lats_pos_general_settings
      LIMIT 1
    `;

    if (settings.length === 0) {
      console.log('   Creating test settings record...');
      await sql`
        INSERT INTO lats_pos_general_settings (business_name)
        VALUES ('Test Business')
      `;
      settings = await sql`
        SELECT id, business_phone
        FROM lats_pos_general_settings
        LIMIT 1
      `;
    }

    const testPhones = JSON.stringify([
      { phone: '+255 123 456 789', whatsapp: true },
      { phone: '+255 987 654 321', whatsapp: false }
    ]);

    await sql`
      UPDATE lats_pos_general_settings
      SET business_phone = ${testPhones}
      WHERE id = ${settings[0].id}
    `;

    const retrieved = await sql`
      SELECT business_phone
      FROM lats_pos_general_settings
      WHERE id = ${settings[0].id}
    `;

    const parsed = JSON.parse(retrieved[0].business_phone);
    console.log('✅ JSON format works!');
    console.log(`   Saved and retrieved ${parsed.length} phone entries\n`);

    console.log('=' .repeat(50));
    console.log('✅ All verifications passed!');
    console.log('✅ Database is ready for phone number format');
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    if (error.message.includes('does not exist')) {
      console.error('\n💡 Tip: Make sure you have run database migrations.');
    }
    process.exit(1);
  }
}

verifyConnection();

