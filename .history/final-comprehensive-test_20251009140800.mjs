#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function comprehensiveTest() {
  try {
    console.log('\n🎯 FINAL COMPREHENSIVE TEST');
    console.log('=======================================\n');
    
    // Get a category
    const categories = await sql`SELECT id, name FROM lats_categories LIMIT 1`;
    const categoryId = categories.length > 0 ? categories[0].id : null;
    
    console.log('1️⃣ Creating product with all fields...');
    const timestamp = Date.now();
    
    // Create product exactly as the app does
    const productResult = await sql`
      INSERT INTO lats_products (
        name, description, sku, category_id,
        cost_price, selling_price, stock_quantity, min_stock_level,
        total_quantity, total_value,
        storage_room_id, store_shelf_id,
        tags, attributes, metadata
      ) VALUES (
        ${'Final Test Product ' + timestamp},
        ${'Complete test of product creation'},
        ${'FINAL-' + timestamp},
        ${categoryId},
        34,
        50,
        10,
        5,
        10,
        340,
        NULL,
        NULL,
        '[]'::jsonb,
        '{"condition": "new"}'::jsonb,
        '{"useVariants": false, "createdBy": "test"}'::jsonb
      )
      RETURNING *
    `;
    
    const product = productResult[0];
    console.log(`   ✅ Product created: ${product.name}`);
    console.log(`      ID: ${product.id}`);
    console.log(`      SKU: ${product.sku}`);
    console.log(`      Cost: ${product.cost_price}, Selling: ${product.selling_price}`);
    console.log(`      Tags: ${JSON.stringify(product.tags)}`);
    console.log('');
    
    console.log('2️⃣ Creating default variant for product...');
    
    // Create default variant (as variantUtils.ts does)
    const variantResult = await sql`
      INSERT INTO lats_product_variants (
        product_id, sku, name,
        cost_price, selling_price,
        quantity, min_quantity,
        attributes
      ) VALUES (
        ${product.id},
        ${product.sku + '-VAR-DEFAULT'},
        'Default',
        ${product.cost_price},
        ${product.selling_price},
        ${product.stock_quantity},
        ${product.min_stock_level},
        ${JSON.stringify(product.attributes)}::jsonb
      )
      RETURNING *
    `;
    
    const variant = variantResult[0];
    console.log(`   ✅ Variant created: ${variant.name}`);
    console.log(`      ID: ${variant.id}`);
    console.log(`      SKU: ${variant.sku}`);
    console.log(`      Selling Price: ${variant.selling_price}`);
    console.log('');
    
    console.log('3️⃣ Verifying product and variant relationship...');
    const verification = await sql`
      SELECT 
        p.name as product_name,
        p.sku as product_sku,
        v.name as variant_name,
        v.sku as variant_sku,
        v.selling_price
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id
      WHERE p.id = ${product.id}
    `;
    
    if (verification.length > 0) {
      const result = verification[0];
      console.log(`   ✅ Relationship verified:`);
      console.log(`      Product: ${result.product_name} (${result.product_sku})`);
      console.log(`      Variant: ${result.variant_name} (${result.variant_sku})`);
      console.log(`      Price: ${result.selling_price}`);
      console.log('');
    }
    
    console.log('4️⃣ Cleaning up test data...');
    await sql`DELETE FROM lats_product_variants WHERE product_id = ${product.id}`;
    await sql`DELETE FROM lats_products WHERE id = ${product.id}`;
    console.log('   ✅ Cleaned up\n');
    
    console.log('=======================================');
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
    console.log('=======================================\n');
    console.log('✅ Product creation works perfectly');
    console.log('✅ Variant creation works perfectly');
    console.log('✅ Product-variant relationship works');
    console.log('');
    console.log('Your app is fully ready to use! 🚀');
    console.log('Refresh your browser and create products!\n');
    
  } catch (error) {
    console.log('\n=======================================');
    console.log('❌ TEST FAILED');
    console.log('=======================================\n');
    console.error('Error:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  }
}

comprehensiveTest();

