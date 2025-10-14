#!/usr/bin/env node

/**
 * 🧪 TEST DIRECT NEON
 * Test direct Neon query vs supabase wrapper
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function testDirectNeon() {
  try {
    console.log('🔍 Testing direct Neon query...');
    
    // Test direct Neon query
    const start = Date.now();
    const result = await sql`SELECT * FROM lats_products LIMIT 10`;
    const duration = Date.now() - start;
    
    console.log(`✅ Direct Neon query: ${result.length} products in ${duration}ms`);
    
    result.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} (${product.sku})`);
    });
    
    // Test with ORDER BY
    console.log('\n🔍 Testing with ORDER BY...');
    const start2 = Date.now();
    const result2 = await sql`SELECT * FROM lats_products ORDER BY created_at DESC LIMIT 10`;
    const duration2 = Date.now() - start2;
    
    console.log(`✅ With ORDER BY: ${result2.length} products in ${duration2}ms`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDirectNeon();
