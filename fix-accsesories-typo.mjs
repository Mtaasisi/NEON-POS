#!/usr/bin/env node

/**
 * Fix Accsesories Typo
 * 
 * This script finds all products with the typo "Accsesories" category
 * and replaces them with the correct "Accessories" category.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.production') });

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ Error: SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Fix products with Accsesories typo
 */
async function fixAccsesoriesTypo(dryRun = true) {
  console.log('🔍 Finding products with "Accsesories" typo...\n');
  
  try {
    // Get the correct Accessories category
    const { data: accessoriesCategory, error: catError } = await supabase
      .from('lats_categories')
      .select('id, name')
      .eq('name', 'Accessories')
      .maybeSingle();
    
    if (catError) {
      console.error('❌ Error fetching Accessories category:', catError);
      process.exit(1);
    }
    
    if (!accessoriesCategory) {
      console.error('❌ Accessories category not found!');
      process.exit(1);
    }
    
    console.log(`✅ Found correct category: "${accessoriesCategory.name}" (ID: ${accessoriesCategory.id})\n`);
    
    // Find products with "Accsesories" in category field
    const { data: productsWithTypo, error: productsError } = await supabase
      .from('lats_products')
      .select('id, name, category, category_id')
      .ilike('category', '%Accsesories%');
    
    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      process.exit(1);
    }
    
    // Also check if there's a typo category still in the database
    const { data: typoCategory } = await supabase
      .from('lats_categories')
      .select('id, name')
      .eq('name', 'Accsesories')
      .maybeSingle();
    
    let productsWithTypoId = [];
    if (typoCategory) {
      console.log(`⚠️  Found typo category "Accsesories" in database (ID: ${typoCategory.id})`);
      const { data: products } = await supabase
        .from('lats_products')
        .select('id, name, category, category_id')
        .eq('category_id', typoCategory.id);
      
      productsWithTypoId = products || [];
      console.log(`   Products using typo category_id: ${productsWithTypoId.length}\n`);
    }
    
    // Combine all products that need fixing
    const allProductsToFix = [
      ...(productsWithTypo || []),
      ...productsWithTypoId.filter(p => !productsWithTypo?.find(p2 => p2.id === p.id))
    ];
    
    // Remove duplicates
    const uniqueProducts = Array.from(
      new Map(allProductsToFix.map(p => [p.id, p])).values()
    );
    
    console.log('📊 Analysis Results:\n');
    console.log(`  - Products with "Accsesories" in category field: ${productsWithTypo?.length || 0}`);
    console.log(`  - Products with typo category_id: ${productsWithTypoId.length}`);
    console.log(`  - Total products to fix: ${uniqueProducts.length}\n`);
    
    if (uniqueProducts.length === 0) {
      console.log('✅ No products with "Accsesories" typo found!');
      return;
    }
    
    // Show examples
    console.log('📋 Examples of products to fix (first 10):\n');
    uniqueProducts.slice(0, 10).forEach((product, idx) => {
      const hasTypoInField = product.category && product.category.includes('Accsesories');
      const hasTypoId = typoCategory && product.category_id === typoCategory.id;
      
      console.log(`  ${idx + 1}. "${product.name}"`);
      console.log(`     Current category: "${product.category || 'N/A'}"`);
      console.log(`     Current category_id: ${product.category_id || 'N/A'}`);
      console.log(`     Issue: ${hasTypoInField ? 'Typo in category field' : hasTypoId ? 'Typo category_id' : 'Unknown'}`);
      console.log(`     Will update to: "Accessories" (ID: ${accessoriesCategory.id})`);
      console.log('');
    });
    
    if (uniqueProducts.length > 10) {
      console.log(`  ... and ${uniqueProducts.length - 10} more\n`);
    }
    
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No products will be updated');
      console.log(`\nTo actually fix these ${uniqueProducts.length} products, run:`);
      console.log(`  node fix-accsesories-typo.mjs --fix\n`);
      return;
    }
    
    console.log(`\n🔄 Fixing ${uniqueProducts.length} products...\n`);
    
    let updated = 0;
    let errors = 0;
    
    for (const product of uniqueProducts) {
      const updateData = {
        category_id: accessoriesCategory.id,
        category: 'Accessories',
        updated_at: new Date().toISOString(),
      };
      
      const { error: updateError } = await supabase
        .from('lats_products')
        .update(updateData)
        .eq('id', product.id);
      
      if (updateError) {
        console.error(`  ❌ Error updating product "${product.name}":`, updateError.message);
        errors++;
      } else {
        updated++;
        if (updated % 10 === 0) {
          process.stdout.write(`  ✓ Updated ${updated}/${uniqueProducts.length} products...\r`);
        }
      }
    }
    
    console.log(`\n\n✅ Fix completed!`);
    console.log(`   - Updated: ${updated} products`);
    console.log(`   - Errors: ${errors} products`);
    
    // Verify fix
    console.log('\n🔍 Verifying fix...');
    const { data: remainingProducts } = await supabase
      .from('lats_products')
      .select('id')
      .ilike('category', '%Accsesories%');
    
    if (remainingProducts && remainingProducts.length === 0) {
      console.log('✅ All products have been fixed! No more "Accsesories" typo found.');
    } else {
      console.log(`⚠️  Warning: ${remainingProducts?.length || 0} products still have "Accsesories" typo`);
    }
    
    // Show final count
    const { count } = await supabase
      .from('lats_products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', accessoriesCategory.id);
    
    console.log(`\n✅ "Accessories" category now has ${count} products`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const shouldFix = args.includes('--fix') || args.includes('-f');

// Run the script
fixAccsesoriesTypo(!shouldFix)
  .then(() => {
    console.log('\n✅ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
