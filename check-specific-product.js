#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkProduct() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Checking Product "22222" Details...\n');
    console.log('='.repeat(80));

    // Get product info
    const productQuery = `
      SELECT * FROM lats_products 
      WHERE name = '22222' OR sku LIKE '%22222%'
    `;
    const productResult = await client.query(productQuery);
    
    if (productResult.rows.length > 0) {
      console.log('\n📦 PRODUCT INFO:');
      console.log(JSON.stringify(productResult.rows[0], null, 2));
    }

    // Get variant info
    const variantQuery = `
      SELECT * FROM lats_product_variants v
      WHERE v.product_id IN (
        SELECT id FROM lats_products WHERE name = '22222' OR sku LIKE '%22222%'
      )
    `;
    const variantResult = await client.query(variantQuery);
    
    if (variantResult.rows.length > 0) {
      console.log('\n\n🔢 VARIANT INFO:');
      variantResult.rows.forEach(v => {
        console.log('\n' + '-'.repeat(80));
        console.log(`Variant ID: ${v.id}`);
        console.log(`SKU: ${v.sku}`);
        console.log(`Name: ${v.name}`);
        console.log(`Quantity: ${v.quantity}`);
        console.log(`Cost Price: ${v.cost_price}`);
        console.log(`Selling Price: ${v.selling_price}`);
        console.log(`Unit Price: ${v.unit_price}`);
        console.log(`Created: ${v.created_at}`);
        console.log(`Updated: ${v.updated_at}`);
      });

      // Check inventory items for this variant
      const inventoryQuery = `
        SELECT 
          status,
          COUNT(*) as count
        FROM inventory_items
        WHERE variant_id = $1
        GROUP BY status
      `;
      
      for (const variant of variantResult.rows) {
        const inventoryResult = await client.query(inventoryQuery, [variant.id]);
        
        console.log('\n\n📊 INVENTORY ITEMS for variant ' + variant.sku + ':');
        console.log('-'.repeat(80));
        
        if (inventoryResult.rows.length === 0) {
          console.log('   No inventory items found');
        } else {
          let total = 0;
          inventoryResult.rows.forEach(row => {
            console.log(`   ${row.status}: ${row.count} items`);
            total += parseInt(row.count);
          });
          console.log(`   TOTAL: ${total} items`);
        }
      }
    }

    // Also check if there's stock_quantity field (old schema)
    const stockQuery = `
      SELECT 
        column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lats_product_variants' 
        AND column_name IN ('quantity', 'stock_quantity')
    `;
    const stockResult = await client.query(stockQuery);
    
    console.log('\n\n📋 Available quantity fields in table:');
    stockResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Check Complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

checkProduct();

