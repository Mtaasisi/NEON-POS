#!/usr/bin/env node

/**
 * 🧪 DEBUG NEON QUERY
 * Debug what's happening with the Neon query
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function debugNeonQuery() {
  try {
    console.log('🔍 Testing Neon query step by step...');
    
    // Test 1: Simple query
    console.log('\n📊 Test 1: Simple query');
    const start1 = Date.now();
    const result1 = await sql`SELECT COUNT(*) as count FROM lats_products`;
    const duration1 = Date.now() - start1;
    console.log(`✅ Count: ${result1[0].count} in ${duration1}ms`);
    
    // Test 2: Select with limit
    console.log('\n📊 Test 2: Select with limit');
    const start2 = Date.now();
    const result2 = await sql`SELECT * FROM lats_products LIMIT 5`;
    const duration2 = Date.now() - start2;
    console.log(`✅ Limited select: ${result2.length} products in ${duration2}ms`);
    
    // Test 3: Select all (this might be the issue)
    console.log('\n📊 Test 3: Select all products');
    const start3 = Date.now();
    
    // Add timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000)
    );
    
    const result3 = await Promise.race([
      sql`SELECT * FROM lats_products`,
      timeoutPromise
    ]);
    
    const duration3 = Date.now() - start3;
    console.log(`✅ Full select: ${result3.length} products in ${duration3}ms`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('🔍 The full select query is timing out.');
      console.log('💡 This suggests the issue is with the amount of data being transferred.');
      console.log('💡 Solution: Use pagination or limit the query.');
    }
  }
}

debugNeonQuery();
