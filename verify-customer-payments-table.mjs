#!/usr/bin/env node

/**
 * Verify customer_payments table structure
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function verifyTable() {
  try {
    console.log('🔍 Checking customer_payments table structure...\n');

    // Check if table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'customer_payments'
      ) as table_exists
    `;

    if (!tableCheck[0]?.table_exists) {
      console.log('❌ customer_payments table does not exist!');
      process.exit(1);
    }

    console.log('✅ customer_payments table exists\n');

    // Get all columns
    const columns = await sql`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'customer_payments'
      ORDER BY ordinal_position
    `;

    console.log('📊 customer_payments table columns:');
    console.table(columns);

    // Check specifically for customer_id
    const hasCustomerId = columns.some(col => col.column_name === 'customer_id');
    
    if (hasCustomerId) {
      console.log('\n✅ customer_id column EXISTS in customer_payments table');
    } else {
      console.log('\n❌ customer_id column MISSING from customer_payments table');
      console.log('\n🔧 Would you like to add it? Run:');
      console.log('   node add-missing-customer-id-columns.mjs');
    }

    // Try a test query
    console.log('\n🔍 Testing a query with customer_id...');
    try {
      const testResult = await sql`
        SELECT customer_id, amount, payment_date 
        FROM customer_payments 
        LIMIT 1
      `;
      console.log('✅ Query successful! Sample data:');
      console.table(testResult);
    } catch (error) {
      console.error('❌ Query failed:', error.message);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

verifyTable();

