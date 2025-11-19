#!/usr/bin/env node

/**
 * Fetch Real Product Data Diagnostic Script
 * This script queries the database to fetch actual data for a product by SKU
 */

import dotenv from 'dotenv';
import { neon, Pool } from '@neondatabase/serverless';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

const TARGET_SKU = 'SKU-1762822402801-8IC'; // The SKU you're investigating (base SKU without variant suffix)

async function fetchProductData() {
  console.log('🔍 Fetching real data from database...\n');
  console.log(`📦 Target SKU: ${TARGET_SKU}\n`);
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // 1. Find the product
    console.log('1️⃣ Searching for product...');
    const productQuery = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.selling_price,
        p.cost_price,
        p.stock_quantity,
        p.min_stock_level,
        p.is_active,
        p.category_id,
        p.metadata,
        p.total_quantity,
        p.total_value,
        p.brand,
        p.model,
        p.condition,
        c.name as category_name
      FROM lats_products p
      LEFT JOIN lats_categories c ON p.category_id = c.id
      WHERE p.sku = $1
    `;
    
    const productResult = await pool.query(productQuery, [TARGET_SKU]);
    
    if (productResult.rows.length === 0) {
      console.log('❌ Product not found with this SKU');
      console.log('\n📋 Searching for similar SKUs...');
      
      const similarQuery = `
        SELECT sku, name, id 
        FROM lats_products 
        WHERE sku LIKE $1 
        ORDER BY created_at DESC 
        LIMIT 10
      `;
      const similarResult = await pool.query(similarQuery, [`%${TARGET_SKU.substring(0, 15)}%`]);
      
      if (similarResult.rows.length > 0) {
        console.log('Found similar products:');
        similarResult.rows.forEach(row => {
          console.log(`  - ${row.sku} | ${row.name} | ID: ${row.id}`);
        });
      } else {
        console.log('No similar products found');
      }
      return;
    }
    
    const product = productResult.rows[0];
    console.log('✅ Product found!');
    console.log('\n📦 PRODUCT DETAILS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID:           ${product.id}`);
    console.log(`Name:         ${product.name}`);
    console.log(`SKU:          ${product.sku}`);
    console.log(`Category:     ${product.category_name || 'Uncategorized'}`);
    console.log(`Brand:        ${product.brand || 'N/A'}`);
    console.log(`Model:        ${product.model || 'N/A'}`);
    console.log(`Condition:    ${product.condition || 'new'}`);
    console.log(`Selling Price: TSh ${product.selling_price || 0}`);
    console.log(`Cost Price:   TSh ${product.cost_price || 0}`);
    console.log(`Stock Qty:    ${product.stock_quantity || 0}`);
    console.log(`Total Qty:    ${product.total_quantity || 0}`);
    console.log(`Total Value:  TSh ${product.total_value || 0}`);
    console.log(`Min Stock:    ${product.min_stock_level || 0}`);
    console.log(`Status:       ${product.is_active ? 'Active' : 'Inactive'}`);
    console.log(`Metadata:     ${JSON.stringify(product.metadata || {}, null, 2)}`);
    
    // 2. Fetch variants
    console.log('\n2️⃣ Fetching product variants...');
    const variantsQuery = `
      SELECT 
        id,
        name,
        variant_name,
        sku,
        cost_price,
        unit_price,
        selling_price,
        quantity,
        min_quantity,
        is_active,
        variant_attributes,
        attributes,
        parent_variant_id
      FROM lats_product_variants
      WHERE product_id = $1
      ORDER BY created_at
    `;
    
    const variantsResult = await pool.query(variantsQuery, [product.id]);
    
    console.log(`\n📊 Found ${variantsResult.rows.length} variant(s):\n`);
    
    if (variantsResult.rows.length === 0) {
      console.log('⚠️  No variants found for this product');
    } else {
      variantsResult.rows.forEach((variant, index) => {
        console.log(`\n🔹 VARIANT ${index + 1}:`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`ID:              ${variant.id}`);
        console.log(`Name:            ${variant.name || 'N/A'}`);
        console.log(`Variant Name:    ${variant.variant_name || 'N/A'}`);
        console.log(`SKU:             ${variant.sku || 'N/A'}`);
        console.log(`Cost Price:      TSh ${variant.cost_price || 0}`);
        console.log(`Unit Price:      TSh ${variant.unit_price || 0}`);
        console.log(`Selling Price:   TSh ${variant.selling_price || 0}`);
        console.log(`Quantity:        ${variant.quantity || 0}`);
        console.log(`Min Quantity:    ${variant.min_quantity || 0}`);
        console.log(`Status:          ${variant.is_active ? 'Active' : 'Inactive'}`);
        console.log(`Parent Variant:  ${variant.parent_variant_id || 'None (Parent)'}`);
        console.log(`Attributes:      ${JSON.stringify(variant.variant_attributes || variant.attributes || {}, null, 2)}`);
      });
    }
    
    // 3. Check product images
    console.log('\n3️⃣ Checking product images...');
    const imagesQuery = `
      SELECT id, image_url, is_primary, display_order
      FROM lats_product_images
      WHERE product_id = $1
      ORDER BY display_order, created_at
    `;
    
    const imagesResult = await pool.query(imagesQuery, [product.id]);
    console.log(`\n📸 Found ${imagesResult.rows.length} image(s)`);
    
    if (imagesResult.rows.length > 0) {
      imagesResult.rows.forEach((img, index) => {
        console.log(`  ${index + 1}. ${img.image_url} ${img.is_primary ? '(PRIMARY)' : ''}`);
      });
    }
    
    // 4. Calculate totals
    console.log('\n4️⃣ SUMMARY CALCULATIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const totalStock = variantsResult.rows.reduce((sum, v) => sum + (v.quantity || 0), 0);
    const totalValue = variantsResult.rows.reduce((sum, v) => 
      sum + ((v.selling_price || 0) * (v.quantity || 0)), 0
    );
    const avgSellingPrice = variantsResult.rows.length > 0 
      ? variantsResult.rows.reduce((sum, v) => sum + (v.selling_price || 0), 0) / variantsResult.rows.length
      : 0;
    const avgCostPrice = variantsResult.rows.length > 0 
      ? variantsResult.rows.reduce((sum, v) => sum + (v.cost_price || 0), 0) / variantsResult.rows.length
      : 0;
    const potentialProfit = avgSellingPrice - avgCostPrice;
    const markup = avgCostPrice > 0 ? ((avgSellingPrice - avgCostPrice) / avgCostPrice * 100).toFixed(2) : 'N/A';
    
    console.log(`Total Variants:        ${variantsResult.rows.length}`);
    console.log(`Total Stock:           ${totalStock}`);
    console.log(`Total Inventory Value: TSh ${totalValue.toLocaleString()}`);
    console.log(`Avg Selling Price:     TSh ${avgSellingPrice.toFixed(2)}`);
    console.log(`Avg Cost Price:        TSh ${avgCostPrice.toFixed(2)}`);
    console.log(`Profit per Unit:       TSh ${potentialProfit.toFixed(2)}`);
    console.log(`Markup:                ${markup}%`);
    
    // Stock health
    const healthyVariants = variantsResult.rows.filter(v => (v.quantity || 0) >= (v.min_quantity || 5)).length;
    const lowStockVariants = variantsResult.rows.filter(v => {
      const qty = v.quantity || 0;
      const min = v.min_quantity || 5;
      return qty > 0 && qty < min;
    }).length;
    const noStockVariants = variantsResult.rows.filter(v => (v.quantity || 0) === 0).length;
    
    console.log(`\n📊 Stock Health:`);
    console.log(`  ✅ Healthy:   ${healthyVariants} variants`);
    console.log(`  ⚠️  Low Stock: ${lowStockVariants} variants`);
    console.log(`  ❌ No Stock:  ${noStockVariants} variants`);
    
    console.log('\n✅ Data fetch complete!');
    
  } catch (error) {
    console.error('❌ Error fetching data:', error);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run the script
fetchProductData().catch(console.error);

