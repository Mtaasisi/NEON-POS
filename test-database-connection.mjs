#!/usr/bin/env node

/**
 * 🧪 DATABASE CONNECTION TEST
 * Tests the database connection and product loading
 */

import { neon } from '@neondatabase/serverless';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

console.log('🔍 Testing database connection...');
console.log('📊 Database URL:', DATABASE_URL ? 'Configured' : 'NOT CONFIGURED');

if (!DATABASE_URL) {
  console.error('❌ No database URL found!');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function testConnection() {
  try {
    console.log('\n🔍 Testing basic connection...');
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Basic connection test:', result);
    
    console.log('\n🔍 Testing products table...');
    const productsCount = await sql`SELECT COUNT(*) as count FROM lats_products`;
    console.log('📊 Total products in database:', productsCount);
    
    console.log('\n🔍 Testing sample products...');
    const sampleProducts = await sql`
      SELECT id, name, sku, is_active, total_quantity, price 
      FROM lats_products 
      WHERE name LIKE '%Sample%' 
      LIMIT 5
    `;
    console.log('📋 Sample products found:', sampleProducts.length);
    sampleProducts.forEach(product => {
      console.log(`  - ${product.name} (${product.sku}) - Qty: ${product.total_quantity}, Price: ${product.price}`);
    });
    
    console.log('\n🔍 Testing all products...');
    const allProducts = await sql`
      SELECT id, name, sku, is_active, total_quantity, price 
      FROM lats_products 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    console.log('📋 Recent products:', allProducts.length);
    allProducts.forEach(product => {
      console.log(`  - ${product.name} (${product.sku}) - Active: ${product.is_active}, Qty: ${product.total_quantity}`);
    });
    
    console.log('\n🔍 Testing product variants...');
    const variantsCount = await sql`SELECT COUNT(*) as count FROM lats_product_variants`;
    console.log('📊 Total variants in database:', variantsCount);
    
    console.log('\n✅ Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    console.error('Error details:', error);
  }
}

testConnection();
