#!/usr/bin/env node

/**
 * Add branch_id to account_transactions table
 * This script adds branch isolation to transactions
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found in environment variables');
  console.error('');
  console.error('Please set VITE_DATABASE_URL in your .env file:');
  console.error('VITE_DATABASE_URL=postgresql://user:password@host/database');
  process.exit(1);
}

console.log('🚀 Adding branch_id to account_transactions...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📡 Connecting to:', DATABASE_URL.substring(0, 50) + '...');
console.log('');

// Create postgres connection
const sql = postgres(DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

async function runMigration() {
  try {
    console.log('⚙️  Adding branch_id column to account_transactions...');

    // Add branch_id column
    await sql`
      ALTER TABLE public.account_transactions
      ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.store_locations(id)
    `;

    console.log('✅ Added branch_id column');

    // Add index for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_account_transactions_branch_id
      ON public.account_transactions(branch_id)
    `;

    console.log('✅ Added branch_id index');

    // Add comment
    await sql`
      COMMENT ON COLUMN public.account_transactions.branch_id IS 'Branch ID for data isolation - references store_locations.id'
    `;

    console.log('✅ Added column comment');

    // Update existing transactions to have the same branch_id as their account
    const result = await sql`
      UPDATE public.account_transactions
      SET branch_id = finance_accounts.branch_id
      FROM public.finance_accounts
      WHERE account_transactions.account_id = finance_accounts.id
      AND account_transactions.branch_id IS NULL
    `;

    console.log(`✅ Updated ${result.count} existing transactions with branch_id`);

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ MIGRATION COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📊 Changes made:');
    console.log('   ✓ Added branch_id column to account_transactions');
    console.log('   ✓ Added performance index');
    console.log('   ✓ Updated existing transactions with account branch_id');
    console.log(`   ✓ ${result.count} transactions updated`);
    console.log('');
    console.log('🎉 Transactions are now branch-aware!');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR during migration:');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(error.message);
    console.error('');

    if (error.message.includes('already exists')) {
      console.log('ℹ️  Note: Column may already exist. Migration might be partially complete.');
    } else if (error.message.includes('connection')) {
      console.error('💡 Connection issue detected. Please check:');
      console.error('   - Your internet connection');
      console.error('   - The DATABASE_URL is correct');
      console.error('   - The database server is accessible');
      console.error('');
    } else {
      console.error('Full error:', error);
    }

    process.exit(1);
  } finally {
    // Close the connection
    await sql.end();
  }
}

// Run the migration
runMigration();
