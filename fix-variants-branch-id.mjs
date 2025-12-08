#!/usr/bin/env node
/**
 * Fix variants with NULL branch_id
 * Updates variants to match their product's branch_id
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixVariantsBranchId() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  🔧 FIXING VARIANTS WITH NULL BRANCH_ID               ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Get all variants with NULL branch_id
    console.log('1️⃣ Finding variants with NULL branch_id...');
    const { data: variants, error: variantsError } = await supabase
      .from('lats_product_variants')
      .select('id, product_id, name, variant_name, branch_id')
      .is('branch_id', null);

    if (variantsError) {
      console.error('❌ Error fetching variants:', variantsError.message);
      return;
    }

    console.log(`   📊 Found ${variants?.length || 0} variants with NULL branch_id\n`);

    if (!variants || variants.length === 0) {
      console.log('✅ All variants already have branch_id!');
      return;
    }

    // 2. Get unique product IDs
    const productIds = [...new Set(variants.map(v => v.product_id))];
    console.log(`2️⃣ Fetching branch_id for ${productIds.length} products...\n`);

    // 3. Get products with their branch_id
    const { data: products, error: productsError } = await supabase
      .from('lats_products')
      .select('id, name, branch_id')
      .in('id', productIds);

    if (productsError) {
      console.error('❌ Error fetching products:', productsError.message);
      return;
    }

    const productBranchMap = new Map();
    products.forEach(p => {
      productBranchMap.set(p.id, p.branch_id);
    });

    // 4. Update variants
    console.log('3️⃣ Updating variants...\n');
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const variant of variants) {
      const productBranchId = productBranchMap.get(variant.product_id);
      
      if (!productBranchId) {
        console.log(`   ⏭️  Skipping variant "${variant.name || variant.variant_name}" - product has no branch_id`);
        skippedCount++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('lats_product_variants')
        .update({ branch_id: productBranchId })
        .eq('id', variant.id);

      if (updateError) {
        console.error(`   ❌ Error updating variant "${variant.name || variant.variant_name}":`, updateError.message);
        errorCount++;
      } else {
        console.log(`   ✅ Updated variant "${variant.name || variant.variant_name}" (branch_id: ${productBranchId})`);
        successCount++;
      }
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  📊 SUMMARY                                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log(`Variants with NULL branch_id: ${variants.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Skipped (product has no branch_id): ${skippedCount}\n`);

    if (successCount > 0) {
      console.log('✅ Variants fixed! Products should now appear in cart.\n');
    }

  } catch (error) {
    console.error('\n❌ Error fixing variants:', error);
    process.exit(1);
  }
}

fixVariantsBranchId().catch(console.error);

