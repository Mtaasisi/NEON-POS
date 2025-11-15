#!/usr/bin/env node

/**
 * Populate Basic Payment Accounts
 *
 * Creates essential payment accounts that will definitely be visible in Expense Management.
 * These accounts are set up to work regardless of branch settings.
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Get environment variables
const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Missing database URL environment variables');
  process.exit(1);
}

// Create Neon SQL client
const sql = neon(databaseUrl);

const basicAccounts = [
  {
    name: 'Main Cash Register',
    type: 'cash',
    balance: 100000, // Start with some balance
    currency: 'TZS',
    branch_id: null, // Global
    is_shared: false,
    is_active: true,
    is_payment_method: true,
    requires_reference: false,
    requires_account_number: false,
    payment_icon: 'dollar-sign',
    payment_color: '#10B981',
    notes: 'Primary cash register - available in all branches'
  },
  {
    name: 'Business Bank Account',
    type: 'bank',
    balance: 500000,
    currency: 'TZS',
    account_number: 'BUS001234',
    bank_name: 'CRDB Bank',
    branch_id: null, // Global
    is_shared: false,
    is_active: true,
    is_payment_method: true,
    requires_reference: true,
    requires_account_number: false,
    payment_icon: 'building',
    payment_color: '#3B82F6',
    notes: 'Main business bank account'
  },
  {
    name: 'M-Pesa Business',
    type: 'mobile_money',
    balance: 25000,
    currency: 'TZS',
    account_number: '+255712345678',
    bank_name: 'M-Pesa',
    branch_id: null, // Global
    is_shared: false,
    is_active: true,
    is_payment_method: true,
    requires_reference: true,
    requires_account_number: true,
    payment_icon: 'smartphone',
    payment_color: '#DC2626',
    notes: 'Mobile money account for payments'
  }
];

async function populateBasicAccounts() {
  console.log('🚀 Populating basic payment accounts...');

  try {
    // Delete existing accounts to start fresh
    console.log('🗑️  Clearing existing accounts...');
    await sql`
      DELETE FROM finance_accounts
      WHERE name IN ('Main Cash Register', 'Business Bank Account', 'M-Pesa Business')
    `;

    // Create the basic accounts
    console.log('📝 Creating essential accounts...');

    for (const account of basicAccounts) {
      console.log(`   Creating: ${account.name} (${account.type})`);

      await sql`
        INSERT INTO finance_accounts (
          name, type, balance, currency, account_number, bank_name,
          branch_id, is_shared, is_active, is_payment_method,
          requires_reference, requires_account_number,
          icon, color, notes
        ) VALUES (
          ${account.name}, ${account.type}, ${account.balance}, ${account.currency},
          ${account.account_number || null}, ${account.bank_name || null},
          ${account.branch_id}, ${account.is_shared}, ${account.is_active}, ${account.is_payment_method},
          ${account.requires_reference}, ${account.requires_account_number},
          ${account.payment_icon}, ${account.payment_color}, ${account.notes}
        )
      `;

      console.log(`✅ Created: ${account.name} (${account.balance.toLocaleString()} ${account.currency})`);
    }

    // Verify the accounts were created
    const createdAccounts = await sql`
      SELECT id, name, type, balance, currency, is_payment_method, is_active
      FROM finance_accounts
      WHERE name IN ('Main Cash Register', 'Business Bank Account', 'M-Pesa Business')
      ORDER BY name
    `;

    console.log('\n✅ Verification - Created accounts:');
    createdAccounts.forEach(account => {
      console.log(`   📋 ${account.name} (${account.type}) - ${account.balance.toLocaleString()} ${account.currency}`);
    });

    console.log('\n🎉 Success! Basic payment accounts created.');
    console.log('📍 These accounts should now be visible in:');
    console.log('   • Payment Account Management page');
    console.log('   • Expense Management (Payment Account dropdown)');
    console.log('   • Any other place that uses payment methods');

    console.log('\n💡 Next steps:');
    console.log('   1. Open the app: http://localhost:5173');
    console.log('   2. Go to Payments → Expense Management');
    console.log('   3. Click "Add Expense"');
    console.log('   4. Check if accounts appear in the dropdown');

  } catch (error) {
    console.error('❌ Error populating accounts:', error.message || error);
  }
}

// Run the script
populateBasicAccounts().catch(console.error);
