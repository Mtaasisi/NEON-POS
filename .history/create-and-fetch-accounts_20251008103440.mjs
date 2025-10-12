#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

// Database connection
const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function createAndFetchAccounts() {
  try {
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
      try {
        const result = await sql`
          INSERT INTO finance_accounts (
            account_name, account_type, currency, current_balance, 
            is_active, is_payment_method, bank_name
          ) VALUES (
            ${account.account_name}, 
            ${account.account_type}, 
            ${account.currency}, 
            ${account.current_balance}, 
            ${account.is_active}, 
            ${account.is_payment_method}, 
            ${account.bank_name || null}
          )
          ON CONFLICT (account_name) DO UPDATE SET
            account_type = EXCLUDED.account_type,
            currency = EXCLUDED.currency,
            current_balance = EXCLUDED.current_balance,
            is_active = EXCLUDED.is_active,
            is_payment_method = EXCLUDED.is_payment_method,
            bank_name = EXCLUDED.bank_name
          RETURNING id, account_name;
        `;
        console.log(`✅ Created/Updated: ${account.account_name}`);
      } catch (error) {
        console.log(`❌ Error creating ${account.account_name}:`, error.message);
      }
    }

    // Fetch and display all accounts
    console.log('\n🔍 Fetching all finance accounts...');
    
    const accounts_result = await sql`
      SELECT 
        id, account_name, account_type, currency, 
        current_balance, is_active, is_payment_method, bank_name
      FROM finance_accounts 
      WHERE is_active = true 
      ORDER BY account_name
    `;
    
    if (accounts_result.length === 0) {
      console.log('📭 No finance accounts found');
    } else {
      console.log(`\n📊 Found ${accounts_result.length} finance accounts:`);
      console.log('════════════════════════════════════════');
      
      accounts_result.forEach((account, index) => {
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
    
    // Test the fetching functionality
    console.log('🧪 Testing payment methods fetch...');
    const paymentMethods = await sql`
      SELECT * FROM finance_accounts 
      WHERE is_active = true AND is_payment_method = true 
      ORDER BY account_name
    `;
    
    console.log(`✅ Payment methods fetch test: ${paymentMethods.length} methods found`);
    
    console.log('\n🎯 Finance accounts are ready for your POS system!');
    console.log('💡 You can now use these accounts in your payment dialog.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createAndFetchAccounts();
