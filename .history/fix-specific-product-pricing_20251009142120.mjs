#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function fixSpecificProductPricing() {
  try {
    console.log('\n🔧 Fixing Specific Product Pricing');
    console.log('==================================\n');
    
    const productId = 'cc922cd8-18df-4954-b043-7b47f8e9d25c';
    const productName = 'dsdasdiuhkjdsfdsf';
    
    console.log(`1️⃣ Checking product: ${productName} (${productId})\n`);
    
    // Get current product data
    const product = await sql`
      SELECT id, name, selling_price, cost_price, stock_quantity
      FROM lats_products 
      WHERE id = ${productId}
    `;
    
    if (product.length === 0) {
      console.log('   ❌ Product not found\n');
      return;
    }
    
    const productData = product[0];
    console.log('   Current product data:');
    console.log(`     Name: ${productData.name}`);
    console.log(`     Selling Price: TSh ${productData.selling_price}`);
    console.log(`     Cost Price: TSh ${productData.cost_price}`);
    console.log(`     Stock: ${productData.stock_quantity}`);
    console.log('');
    
    // Get variant data
    const variant = await sql`
      SELECT id, name, sku, selling_price, cost_price, quantity
      FROM lats_product_variants 
      WHERE product_id = ${productId}
    `;
    
    if (variant.length === 0) {
      console.log('   ❌ No variants found\n');
      return;
    }
    
    const variantData = variant[0];
    console.log('   Current variant data:');
    console.log(`     Name: ${variantData.name}`);
    console.log(`     SKU: ${variantData.sku}`);
    console.log(`     Selling Price: TSh ${variantData.selling_price}`);
    console.log(`     Cost Price: TSh ${variantData.cost_price}`);
    console.log(`     Stock: ${variantData.quantity}`);
    console.log('');
    
    // Fix pricing - set a reasonable selling price based on cost
    const costPrice = parseFloat(variantData.cost_price) || 34;
    const sellingPrice = costPrice * 2.5; // 150% markup (250% of cost)
    
    console.log('2️⃣ Updating pricing...');
    console.log(`   Cost Price: TSh ${costPrice}`);
    console.log(`   New Selling Price: TSh ${sellingPrice.toFixed(0)} (150% markup)`);
    console.log('');
    
    // Update product pricing
    await sql`
      UPDATE lats_products 
      SET 
        selling_price = ${sellingPrice},
        cost_price = ${costPrice}
      WHERE id = ${productId}
    `;
    
    // Update variant pricing
    await sql`
      UPDATE lats_product_variants 
      SET 
        selling_price = ${sellingPrice},
        cost_price = ${costPrice}
      WHERE product_id = ${productId}
    `;
    
    console.log('   ✅ Pricing updated successfully\n');
    
    // Verify the fix
    console.log('3️⃣ Verifying updated pricing...');
    
    const updatedVariant = await sql`
      SELECT selling_price, cost_price, quantity
      FROM lats_product_variants 
      WHERE product_id = ${productId}
    `;
    
    const updated = updatedVariant[0];
    const profit = updated.selling_price - updated.cost_price;
    const margin = updated.cost_price > 0 ? ((profit / updated.cost_price) * 100).toFixed(1) : 0;
    
    console.log('   Updated variant data:');
    console.log(`     Selling Price: TSh ${updated.selling_price.toLocaleString()}`);
    console.log(`     Cost Price: TSh ${updated.cost_price.toLocaleString()}`);
    console.log(`     Stock: ${updated.quantity}`);
    console.log(`     Profit per unit: TSh ${profit.toFixed(0)}`);
    console.log(`     Margin: ${margin}%`);
    console.log('');
    
    console.log('==================================');
    console.log('✅ PRODUCT PRICING FIXED!');
    console.log('==================================\n');
    console.log(`Product: ${productName}`);
    console.log(`New Price: TSh ${updated.selling_price.toLocaleString()}`);
    console.log(`Profit: TSh ${profit.toFixed(0)} per unit`);
    console.log(`Margin: ${margin}%`);
    console.log('\n🚀 Refresh your browser to see the updated pricing!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

fixSpecificProductPricing();

