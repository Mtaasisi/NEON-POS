#!/usr/bin/env node

/**
 * ADD IMEI SYSTEM COLUMNS
 * Adds variant_type and parent_variant_id columns to lats_product_variants table
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumns() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   ADDING IMEI SYSTEM COLUMNS                                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('📝 Adding missing columns to lats_product_variants...\n');

  // SQL to add the columns
  const sql = `
    -- Add variant_type column if it doesn't exist
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'variant_type'
      ) THEN
        ALTER TABLE lats_product_variants 
        ADD COLUMN variant_type TEXT DEFAULT 'standard';
        
        RAISE NOTICE 'Added variant_type column';
      ELSE
        RAISE NOTICE 'variant_type column already exists';
      END IF;
    END $$;

    -- Add parent_variant_id column if it doesn't exist
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = 'parent_variant_id'
      ) THEN
        ALTER TABLE lats_product_variants 
        ADD COLUMN parent_variant_id UUID REFERENCES lats_product_variants(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added parent_variant_id column';
      ELSE
        RAISE NOTICE 'parent_variant_id column already exists';
      END IF;
    END $$;

    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_variants_parent_id 
    ON lats_product_variants(parent_variant_id) 
    WHERE parent_variant_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_variants_type 
    ON lats_product_variants(variant_type);
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, provide manual instructions
      console.log('⚠️  Cannot add columns automatically.');
      console.log('Please run the following SQL in your Supabase SQL Editor:\n');
      console.log('─'.repeat(70));
      console.log(sql);
      console.log('─'.repeat(70));
      console.log('\nOr use the apply-system-fixes.sql file provided.\n');
      return false;
    }

    console.log('✅ Columns added successfully!\n');
    return true;
  } catch (err) {
    console.log('⚠️  Cannot add columns automatically.');
    console.log('Please run the apply-system-fixes.sql file in your Supabase SQL Editor.\n');
    return false;
  }
}

async function main() {
  await addColumns();
  
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   NEXT STEPS                                                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Open and run the file: apply-system-fixes.sql');
  console.log('4. This will set up the complete IMEI tracking system\n');
  console.log('After running the SQL file, your system will be ready for IMEI tracking!\n');
}

main();

