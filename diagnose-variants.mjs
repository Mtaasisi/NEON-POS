#!/usr/bin/env node

/**
 * Diagnostic Script: Check Product Variants
 * 
 * This script helps diagnose why variants aren't showing in Special Orders
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Need: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Product Variants Diagnostic Tool\n');
console.log('=' .repeat(60));

async function diagnoseVariants() {
  try {
    // 1. Check total products
    const { data: products, error: productsError } = await supabase
      .from('lats_products')
      .select('id, name, is_active')
      .eq('is_active', true);
    
    if (productsError) throw productsError;
    
    console.log(`\n📦 Total Active Products: ${products.length}`);
    
    // 2. Check total variants
    const { data: allVariants, error: variantsError } = await supabase
      .from('lats_product_variants')
      .select('*');
    
    if (variantsError) throw variantsError;
    
    console.log(`🎨 Total Variants: ${allVariants.length}`);
    
    // 3. Analyze variants
    const parentVariants = allVariants.filter(v => v.is_parent_variant === true);
    const nonParentVariants = allVariants.filter(v => v.is_parent_variant !== true);
    const imeiChildren = allVariants.filter(v => v.parent_variant_id != null);
    const activeVariants = allVariants.filter(v => v.is_active !== false);
    const sellableVariants = allVariants.filter(v => 
      v.is_active !== false && 
      v.is_parent_variant !== true && 
      v.parent_variant_id == null
    );
    
    console.log(`\n📊 Variant Breakdown:`);
    console.log(`   - Parent Variants: ${parentVariants.length}`);
    console.log(`   - Non-Parent Variants: ${nonParentVariants.length}`);
    console.log(`   - IMEI Children: ${imeiChildren.length}`);
    console.log(`   - Active Variants: ${activeVariants.length}`);
    console.log(`   - Sellable Variants: ${sellableVariants.length}`);
    
    // 4. Find products with multiple sellable variants
    const productVariantMap = new Map();
    
    sellableVariants.forEach(variant => {
      if (!productVariantMap.has(variant.product_id)) {
        productVariantMap.set(variant.product_id, []);
      }
      productVariantMap.get(variant.product_id).push(variant);
    });
    
    const productsWithMultipleVariants = Array.from(productVariantMap.entries())
      .filter(([_, variants]) => variants.length > 1);
    
    console.log(`\n✨ Products with Multiple Sellable Variants: ${productsWithMultipleVariants.length}`);
    
    if (productsWithMultipleVariants.length > 0) {
      console.log('\n📋 Top 10 Products with Variants:\n');
      
      for (let i = 0; i < Math.min(10, productsWithMultipleVariants.length); i++) {
        const [productId, variants] = productsWithMultipleVariants[i];
        const product = products.find(p => p.id === productId);
        
        console.log(`${i + 1}. ${product?.name || 'Unknown Product'}`);
        console.log(`   Product ID: ${productId}`);
        console.log(`   Variant Count: ${variants.length}`);
        console.log(`   Variants:`);
        
        variants.forEach((v, idx) => {
          const details = [v.color, v.storage, v.size].filter(Boolean).join(' / ');
          const price = v.selling_price || v.unit_price || 0;
          console.log(`      ${idx + 1}. ${details || v.variant_name || 'No details'}`);
          console.log(`         SKU: ${v.sku || 'N/A'}, Price: ${price.toLocaleString()}, Stock: ${v.stock_quantity || 0}`);
        });
        console.log('');
      }
    } else {
      console.log('\n⚠️  NO PRODUCTS WITH MULTIPLE VARIANTS FOUND!');
      console.log('\n💡 Possible Reasons:');
      console.log('   1. All products have only 1 variant each (will select directly)');
      console.log('   2. All variants are marked as parent variants');
      console.log('   3. All variants have parent_variant_id (IMEI children)');
      console.log('   4. Variants exist but are inactive');
      
      // Show some example variants
      if (allVariants.length > 0) {
        console.log('\n📝 Sample Variants (first 5):');
        allVariants.slice(0, 5).forEach((v, idx) => {
          console.log(`   ${idx + 1}. ID: ${v.id}`);
          console.log(`      Product ID: ${v.product_id}`);
          console.log(`      Name: ${v.variant_name || 'N/A'}`);
          console.log(`      Color: ${v.color || 'N/A'}, Storage: ${v.storage || 'N/A'}, Size: ${v.size || 'N/A'}`);
          console.log(`      is_parent_variant: ${v.is_parent_variant}`);
          console.log(`      parent_variant_id: ${v.parent_variant_id || 'NULL'}`);
          console.log(`      is_active: ${v.is_active}`);
          console.log('');
        });
      }
    }
    
    // 5. Check Supabase query simulation
    console.log('\n🔬 Testing Supabase Query...');
    const { data: testQuery, error: testError } = await supabase
      .from('lats_products')
      .select(`
        *,
        lats_product_variants(
          id,
          variant_name,
          color,
          storage,
          size,
          is_parent_variant,
          parent_variant_id,
          is_active
        )
      `)
      .eq('is_active', true)
      .limit(5);
    
    if (testError) {
      console.error('❌ Query Error:', testError.message);
    } else {
      console.log(`✅ Query successful, returned ${testQuery.length} products`);
      
      testQuery.forEach((p, idx) => {
        const sellable = (p.lats_product_variants || []).filter((v: any) => 
          v.is_active !== false && 
          v.is_parent_variant !== true && 
          v.parent_variant_id == null
        );
        
        if (sellable.length > 1) {
          console.log(`   ${idx + 1}. ${p.name}: ${sellable.length} sellable variants ✅`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Diagnosis Complete!\n');
    
    if (productsWithMultipleVariants.length > 0) {
      console.log('🎉 You have products with variants!');
      console.log(`   Try searching for: "${productsWithMultipleVariants[0][1][0].product_id}" in Special Orders`);
      const product = products.find(p => p.id === productsWithMultipleVariants[0][0]);
      if (product) {
        console.log(`   Product name: "${product.name}"`);
      }
    } else {
      console.log('⚠️  No multi-variant products found.');
      console.log('   You need to create product variants in your database.');
      console.log('\n📚 How to create variants:');
      console.log('   1. Go to your product management page');
      console.log('   2. Edit a product');
      console.log('   3. Add multiple variants (colors, storage options, etc.)');
      console.log('   4. Make sure is_parent_variant is FALSE for sellable variants');
    }
    
  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error.message);
    console.error('   Details:', error);
  }
}

// Run diagnosis
diagnoseVariants();

