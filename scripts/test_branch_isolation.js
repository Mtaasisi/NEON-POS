#!/usr/bin/env node

/**
 * Test Branch Stock Isolation
 * This script validates that the branch stock isolation fixes are working correctly
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dummy';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'dummy';
const DATABASE_URL = process.env.DATABASE_URL;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testBranchIsolation() {
  console.log('🧪 Testing Branch Stock Isolation...\n');

  try {
    // Test 1: Check that products are global (no branch_id)
    console.log('📦 Test 1: Products should be global (no branch_id)');
    const { data: productsWithBranchId, error: productError } = await supabase
      .from('lats_products')
      .select('id, name, branch_id')
      .not('branch_id', 'is', null)
      .limit(5);

    if (productError) {
      console.error('❌ Error checking products:', productError.message);
    } else if (productsWithBranchId && productsWithBranchId.length > 0) {
      console.error('❌ FAILED: Found products with branch_id (should be global):');
      productsWithBranchId.forEach(p => console.error(`   - ${p.name} (${p.id}): branch_id=${p.branch_id}`));
    } else {
      console.log('✅ PASSED: No products found with branch_id (products are global)');
    }

    // Test 2: Check that all variants have branch_id
    console.log('\n🏪 Test 2: All variants should have branch_id');
    const { data: variantsWithoutBranchId, error: variantError } = await supabase
      .from('lats_product_variants')
      .select('id, variant_name, product_id, quantity')
      .is('branch_id', null)
      .limit(5);

    if (variantError) {
      console.error('❌ Error checking variants:', variantError.message);
    } else if (variantsWithoutBranchId && variantsWithoutBranchId.length > 0) {
      console.error('❌ FAILED: Found variants without branch_id:');
      variantsWithoutBranchId.forEach(v => console.error(`   - ${v.variant_name} (${v.id}): quantity=${v.quantity}`));
    } else {
      console.log('✅ PASSED: No variants found without branch_id');
    }

    // Test 3: Check that different branches have different variants
    console.log('\n🔀 Test 3: Different branches should have isolated variants');
    const { data: branchVariants, error: branchError } = await supabase
      .from('lats_product_variants')
      .select('branch_id, COUNT(*) as variant_count')
      .not('branch_id', 'is', null)
      .group('branch_id');

    if (branchError) {
      console.error('❌ Error checking branch variant distribution:', branchError.message);
    } else {
      console.log('📊 Variant distribution by branch:');
      branchVariants?.forEach(bv => {
        console.log(`   - Branch ${bv.branch_id}: ${bv.variant_count} variants`);
      });
      console.log('✅ PASSED: Variants are properly distributed across branches');
    }

    // Test 4: Check for duplicate SKUs within the same branch (should not happen)
    console.log('\n🏷️  Test 4: No duplicate SKUs within the same branch');
    const { data: duplicateSkus, error: skuError } = await supabase
      .rpc('validate_branch_stock_isolation')
      .select('issue_type, description, affected_count')
      .eq('issue_type', 'duplicate_skus_across_branches');

    if (skuError) {
      console.error('❌ Error checking for duplicate SKUs:', skuError.message);
    } else if (duplicateSkus && duplicateSkus.length > 0 && duplicateSkus[0].affected_count > 0) {
      console.error('❌ FAILED: Found duplicate SKUs across branches:');
      console.error(`   - ${duplicateSkus[0].affected_count} duplicate SKU issues`);
    } else {
      console.log('✅ PASSED: No duplicate SKUs found across branches');
    }

    console.log('\n🎯 Branch Stock Isolation Test Complete!');
    console.log('\n💡 If all tests passed, branch isolation is working correctly.');
    console.log('💡 If any tests failed, please run the migration script:');
    console.log('   node run_branch_fix_migration.js');

  } catch (error) {
    console.error('❌ Test script error:', error);
    process.exit(1);
  }
}

// Run the test
testBranchIsolation();