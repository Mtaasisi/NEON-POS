#!/usr/bin/env node
/**
 * Check columns from app's perspective
 * Uses the same connection method as the app
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

if (existsSync(join(process.cwd(), '.env'))) {
  dotenv.config({ path: join(process.cwd(), '.env') });
}

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || process.argv[2];

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found!');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function checkColumns() {
  try {
    console.log('🔍 Checking columns from app perspective...\n');
    console.log(`   Connection: ${DATABASE_URL.substring(0, 60)}...\n`);
    
    // Check columns in all schemas
    const columns = await sql`
      SELECT 
        table_schema,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_name = 'lats_pos_general_settings'
        AND column_name LIKE 'business_%'
      ORDER BY table_schema, column_name
    `;
    
    console.log('📋 Found columns:');
    columns.forEach(col => {
      console.log(`   ${col.table_schema}.${col.column_name} (${col.data_type})`);
    });
    
    // Check specifically for social media columns
    const socialColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'lats_pos_general_settings'
        AND column_name IN ('business_instagram', 'business_tiktok', 'business_whatsapp')
    `;
    
    console.log('\n📱 Social media columns check:');
    const found = socialColumns.map(c => c.column_name);
    ['business_instagram', 'business_tiktok', 'business_whatsapp'].forEach(col => {
      const exists = found.includes(col);
      console.log(`   ${exists ? '✅' : '❌'} ${col}`);
    });
    
    // Try a direct update test
    console.log('\n🧪 Testing direct update...');
    const testRecord = await sql`
      SELECT id FROM lats_pos_general_settings LIMIT 1
    `;
    
    if (testRecord.length > 0) {
      try {
        await sql`
          UPDATE lats_pos_general_settings
          SET business_instagram = 'test'
          WHERE id = ${testRecord[0].id}
        `;
        console.log('   ✅ Update with business_instagram works!');
        
        // Clean up
        await sql`
          UPDATE lats_pos_general_settings
          SET business_instagram = NULL
          WHERE id = ${testRecord[0].id}
        `;
      } catch (err) {
        console.log(`   ❌ Update failed: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkColumns();

