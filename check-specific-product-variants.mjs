#!/usr/bin/env node
/**
 * Check specific product variants
 * Check the Vizio SB2021-J6 product
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProductVariants() {
  const productId = 'b439b35c-92b7-4c7b-b661-28cc19d1f43d'; // Vizio SB2021-J6
  
  console.log('\n🔍 Checking product variants...\n');

  // Get product
  const { data: product, error: productError } = await supabase
    .from('lats_products')
    .select('*')
    .eq('id', productId)
    .single();

  if (productError) {
    console.error('❌ Error fetching product:', productError.message);
    return;
  }

  console.log(`Product: ${product.name}`);
  console.log(`ID: ${product.id}\n`);

  // Get ALL variants (including inactive)
  const { data: allVariants, error: allError } = await supabase
    .from('lats_product_variants')
    .select('*')
    .eq('product_id', productId);

  if (allError) {
    console.error('❌ Error fetching variants:', allError.message);
    return;
  }

  console.log(`Total variants (all): ${allVariants?.length || 0}`);

  // Get active variants only
  const { data: activeVariants, error: activeError } = await supabase
    .from('lats_product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true);

  if (activeError) {
    console.error('❌ Error fetching active variants:', activeError.message);
    return;
  }

  console.log(`Active variants: ${activeVariants?.length || 0}`);

  // Get parent variants only
  const { data: parentVariants, error: parentError } = await supabase
    .from('lats_product_variants')
    .select('*')
    .eq('product_id', productId)
    .is('parent_variant_id', null);

  if (parentError) {
    console.error('❌ Error fetching parent variants:', parentError.message);
    return;
  }

  console.log(`Parent variants: ${parentVariants?.length || 0}`);

  // Get active parent variants
  const { data: activeParentVariants, error: activeParentError } = await supabase
    .from('lats_product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .is('parent_variant_id', null);

  if (activeParentError) {
    console.error('❌ Error fetching active parent variants:', activeParentError.message);
    return;
  }

  console.log(`Active parent variants: ${activeParentVariants?.length || 0}\n`);

  if (allVariants && allVariants.length > 0) {
    console.log('📋 All variants:');
    allVariants.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.name || v.variant_name || 'Unnamed'} (ID: ${v.id})`);
      console.log(`      Active: ${v.is_active}, Parent: ${v.parent_variant_id || 'None'}`);
      console.log(`      Quantity: ${v.quantity || 0}, Price: ${v.selling_price || 0}`);
    });
  }

  // If no active parent variants, create one
  if (activeParentVariants?.length === 0) {
    console.log('\n⚠️  No active parent variants found!');
    console.log('Creating default variant...\n');

    const variantSku = product.sku 
      ? `${product.sku}-DEFAULT`
      : `SKU-${product.id.substring(0, 8)}-DEFAULT`;

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
      console.error('❌ Error creating variant:', createError.message);
    } else {
      console.log(`✅ Created default variant (ID: ${newVariant.id})`);
      console.log('   Product can now be added to cart!');
    }
  } else {
    console.log('\n✅ Product has active variants!');
  }
}

checkProductVariants().catch(console.error);

