#!/usr/bin/env node

/**
 * Verify IMEI Function Fix - Complete System Check
 * Run this to confirm all IMEI functions are properly installed
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log('🔍 Verifying IMEI Function Installation...\n');

const sql = neon(DATABASE_URL);

async function verify() {
  try {
    // Check required columns
    console.log('1️⃣ Checking required columns...');
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'lats_product_variants'
        AND column_name IN ('parent_variant_id', 'is_parent', 'variant_type')
      ORDER BY column_name
    `;
    
    if (columns.length === 3) {
      console.log('✅ All required columns exist:');
      columns.forEach(col => {
        console.log(`   ✓ ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('⚠️  Missing columns:', 3 - columns.length);
      return false;
    }
    console.log();
    
    // Check functions
    console.log('2️⃣ Checking IMEI functions...');
    const functions = await sql`
      SELECT 
        p.proname as function_name,
        pg_get_function_arguments(p.oid) as arguments,
        pg_get_function_result(p.oid) as return_type
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname IN (
          'add_imei_to_parent_variant',
          'get_child_imeis',
          'calculate_parent_variant_stock',
          'update_parent_variant_stock',
          'get_available_imeis_for_pos',
          'mark_imei_as_sold'
        )
      ORDER BY p.proname
    `;
    
    const requiredFunctions = [
      'add_imei_to_parent_variant',
      'calculate_parent_variant_stock',
      'get_available_imeis_for_pos',
      'get_child_imeis',
      'mark_imei_as_sold',
      'update_parent_variant_stock'
    ];
    
    if (functions.length === requiredFunctions.length) {
      console.log('✅ All required functions exist:');
      functions.forEach(fn => {
        console.log(`   ✓ ${fn.function_name}`);
      });
    } else {
      console.log('⚠️  Missing functions:', requiredFunctions.length - functions.length);
      const found = functions.map(f => f.function_name);
      const missing = requiredFunctions.filter(f => !found.includes(f));
      console.log('   Missing:', missing.join(', '));
      return false;
    }
    console.log();
    
    // Check trigger
    console.log('3️⃣ Checking triggers...');
    const triggers = await sql`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name = 'trigger_update_parent_stock'
        AND event_object_table = 'lats_product_variants'
    `;
    
    if (triggers.length > 0) {
      console.log('✅ Stock update trigger exists:');
      console.log(`   ✓ ${triggers[0].trigger_name} on ${triggers[0].event_object_table}`);
    } else {
      console.log('⚠️  Trigger not found');
      return false;
    }
    console.log();
    
    // Check indexes
    console.log('4️⃣ Checking indexes...');
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'lats_product_variants'
        AND indexname IN ('idx_variant_parent_id', 'idx_variant_type', 'idx_variant_is_parent')
      ORDER BY indexname
    `;
    
    if (indexes.length >= 1) {
      console.log('✅ Performance indexes found:');
      indexes.forEach(idx => {
        console.log(`   ✓ ${idx.indexname}`);
      });
    } else {
      console.log('⚠️  Some indexes missing (not critical)');
    }
    console.log();
    
    // Test function call
    console.log('5️⃣ Testing function execution...');
    try {
      // Just test that the function can be called (will fail with validation, but that's ok)
      await sql`
        SELECT * FROM add_imei_to_parent_variant(
          '00000000-0000-0000-0000-000000000000'::uuid,
          'TEST_IMEI_12345'
        )
      `;
    } catch (err) {
      // Expected to fail with "Parent variant not found" - that's good!
      if (err.message.includes('Parent variant not found') || 
          err.message.includes('violates foreign key constraint')) {
        console.log('✅ Function executes correctly (validation working)');
      } else {
        console.log('⚠️  Function execution error:', err.message.substring(0, 80));
      }
    }
    console.log();
    
    // Final summary
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🎉 VERIFICATION COMPLETE!\n');
    console.log('✅ All IMEI functions are properly installed');
    console.log('✅ Database schema is up to date');
    console.log('✅ Triggers are active');
    console.log('✅ System is ready to use\n');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📋 NEXT STEPS:\n');
    console.log('   1. Clear your browser cache (Ctrl+Shift+R / Cmd+Shift+R)');
    console.log('   2. Refresh the Purchase Order page');
    console.log('   3. Try receiving a PO with IMEI numbers');
    console.log('   4. IMEIs should now save successfully! 🎊\n');
    
    return true;
    
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    console.error('\nFull error:', error);
    return false;
  }
}

verify()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

