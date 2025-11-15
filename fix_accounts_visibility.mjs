#!/usr/bin/env node

/**
 * Fix Accounts Visibility
 *
 * This script ensures that payment accounts are visible in the Expense Management.
 * It creates default accounts and sets up proper branch visibility.
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Get environment variables
const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Missing database URL environment variables');
  console.error('Please set VITE_DATABASE_URL or DATABASE_URL in your .env file');
  process.exit(1);
}

// Create Neon SQL client
const sql = neon(databaseUrl);

async function fixAccountsVisibility() {
  console.log('🔧 Fixing accounts visibility for Expense Management...');

  try {
    // Step 1: Check current accounts and their branch status
    console.log('\n📊 Step 1: Analyzing current accounts...');
    const accounts = await sql`
      SELECT id, name, type, branch_id, is_shared, is_active, is_payment_method
      FROM finance_accounts
      ORDER BY name
    `;

    console.log(`Found ${accounts.length} accounts:`);
    accounts.forEach(account => {
      const branchInfo = account.branch_id
        ? `Branch: ${account.branch_id}${account.is_shared ? ' (shared)' : ''}`
        : 'Branch: null (global)';
      console.log(`   - ${account.name} (${account.type}) - ${branchInfo}`);
    });

    // Step 2: Create default global accounts if needed
    console.log('\n📝 Step 2: Ensuring default global accounts exist...');

    const defaultGlobalAccounts = [
      {
        name: 'Main Cash Register',
        type: 'cash',
        balance: 0,
        currency: 'TZS',
        branch_id: null,
        is_shared: false,
        is_active: true,
        is_payment_method: true,
        requires_reference: false,
        requires_account_number: false,
        notes: 'Main cash register - available in all branches'
      },
      {
        name: 'Primary Bank Account',
        type: 'bank',
        balance: 0,
        currency: 'TZS',
        account_number: 'MAIN001',
        bank_name: 'Main Bank',
        branch_id: null,
        is_shared: false,
        is_active: true,
        is_payment_method: true,
        requires_reference: true,
        requires_account_number: false,
        notes: 'Primary business bank account - available in all branches'
      }
    ];

    for (const account of defaultGlobalAccounts) {
      // Check if account already exists
      const existing = await sql`
        SELECT id FROM finance_accounts
        WHERE name = ${account.name} AND branch_id IS NULL
        LIMIT 1
      `;

      if (existing.length === 0) {
        console.log(`   Creating: ${account.name}`);
        await sql`
          INSERT INTO finance_accounts (
            name, type, balance, currency, account_number, bank_name,
            branch_id, is_shared, is_active, is_payment_method,
            requires_reference, requires_account_number, notes
          ) VALUES (
            ${account.name}, ${account.type}, ${account.balance}, ${account.currency},
            ${account.account_number || null}, ${account.bank_name || null},
            ${account.branch_id}, ${account.is_shared}, ${account.is_active}, ${account.is_payment_method},
            ${account.requires_reference}, ${account.requires_account_number}, ${account.notes}
          )
        `;
      } else {
        console.log(`   ✅ Already exists: ${account.name}`);
      }
    }

    // Step 3: Ensure some accounts are shared (visible in any branch)
    console.log('\n🔄 Step 3: Making key accounts shared...');

    // Make "Cashi" account shared if it exists and isn't already shared
    const cashiAccount = accounts.find(acc => acc.name === 'Cashi');
    if (cashiAccount && !cashiAccount.is_shared) {
      console.log('   Making "Cashi" account shared...');
      await sql`
        UPDATE finance_accounts
        SET is_shared = true
        WHERE id = ${cashiAccount.id}
      `;
    }

    // Step 4: Final verification
    console.log('\n✅ Step 4: Final verification...');
    const finalAccounts = await sql`
      SELECT id, name, type, branch_id, is_shared, is_active, is_payment_method
      FROM finance_accounts
      WHERE is_payment_method = true AND is_active = true
      ORDER BY name
    `;

    console.log(`\n🎉 Final result: ${finalAccounts.length} active payment methods`);
    console.log('Visible accounts (global + shared):');
    finalAccounts.forEach(account => {
      const visibility = !account.branch_id ? 'global' :
                        account.is_shared ? 'shared' :
                        `branch: ${account.branch_id}`;
      console.log(`   ✅ ${account.name} (${account.type}) - ${visibility}`);
    });

    console.log('\n💡 Summary:');
    console.log('   - Global accounts: Visible in all branches');
    console.log('   - Shared accounts: Visible in all branches');
    console.log('   - Branch-specific accounts: Only visible in their branch');
    console.log('   - If you still see "accounts is empty", check your browser\'s current branch setting');

  } catch (error) {
    console.error('❌ Error fixing accounts visibility:', error.message || error);
  }
}

// Run the script
fixAccountsVisibility().catch(console.error);
