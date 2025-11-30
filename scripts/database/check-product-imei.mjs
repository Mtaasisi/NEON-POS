#!/usr/bin/env node

/**
 * Check if a specific product has IMEI variants
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const productSKU = 'SKU-1761224833317-0KI-V01';

async function checkProduct() {
  console.log('🔍 Checking Product: Embe');
  console.log('SKU:', productSKU);
  console.log('='.repeat(60));

  try {
    // Find product by variant SKU
    const { data: variant, error: variantError } = await supabase
      .from('lats_product_variants')
      .select(`
        id,
        variant_name,
        sku,
        quantity,
        selling_price,
        cost_price,
        variant_attributes,
        is_active,
        product:lats_products(
          id,
          name,
          sku,
          stock_quantity
        )
      `)
      .eq('sku', productSKU)
      .single();

    if (variantError || !variant) {
      console.log('\n⚠️  Variant not found with that SKU');
      return;
    }

    console.log('\n📦 PRODUCT INFORMATION:');
    console.log('Product Name:', variant.product?.name || 'N/A');
    console.log('Product ID:', variant.product?.id || 'N/A');
    console.log('Total Stock:', variant.product?.stock_quantity || 0);
    
    console.log('\n📋 VARIANT INFORMATION:');
    console.log('Variant Name:', variant.variant_name);
    console.log('Variant SKU:', variant.sku);
    console.log('Quantity:', variant.quantity);
    console.log('Selling Price:', variant.selling_price);
    console.log('Cost Price:', variant.cost_price);

    // Check if this variant has IMEI
    const hasIMEI = variant.variant_attributes?.imei;
    
    console.log('\n🔍 IMEI CHECK:');
    if (hasIMEI) {
      console.log('✅ This IS an IMEI Variant!');
      console.log('IMEI:', variant.variant_attributes.imei);
      console.log('Serial Number:', variant.variant_attributes.serial_number || 'N/A');
      console.log('Condition:', variant.variant_attributes.condition || 'N/A');
      console.log('Source:', variant.variant_attributes.source || 'N/A');
    } else {
      console.log('❌ This is NOT an IMEI Variant');
      console.log('This is a regular product variant');
    }

    // Check all variants for this product
    const productId = variant.product?.id;
    if (productId) {
      const { data: allVariants, error: allError } = await supabase
        .from('lats_product_variants')
        .select('id, variant_name, quantity, variant_attributes')
        .eq('product_id', productId)
        .eq('is_active', true);

      if (!allError && allVariants) {
        console.log('\n📊 ALL VARIANTS FOR THIS PRODUCT:');
        console.log(`Total variants: ${allVariants.length}`);
        
        const imeiVariants = allVariants.filter(v => v.variant_attributes?.imei);
        const regularVariants = allVariants.filter(v => !v.variant_attributes?.imei);
        
        console.log(`├─ IMEI Variants: ${imeiVariants.length}`);
        console.log(`└─ Regular Variants: ${regularVariants.length}`);

        if (imeiVariants.length > 0) {
          console.log('\n📱 IMEI VARIANTS:');
          imeiVariants.forEach((v, i) => {
            console.log(`  ${i + 1}. ${v.variant_name}`);
            console.log(`     IMEI: ${v.variant_attributes?.imei}`);
            console.log(`     Qty: ${v.quantity}`);
          });
        }

        if (regularVariants.length > 0) {
          console.log('\n📦 REGULAR VARIANTS:');
          regularVariants.forEach((v, i) => {
            console.log(`  ${i + 1}. ${v.variant_name}`);
            console.log(`     Qty: ${v.quantity}`);
          });
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkProduct();

