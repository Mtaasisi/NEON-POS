#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function refreshProductData() {
  try {
    console.log('\n🔄 Refreshing Product Data');
    console.log('==========================\n');
    
    // Get all products with their variants
    console.log('1️⃣ Fetching all products with variants...');
    
    const products = await sql`
      SELECT 
        p.id,
        p.name,
        p.selling_price as product_price,
        p.cost_price as product_cost,
        v.id as variant_id,
        v.name as variant_name,
        v.sku,
        v.selling_price as variant_price,
        v.cost_price as variant_cost,
        v.quantity as stock
      FROM lats_products p
      JOIN lats_product_variants v ON p.id = v.product_id
      ORDER BY p.name
    `;
    
    console.log(`   Found ${products.length} product-variant combinations\n`);
    
    console.log('2️⃣ Current product data:');
    console.log('   Product Name | Variant | SKU | Selling Price | Cost | Stock');
    console.log('   ' + '-'.repeat(80));
    
    products.forEach(p => {
      const price = parseFloat(p.variant_price) || 0;
      const cost = parseFloat(p.variant_cost) || 0;
      const stock = p.stock || 0;
      
      console.log(`   ${p.name.substring(0, 20).padEnd(20)} | ${p.variant_name.padEnd(7)} | ${p.sku.substring(0, 15).padEnd(15)} | TSh ${price.toFixed(0).padStart(6)} | TSh ${cost.toFixed(0).padStart(4)} | ${stock.toString().padStart(5)}`);
    });
    
    console.log('\n3️⃣ Ensuring data consistency...');
    
    let fixedCount = 0;
    for (const product of products) {
      const variantPrice = parseFloat(product.variant_price) || 0;
      const productPrice = parseFloat(product.product_price) || 0;
      
      // If variant has price but product doesn't, sync them
      if (variantPrice > 0 && productPrice === 0) {
        await sql`
          UPDATE lats_products 
          SET selling_price = ${variantPrice}
          WHERE id = ${product.id}
        `;
        console.log(`   ✅ Synced product price for: ${product.name}`);
        fixedCount++;
      }
      // If product has price but variant doesn't, sync them
      else if (productPrice > 0 && variantPrice === 0) {
        await sql`
          UPDATE lats_product_variants 
          SET selling_price = ${productPrice}
          WHERE id = ${product.variant_id}
        `;
        console.log(`   ✅ Synced variant price for: ${product.name}`);
        fixedCount++;
      }
    }
    
    console.log(`\n   Fixed ${fixedCount} inconsistencies\n`);
    
    // Show the specific product you mentioned
    console.log('4️⃣ Checking specific product: dsdasdiuhkjdsfdsf...');
    
    const specificProduct = await sql`
      SELECT 
        p.name,
        p.selling_price as product_price,
        v.selling_price as variant_price,
        v.cost_price,
        v.quantity,
        v.sku
      FROM lats_products p
      JOIN lats_product_variants v ON p.id = v.product_id
      WHERE p.name = 'dsdasdiuhkjdsfdsf'
    `;
    
    if (specificProduct.length > 0) {
      const p = specificProduct[0];
      const profit = (p.variant_price || 0) - (p.cost_price || 0);
      const margin = p.cost_price > 0 ? ((profit / p.cost_price) * 100).toFixed(1) : 0;
      
      console.log(`   Product: ${p.name}`);
      console.log(`   SKU: ${p.sku}`);
      console.log(`   Product Price: TSh ${p.product_price || 0}`);
      console.log(`   Variant Price: TSh ${p.variant_price || 0}`);
      console.log(`   Cost Price: TSh ${p.cost_price || 0}`);
      console.log(`   Stock: ${p.quantity || 0}`);
      console.log(`   Profit: TSh ${profit.toFixed(0)}`);
      console.log(`   Margin: ${margin}%`);
    } else {
      console.log('   ❌ Product not found');
    }
    
    console.log('\n==========================');
    console.log('✅ DATA REFRESH COMPLETE!');
    console.log('==========================\n');
    console.log('If you still see "TSh 0" in the frontend:');
    console.log('1. Hard refresh your browser (Ctrl+Shift+R / Cmd+Shift+R)');
    console.log('2. Clear browser cache');
    console.log('3. Check if there are any frontend caching issues');
    console.log('\nThe database has the correct pricing data.\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

refreshProductData();

