#!/usr/bin/env node

/**
 * 🧪 CHECK TABLE STRUCTURE
 * Checks the actual structure of the products table
 */

import { neon } from '@neondatabase/serverless';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function checkTableStructure() {
  try {
    console.log('🔍 Checking lats_products table structure...');
    
    // Get table structure
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'lats_products' 
      ORDER BY ordinal_position
    `;
    
    console.log('\n📋 Table columns:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    console.log('\n🔍 Checking product variants table structure...');
    const variantsInfo = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'lats_product_variants' 
      ORDER BY ordinal_position
    `;
    
    console.log('\n📋 Variants table columns:');
    variantsInfo.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    console.log('\n🔍 Sample products with correct columns...');
    const sampleProducts = await sql`
      SELECT id, name, sku, is_active, total_quantity, created_at
      FROM lats_products 
      WHERE name LIKE '%Sample%' 
      LIMIT 5
    `;
    console.log('📋 Sample products found:', sampleProducts.length);
    sampleProducts.forEach(product => {
      console.log(`  - ${product.name} (${product.sku}) - Active: ${product.is_active}, Qty: ${product.total_quantity}`);
    });
    
    console.log('\n🔍 All products count by status...');
    const statusCount = await sql`
      SELECT is_active, COUNT(*) as count
      FROM lats_products 
      GROUP BY is_active
    `;
    console.log('📊 Products by status:');
    statusCount.forEach(status => {
      console.log(`  - Active: ${status.is_active}, Count: ${status.count}`);
    });
    
    console.log('\n🔍 Checking variants with pricing...');
    const variantsWithPricing = await sql`
      SELECT p.name as product_name, v.sku as variant_sku, v.unit_price, v.cost_price, v.quantity
      FROM lats_products p
      JOIN lats_product_variants v ON p.id = v.product_id
      WHERE p.name LIKE '%Sample%'
      LIMIT 5
    `;
    console.log('📋 Sample variants with pricing:');
    variantsWithPricing.forEach(variant => {
      console.log(`  - ${variant.product_name} (${variant.variant_sku}) - Unit: ${variant.unit_price}, Cost: ${variant.cost_price}, Qty: ${variant.quantity}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking table structure:', error.message);
  }
}

checkTableStructure();
