#!/usr/bin/env node
/**
 * Clean up references to a specific variant before deletion
 * Target variant ID: 0c7add79-5355-433a-8d17-e40763a5389c
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.VITE_DATABASE_URL ||
                    process.env.DATABASE_URL ||
                    'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const TARGET_VARIANT_ID = '0c7add79-5355-433a-8d17-e40763a5389c';

console.log(`🔍 Checking references to variant ${TARGET_VARIANT_ID}...\n`);

async function cleanupVariantReferences() {
  const sql = neon(DATABASE_URL);

  try {
    // Define all tables that reference variants
    const referenceTables = [
      { table: 'auto_reorder_log', column: 'variant_id' },
      { table: 'branch_transfers', column: 'entity_id' },
      { table: 'inventory_items', column: 'variant_id' },
      { table: 'lats_inventory_adjustments', column: 'variant_id' },
      { table: 'lats_inventory_items', column: 'variant_id' },
      { table: 'lats_product_units', column: 'parent_variant_id' },
      { table: 'lats_product_variants', column: 'parent_variant_id' },
      { table: 'lats_purchase_order_items', column: 'variant_id' },
      { table: 'lats_stock_movements', column: 'variant_id' },
      { table: 'lats_trade_in_prices', column: 'variant_id' },
      { table: 'lats_trade_in_transactions', column: 'new_variant_id' },
      { table: 'lats_stock_transfers', column: 'variant_id' },
      { table: 'variant_images', column: 'variant_id' },
      { table: 'returns', column: 'variant_id' }
    ];

    console.log('📊 Checking all reference tables...\n');

    let hasReferences = false;

    for (const { table, column } of referenceTables) {
      try {
        const query = `SELECT COUNT(*) as count FROM "${table}" WHERE "${column}" = '${TARGET_VARIANT_ID}'`;
        const result = await sql.query(query);

        const count = parseInt(result[0].count);
        if (count > 0) {
          console.log(`⚠️  ${table}: ${count} reference(s) found (column: ${column})`);
          hasReferences = true;

          // Show sample rows
          const sampleQuery = `SELECT * FROM "${table}" WHERE "${column}" = '${TARGET_VARIANT_ID}' LIMIT 3`;
          const samples = await sql.query(sampleQuery);
          console.log('   Sample rows:', JSON.stringify(samples, null, 2));
          console.log('');
        } else {
          console.log(`✅ ${table}: No references found`);
        }
      } catch (error) {
        console.log(`❌ ${table}: Error checking (${error.message})`);
      }
    }

    if (!hasReferences) {
      console.log('\n🎉 No references found! Variant can be safely deleted.');
      return;
    }

    console.log('\n🛠️  Remediation Options:');
    console.log('='.repeat(60));

    console.log('OPTION 1: DELETE referencing rows (if safe to remove):');
    console.log('```sql');
    console.log('BEGIN;');

    for (const { table, column } of referenceTables) {
      console.log(`DELETE FROM "${table}" WHERE "${column}" = '${TARGET_VARIANT_ID}';`);
    }

    console.log(`DELETE FROM lats_product_variants WHERE id = '${TARGET_VARIANT_ID}';`);
    console.log('COMMIT;');
    console.log('```');

    console.log('\nOPTION 2: UPDATE references to another variant ID (replace NEW_VARIANT_ID):');
    console.log('```sql');
    console.log('BEGIN;');

    for (const { table, column } of referenceTables) {
      console.log(`UPDATE "${table}" SET "${column}" = 'NEW_VARIANT_ID' WHERE "${column}" = '${TARGET_VARIANT_ID}';`);
    }

    console.log(`DELETE FROM lats_product_variants WHERE id = '${TARGET_VARIANT_ID}';`);
    console.log('COMMIT;');
    console.log('```');

    console.log('\n⚠️  WARNING: Choose the appropriate option based on your business rules!');
    console.log('   - Option 1: Removes historical data (good for cleanup)');
    console.log('   - Option 2: Preserves relationships (good for data integrity)');

  } catch (error) {
    console.error('❌ Error during cleanup check:', error);
  }
}

cleanupVariantReferences();
