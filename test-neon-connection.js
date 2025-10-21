#!/usr/bin/env node

/**
 * Neon Database Connection Test
 * Tests the database connection and identifies potential issues
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

// Database URL from database-config.json
const configPath = path.join(process.cwd(), 'database-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const DATABASE_URL = config.url;

console.log('🔍 Testing Neon Database Connection...');
console.log('📊 Database URL:', DATABASE_URL.substring(0, 50) + '...');

// Create Neon client with optimized configuration
const sql = neon(DATABASE_URL, {
  fetchOptions: {
    cache: 'no-store',
  },
  fullResults: true,
  poolQueryViaFetch: true,
});

async function testConnection() {
  try {
    console.log('🧪 Test 1: Basic connection test...');
    const basicTest = await sql`SELECT 1 as test`;
    console.log('✅ Basic connection successful:', basicTest);
    
    console.log('\n🧪 Test 2: Simple table query...');
    const tableTest = await sql`SELECT COUNT(*) as count FROM users`;
    console.log('✅ Table query successful:', tableTest);
    
    console.log('\n🧪 Test 3: Complex query with JOINs...');
    const complexTest = await sql`
      SELECT 
        p.id,
        p.name,
        s.name as supplier_name,
        c.name as category_name
      FROM lats_products p
      LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
      LEFT JOIN lats_categories c ON p.category_id = c.id
      LIMIT 5
    `;
    console.log('✅ Complex query successful:', complexTest);
    
    console.log('\n🧪 Test 4: Multiple rapid queries (stress test)...');
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(sql`SELECT ${i} as query_number, NOW() as timestamp`);
    }
    
    const rapidResults = await Promise.all(promises);
    console.log('✅ Rapid queries successful:', rapidResults.length, 'queries completed');
    
    console.log('\n🧪 Test 5: Large result set...');
    const largeTest = await sql`
      SELECT 
        p.id,
        p.name,
        pv.quantity,
        pv.selling_price
      FROM lats_products p
      LEFT JOIN lats_product_variants pv ON p.id = pv.product_id
      ORDER BY p.created_at DESC
      LIMIT 50
    `;
    console.log('✅ Large query successful:', largeTest.length, 'rows returned');
    
    console.log('\n🎉 All connection tests passed!');
    
    // Generate connection report
    const report = {
      timestamp: new Date().toISOString(),
      connectionStatus: 'SUCCESS',
      tests: {
        basicConnection: 'PASSED',
        tableQuery: 'PASSED',
        complexQuery: 'PASSED',
        rapidQueries: 'PASSED',
        largeResultSet: 'PASSED'
      },
      databaseUrl: DATABASE_URL.substring(0, 50) + '...',
      results: {
        userCount: tableTest[0]?.count || 0,
        productCount: largeTest.length,
        rapidQueryCount: rapidResults.length
      }
    };
    
    fs.writeFileSync('neon-connection-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Connection test report saved to: neon-connection-test-report.json');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('Full error:', error);
    
    // Generate error report
    const errorReport = {
      timestamp: new Date().toISOString(),
      connectionStatus: 'FAILED',
      error: {
        message: error.message,
        code: error.code,
        severity: error.severity
      },
      databaseUrl: DATABASE_URL.substring(0, 50) + '...',
      recommendations: [
        'Check database URL configuration',
        'Verify network connectivity',
        'Check Neon database status',
        'Review connection pooling settings'
      ]
    };
    
    fs.writeFileSync('neon-connection-error-report.json', JSON.stringify(errorReport, null, 2));
    console.log('\n💾 Error report saved to: neon-connection-error-report.json');
  }
}

testConnection().then(() => {
  console.log('\n🎉 Connection test completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Connection test failed:', error);
  process.exit(1);
});
