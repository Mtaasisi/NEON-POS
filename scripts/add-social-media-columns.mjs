#!/usr/bin/env node
/**
 * Add Social Media Columns to Database
 * Adds Instagram, TikTok, and WhatsApp columns to lats_pos_general_settings
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
if (existsSync(join(process.cwd(), '.env'))) {
  dotenv.config({ path: join(process.cwd(), '.env') });
}

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found!');
  process.exit(1);
}

console.log('🔌 Connecting to database...\n');

const sql = neon(DATABASE_URL);

async function addSocialMediaColumns() {
  try {
    // Check if columns exist
    console.log('1️⃣ Checking for social media columns...');
    const existingColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'lats_pos_general_settings'
        AND column_name IN ('business_instagram', 'business_tiktok', 'business_whatsapp')
    `;

    const existingNames = existingColumns.map(c => c.column_name);
    const neededColumns = ['business_instagram', 'business_tiktok', 'business_whatsapp'];
    const missing = neededColumns.filter(name => !existingNames.includes(name));

    if (missing.length === 0) {
      console.log('✅ All social media columns already exist!\n');
      return;
    }

    console.log(`📝 Adding ${missing.length} missing column(s)...\n`);

    // Add missing columns - handle each one individually
    for (const col of missing) {
      console.log(`   Adding ${col}...`);
      try {
        if (col === 'business_instagram') {
          await sql`ALTER TABLE lats_pos_general_settings ADD COLUMN IF NOT EXISTS business_instagram TEXT`;
        } else if (col === 'business_tiktok') {
          await sql`ALTER TABLE lats_pos_general_settings ADD COLUMN IF NOT EXISTS business_tiktok TEXT`;
        } else if (col === 'business_whatsapp') {
          await sql`ALTER TABLE lats_pos_general_settings ADD COLUMN IF NOT EXISTS business_whatsapp TEXT`;
        }
        console.log(`   ✅ Added ${col}`);
      } catch (err) {
        console.log(`   ⚠️  Could not add ${col}:`, err.message);
      }
    }

    console.log('\n✅ All social media columns added successfully!');
    console.log('\n📋 Current columns:');
    const allColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'lats_pos_general_settings'
        AND column_name LIKE 'business_%'
      ORDER BY column_name
    `;

    allColumns.forEach(col => {
      console.log(`   • ${col.column_name} (${col.data_type})`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addSocialMediaColumns()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });

