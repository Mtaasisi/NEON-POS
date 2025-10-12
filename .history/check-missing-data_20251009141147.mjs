#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function checkMissingData() {
  try {
    console.log('\n🔍 Checking for Missing Data Issues');
    console.log('=====================================\n');
    
    // Check products with zero prices
    console.log('1️⃣ Products with zero selling prices...');
    const zeroPriceProducts = await sql`
      SELECT p.name, p.sku, p.selling_price, v.selling_price as variant_price
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id
      WHERE p.selling_price = 0 OR v.selling_price = 0 OR v.selling_price IS NULL
      LIMIT 10
    `;
    
    console.log(`   Found ${zeroPriceProducts.length} products with zero prices:`);
    zeroPriceProducts.forEach(p => {
      console.log(`   - ${p.name}: Product=${p.selling_price}, Variant=${p.variant_price}`);
    });
    console.log('');
    
    // Check products without variants
    console.log('2️⃣ Products without variants...');
    const productsWithoutVariants = await sql`
      SELECT p.id, p.name, p.sku
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id
      WHERE v.id IS NULL
    `;
    
    console.log(`   Found ${productsWithoutVariants.length} products without variants:`);
    productsWithoutVariants.forEach(p => {
      console.log(`   - ${p.name} (${p.sku})`);
    });
    console.log('');
    
    // Check variants with missing data
    console.log('3️⃣ Variants with missing selling_price...');
    const variantsWithoutPrice = await sql`
      SELECT v.id, v.name, v.sku, v.selling_price, p.name as product_name
      FROM lats_product_variants v
      JOIN lats_products p ON v.product_id = p.id
      WHERE v.selling_price IS NULL OR v.selling_price = 0
      LIMIT 10
    `;
    
    console.log(`   Found ${variantsWithoutPrice.length} variants with missing prices:`);
    variantsWithoutPrice.forEach(v => {
      console.log(`   - ${v.product_name}: ${v.name} (${v.sku}) - Price: ${v.selling_price}`);
    });
    console.log('');
    
    console.log('=====================================');
    console.log('📊 SUMMARY OF MISSING DATA ISSUES:');
    console.log('=====================================\n');
    console.log(`- ${zeroPriceProducts.length} products with zero prices`);
    console.log(`- ${productsWithoutVariants.length} products without variants`);
    console.log(`- ${variantsWithoutPrice.length} variants with missing prices`);
    console.log('\nThis explains why you see "TSh 0" in the inventory!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkMissingData();

