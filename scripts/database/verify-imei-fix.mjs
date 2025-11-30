#!/usr/bin/env node

/**
 * Verify IMEI Function Fix
 * Quick script to check if the fix was applied successfully
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = 
  process.env.DATABASE_URL || 
  process.env.VITE_DATABASE_URL || 
  process.env.NEON_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ No database URL found');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

console.log('🔍 Verifying IMEI Function Fix...\n');

async function verify() {
  try {
    // Check function exists
    const functionCheck = await sql`
      SELECT 
        p.proname as function_name,
        pg_get_function_arguments(p.oid) as arguments,
        pg_get_function_result(p.oid) as return_type
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'add_imei_to_parent_variant'
    `;
    
    if (functionCheck.length === 0) {
      console.log('❌ Function NOT found in database!');
      console.log('📝 Run: node fix-missing-imei-function.mjs\n');
      return false;
    }
    
    console.log('✅ Function EXISTS in database');
    console.log(`   Name: ${functionCheck[0].function_name}`);
    console.log(`   Returns: ${functionCheck[0].return_type}\n`);
    
    // Check schema has required columns
    const schemaCheck = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'lats_product_variants'
        AND column_name IN ('parent_variant_id', 'is_parent', 'variant_type')
      ORDER BY column_name
    `;
    
    const expectedColumns = ['is_parent', 'parent_variant_id', 'variant_type'];
    const foundColumns = schemaCheck.map(c => c.column_name);
    
    console.log('📋 Database Schema Check:');
    expectedColumns.forEach(col => {
      if (foundColumns.includes(col)) {
        console.log(`   ✅ ${col} column exists`);
      } else {
        console.log(`   ❌ ${col} column MISSING`);
      }
    });
    
    const allColumnsExist = expectedColumns.every(col => foundColumns.includes(col));
    
    if (!allColumnsExist) {
      console.log('\n⚠️  Some columns are missing!');
      console.log('📝 Run: node apply-parent-child-variant-functions.mjs\n');
      return false;
    }
    
    console.log('\n✅ All required columns exist\n');
    
    // Check if there are any parent variants
    const parentCount = await sql`
      SELECT COUNT(*) as count
      FROM lats_product_variants
      WHERE variant_type = 'parent' OR is_parent = TRUE
    `;
    
    console.log(`📦 Parent Variants in System: ${parentCount[0].count}`);
    
    // Check if there are any child IMEI variants
    const childCount = await sql`
      SELECT COUNT(*) as count
      FROM lats_product_variants
      WHERE variant_type = 'imei_child'
    `;
    
    console.log(`📱 IMEI Child Variants: ${childCount[0].count}\n`);
    
    // Overall status
    console.log('═══════════════════════════════════════');
    console.log('   VERIFICATION RESULT');
    console.log('═══════════════════════════════════════');
    console.log('✅ Database Function: READY');
    console.log('✅ Schema Columns: READY');
    console.log('✅ System Status: OPERATIONAL');
    console.log('═══════════════════════════════════════\n');
    
    console.log('💡 Next Steps:');
    console.log('   1. Refresh your browser (Cmd/Ctrl + Shift + R)');
    console.log('   2. Open your Purchase Order');
    console.log('   3. Try receiving items with IMEI numbers');
    console.log('   4. Check for success messages\n');
    
    return true;
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

verify()
  .then(success => {
    if (success) {
      console.log('🎉 All checks passed!\n');
      process.exit(0);
    } else {
      console.log('⚠️  Some checks failed. See messages above.\n');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

