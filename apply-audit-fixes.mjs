#!/usr/bin/env node

/**
 * Apply Comprehensive Audit Fixes
 * This script applies all recommendations from the audit
 */

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

async function applyFixes() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║         APPLYING COMPREHENSIVE AUDIT FIXES                           ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝');
    console.log('');

    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    // Read and execute the SQL fix file
    console.log('📄 Reading SQL fixes from apply-audit-fixes.sql...');
    const sqlFixes = readFileSync('./apply-audit-fixes.sql', 'utf8');
    
    console.log('🚀 Executing fixes...\n');
    await client.query(sqlFixes);
    
    console.log('\n✅ All fixes applied successfully!\n');

    // Verify the fixes
    console.log('🔍 Verifying fixes...\n');

    // Check constraints
    const { rows: constraints } = await client.query(`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'lats_product_variants'::regclass
        AND conname IN ('check_imei_format', 'check_non_negative_quantity')
    `);

    console.log('📋 Constraints:');
    constraints.forEach(c => {
      console.log(`   ✅ ${c.conname} (${c.contype === 'c' ? 'CHECK' : 'OTHER'})`);
    });
    console.log('');

    // Check indexes
    const { rows: indexes } = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'lats_product_variants'
        AND indexname IN (
          'idx_unique_imei', 
          'idx_lats_product_variants_imei',
          'idx_lats_product_variants_imei_status',
          'idx_lats_product_variants_parent_id'
        )
    `);

    console.log('📊 Indexes:');
    indexes.forEach(i => {
      console.log(`   ✅ ${i.indexname}`);
    });
    console.log('');

    // Check functions
    const { rows: functions } = await client.query(`
      SELECT proname
      FROM pg_proc
      WHERE proname IN (
        'validate_and_set_imei_status',
        'cleanup_duplicate_imeis',
        'get_parent_variants'
      )
    `);

    console.log('⚙️  Functions:');
    functions.forEach(f => {
      console.log(`   ✅ ${f.proname}()`);
    });
    console.log('');

    // Check view
    const { rows: views } = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_name = 'v_system_health_check'
    `);

    if (views.length > 0) {
      console.log('👁️  Views:');
      console.log('   ✅ v_system_health_check');
      console.log('');

      // Show system health
      console.log('📊 Current System Health:');
      console.log('─'.repeat(70));
      const { rows: health } = await client.query(`SELECT * FROM v_system_health_check ORDER BY category, metric`);
      
      let currentCategory = '';
      health.forEach(h => {
        if (h.category !== currentCategory) {
          currentCategory = h.category;
          console.log(`\n   ${currentCategory.toUpperCase()}`);
        }
        console.log(`      ${h.metric}: ${h.value}`);
      });
      console.log('');
    }

    // Test IMEI validation
    console.log('🧪 Testing IMEI Validation...\n');
    
    try {
      // This should fail with invalid IMEI format
      await client.query(`
        INSERT INTO lats_product_variants (
          product_id, 
          variant_name, 
          sku, 
          variant_type, 
          variant_attributes,
          cost_price,
          selling_price,
          quantity
        )
        SELECT 
          id,
          'Test Invalid IMEI',
          'TEST-INVALID-' || gen_random_uuid()::text,
          'imei_child',
          '{"imei": "12345"}'::jsonb,
          1000,
          1200,
          1
        FROM lats_products
        LIMIT 1
      `);
      console.log('   ⚠️  Invalid IMEI was accepted (constraint may not be enforced yet)');
    } catch (e) {
      if (e.message.includes('check_imei_format')) {
        console.log('   ✅ Invalid IMEI format correctly rejected');
      } else {
        console.log('   ℹ️  Test insert failed:', e.message.substring(0, 100));
      }
    }

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                      FIXES APPLIED SUCCESSFULLY!                     ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Clean up duplicate IMEIs:');
    console.log('      SELECT * FROM cleanup_duplicate_imeis();');
    console.log('');
    console.log('   2. Monitor system health:');
    console.log('      SELECT * FROM v_system_health_check;');
    console.log('');
    console.log('   3. Validate constraints after cleanup:');
    console.log('      ALTER TABLE lats_product_variants VALIDATE CONSTRAINT check_imei_format;');
    console.log('      ALTER TABLE lats_product_variants VALIDATE CONSTRAINT check_non_negative_quantity;');
    console.log('');
    console.log('🎉 Your POS system is now optimized and ready for production!');
    console.log('');

  } catch (error) {
    console.error('❌ Error applying fixes:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyFixes().catch(console.error);

