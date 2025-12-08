#!/usr/bin/env node
/**
 * Fix products without variants
 * Creates default variants for products that don't have any variants
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Use production Supabase connection
const supabaseUrl = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProductsWithoutVariants() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  🔧 FIXING PRODUCTS WITHOUT VARIANTS                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Get all products
    console.log('1️⃣ Getting all products...');
    const { data: products, error: productsError } = await supabase
      .from('lats_products')
      .select('id, name, sku, cost_price, selling_price, stock_quantity, min_stock_level, branch_id')
      .eq('is_active', true);

    if (productsError) {
      console.error('❌ Error fetching products:', productsError.message);
      return;
    }

    console.log(`   ✅ Found ${products?.length || 0} active products\n`);

    if (!products || products.length === 0) {
      console.log('⚠️  No products found');
      return;
    }

    // 2. Check which products have variants
    console.log('2️⃣ Checking for products without variants...');
    const productsWithoutVariants = [];

    for (const product of products) {
      const { count, error: variantError } = await supabase
        .from('lats_product_variants')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', product.id)
        .is('parent_variant_id', null); // Only check parent variants

      if (variantError) {
        console.warn(`   ⚠️  Error checking variants for ${product.name}:`, variantError.message);
        continue;
      }

      if (count === 0) {
        productsWithoutVariants.push(product);
      }
    }

    console.log(`   📊 Found ${productsWithoutVariants.length} products without variants\n`);

    if (productsWithoutVariants.length === 0) {
      console.log('✅ All products already have variants!');
      return;
    }

    // 3. Create default variants
    console.log('3️⃣ Creating default variants...\n');
    let successCount = 0;
    let errorCount = 0;

    for (const product of productsWithoutVariants) {
      try {
        // Generate SKU for variant
        const variantSku = product.sku 
          ? `${product.sku}-DEFAULT`
          : `SKU-${product.id.substring(0, 8)}-DEFAULT`;

        // Create default variant
        const { data: newVariant, error: createError } = await supabase
          .from('lats_product_variants')
          .insert({
            product_id: product.id,
            name: 'Default',
            variant_name: 'Default',
            sku: variantSku,
            cost_price: product.cost_price || 0,
            selling_price: product.selling_price || 0,
            unit_price: product.selling_price || 0,
            quantity: product.stock_quantity || 0,
            min_quantity: product.min_stock_level || 0,
            branch_id: product.branch_id,
            is_active: true,
            variant_attributes: {
              auto_created: true,
              created_at: new Date().toISOString(),
              created_from: 'fix_script'
            },
            attributes: {}
          })
          .select('id')
          .single();

        if (createError) {
          console.error(`   ❌ Error creating variant for "${product.name}":`, createError.message);
          errorCount++;
        } else {
          console.log(`   ✅ Created default variant for "${product.name}" (ID: ${newVariant.id})`);
          successCount++;
        }
      } catch (error) {
        console.error(`   ❌ Exception creating variant for "${product.name}":`, error.message);
        errorCount++;
      }
    }

    // 4. Verify
    console.log('\n4️⃣ Verifying the fix...');
    let stillMissing = 0;
    for (const product of productsWithoutVariants) {
      const { count, error } = await supabase
        .from('lats_product_variants')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', product.id)
        .is('parent_variant_id', null);

      if (!error && count === 0) {
        stillMissing++;
      }
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  📊 SUMMARY                                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log(`Products checked: ${products.length}`);
    console.log(`Products without variants: ${productsWithoutVariants.length}`);
    console.log(`Variants created successfully: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Products still missing variants: ${stillMissing}\n`);

    if (successCount > 0) {
      console.log('✅ Successfully created default variants!');
      console.log('   Products can now be added to cart.\n');
    }

    if (stillMissing > 0) {
      console.log('⚠️  Some products still need manual variant creation.');
    }

  } catch (error) {
    console.error('\n❌ Error fixing products:', error);
    process.exit(1);
  }
}

fixProductsWithoutVariants().catch(console.error);

