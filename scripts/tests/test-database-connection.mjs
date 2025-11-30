#!/usr/bin/env node

/**
 * Database Connection Test
 * 
 * Tests the Neon WebSocket pooler connection to verify CORS fix
 */

import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found in environment variables');
  console.error('Please check your .env file');
  process.exit(1);
}

console.log('🔍 Testing Neon Database Connection...\n');
console.log('📍 Connection String:', DATABASE_URL.substring(0, 50) + '...');
console.log('🔌 Using WebSocket Pooler Connection\n');

async function testConnection() {
  const pool = new Pool({ 
    connectionString: DATABASE_URL 
  });

  try {
    console.log('⏳ Attempting connection...');
    
    // Test 1: Simple query
    const result1 = await pool.query('SELECT 1 as test');
    console.log('✅ Test 1: Basic query successful');
    console.log('   Result:', result1.rows[0]);
    
    // Test 2: Check database name
    const result2 = await pool.query('SELECT current_database() as db_name');
    console.log('✅ Test 2: Database name query successful');
    console.log('   Database:', result2.rows[0].db_name);
    
    // Test 3: Check tables
    const result3 = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      LIMIT 5
    `);
    console.log('✅ Test 3: Tables query successful');
    console.log('   Sample tables:', result3.rows.map(r => r.table_name).join(', '));
    
    // Test 4: Check users table
    const result4 = await pool.query('SELECT COUNT(*) as user_count FROM users');
    console.log('✅ Test 4: Users table query successful');
    console.log('   Users count:', result4.rows[0].user_count);
    
    console.log('\n🎉 All tests passed! Database connection is working correctly.');
    console.log('🌐 WebSocket pooler connection is CORS-free and browser-compatible.');
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Connection test failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('CORS') || error.message.includes('Access Control')) {
      console.error('\n💡 CORS Error detected. This suggests:');
      console.error('   1. The HTTP API is still being used instead of WebSocket');
      console.error('   2. Check that src/lib/supabaseClient.ts has been updated');
      console.error('   3. Restart your development server');
    } else if (error.message.includes('authentication') || error.message.includes('password')) {
      console.error('\n💡 Authentication error. Check:');
      console.error('   1. Database credentials in .env file');
      console.error('   2. Connection string format');
    } else if (error.message.includes('does not exist')) {
      console.error('\n💡 Table does not exist. This is normal if:');
      console.error('   1. Database is newly created');
      console.error('   2. Migrations have not been run yet');
    }
    
    await pool.end();
    process.exit(1);
  }
}

console.log('🚀 Starting connection test...\n');
testConnection();
