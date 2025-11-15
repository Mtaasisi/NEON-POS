#!/usr/bin/env node

/**
 * Create Default Payment Accounts
 *
 * This script creates basic payment accounts that are needed for the expense management system.
 * Run this script to set up default accounts for testing and development.
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

const defaultAccounts = [
  {
    name: 'Cash Register',
    type: 'cash',
    balance: 0,
    currency: 'TZS',
    is_active: true,
    is_payment_method: true,
    requires_reference: false,
    requires_account_number: false,
    notes: 'Main cash register for daily transactions'
  },
  {
    name: 'Bank Account - CRDB',
    type: 'bank',
    balance: 0,
    currency: 'TZS',
    account_number: '1234567890',
    bank_name: 'CRDB Bank',
    is_active: true,
    is_payment_method: true,
    requires_reference: true,
    requires_account_number: false,
    notes: 'Main business bank account'
  },
  {
    name: 'M-Pesa',
    type: 'mobile_money',
    balance: 0,
    currency: 'TZS',
    account_number: '+255712345678',
    bank_name: 'M-Pesa',
    is_active: true,
    is_payment_method: true,
    requires_reference: true,
    requires_account_number: true,
    notes: 'Mobile money account for payments'
  },
  {
    name: 'Airtel Money',
    type: 'mobile_money',
    balance: 0,
    currency: 'TZS',
    account_number: '+255712345679',
    bank_name: 'Airtel Money',
    is_active: true,
    is_payment_method: true,
    requires_reference: true,
    requires_account_number: true,
    notes: 'Secondary mobile money account'
  },
  {
    name: 'Tigo Pesa',
    type: 'mobile_money',
    balance: 0,
    currency: 'TZS',
    account_number: '+255712345680',
    bank_name: 'Tigo Pesa',
    is_active: true,
    is_payment_method: true,
    requires_reference: true,
    requires_account_number: true,
    notes: 'Third mobile money account'
  }
];

async function createDefaultAccounts() {
  console.log('🚀 Creating default payment accounts...');

  try {
    // Check if accounts already exist
    const existingAccounts = await sql`
      SELECT id, name FROM finance_accounts LIMIT 10
    `;

    if (existingAccounts.length > 0) {
      console.log('⚠️  Payment accounts already exist:');
      existingAccounts.forEach(account => {
        console.log(`   - ${account.name} (ID: ${account.id})`);
      });
      console.log('\n💡 To create fresh accounts, delete existing ones first.');
      console.log('   You can do this in the Payment Account Management page.');
      return;
    }

    // Create accounts
    console.log('📝 Creating accounts...');

    for (const account of defaultAccounts) {
      console.log(`   Creating: ${account.name} (${account.type})`);

      try {
        const result = await sql`
          INSERT INTO finance_accounts (
            name, type, balance, currency, account_number, bank_name,
            is_active, is_payment_method, requires_reference, requires_account_number, notes
          ) VALUES (
            ${account.name}, ${account.type}, ${account.balance}, ${account.currency},
            ${account.account_number || null}, ${account.bank_name || null},
            ${account.is_active}, ${account.is_payment_method},
            ${account.requires_reference}, ${account.requires_account_number}, ${account.notes}
          )
          RETURNING id, name
        `;

        if (result.length > 0) {
          console.log(`✅ Created: ${result[0].name} (ID: ${result[0].id})`);
        } else {
          console.log(`❌ Failed to create ${account.name}: No result returned`);
        }
      } catch (error) {
        console.error(`❌ Failed to create ${account.name}:`, error.message || error);
      }
    }

    console.log('\n🎉 Default payment accounts created successfully!');
    console.log('📍 You can now use the Expense Management feature.');
    console.log('   Go to: Payments → Expense Management');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message || error);
  }
}

// Run the script
createDefaultAccounts().catch(console.error);
