#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

console.log('🔍 DIAGNOSING PRODUCTS DISPLAY ISSUE');
console.log('='.repeat(50));

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

async function diagnose() {
  try {
    console.log('📊 Checking database connection...');
    
    // Test connection
    const connectionTest = await sql`SELECT 1 as test`;
    console.log('✅ Database connected successfully');
    
    console.log('\n📦 Checking products data...');
    
    // Get total products count
    const totalProducts = await sql`
      SELECT COUNT(*) as total_count
      FROM lats_products
    `;
    console.log(`📊 Total products in database: ${totalProducts[0].total_count}`);
    
    // Get active products count
    const activeProducts = await sql`
      SELECT COUNT(*) as active_count
      FROM lats_products
      WHERE is_active = true
    `;
    console.log(`✅ Active products: ${activeProducts[0].active_count}`);
    
    // Get sample of actual products
    const sampleProducts = await sql`
      SELECT id, name, sku, selling_price, stock_quantity, is_active
      FROM lats_products
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    console.log('\n📋 Sample products from database:');
    console.log('-'.repeat(80));
    sampleProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} | SKU: ${product.sku} | Price: ${product.selling_price} | Stock: ${product.stock_quantity}`);
    });
    
    // Check categories
    const totalCategories = await sql`
      SELECT COUNT(*) as category_count
      FROM lats_categories
    `;
    console.log(`\n📁 Total categories: ${totalCategories[0].category_count}`);
    
    // Check for any sample/dummy data
    const sampleDataCheck = await sql`
      SELECT COUNT(*) as sample_count
      FROM lats_products
      WHERE name ILIKE '%sample%' OR name ILIKE '%test%' OR name ILIKE '%dummy%'
    `;
    
    if (sampleDataCheck[0].sample_count > 0) {
      console.log(`⚠️ Found ${sampleDataCheck[0].sample_count} sample/dummy products`);
      
      const sampleProducts = await sql`
        SELECT name, sku
        FROM lats_products
        WHERE name ILIKE '%sample%' OR name ILIKE '%test%' OR name ILIKE '%dummy%'
      `;
      
      console.log('Sample products found:');
      sampleProducts.forEach(p => {
        console.log(`  - ${p.name} (${p.sku})`);
      });
    } else {
      console.log('✅ No sample/dummy data found in database');
    }
    
    console.log('\n🔧 DIAGNOSIS COMPLETE');
    console.log('='.repeat(50));
    
    if (totalProducts[0].total_count === 57) {
      console.log('✅ Database has correct number of products (57)');
      console.log('🎯 ISSUE: UI is showing cached/dummy data instead of fetching from database');
      console.log('\n💡 SOLUTIONS:');
      console.log('1. Clear browser cache and localStorage');
      console.log('2. Check if .env file has correct DATABASE_URL');
      console.log('3. Restart development server');
      console.log('4. Check browser console for API errors');
    } else {
      console.log(`⚠️ Expected 57 products but found ${totalProducts[0].total_count}`);
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n💡 CHECK:');
    console.log('1. Database URL is correct');
    console.log('2. Database is accessible');
    console.log('3. Tables exist');
  }
}

diagnose();
