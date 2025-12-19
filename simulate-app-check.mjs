#!/usr/bin/env node
/**
 * Simulate exactly what the app is doing to check for references
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TARGET_VARIANT_IDS = [
  '2fb93225-c882-4dd1-a53a-d9892486c72d',
  '1d17c854-bb58-4975-bc7b-4def1fc3b990',
  '8918501c-78ce-46a8-8cec-12d9a08ce021'
];

console.log(`🔍 Simulating app reference checks using Supabase client...\n`);

async function simulateAppChecks() {
  try {
    for (const variantId of TARGET_VARIANT_IDS) {
      console.log(`🔍 Checking variant: ${variantId}`);

      // Simulate the exact column discovery logic from the app
      const { data: cols, error: colsError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'branch_transfers');

      if (colsError) {
        console.error('❌ Failed to fetch branch_transfers columns:', colsError);
      } else {
        const existingColumns = (cols || []).map((c) => (c && c.column_name ? String(c.column_name) : '')).filter(Boolean);
        const candidateColumns = [
          'entity',
          'entity_id',
          'variant_id',
          'source_entity',
          'reference_id',
          'reference',
          'item_id',
          'entity_uuid'
        ];

        const foundCol = candidateColumns.find(c => existingColumns.includes(c));
        console.log(`   Found reference column: ${foundCol}`);

        if (foundCol) {
          // Simulate the exact query the app does
          const { data: branchTransfers, error: branchTransfersError } = await supabase
            .from('branch_transfers')
            .select('id')
            .eq(foundCol, variantId)
            .limit(1);

          if (branchTransfersError) {
            console.error('❌ Branch transfers check error:', branchTransfersError);
          } else {
            console.log(`   Branch transfers result: ${branchTransfers ? branchTransfers.length : 0} references found`);
            if (branchTransfers && branchTransfers.length > 0) {
              console.log(`   ⚠️  APP WOULD REPORT: Cannot delete variant ${variantId}: referenced by branch_transfers`);
            } else {
              console.log(`   ✅ APP WOULD ALLOW: No branch_transfers references found`);
            }
          }
        }
      }

      // Check other tables
      const referenceChecks = [
        { table: 'auto_reorder_log', column: 'variant_id' },
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

      for (const { table, column } of referenceChecks) {
        const { data: references, error: refCheckError } = await supabase
          .from(table)
          .select('id')
          .eq(column, variantId)
          .limit(1);

        if (refCheckError) {
          console.log(`   ❌ ${table}: Error - ${refCheckError.message}`);
        } else if (references && references.length > 0) {
          console.log(`   ⚠️  ${table}: ${references.length} references found - APP WOULD BLOCK DELETION`);
        } else {
          console.log(`   ✅ ${table}: No references`);
        }
      }

      console.log('');
    }

  } catch (error) {
    console.error('❌ Error during simulation:', error);
  }
}

simulateAppChecks();
