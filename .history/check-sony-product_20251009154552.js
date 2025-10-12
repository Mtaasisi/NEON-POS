#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function checkSonyProduct() {
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Find Sony WH-1000XM5
    const result = await client.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.unit_price,
        p.cost_price,
        p.is_active,
        p.category_id,
        c.name as category_name,
        pv.id as variant_id,
        pv.variant_name,
        pv.sku as variant_sku,
        pv.unit_price as variant_unit_price,
        pv.cost_price as variant_cost_price,
        pv.quantity as variant_quantity
      FROM lats_products p
      LEFT JOIN lats_categories c ON c.id = p.category_id
      LEFT JOIN lats_product_variants pv ON pv.product_id = p.id
      WHERE p.name ILIKE '%Sony%WH%1000XM5%'
         OR p.name ILIKE '%Headphones%'
         OR p.name ILIKE '%WH-1000XM5%'
      ORDER BY p.created_at DESC
      LIMIT 5;
    `);

    console.log('🔍 Sony WH-1000XM5 Product Details:\n');
    
    if (result.rows.length === 0) {
      console.log('❌ No Sony WH-1000XM5 product found in database');
      console.log('\n📋 Searching for any product with "Sony" in the name...\n');
      
      const sonySearch = await client.query(`
        SELECT p.id, p.name, p.unit_price, pv.variant_name, pv.unit_price as variant_price
        FROM lats_products p
        LEFT JOIN lats_product_variants pv ON pv.product_id = p.id
        WHERE p.name ILIKE '%Sony%'
        LIMIT 10;
      `);
      
      if (sonySearch.rows.length > 0) {
        console.log('Found Sony products:');
        sonySearch.rows.forEach(row => {
          console.log(`  - ${row.name} (Product Price: ${row.unit_price}, Variant: ${row.variant_name || 'N/A'}, Variant Price: ${row.variant_price || 'N/A'})`);
        });
      } else {
        console.log('No Sony products found at all');
      }
    } else {
      result.rows.forEach((row, index) => {
        console.log(`Product ${index + 1}:`);
        console.log(`  ID: ${row.id}`);
        console.log(`  Name: ${row.name}`);
        console.log(`  SKU: ${row.sku || 'N/A'}`);
        console.log(`  Category: ${row.category_name || 'N/A'}`);
        console.log(`  Product Unit Price: ${row.unit_price} (Type: ${typeof row.unit_price})`);
        console.log(`  Product Cost Price: ${row.cost_price || 'N/A'}`);
        console.log(`  Is Active: ${row.is_active}`);
        
        if (row.variant_id) {
          console.log(`  Variant:`);
          console.log(`    - ID: ${row.variant_id}`);
          console.log(`    - Name: ${row.variant_name || 'Default'}`);
          console.log(`    - SKU: ${row.variant_sku || 'N/A'}`);
          console.log(`    - Unit Price: ${row.variant_unit_price} (Type: ${typeof row.variant_unit_price})`);
          console.log(`    - Cost Price: ${row.variant_cost_price || 'N/A'}`);
          console.log(`    - Quantity: ${row.variant_quantity || 0}`);
        } else {
          console.log(`  ⚠️  No variants found for this product!`);
        }
        console.log('');
      });
      
      // Check if price is actually 0
      const zeroPrice = result.rows.find(r => r.unit_price == 0 || r.variant_unit_price == 0);
      if (zeroPrice) {
        console.log('⚠️  WARNING: Found product with zero price!');
        console.log('This will cause "Invalid cart items" error in POS\n');
      } else {
        console.log('✅ All prices look good!\n');
      }
    }

    // Check all products to see pricing status
    const allPricesCheck = await client.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN unit_price > 0 THEN 1 END) as products_with_price,
        COUNT(CASE WHEN unit_price = 0 OR unit_price IS NULL THEN 1 END) as products_without_price,
        (SELECT COUNT(*) FROM lats_product_variants WHERE unit_price = 0 OR unit_price IS NULL) as variants_without_price
      FROM lats_products;
    `);
    
    console.log('📊 Database Summary:');
    console.log(`  Total Products: ${allPricesCheck.rows[0].total_products}`);
    console.log(`  Products with Price: ${allPricesCheck.rows[0].products_with_price}`);
    console.log(`  Products without Price: ${allPricesCheck.rows[0].products_without_price}`);
    console.log(`  Variants without Price: ${allPricesCheck.rows[0].variants_without_price}`);
    
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkSonyProduct();

