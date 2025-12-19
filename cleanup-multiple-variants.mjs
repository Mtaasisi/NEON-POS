#!/usr/bin/env node
/**
 * Clean up references for multiple variants that are preventing product update
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.VITE_DATABASE_URL ||
                    process.env.DATABASE_URL ||
                    'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const TARGET_VARIANT_IDS = [
  '2fb93225-c882-4dd1-a53a-d9892486c72d',
  '1d17c854-bb58-4975-bc7b-4def1fc3b990',
  '8918501c-78ce-46a8-8cec-12d9a08ce021'
];

console.log(`🔍 Checking references for ${TARGET_VARIANT_IDS.length} variants...\n`);

async function cleanupMultipleVariants() {
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

    console.log('📊 Checking references for each variant...\n');

    let totalReferences = 0;

    for (const variantId of TARGET_VARIANT_IDS) {
      console.log(`🔍 Variant: ${variantId}`);
      let variantHasReferences = false;

      for (const { table, column } of referenceTables) {
        try {
          const query = `SELECT COUNT(*) as count FROM "${table}" WHERE "${column}" = '${variantId}'`;
          const result = await sql.query(query);

          const count = parseInt(result[0].count);
          if (count > 0) {
            console.log(`   ⚠️  ${table}: ${count} reference(s)`);
            variantHasReferences = true;
            totalReferences += count;

            // Show sample rows for branch_transfers
            if (table === 'branch_transfers') {
              const sampleQuery = `SELECT id, status, quantity, notes FROM "${table}" WHERE "${column}" = '${variantId}' LIMIT 3`;
              const samples = await sql.query(sampleQuery);
              samples.forEach((sample, idx) => {
                console.log(`      ${idx + 1}. Status: ${sample.status}, Quantity: ${sample.quantity}`);
              });
            }
          }
        } catch (error) {
          console.log(`   ❌ ${table}: Error checking (${error.message})`);
        }
      }

      if (!variantHasReferences) {
        console.log(`   ✅ No references found`);
      }
      console.log('');
    }

    if (totalReferences === 0) {
      console.log('🎉 No references found for any variants! They should be deletable.');
      return;
    }

    console.log(`📊 Total references found: ${totalReferences}\n`);

    // Perform cleanup
    console.log('🛠️  Performing cleanup...');
    await sql.query('BEGIN');

    try {
      let totalDeleted = 0;

      for (const variantId of TARGET_VARIANT_IDS) {
        for (const { table, column } of referenceTables) {
          const deleteQuery = `DELETE FROM "${table}" WHERE "${column}" = '${variantId}'`;
          const deleteResult = await sql.query(deleteQuery);
          if (deleteResult.rowCount > 0) {
            console.log(`✅ Deleted ${deleteResult.rowCount} reference(s) from ${table} for variant ${variantId}`);
            totalDeleted += deleteResult.rowCount;
          }
        }
      }

      console.log(`\n✅ Cleanup completed! Removed ${totalDeleted} total references.`);
      console.log('The variants should now be deletable.');

      await sql.query('COMMIT');
      console.log('✅ Transaction committed successfully!');

    } catch (error) {
      await sql.query('ROLLBACK');
      console.error('❌ Error during cleanup, transaction rolled back:', error);
      throw error;
    }

    console.log('\n🎉 All variants should now be deletable! Try the product update again.');

  } catch (error) {
    console.error('❌ Error during cleanup check:', error);
  }
}

cleanupMultipleVariants();
