#!/usr/bin/env node

/**
 * 🚀 DIRECT PRODUCT CREATION
 * Creates products directly in the database
 * Simple, fast, and reliable
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// Load database configuration
const dbConfig = JSON.parse(readFileSync('./database-config.json', 'utf-8'));
const sql = neon(dbConfig.url);

// Sample product data
const SAMPLE_PRODUCTS = [
  {
    name: `Wireless Headphones Pro ${Date.now()}`,
    description: 'Premium wireless headphones with active noise cancellation',
    category: 'Accessories',
    condition: 'new',
    costPrice: 150.00,
    sellingPrice: 299.99,
    quantity: 25,
    minQuantity: 5,
    sku: `WHP-${Date.now()}`
  },
  {
    name: `iPhone 15 Pro Max ${Date.now()}`,
    description: '256GB, Space Black, Unlocked',
    category: 'Smartphones',
    condition: 'new',
    costPrice: 900.00,
    sellingPrice: 1299.99,
    quantity: 10,
    minQuantity: 2,
    sku: `IP15-${Date.now()}`
  },
  {
    name: `Samsung Galaxy Tab S9 ${Date.now()}`,
    description: '128GB, WiFi, with S Pen',
    category: 'Tablets',
    condition: 'new',
    costPrice: 450.00,
    sellingPrice: 699.99,
    quantity: 15,
    minQuantity: 3,
    sku: `TAB-${Date.now()}`
  }
];

async function createProduct(productData) {
  console.log(`\n📦 Creating product: ${productData.name}`);
  
  try {
    // Step 1: Create category if it doesn't exist
    const categoryName = productData.category;
    let categoryId = null;
    
    const existingCategory = await sql`
      SELECT id FROM lats_categories 
      WHERE LOWER(name) = LOWER(${categoryName})
      LIMIT 1
    `;
    
    if (existingCategory.length > 0) {
      categoryId = existingCategory[0].id;
      console.log(`  ✅ Using existing category: ${categoryName} (${categoryId})`);
    } else {
      const newCategory = await sql`
        INSERT INTO lats_categories (name, description, is_active)
        VALUES (${categoryName}, ${`Products in ${categoryName} category`}, true)
        RETURNING id
      `;
      categoryId = newCategory[0].id;
      console.log(`  ✅ Created new category: ${categoryName} (${categoryId})`);
    }
    
    // Step 2: Create the product
    const product = await sql`
      INSERT INTO lats_products (
        name, 
        description, 
        category_id,
        sku,
        unit_price,
        cost_price,
        stock_quantity,
        min_stock_level,
        is_active
      )
      VALUES (
        ${productData.name},
        ${productData.description},
        ${categoryId},
        ${productData.sku},
        ${productData.sellingPrice},
        ${productData.costPrice},
        ${productData.quantity},
        ${productData.minQuantity},
        true
      )
      RETURNING id, name, created_at
    `;
    
    const productId = product[0].id;
    console.log(`  ✅ Product created with ID: ${productId}`);
    console.log(`  ✅ SKU: ${productData.sku}`);
    console.log(`  ✅ Stock: ${productData.quantity} units`);
    console.log(`  ✅ Price: $${productData.sellingPrice}`);
    
    // Return success
    return {
      success: true,
      product: {
        id: productId,
        name: product[0].name,
        categoryId: categoryId,
        sku: productData.sku,
        createdAt: product[0].created_at
      }
    };
    
  } catch (error) {
    console.error(`  ❌ Error creating product: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🚀 Direct Product Creation Script');
  console.log('=' .repeat(60));
  
  const results = [];
  
  // Create all sample products
  for (const productData of SAMPLE_PRODUCTS) {
    const result = await createProduct(productData);
    results.push(result);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successfully created: ${successful.length} products`);
  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length} products`);
  }
  
  if (successful.length > 0) {
    console.log('\n📦 Created Products:');
    successful.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.product.name}`);
      console.log(`     ID: ${result.product.id}`);
      console.log(`     SKU: ${result.product.variantSku}`);
      console.log(`     Category ID: ${result.product.categoryId}`);
    });
  }
  
  console.log('\n✨ Done!\n');
}

main().catch(console.error);

