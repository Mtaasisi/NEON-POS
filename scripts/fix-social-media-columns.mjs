#!/usr/bin/env node
/**
 * Fix social media columns - ensure they exist and are accessible
 * Uses the exact same connection method as the app
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

async function fixColumns() {
  try {
    console.log('🔧 Fixing social media columns...\n');
    
    // Use the same connection method as the app (neon function)
    await sql`
      ALTER TABLE IF EXISTS public.lats_pos_general_settings 
      ADD COLUMN IF NOT EXISTS business_instagram TEXT,
      ADD COLUMN IF NOT EXISTS business_tiktok TEXT,
      ADD COLUMN IF NOT EXISTS business_whatsapp TEXT
    `;
    
    console.log('✅ Columns added successfully\n');
    
    // Verify they exist
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'lats_pos_general_settings'
        AND column_name IN ('business_instagram', 'business_tiktok', 'business_whatsapp')
    `;
    
    console.log('📋 Verified columns:');
    columns.forEach(col => {
      console.log(`   ✅ ${col.column_name}`);
    });
    
    console.log('\n✅ All done! Try saving social media fields now.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixColumns();

