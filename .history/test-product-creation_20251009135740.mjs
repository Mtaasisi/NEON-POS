#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function testProductCreation() {
  try {
    console.log('\n🧪 Testing Product Creation');
    console.log('============================\n');
    
    // First, get a valid category_id
    console.log('1️⃣ Finding a valid category...');
    const categories = await sql`
      SELECT id, name FROM lats_categories LIMIT 1
    `;
    
    const categoryId = categories.length > 0 ? categories[0].id : null;
    if (categoryId) {
      console.log(`   ✅ Found category: ${categories[0].name} (${categoryId})\n`);
    } else {
      console.log('   ⚠️  No categories found, will create product without category\n');
    }
    
    // Create test product data (matching AddProductPage.tsx structure)
    const timestamp = Date.now();
    const testProduct = {
      name: `Test Product ${timestamp}`,
      description: 'This is a test product created by automated verification',
      sku: `TEST-${timestamp}`,
      category_id: categoryId,
      cost_price: 100.00,
      selling_price: 150.00,
      stock_quantity: 10,
      min_stock_level: 5,
      total_quantity: 10,
      total_value: 1000.00,
      storage_room_id: null,
      store_shelf_id: null,
      tags: ['test', 'automated'],
      attributes: {
        color: 'blue',
        size: 'medium',
        condition: 'new'
      },
      metadata: {
        useVariants: false,
        variantCount: 0,
        createdBy: 'automated-test',
        createdAt: new Date().toISOString(),
        testProduct: true
      }
    };
    
    console.log('2️⃣ Creating test product...');
    console.log('   Product data:', JSON.stringify(testProduct, null, 2));
    console.log('');
    
    // Insert the test product
    const result = await sql`
      INSERT INTO lats_products (
        name,
        description,
        sku,
        category_id,
        cost_price,
        selling_price,
        stock_quantity,
        min_stock_level,
        total_quantity,
        total_value,
        storage_room_id,
        store_shelf_id,
        tags,
        attributes,
        metadata
      ) VALUES (
        ${testProduct.name},
        ${testProduct.description},
        ${testProduct.sku},
        ${testProduct.category_id},
        ${testProduct.cost_price},
        ${testProduct.selling_price},
        ${testProduct.stock_quantity},
        ${testProduct.min_stock_level},
        ${testProduct.total_quantity},
        ${testProduct.total_value},
        ${testProduct.storage_room_id},
        ${testProduct.store_shelf_id},
        ${sql.array(testProduct.tags)},
        ${sql.json(testProduct.attributes)},
        ${sql.json(testProduct.metadata)}
      )
      RETURNING *
    `;
    
    if (result && result.length > 0) {
      const createdProduct = result[0];
      console.log('   ✅ Product created successfully!\n');
      console.log('   Product ID:', createdProduct.id);
      console.log('   Name:', createdProduct.name);
      console.log('   SKU:', createdProduct.sku);
      console.log('   Selling Price:', createdProduct.selling_price);
      console.log('   Stock Quantity:', createdProduct.stock_quantity);
      console.log('   Tags:', createdProduct.tags);
      console.log('   Attributes:', JSON.stringify(createdProduct.attributes, null, 2));
      console.log('   Metadata:', JSON.stringify(createdProduct.metadata, null, 2));
      console.log('');
      
      // Clean up - delete the test product
      console.log('3️⃣ Cleaning up test product...');
      await sql`DELETE FROM lats_products WHERE id = ${createdProduct.id}`;
      console.log('   ✅ Test product deleted\n');
      
      console.log('============================');
      console.log('✅ TEST PASSED!');
      console.log('============================\n');
      console.log('Product creation is working perfectly!');
      console.log('All required columns are present and functional.\n');
      console.log('You can now create products in your app! 🎉\n');
      
    } else {
      console.log('   ❌ Product creation returned no data\n');
    }
    
  } catch (error) {
    console.log('\n============================');
    console.log('❌ TEST FAILED!');
    console.log('============================\n');
    console.error('Error:', error.message);
    console.error('\nError details:', error);
    console.log('\nThe error above indicates what still needs to be fixed.\n');
    process.exit(1);
  }
}

testProductCreation();

