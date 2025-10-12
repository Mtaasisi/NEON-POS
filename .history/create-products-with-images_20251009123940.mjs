#!/usr/bin/env node

/**
 * 📸 CREATE PRODUCTS WITH WEB IMAGES
 * Creates products with web-accessible images that will display in inventory
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const dbConfig = JSON.parse(readFileSync('./database-config.json', 'utf-8'));
const sql = neon(dbConfig.url);

const PRODUCTS_WITH_IMAGES = [
  {
    name: 'Wireless Headphones Pro Max',
    description: 'Premium noise-canceling headphones with 40-hour battery life',
    category: 'Accessories',
    sku: `WHP-${Date.now()}`,
    costPrice: 150.00,
    sellingPrice: 299.99,
    quantity: 25,
    minQuantity: 5,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80'
  },
  {
    name: 'iPhone 15 Pro Max 256GB',
    description: 'Latest iPhone with titanium design and A17 Pro chip',
    category: 'Smartphones',
    sku: `IP15-${Date.now()}`,
    costPrice: 900.00,
    sellingPrice: 1299.99,
    quantity: 10,
    minQuantity: 2,
    imageUrl: 'https://images.unsplash.com/photo-1592286927505-72d7e220f589?w=400&q=80'
  },
  {
    name: 'Samsung Galaxy Tab S9',
    description: '11-inch tablet with S Pen included',
    category: 'Tablets',
    sku: `TAB-${Date.now()}`,
    costPrice: 450.00,
    sellingPrice: 699.99,
    quantity: 15,
    minQuantity: 3,
    imageUrl: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&q=80'
  },
  {
    name: 'MacBook Pro 14-inch M3',
    description: 'M3 Pro chip, 18GB RAM, 512GB SSD',
    category: 'Laptops',
    sku: `MBP-${Date.now()}`,
    costPrice: 1800.00,
    sellingPrice: 2499.99,
    quantity: 5,
    minQuantity: 1,
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80'
  },
  {
    name: 'Sony WH-1000XM5 Headphones',
    description: 'Industry-leading noise canceling headphones',
    category: 'Accessories',
    sku: `SONY-${Date.now()}`,
    costPrice: 280.00,
    sellingPrice: 399.99,
    quantity: 20,
    minQuantity: 5,
    imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&q=80'
  }
];

async function createProductWithImage(productData) {
  console.log(`\n📦 Creating: ${productData.name}`);
  
  try {
    // Create or get category
    let categoryId;
    const existingCategory = await sql`
      SELECT id FROM lats_categories 
      WHERE LOWER(name) = LOWER(${productData.category})
      LIMIT 1
    `;
    
    if (existingCategory.length > 0) {
      categoryId = existingCategory[0].id;
      console.log(`  ✅ Using existing category: ${productData.category}`);
    } else {
      const categoryDescription = `Products in ${productData.category} category`;
      const newCategory = await sql`
        INSERT INTO lats_categories (name, description, is_active)
        VALUES (${productData.category}, ${categoryDescription}, true)
        RETURNING id
      `;
      categoryId = newCategory[0].id;
      console.log(`  ✅ Created new category: ${productData.category}`);
    }
    
    // Create product with image_url
    const product = await sql`
      INSERT INTO lats_products (
        name, description, category_id, sku,
        unit_price, cost_price, stock_quantity, min_stock_level,
        image_url, is_active
      )
      VALUES (
        ${productData.name}, ${productData.description}, ${categoryId}, ${productData.sku},
        ${productData.sellingPrice}, ${productData.costPrice}, ${productData.quantity}, ${productData.minQuantity},
        ${productData.imageUrl}, true
      )
      RETURNING id, name, sku
    `;
    
    const productId = product[0].id;
    
    // Also add to product_images table for redundancy
    await sql`
      INSERT INTO product_images (product_id, image_url, is_primary)
      VALUES (${productId}, ${productData.imageUrl}, true)
    `;
    
    console.log(`  ✅ Product ID: ${productId}`);
    console.log(`  ✅ SKU: ${product[0].sku}`);
    console.log(`  ✅ Price: $${productData.sellingPrice}`);
    console.log(`  ✅ Stock: ${productData.quantity} units`);
    console.log(`  📸 Image: ${productData.imageUrl.substring(0, 60)}...`);
    console.log(`  📸 Image added to both tables!`);
    
    return { success: true, product: product[0] };
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     📸 CREATING PRODUCTS WITH WEB IMAGES                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  const results = [];
  
  for (const productData of PRODUCTS_WITH_IMAGES) {
    const result = await createProductWithImage(productData);
    results.push(result);
  }
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log('\n' + '═'.repeat(65));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(65));
  console.log(`\n✅ Successfully created: ${successful.length} products`);
  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length} products`);
  }
  
  console.log('\n📸 All products have web images that will display!');
  console.log('\n🌐 View in inventory: http://localhost:3000/lats/inventory');
  console.log('   Refresh your browser to see the products with images!');
  console.log('\n✨ Done!\n');
}

main().catch(console.error);

