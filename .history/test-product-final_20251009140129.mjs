#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function testProductCreation() {
  try {
    console.log('\n🧪 FINAL TEST - Product Creation with JSONB Tags');
    console.log('=================================================\n');
    
    // Get a category
    const categories = await sql`SELECT id, name FROM lats_categories LIMIT 1`;
    const categoryId = categories.length > 0 ? categories[0].id : null;
    
    if (categoryId) {
      console.log(`✓ Using category: ${categories[0].name}\n`);
    }
    
    // Create test product matching your app's structure
    const timestamp = Date.now();
    const testProduct = {
      name: `Final Test ${timestamp}`,
      description: 'Testing after tags column fix',
      sku: `FINAL-${timestamp}`,
      category_id: categoryId,
      cost_price: 34,
      selling_price: 50,
      stock_quantity: 10,
      min_stock_level: 5,
      total_quantity: 10,
      total_value: 340,
      storage_room_id: null,
      store_shelf_id: null,
      tags: [],  // Empty array as JSONB
      attributes: {
        condition: 'new'
      },
      metadata: {
        useVariants: false,
        variantCount: 0,
        createdBy: 'final-test',
        createdAt: new Date().toISOString()
      }
    };
    
    console.log('Creating product with JSONB tags...');
    console.log('Tags value:', JSON.stringify(testProduct.tags));
    console.log('');
    
    // Insert exactly as the app would
    const result = await sql`
      INSERT INTO lats_products (
        name, description, sku, category_id,
        cost_price, selling_price, stock_quantity, min_stock_level,
        total_quantity, total_value, storage_room_id, store_shelf_id,
        tags, attributes, metadata
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
        ${JSON.stringify(testProduct.tags)}::jsonb,
        ${JSON.stringify(testProduct.attributes)}::jsonb,
        ${JSON.stringify(testProduct.metadata)}::jsonb
      )
      RETURNING *
    `;
    
    if (result && result.length > 0) {
      const product = result[0];
      console.log('✅ SUCCESS! Product created:\n');
      console.log('   ID:', product.id);
      console.log('   Name:', product.name);
      console.log('   SKU:', product.sku);
      console.log('   Cost Price:', product.cost_price);
      console.log('   Selling Price:', product.selling_price);
      console.log('   Tags:', JSON.stringify(product.tags));
      console.log('   Attributes:', JSON.stringify(product.attributes));
      
      // Clean up
      await sql`DELETE FROM lats_products WHERE id = ${product.id}`;
      console.log('\n✓ Test product cleaned up\n');
      
      console.log('=================================================');
      console.log('✅ ALL TESTS PASSED!');
      console.log('=================================================\n');
      console.log('Your app can now create products successfully! 🎉');
      console.log('Refresh your browser and try creating a product.\n');
    }
    
  } catch (error) {
    console.log('\n❌ TEST FAILED!');
    console.error('Error:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  }
}

testProductCreation();

