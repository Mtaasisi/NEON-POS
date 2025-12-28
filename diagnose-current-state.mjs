#!/usr/bin/env node
/**
 * Diagnose the current state of the variants and their references
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.VITE_DATABASE_URL ||
                    process.env.DATABASE_URL ||
                    'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const TARGET_VARIANT_IDS = [
  '2fb93225-c882-4dd1-a53a-d9892486c72d',
  '1d17c854-bb58-4975-bc7b-4def1fc3b990',
  '8918501c-78ce-46a8-8cec-12d9a08ce021'
];

console.log(`🔍 Diagnosing current state of variants...\n`);

async function diagnoseState() {
  const sql = neon(DATABASE_URL);

  try {
    console.log('📊 Checking if variants still exist...');

    for (const variantId of TARGET_VARIANT_IDS) {
      const variantQuery = `SELECT id, sku, variant_name, is_active FROM lats_product_variants WHERE id = '${variantId}'`;
      const variantResult = await sql.query(variantQuery);

      if (variantResult.length > 0) {
        const variant = variantResult[0];
        console.log(`✅ Variant ${variantId} exists:`);
        console.log(`   SKU: ${variant.sku}`);
        console.log(`   Name: ${variant.variant_name}`);
        console.log(`   Active: ${variant.is_active}`);

        // Check branch_transfers references
        const btQuery = `SELECT id, status, entity_id FROM branch_transfers WHERE entity_id = '${variantId}'`;
        const btResult = await sql.query(btQuery);

        if (btResult.length > 0) {
          console.log(`   ⚠️  Has ${btResult.length} branch transfer reference(s):`);
          btResult.forEach((bt, idx) => {
            console.log(`      ${idx + 1}. ID: ${bt.id}, Status: ${bt.status}`);
          });
        } else {
          console.log(`   ✅ No branch transfer references found`);
        }

        // Check other potential references
        const referenceTables = [
          { table: 'lats_stock_movements', column: 'variant_id' },
          { table: 'lats_purchase_order_items', column: 'variant_id' },
          { table: 'lats_sale_items', column: 'variant_id' }
        ];

        for (const { table, column } of referenceTables) {
          const refQuery = `SELECT COUNT(*) as count FROM "${table}" WHERE "${column}" = '${variantId}'`;
          const refResult = await sql.query(refQuery);
          const count = parseInt(refResult[0].count);
          if (count > 0) {
            console.log(`   ⚠️  Has ${count} reference(s) in ${table}`);
          }
        }

      } else {
        console.log(`❌ Variant ${variantId} does not exist in database`);
      }

      console.log('');
    }

    console.log('🔍 Checking for any remaining branch_transfers references...');
    const allBtQuery = `SELECT entity_id, COUNT(*) as count FROM branch_transfers WHERE entity_id IN ('${TARGET_VARIANT_IDS.join("','")}') GROUP BY entity_id`;
    const allBtResult = await sql.query(allBtQuery);

    if (allBtResult.length > 0) {
      console.log('⚠️  Found remaining references:');
      allBtResult.forEach(row => {
        console.log(`   ${row.entity_id}: ${row.count} reference(s)`);
      });
    } else {
      console.log('✅ No branch_transfers references found for target variants');
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }
}

diagnoseState();
