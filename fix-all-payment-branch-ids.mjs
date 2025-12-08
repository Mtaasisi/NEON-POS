#!/usr/bin/env node

/**
 * Fix all payment accounts and payments to have branch_id
 * This ensures proper branch isolation for all financial data
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.production') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL or SUPABASE_DB_URL not found in environment variables');
  console.error('Please set DATABASE_URL in your .env.production file');
  process.exit(1);
}

async function fixAllPaymentBranchIds() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read the SQL file
    const sqlFile = join(__dirname, 'FIX_ALL_PAYMENT_ACCOUNTS_AND_PAYMENTS_BRANCH_ID.sql');
    const sql = readFileSync(sqlFile, 'utf8');

    console.log('📝 Executing SQL to fix all payment accounts and payments...\n');
    
    // Execute the SQL
    await client.query(sql);

    console.log('\n✅ Done! All payment accounts and payments now have branch_id assigned.');
    console.log('\n📊 Verification results:');
    
    // Run verification queries
    const tables = [
      'finance_accounts',
      'customer_payments',
      'purchase_order_payments',
      'payment_transactions',
      'account_transactions'
    ];

    for (const table of tables) {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(branch_id) as with_branch_id,
          COUNT(*) - COUNT(branch_id) as missing_branch_id
        FROM ${table}
      `);

      const { total, with_branch_id, missing_branch_id } = result.rows[0];
      const status = missing_branch_id === '0' ? '✅' : '⚠️';
      
      console.log(`   ${status} ${table}: ${with_branch_id}/${total} have branch_id (${missing_branch_id} missing)`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing payment branch IDs:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
fixAllPaymentBranchIds().catch(console.error);

