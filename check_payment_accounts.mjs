#!/usr/bin/env node

/**
 * Check Payment Accounts Status
 *
 * This script checks the current state of payment accounts in the database.
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

async function checkPaymentAccounts() {
  console.log('🔍 Checking payment accounts status...');

  try {
    // Check all finance accounts
    const allAccounts = await sql`
      SELECT id, name, type, is_active, is_payment_method, balance, currency
      FROM finance_accounts
      ORDER BY name
    `;

    console.log(`\n📊 Total finance accounts: ${allAccounts.length}`);
    console.log('All accounts:');
    allAccounts.forEach(account => {
      console.log(`   - ${account.name} (${account.type}) - Active: ${account.is_active}, Payment Method: ${account.is_payment_method}, Balance: ${account.balance} ${account.currency}`);
    });

    // Check payment method accounts specifically
    const paymentMethods = await sql`
      SELECT id, name, type, is_active, balance, currency
      FROM finance_accounts
      WHERE is_payment_method = true AND is_active = true
      ORDER BY name
    `;

    console.log(`\n💳 Active payment methods: ${paymentMethods.length}`);
    if (paymentMethods.length > 0) {
      paymentMethods.forEach(account => {
        console.log(`   ✅ ${account.name} (${account.type}) - Balance: ${account.balance} ${account.currency}`);
      });
    } else {
      console.log('   ❌ No active payment methods found!');
      console.log('   💡 You need to create payment accounts first.');
    }

    // Check if there are any accounts that could be payment methods but aren't
    const potentialPaymentMethods = await sql`
      SELECT id, name, type, is_active, is_payment_method, balance, currency
      FROM finance_accounts
      WHERE is_payment_method = false AND is_active = true
      ORDER BY name
    `;

    if (potentialPaymentMethods.length > 0) {
      console.log(`\n🔄 Potential payment methods (${potentialPaymentMethods.length}):`);
      potentialPaymentMethods.forEach(account => {
        console.log(`   - ${account.name} (${account.type}) - Could be converted to payment method`);
      });
      console.log('   💡 You can edit these accounts in Payment Account Management to enable "Payment Method"');
    }

  } catch (error) {
    console.error('❌ Error checking payment accounts:', error.message || error);
  }
}

// Run the script
checkPaymentAccounts().catch(console.error);
