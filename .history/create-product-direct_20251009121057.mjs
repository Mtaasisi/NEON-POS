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
        condition,
        is_active,
        total_quantity,
        total_value
      )
      VALUES (
        ${productData.name},
        ${productData.description},
        ${categoryId},
        ${productData.condition},
        true,
        0,
        0
      )
      RETURNING id, name, created_at
    `;
    
    const productId = product[0].id;
    console.log(`  ✅ Product created with ID: ${productId}`);
    
    // Step 3: Create a variant for the product
    const variant = await sql`
      INSERT INTO lats_product_variants (
        product_id,
        variant_name,
        sku,
        cost_price,
        unit_price,
        quantity,
        min_quantity
      )
      VALUES (
        ${productId},
        'Default',
        ${productData.sku},
        ${productData.costPrice},
        ${productData.sellingPrice},
        ${productData.quantity},
        ${productData.minQuantity}
      )
      RETURNING id, sku
    `;
    
    console.log(`  ✅ Variant created with SKU: ${variant[0].sku}`);
    
    // Step 4: Update product totals
    await sql`
      UPDATE lats_products
      SET 
        total_quantity = ${productData.quantity},
        total_value = ${productData.quantity * productData.costPrice}
      WHERE id = ${productId}
    `;
    
    console.log(`  ✅ Updated product totals`);
    
    // Return success
    return {
      success: true,
      product: {
        id: productId,
        name: product[0].name,
        categoryId: categoryId,
        variantSku: variant[0].sku,
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

