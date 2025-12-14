#!/usr/bin/env node
/**
 * Add social media columns to the database that the app is actually using
 * This script will add columns to whichever database the app connects to
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

if (existsSync(join(process.cwd(), '.env'))) {
  dotenv.config({ path: join(process.cwd(), '.env') });
}

// Use the same URL the app uses
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found!');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function addColumns() {
  try {
    console.log('🔧 Adding social media columns to app database...\n');
    console.log(`Using: ${DATABASE_URL.substring(0, 60)}...\n`);
    
    // Add columns with IF NOT EXISTS
    await sql`
      ALTER TABLE public.lats_pos_general_settings 
      ADD COLUMN IF NOT EXISTS business_instagram TEXT,
      ADD COLUMN IF NOT EXISTS business_tiktok TEXT,
      ADD COLUMN IF NOT EXISTS business_whatsapp TEXT
    `;
    
    console.log('✅ Columns added successfully!\n');
    
    // Verify they exist
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'lats_pos_general_settings'
        AND column_name IN ('business_instagram', 'business_tiktok', 'business_whatsapp')
      ORDER BY column_name
    `;
    
    if (columns.length > 0) {
      console.log('✅ Verified columns exist:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('⚠️  Columns not found after adding - may need to check permissions');
    }
    
    // Grant permissions
    await sql`
      GRANT UPDATE ON public.lats_pos_general_settings TO anon, authenticated
    `;
    
    console.log('\n✅ Permissions granted');
    console.log('\n✅ All done! The app should now be able to see and save social media fields.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addColumns();

