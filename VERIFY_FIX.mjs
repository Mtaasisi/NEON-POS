#!/usr/bin/env node

/**
 * VERIFICATION SCRIPT: Check if IMEI Function Fix Was Applied
 * ============================================================
 * This script verifies that the database has all required components
 * 
 * Usage:
 *   node VERIFY_FIX.mjs
 */

import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('\n❌ ERROR: DATABASE_URL not found in environment variables\n');
  process.exit(1);
}

console.log('🔍 Verifying IMEI Function Fix...\n');
console.log('═══════════════════════════════════════════════════════\n');

// Import postgres client
let postgres;
try {
  postgres = (await import('@neondatabase/serverless')).default;
} catch (error) {
  console.error('❌ Error: @neondatabase/serverless not installed');
  console.error('Please install: npm install @neondatabase/serverless\n');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });

let allPassed = true;

try {
  // Check 1: Function exists
  console.log('📝 Checking function: add_imei_to_parent_variant...');
  const funcCheck = await sql`
    SELECT EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'add_imei_to_parent_variant'
    ) as exists;
  `;
  
  if (funcCheck[0].exists) {
    console.log('   ✅ Function exists\n');
  } else {
    console.log('   ❌ Function NOT FOUND\n');
    allPassed = false;
  }

  // Check 2: Required columns
  console.log('📝 Checking required columns...');
  const requiredColumns = [
    'parent_variant_id',
    'is_parent',
    'variant_type',
    'variant_attributes',
    'variant_name'
  ];

  for (const columnName of requiredColumns) {
    const colCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_product_variants' 
        AND column_name = ${columnName}
      ) as exists;
    `;
    
    if (colCheck[0].exists) {
      console.log(`   ✅ Column: ${columnName}`);
    } else {
      console.log(`   ❌ Column MISSING: ${columnName}`);
      allPassed = false;
    }
  }

  console.log();

  // Check 3: Function signature
  console.log('📝 Checking function signature...');
  const sigCheck = await sql`
    SELECT 
      pg_get_function_arguments(p.oid) as arguments,
      pg_get_function_result(p.oid) as return_type
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'add_imei_to_parent_variant'
    LIMIT 1;
  `;

  if (sigCheck.length > 0) {
    console.log('   ✅ Function signature verified');
    console.log(`   📋 Arguments: ${sigCheck[0].arguments}`);
    console.log(`   📋 Returns: ${sigCheck[0].return_type}\n`);
  } else {
    console.log('   ⚠️  Could not verify function signature\n');
  }

  // Check 4: Indexes
  console.log('📝 Checking indexes...');
  const indexCheck = await sql`
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'lats_product_variants'
    AND (
      indexname LIKE '%parent%' OR 
      indexname LIKE '%variant_type%' OR
      indexname LIKE '%variant_attributes%'
    );
  `;

  if (indexCheck.length > 0) {
    console.log(`   ✅ Found ${indexCheck.length} relevant indexes:`);
    indexCheck.forEach(idx => {
      console.log(`      - ${idx.indexname}`);
    });
  } else {
    console.log('   ⚠️  No indexes found (performance may be affected)');
  }

  console.log('\n═══════════════════════════════════════════════════════\n');

  if (allPassed) {
    console.log('🎉 VERIFICATION PASSED!\n');
    console.log('✅ All required components are in place');
    console.log('✅ Your IMEI system should work correctly\n');
    console.log('📋 Next Steps:');
    console.log('   1. Refresh your browser (Cmd+Shift+R)');
    console.log('   2. Clear browser console');
    console.log('   3. Try receiving a Purchase Order with IMEI numbers');
    console.log('   4. The error should be gone! ✨\n');
  } else {
    console.log('❌ VERIFICATION FAILED!\n');
    console.log('Some components are missing. Please run the fix again:');
    console.log('   node APPLY_FIX_NOW.mjs\n');
    console.log('Or manually apply: ALL_IN_ONE_FIX.sql\n');
  }

  await sql.end();
  process.exit(allPassed ? 0 : 1);

} catch (error) {
  console.error('\n❌ ERROR during verification:');
  console.error('─────────────────────────────────────────────────────');
  console.error(error.message);
  console.error('─────────────────────────────────────────────────────\n');
  
  await sql.end();
  process.exit(1);
}

