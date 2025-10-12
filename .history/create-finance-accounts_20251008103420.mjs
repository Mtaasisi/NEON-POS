#!/usr/bin/env node

import { config } from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;

config();

const client = new Client({
  connectionString: process.env.DATABASE_URL || process.env.VITE_SUPABASE_URL
});

async function createFinanceAccounts() {
  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Create finance accounts
    const accounts = [
      {
        account_name: 'Cash',
        account_type: 'cash',
        currency: 'TZS',
        current_balance: 0,
        is_active: true,
        is_payment_method: true
      },
      {
        account_name: 'M-Pesa',
        account_type: 'mobile_money',
        currency: 'TZS',
        current_balance: 0,
        is_active: true,
        is_payment_method: true
      },
      {
        account_name: 'CRDB Bank',
        account_type: 'bank',
        bank_name: 'CRDB Bank',
        currency: 'TZS',
        current_balance: 0,
        is_active: true,
        is_payment_method: true
      },
      {
        account_name: 'Card Payments',
        account_type: 'card',
        currency: 'TZS',
        current_balance: 0,
        is_active: true,
        is_payment_method: true
      },
      {
        account_name: 'Airtel Money',
        account_type: 'mobile_money',
        currency: 'TZS',
        current_balance: 0,
        is_active: true,
        is_payment_method: true
      }
    ];

    console.log('🔧 Creating finance accounts...');
    
    for (const account of accounts) {
      const query = `
        INSERT INTO finance_accounts (
          account_name, account_type, currency, current_balance, 
          is_active, is_payment_method, bank_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (account_name) DO UPDATE SET
          account_type = EXCLUDED.account_type,
          currency = EXCLUDED.currency,
          current_balance = EXCLUDED.current_balance,
          is_active = EXCLUDED.is_active,
          is_payment_method = EXCLUDED.is_payment_method,
          bank_name = EXCLUDED.bank_name
        RETURNING id, account_name;
      `;
      
      const values = [
        account.account_name,
        account.account_type,
        account.currency,
        account.current_balance,
        account.is_active,
        account.is_payment_method,
        account.bank_name || null
      ];
      
      const result = await client.query(query, values);
      console.log(`✅ Created/Updated: ${result.rows[0].account_name}`);
    }

    // Fetch and display all accounts
    console.log('\n🔍 Fetching all finance accounts...');
    const fetchQuery = `
      SELECT 
        id, account_name, account_type, currency, 
        current_balance, is_active, is_payment_method, bank_name
      FROM finance_accounts 
      WHERE is_active = true 
      ORDER BY account_name
    `;
    
    const result = await client.query(fetchQuery);
    
    if (result.rows.length === 0) {
      console.log('📭 No finance accounts found');
    } else {
      console.log(`\n📊 Found ${result.rows.length} finance accounts:`);
      console.log('════════════════════════════════════════');
      
      result.rows.forEach((account, index) => {
        console.log(`${index + 1}. 💳 ${account.account_name}`);
        console.log(`   Type: ${account.account_type}`);
        console.log(`   Currency: ${account.currency}`);
        console.log(`   Balance: ${account.current_balance} ${account.currency}`);
        console.log(`   Active: ${account.is_active ? '✅' : '❌'}`);
        console.log(`   Payment Method: ${account.is_payment_method ? '✅' : '❌'}`);
        if (account.bank_name) {
          console.log(`   Bank: ${account.bank_name}`);
        }
        console.log('');
      });
    }
    
    console.log('🎯 Finance accounts are ready for your POS system!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createFinanceAccounts();
