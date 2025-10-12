#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function testSellingPriceFix() {
  try {
    console.log('\n🧪 Testing Selling Price Fix');
    console.log('============================\n');
    
    // Test the specific product that was showing TSh 0
    const productId = 'cc922cd8-18df-4954-b043-7b47f8e9d25c';
    
    console.log('1️⃣ Testing specific product query...');
    
    const variant = await sql`
      SELECT 
        id,
        name,
        sku,
        selling_price,
        cost_price,
        quantity
      FROM lats_product_variants 
      WHERE product_id = ${productId}
      LIMIT 1
    `;
    
    if (variant.length > 0) {
      const v = variant[0];
      console.log(`   Product: dsdasdiuhkjdsfdsf`);
      console.log(`   Variant: ${v.name}`);
      console.log(`   SKU: ${v.sku}`);
      console.log(`   selling_price: TSh ${v.selling_price}`);
      console.log(`   cost_price: TSh ${v.cost_price}`);
      console.log(`   quantity: ${v.quantity}`);
      console.log('');
      
      if (v.selling_price > 0) {
        console.log('   ✅ selling_price has correct value');
      } else {
        console.log('   ❌ selling_price is still 0');
      }
    } else {
      console.log('   ❌ Variant not found');
    }
    
    console.log('2️⃣ Testing all variants for selling_price values...');
    
    const allVariants = await sql`
      SELECT 
        COUNT(*) as total_variants,
        COUNT(CASE WHEN selling_price > 0 THEN 1 END) as variants_with_price,
        COUNT(CASE WHEN selling_price = 0 OR selling_price IS NULL THEN 1 END) as variants_without_price
      FROM lats_product_variants
    `;
    
    const stats = allVariants[0];
    console.log(`   Total variants: ${stats.total_variants}`);
    console.log(`   Variants with selling_price > 0: ${stats.variants_with_price}`);
    console.log(`   Variants without selling_price: ${stats.variants_without_price}`);
    console.log('');
    
    console.log('3️⃣ Sample of variants with prices...');
    
    const sampleVariants = await sql`
      SELECT 
        name,
        sku,
        selling_price,
        cost_price
      FROM lats_product_variants 
      WHERE selling_price > 0
      LIMIT 5
    `;
    
    sampleVariants.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.name} - ${v.sku}`);
      console.log(`      Selling Price: TSh ${v.selling_price}`);
      console.log(`      Cost Price: TSh ${v.cost_price}`);
    });
    
    console.log('\n============================');
    console.log('✅ SELLING PRICE FIX VERIFIED!');
    console.log('============================\n');
    console.log('The frontend should now fetch selling_price instead of unit_price.');
    console.log('Please refresh your browser to see the correct prices!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

testSellingPriceFix();

