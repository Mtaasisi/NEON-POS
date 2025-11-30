#!/usr/bin/env node

/**
 * IMEI Variant System - Database Verification Script
 * 
 * This script verifies that your database is properly set up for the IMEI variant system.
 * It checks:
 * 1. Required columns exist
 * 2. Triggers are in place
 * 3. Functions exist
 * 4. Views are created
 * 5. Sample queries work
 * 
 * Run: node verify-imei-setup.mjs
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.VITE_DATABASE_URL || process.env.VITE_NEON_DATABASE_URL);

console.log('🔍 IMEI Variant System - Database Verification\n');
console.log('═'.repeat(60));

let allChecksPass = true;

// Helper function to run check
async function runCheck(name, checkFn) {
  try {
    const result = await checkFn();
    if (result.pass) {
      console.log(`✅ ${name}`);
      if (result.details) {
        console.log(`   ${result.details}`);
      }
    } else {
      console.log(`❌ ${name}`);
      console.log(`   ${result.message}`);
      allChecksPass = false;
    }
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    allChecksPass = false;
  }
}

// Check 1: variant_attributes column exists
await runCheck('variant_attributes column exists', async () => {
  const result = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'variant_attributes'
  `;
  
  return {
    pass: result.length > 0,
    message: 'variant_attributes column not found in lats_product_variants',
    details: result.length > 0 ? `Type: ${result[0].data_type}` : null
  };
});

// Check 2: quantity column exists
await runCheck('quantity column exists', async () => {
  const result = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'quantity'
  `;
  
  return {
    pass: result.length > 0,
    message: 'quantity column not found in lats_product_variants',
    details: result.length > 0 ? `Type: ${result[0].data_type}` : null
  };
});

// Check 3: branch_id column exists in variants
await runCheck('branch_id column exists in variants', async () => {
  const result = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'branch_id'
  `;
  
  return {
    pass: result.length > 0,
    message: 'branch_id column not found in lats_product_variants',
    details: result.length > 0 ? `Type: ${result[0].data_type}` : null
  };
});

// Check 4: IMEI index exists
await runCheck('IMEI index exists', async () => {
  const result = await sql`
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'lats_product_variants' 
    AND indexname = 'idx_variant_imei'
  `;
  
  return {
    pass: result.length > 0,
    message: 'IMEI index (idx_variant_imei) not found',
    details: result.length > 0 ? 'Index on variant_attributes->\'\'imei\'\' exists' : null
  };
});

// Check 5: check_duplicate_imei function exists
await runCheck('check_duplicate_imei() function exists', async () => {
  const result = await sql`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_name = 'check_duplicate_imei'
    AND routine_schema = 'public'
  `;
  
  return {
    pass: result.length > 0,
    message: 'check_duplicate_imei() function not found',
    details: result.length > 0 ? 'Duplicate IMEI validation function exists' : null
  };
});

// Check 6: enforce_unique_imei trigger exists
await runCheck('enforce_unique_imei trigger exists', async () => {
  const result = await sql`
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE trigger_name = 'enforce_unique_imei'
    AND event_object_table = 'lats_product_variants'
  `;
  
  return {
    pass: result.length > 0,
    message: 'enforce_unique_imei trigger not found',
    details: result.length > 0 ? 'IMEI uniqueness trigger active' : null
  };
});

// Check 7: get_variant_by_imei function exists
await runCheck('get_variant_by_imei() function exists', async () => {
  const result = await sql`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_name = 'get_variant_by_imei'
    AND routine_schema = 'public'
  `;
  
  return {
    pass: result.length > 0,
    message: 'get_variant_by_imei() function not found',
    details: result.length > 0 ? 'Helper function for IMEI lookups exists' : null
  };
});

// Check 8: decrement_variant_quantity function exists
await runCheck('decrement_variant_quantity() function exists', async () => {
  const result = await sql`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_name = 'decrement_variant_quantity'
    AND routine_schema = 'public'
  `;
  
  return {
    pass: result.length > 0,
    message: 'decrement_variant_quantity() function not found',
    details: result.length > 0 ? 'Quantity management function exists' : null
  };
});

// Check 9: available_imei_variants view exists
await runCheck('available_imei_variants view exists', async () => {
  const result = await sql`
    SELECT table_name 
    FROM information_schema.views 
    WHERE table_name = 'available_imei_variants'
    AND table_schema = 'public'
  `;
  
  return {
    pass: result.length > 0,
    message: 'available_imei_variants view not found',
    details: result.length > 0 ? 'View for querying available IMEI variants exists' : null
  };
});

// Check 10: metadata column in products
await runCheck('metadata column exists in products', async () => {
  const result = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'lats_products' 
    AND column_name = 'metadata'
  `;
  
  return {
    pass: result.length > 0,
    message: 'metadata column not found in lats_products',
    details: result.length > 0 ? `Type: ${result[0].data_type}` : null
  };
});

console.log('\n' + '═'.repeat(60));

// Additional Information
console.log('\n📊 Additional Information:\n');

try {
  // Count existing IMEI variants
  const imeiCount = await sql`
    SELECT COUNT(*) as count 
    FROM lats_product_variants 
    WHERE variant_attributes->>'imei' IS NOT NULL
    AND variant_attributes->>'imei' != ''
  `;
  console.log(`✓ Existing IMEI variants: ${imeiCount[0].count}`);

  // Count products
  const productCount = await sql`
    SELECT COUNT(*) as count FROM lats_products
  `;
  console.log(`✓ Total products: ${productCount[0].count}`);

  // Count variants
  const variantCount = await sql`
    SELECT COUNT(*) as count FROM lats_product_variants
  `;
  console.log(`✓ Total variants: ${variantCount[0].count}`);

  // Check if any legacy inventory_items with IMEI exist
  const legacyImeiCount = await sql`
    SELECT COUNT(*) as count 
    FROM inventory_items 
    WHERE imei IS NOT NULL 
    AND imei != ''
    AND status != 'migrated'
  `;
  console.log(`✓ Legacy inventory_items with IMEI (not migrated): ${legacyImeiCount[0].count}`);

} catch (error) {
  console.log(`⚠️  Could not fetch additional info: ${error.message}`);
}

console.log('\n' + '═'.repeat(60));

// Final Summary
console.log('\n📋 Summary:\n');

if (allChecksPass) {
  console.log('✅ All checks passed! Your database is ready for the IMEI variant system.\n');
  console.log('Next steps:');
  console.log('1. ✅ Database schema is ready');
  console.log('2. ✅ Start receiving POs with IMEI numbers');
  console.log('3. ✅ System will automatically create IMEI variants');
  console.log('4. ✅ POS will automatically detect and use IMEI variants');
  console.log('5. ⚠️  Optional: Run migration script to convert old data');
  console.log('   → node migrate-inventory-items-to-imei-variants.mjs\n');
} else {
  console.log('❌ Some checks failed. Please run the migration:\n');
  console.log('   psql $VITE_NEON_DATABASE_URL -f migrations/add_imei_variant_support.sql\n');
  console.log('Or apply the SQL manually in your Neon dashboard.\n');
}

process.exit(allChecksPass ? 0 : 1);

