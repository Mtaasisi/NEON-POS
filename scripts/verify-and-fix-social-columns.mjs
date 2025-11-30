#!/usr/bin/env node
/**
 * Verify and Fix Social Media Columns
 * Ensures columns exist and are accessible
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

async function verifyAndFix() {
  try {
    console.log('🔍 Verifying social media columns...\n');
    
    // Check columns
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'lats_pos_general_settings'
        AND column_name IN ('business_instagram', 'business_tiktok', 'business_whatsapp')
    `;
    
    const existing = columns.map(c => c.column_name);
    const needed = ['business_instagram', 'business_tiktok', 'business_whatsapp'];
    const missing = needed.filter(c => !existing.includes(c));
    
    if (missing.length > 0) {
      console.log(`⚠️  Missing columns: ${missing.join(', ')}`);
      console.log('   Adding them now...\n');
      
      for (const col of missing) {
        if (col === 'business_instagram') {
          await sql`ALTER TABLE public.lats_pos_general_settings ADD COLUMN IF NOT EXISTS business_instagram TEXT`;
        } else if (col === 'business_tiktok') {
          await sql`ALTER TABLE public.lats_pos_general_settings ADD COLUMN IF NOT EXISTS business_tiktok TEXT`;
        } else if (col === 'business_whatsapp') {
          await sql`ALTER TABLE public.lats_pos_general_settings ADD COLUMN IF NOT EXISTS business_whatsapp TEXT`;
        }
        console.log(`   ✅ Added ${col}`);
      }
    } else {
      console.log('✅ All social media columns exist\n');
    }
    
    // Test update with all columns
    console.log('🧪 Testing update with social media columns...');
    const testSettings = await sql`
      SELECT id FROM lats_pos_general_settings LIMIT 1
    `;
    
    if (testSettings.length > 0) {
      const testId = testSettings[0].id;
      const testUpdate = await sql`
        UPDATE lats_pos_general_settings
        SET 
          business_instagram = 'test_instagram',
          business_tiktok = 'test_tiktok',
          business_whatsapp = 'test_whatsapp'
        WHERE id = ${testId}
        RETURNING id, business_instagram, business_tiktok, business_whatsapp
      `;
      
      console.log('✅ Update test successful!');
      console.log(`   Updated record: ${testUpdate[0].id}`);
      
      // Clean up test data
      await sql`
        UPDATE lats_pos_general_settings
        SET 
          business_instagram = NULL,
          business_tiktok = NULL,
          business_whatsapp = NULL
        WHERE id = ${testId}
      `;
      console.log('   ✅ Cleaned up test data\n');
    }
    
    console.log('✅ All checks passed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

verifyAndFix();

