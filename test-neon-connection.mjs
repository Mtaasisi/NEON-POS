#!/usr/bin/env node

/**
 * 🧪 TEST NEON CONNECTION
 * Test Neon database connection directly
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function testNeonConnection() {
  try {
    console.log('🔍 Testing Neon connection...');
    
    // Test 1: Simple query
    console.log('\n📊 Test 1: Simple count query');
    const start1 = Date.now();
    const countResult = await sql`SELECT COUNT(*) as count FROM lats_products`;
    const duration1 = Date.now() - start1;
    console.log(`✅ Count query: ${countResult[0].count} products in ${duration1}ms`);
    
    // Test 2: Limited select
    console.log('\n📊 Test 2: Limited select (5 products)');
    const start2 = Date.now();
    const limitedResult = await sql`
      SELECT id, name, sku, is_active 
      FROM lats_products 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    const duration2 = Date.now() - start2;
    console.log(`✅ Limited query: ${limitedResult.length} products in ${duration2}ms`);
    limitedResult.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} (${product.sku})`);
    });
    
    // Test 3: Full select (this is what's hanging)
    console.log('\n📊 Test 3: Full select (all products)');
    const start3 = Date.now();
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Full select timeout after 10 seconds')), 10000)
    );
    
    const fullResult = await Promise.race([
      sql`SELECT * FROM lats_products ORDER BY created_at DESC`,
      timeoutPromise
    ]);
    
    const duration3 = Date.now() - start3;
    console.log(`✅ Full query: ${fullResult.length} products in ${duration3}ms`);
    
    // Test 4: Check if it's the ORDER BY clause
    console.log('\n📊 Test 4: Select without ORDER BY');
    const start4 = Date.now();
    const noOrderResult = await sql`SELECT * FROM lats_products LIMIT 10`;
    const duration4 = Date.now() - start4;
    console.log(`✅ No ORDER BY: ${noOrderResult.length} products in ${duration4}ms`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('🔍 The full select query is timing out. This suggests:');
      console.log('  1. The ORDER BY clause might be slow on large datasets');
      console.log('  2. There might be too much data to transfer');
      console.log('  3. The Neon connection might be throttled');
    }
  }
}

testNeonConnection();
