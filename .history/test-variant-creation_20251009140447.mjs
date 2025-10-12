#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function testVariantCreation() {
  try {
    console.log('\n🧪 Testing Variant Creation');
    console.log('============================\n');
    
    // First create a test product
    console.log('1️⃣ Creating test product...');
    const timestamp = Date.now();
    const productResult = await sql`
      INSERT INTO lats_products (
        name, sku, category_id, cost_price, selling_price,
        stock_quantity, min_stock_level, tags, attributes, metadata
      ) VALUES (
        ${'Test Product ' + timestamp},
        ${'TEST-' + timestamp},
        NULL,
        100,
        150,
        0,
        0,
        '[]'::jsonb,
        '{}'::jsonb,
        '{"test": true}'::jsonb
      )
      RETURNING id, name
    `;
    
    const product = productResult[0];
    console.log(`   ✅ Product created: ${product.name} (${product.id})\n`);
    
    // Now create a default variant (matching variantUtils.ts logic)
    console.log('2️⃣ Creating default variant...');
    const variantData = {
      product_id: product.id,
      sku: `${product.name.replace(/\s+/g, '')}-VAR-${timestamp}`,
      name: 'Default',
      cost_price: 100,
      selling_price: 150,
      quantity: 0,
      min_quantity: 0,
      attributes: {},
      barcode: null,
      weight: null,
      dimensions: null
    };
    
    console.log('   Variant data:', JSON.stringify(variantData, null, 2));
    console.log('');
    
    const variantResult = await sql`
      INSERT INTO lats_product_variants (
        product_id, sku, name, cost_price, selling_price,
        quantity, min_quantity, attributes, barcode, weight, dimensions
      ) VALUES (
        ${variantData.product_id},
        ${variantData.sku},
        ${variantData.name},
        ${variantData.cost_price},
        ${variantData.selling_price},
        ${variantData.quantity},
        ${variantData.min_quantity},
        ${JSON.stringify(variantData.attributes)}::jsonb,
        ${variantData.barcode},
        ${variantData.weight},
        ${variantData.dimensions}
      )
      RETURNING *
    `;
    
    const variant = variantResult[0];
    console.log('   ✅ Variant created successfully!\n');
    console.log('   Variant ID:', variant.id);
    console.log('   Variant Name:', variant.name);
    console.log('   SKU:', variant.sku);
    console.log('   Cost Price:', variant.cost_price);
    console.log('   Selling Price:', variant.selling_price);
    console.log('');
    
    // Clean up
    console.log('3️⃣ Cleaning up...');
    await sql`DELETE FROM lats_product_variants WHERE id = ${variant.id}`;
    await sql`DELETE FROM lats_products WHERE id = ${product.id}`;
    console.log('   ✅ Test data cleaned up\n');
    
    console.log('============================');
    console.log('✅ TEST PASSED!');
    console.log('============================\n');
    console.log('Variant creation is working perfectly!');
    console.log('Your app can now create products with variants.\n');
    
  } catch (error) {
    console.log('\n============================');
    console.log('❌ TEST FAILED!');
    console.log('============================\n');
    console.error('Error:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  }
}

testVariantCreation();

