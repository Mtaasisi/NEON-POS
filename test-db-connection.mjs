#!/usr/bin/env node

/**
 * Test Database Connection
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ No DATABASE_URL found in environment');
  process.exit(1);
}

console.log('🔍 Testing database connection...');
console.log(`📡 Database URL: ${DATABASE_URL.substring(0, 50)}...`);

const sql = neon(DATABASE_URL);

async function testConnection() {
  try {
    console.log('\n1️⃣ Testing basic connection...');
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Basic connection successful:', result);

    console.log('\n2️⃣ Testing products table...');
    const products = await sql`SELECT COUNT(*) as count FROM lats_products`;
    console.log('✅ Products table accessible:', products);

    console.log('\n3️⃣ Testing users table...');
    const users = await sql`SELECT COUNT(*) as count FROM users`;
    console.log('✅ Users table accessible:', users);

    console.log('\n✅ All tests passed! Database is accessible.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.error('\n📝 Error details:', error);
    process.exit(1);
  }
}

testConnection();

