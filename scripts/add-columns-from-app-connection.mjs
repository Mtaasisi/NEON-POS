#!/usr/bin/env node
/**
 * Add social media columns using the exact same connection the app uses
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

console.log('🔌 Using app connection:', DATABASE_URL.substring(0, 60) + '...\n');

const sql = neon(DATABASE_URL);

async function addColumns() {
  try {
    console.log('1️⃣ Checking if columns exist...\n');
    
    // Check columns using the app's connection
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
    
    if (missing.length === 0) {
      console.log('✅ All social media columns already exist!\n');
      return;
    }
    
    console.log(`2️⃣ Adding ${missing.length} missing column(s)...\n`);
    
    // Add missing columns
    for (const col of missing) {
      try {
        await sql`ALTER TABLE public.lats_pos_general_settings ADD COLUMN IF NOT EXISTS ${sql(col)} TEXT`;
        console.log(`   ✅ Added ${col}`);
      } catch (err) {
        console.log(`   ❌ Error adding ${col}:`, err.message);
      }
    }
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addColumns();

