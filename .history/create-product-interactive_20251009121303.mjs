#!/usr/bin/env node

/**
 * 🎨 INTERACTIVE PRODUCT CREATOR
 * Create a single product with step-by-step prompts
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { createInterface } from 'readline';

const dbConfig = JSON.parse(readFileSync('./database-config.json', 'utf-8'));
const sql = neon(dbConfig.url);

const readline = createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => {
    readline.question(question, answer => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('🎨 Interactive Product Creator');
  console.log('=' .repeat(60));
  console.log('Create a product by answering a few questions\n');

  try {
    // Get product details
    const name = await ask('Product name: ');
    const description = await ask('Description (optional): ') || null;
    const category = await ask('Category (e.g., "Smartphones", "Accessories"): ');
    const sellingPrice = parseFloat(await ask('Selling price ($): ')) || 0;
    const costPrice = parseFloat(await ask('Cost price ($): ')) || 0;
    const quantity = parseInt(await ask('Initial stock quantity: ')) || 0;
    const minQuantity = parseInt(await ask('Minimum stock level (for alerts): ')) || 0;
    
    // Auto-generate SKU
    const sku = `${name.substring(0, 3).toUpperCase()}-${Date.now()}`;
    
    console.log('\n' + '='.repeat(60));
    console.log('Creating product...\n');
    
    // Create or get category
    let categoryId = null;
    const existingCategory = await sql`
      SELECT id FROM lats_categories 
      WHERE LOWER(name) = LOWER(${category})
      LIMIT 1
    `;
    
    if (existingCategory.length > 0) {
      categoryId = existingCategory[0].id;
      console.log(`✅ Using existing category: ${category}`);
    } else {
      const newCategory = await sql`
        INSERT INTO lats_categories (name, description, is_active)
        VALUES (${category}, ${`Products in ${category} category`}, true)
        RETURNING id
      `;
      categoryId = newCategory[0].id;
      console.log(`✅ Created new category: ${category}`);
    }
    
    // Create product
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
        ${name},
        ${description},
        ${categoryId},
        ${sku},
        ${sellingPrice},
        ${costPrice},
        ${quantity},
        ${minQuantity},
        true
      )
      RETURNING id, name, sku, created_at
    `;
    
    console.log('✅ Product created successfully!\n');
    console.log('Product Details:');
    console.log('─'.repeat(60));
    console.log(`  Name:          ${product[0].name}`);
    console.log(`  ID:            ${product[0].id}`);
    console.log(`  SKU:           ${product[0].sku}`);
    console.log(`  Category:      ${category}`);
    console.log(`  Selling Price: $${sellingPrice.toFixed(2)}`);
    console.log(`  Cost Price:    $${costPrice.toFixed(2)}`);
    console.log(`  Profit Margin: ${((sellingPrice - costPrice) / sellingPrice * 100).toFixed(1)}%`);
    console.log(`  Stock:         ${quantity} units`);
    console.log(`  Min Stock:     ${minQuantity} units`);
    console.log(`  Created:       ${new Date(product[0].created_at).toLocaleString()}`);
    console.log('─'.repeat(60));
    
    const createAnother = await ask('\n\nCreate another product? (y/n): ');
    
    readline.close();
    
    if (createAnother.toLowerCase() === 'y' || createAnother.toLowerCase() === 'yes') {
      console.log('\n');
      await main();
    } else {
      console.log('\n✨ All done! Your products are ready to use.\n');
      process.exit(0);
    }
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    readline.close();
    process.exit(1);
  }
}

main();

