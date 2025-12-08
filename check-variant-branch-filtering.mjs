#!/usr/bin/env node
/**
 * Check if variant is being filtered out by branch isolation
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVariantBranchFiltering() {
  const productId = 'b439b35c-92b7-4c7b-b661-28cc19d1f43d';
  const variantId = '4e74f05f-1b0b-4314-9fd2-3af32a705093';
  
  console.log('\n🔍 Checking variant branch filtering...\n');

  // Get variant details
  const { data: variant, error: variantError } = await supabase
    .from('lats_product_variants')
    .select('*')
    .eq('id', variantId)
    .single();

  if (variantError) {
    console.error('❌ Error fetching variant:', variantError.message);
    return;
  }

  console.log('Variant Details:');
  console.log(`  ID: ${variant.id}`);
  console.log(`  Name: ${variant.name || variant.variant_name}`);
  console.log(`  Product ID: ${variant.product_id}`);
  console.log(`  Branch ID: ${variant.branch_id || 'NULL'}`);
  console.log(`  Is Shared: ${variant.is_shared || false}`);
  console.log(`  Is Active: ${variant.is_active}`);
  console.log(`  Parent Variant ID: ${variant.parent_variant_id || 'NULL'}\n`);

  // Get product details
  const { data: product, error: productError } = await supabase
    .from('lats_products')
    .select('id, name, branch_id, is_shared')
    .eq('id', productId)
    .single();

  if (productError) {
    console.error('❌ Error fetching product:', productError.message);
    return;
  }

  console.log('Product Details:');
  console.log(`  ID: ${product.id}`);
  console.log(`  Name: ${product.name}`);
  console.log(`  Branch ID: ${product.branch_id || 'NULL'}`);
  console.log(`  Is Shared: ${product.is_shared || false}\n`);

  // Get branch settings
  const branchId = '24cd45b8-1ce1-486a-b055-29d169c3a8ea'; // Main Branch
  const { data: branchSettings, error: branchError } = await supabase
    .from('store_locations')
    .select('id, name, data_isolation_mode, share_products, share_inventory')
    .eq('id', branchId)
    .single();

  if (branchError) {
    console.error('❌ Error fetching branch settings:', branchError.message);
    return;
  }

  console.log('Branch Settings:');
  console.log(`  ID: ${branchSettings.id}`);
  console.log(`  Name: ${branchSettings.name}`);
  console.log(`  Isolation Mode: ${branchSettings.data_isolation_mode}`);
  console.log(`  Share Products: ${branchSettings.share_products || false}`);
  console.log(`  Share Inventory: ${branchSettings.share_inventory || false}\n`);

  // Test the query that frontend uses
  console.log('Testing frontend query...');
  const { data: frontendVariants, error: frontendError } = await supabase
    .from('lats_product_variants')
    .select('*')
    .eq('product_id', productId)
    .is('parent_variant_id', null)
    .eq('is_active', true);

  if (frontendError) {
    console.error('❌ Frontend query error:', frontendError.message);
  } else {
    console.log(`✅ Frontend query found ${frontendVariants?.length || 0} variants`);
    if (frontendVariants && frontendVariants.length > 0) {
      frontendVariants.forEach(v => {
        console.log(`  - ${v.name || v.variant_name} (branch_id: ${v.branch_id || 'NULL'})`);
      });
    }
  }

  // Test with branch filtering (isolated mode)
  console.log('\nTesting with branch filtering (isolated mode)...');
  const { data: isolatedVariants, error: isolatedError } = await supabase
    .from('lats_product_variants')
    .select('*')
    .eq('product_id', productId)
    .is('parent_variant_id', null)
    .eq('is_active', true)
    .eq('branch_id', branchId);

  if (isolatedError) {
    console.error('❌ Isolated query error:', isolatedError.message);
  } else {
    console.log(`✅ Isolated query found ${isolatedVariants?.length || 0} variants`);
  }

  // Check if variant branch_id matches product branch_id
  if (variant.branch_id !== product.branch_id) {
    console.log('\n⚠️  WARNING: Variant branch_id does not match product branch_id!');
    console.log(`   Product branch_id: ${product.branch_id}`);
    console.log(`   Variant branch_id: ${variant.branch_id}`);
    console.log('\n   Fixing variant branch_id to match product...');
    
    const { error: updateError } = await supabase
      .from('lats_product_variants')
      .update({ branch_id: product.branch_id })
      .eq('id', variantId);

    if (updateError) {
      console.error('❌ Error updating variant:', updateError.message);
    } else {
      console.log('✅ Variant branch_id updated!');
    }
  } else {
    console.log('\n✅ Variant branch_id matches product branch_id');
  }
}

checkVariantBranchFiltering().catch(console.error);

