#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

// Database connection
const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function fixFinanceAccounts() {
  try {
    console.log('🔗 Connected to database');

    // First, let's see what we have
    console.log('🔍 Current finance accounts:');
    const current = await sql`
      SELECT id, account_name, account_type, is_payment_method, is_active
      FROM finance_accounts 
      ORDER BY account_name, id
    `;
    
    console.log(`Found ${current.length} total accounts`);
    
    // Remove duplicates and keep the first occurrence of each account name
    console.log('\n🧹 Removing duplicates...');
    await sql`
      DELETE FROM finance_accounts 
      WHERE id NOT IN (
        SELECT DISTINCT ON (account_name) id 
        FROM finance_accounts 
        ORDER BY account_name, created_at ASC
      )
    `;
    
    // Update all remaining accounts to be payment methods
    console.log('🔧 Setting all accounts as payment methods...');
    await sql`
      UPDATE finance_accounts 
      SET is_payment_method = true, is_active = true
      WHERE is_active = true
    `;
    
    // Fetch and display the cleaned accounts
    console.log('\n✅ Fixed finance accounts:');
    const fixed = await sql`
      SELECT 
        id, account_name, account_type, currency, 
        current_balance, is_active, is_payment_method, bank_name
      FROM finance_accounts 
      WHERE is_active = true 
      ORDER BY account_name
    `;
    
    if (fixed.length === 0) {
      console.log('📭 No finance accounts found');
    } else {
      console.log(`\n📊 Found ${fixed.length} finance accounts:`);
      console.log('════════════════════════════════════════');
      
      fixed.forEach((account, index) => {
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
    
    console.log('\n🎯 Finance accounts are now properly configured!');
    console.log('💡 Your payment dialog should now show these accounts.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixFinanceAccounts();
