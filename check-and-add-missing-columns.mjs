#!/usr/bin/env node

/**
 * CHECK AND ADD MISSING COLUMNS
 * Ensures variant_type and parent_variant_id columns exist
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log('\n🔍 CHECKING CURRENT SCHEMA...\n');

  // Get a sample variant to check columns
  const { data: variants } = await supabase
    .from('lats_product_variants')
    .select('*')
    .limit(1);

  if (variants && variants.length > 0) {
    const columns = Object.keys(variants[0]);
    console.log(`Found ${columns.length} columns in lats_product_variants:\n`);
    
    const hasVariantType = columns.includes('variant_type');
    const hasParentVariantId = columns.includes('parent_variant_id');

    console.log(`✓ Columns: ${columns.join(', ')}\n`);
    console.log(`${hasVariantType ? '✅' : '❌'} variant_type column ${hasVariantType ? 'exists' : 'MISSING'}`);
    console.log(`${hasParentVariantId ? '✅' : '❌'} parent_variant_id column ${hasParentVariantId ? 'exists' : 'MISSING'}\n`);

    if (!hasVariantType || !hasParentVariantId) {
      console.log('⚠️  IMEI parent-child system columns are missing!');
      console.log('📝 These columns are required for IMEI tracking.\n');
      console.log('To add them, run the SQL file: apply-system-fixes.sql');
      console.log('Or add them manually in Supabase SQL Editor.\n');
      return false;
    } else {
      console.log('✅ All required columns exist!');
      console.log('✅ IMEI parent-child system is ready.\n');
      return true;
    }
  }

  return false;
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   SCHEMA VALIDATION - IMEI SYSTEM COLUMNS                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  await checkColumns();
}

main();

