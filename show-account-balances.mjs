#!/usr/bin/env node

/**
 * Account Balance Display Script
 * Shows current balances for all active accounts
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('💡 Please set VITE_DATABASE_URL in your .env file');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Format currency with thousands separator
function formatCurrency(amount, currency = 'TZS') {
  const formatted = Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${currency} ${formatted}`;
}

async function showAccountBalances() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('💰 ACCOUNT BALANCES REPORT');
    console.log('='.repeat(80) + '\n');

    // Query all active accounts
    const accounts = await sql`
      SELECT 
        id,
        name,
        type as account_type,
        balance,
        currency,
        is_active,
        is_payment_method,
        account_number,
        bank_name,
        updated_at
      FROM finance_accounts
      WHERE is_active = true
      ORDER BY currency, name
    `;

    if (!accounts || accounts.length === 0) {
      console.log('⚠️  No active accounts found\n');
      return;
    }

    // Group accounts by currency
    const accountsByCurrency = accounts.reduce((acc, account) => {
      const currency = account.currency || 'TZS';
      if (!acc[currency]) {
        acc[currency] = [];
      }
      acc[currency].push(account);
      return acc;
    }, {});

    // Display accounts grouped by currency
    for (const [currency, currencyAccounts] of Object.entries(accountsByCurrency)) {
      console.log(`\n📊 ${currency} Accounts:`);
      console.log('-'.repeat(80));
      
      let totalBalance = 0;
      
      for (const account of currencyAccounts) {
        const balance = Number(account.balance || 0);
        totalBalance += balance;
        
        const accountType = (account.account_type || 'unknown').toUpperCase().padEnd(15);
        const paymentMethod = account.is_payment_method ? '💳' : '  ';
        const balanceStr = formatCurrency(balance, currency).padStart(25);
        
        console.log(`${paymentMethod} ${accountType} ${account.name.padEnd(25)} ${balanceStr}`);
        
        // Show additional details for bank accounts
        if (account.account_type === 'bank' && (account.bank_name || account.account_number)) {
          const details = [];
          if (account.bank_name) details.push(account.bank_name);
          if (account.account_number) details.push(`A/C: ${account.account_number}`);
          console.log(`      ${details.join(' | ')}`);
        }
      }
      
      console.log('-'.repeat(80));
      console.log(`   TOTAL (${currency}):`.padEnd(55) + formatCurrency(totalBalance, currency).padStart(25));
    }

    // Get recent transactions for each account
    console.log('\n\n📈 RECENT TRANSACTIONS (Last 5 per account):');
    console.log('='.repeat(80));

    for (const account of accounts) {
      const transactions = await sql`
        SELECT 
          transaction_type,
          amount,
          balance_after,
          description,
          reference_number,
          created_at
        FROM account_transactions
        WHERE account_id = ${account.id}
        ORDER BY created_at DESC
        LIMIT 5
      `;

      if (transactions && transactions.length > 0) {
        console.log(`\n🏦 ${account.name} (${account.currency}):`);
        console.log('-'.repeat(80));
        
        for (const tx of transactions) {
          const date = new Date(tx.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          const type = tx.transaction_type.padEnd(20);
          const amount = formatCurrency(tx.amount, account.currency).padStart(20);
          const balance = formatCurrency(tx.balance_after, account.currency).padStart(20);
          
          // Use different symbols for different transaction types
          let symbol = '•';
          if (tx.transaction_type === 'payment_received' || tx.transaction_type === 'transfer_in') {
            symbol = '✅'; // Money in
          } else if (tx.transaction_type === 'expense' || tx.transaction_type === 'payment_made') {
            symbol = '❌'; // Money out
          }
          
          console.log(`${symbol} ${date.padEnd(15)} ${type} ${amount}  →  Bal: ${balance}`);
          if (tx.description) {
            console.log(`   ${tx.description.substring(0, 70)}`);
          }
        }
      }
    }

    // Summary statistics
    console.log('\n\n📊 SUMMARY STATISTICS:');
    console.log('='.repeat(80));
    
    const totalsByType = accounts.reduce((acc, account) => {
      const type = account.account_type || 'other';
      if (!acc[type]) {
        acc[type] = { count: 0, totalBalance: 0, currency: account.currency };
      }
      acc[type].count++;
      acc[type].totalBalance += Number(account.balance || 0);
      return acc;
    }, {});

    for (const [type, data] of Object.entries(totalsByType)) {
      console.log(`   ${type.toUpperCase().padEnd(15)}: ${data.count} account(s)  -  Total: ${formatCurrency(data.totalBalance, data.currency)}`);
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error fetching account balances:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the script
showAccountBalances()
  .then(() => {
    console.log('✅ Report completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });

