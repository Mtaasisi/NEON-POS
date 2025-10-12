#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createFinanceAccounts() {
  console.log('🔧 Creating finance accounts...');
  
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

  for (const account of accounts) {
    const { data, error } = await supabase
      .from('finance_accounts')
      .upsert(account, { onConflict: 'account_name' });
      
    if (error) {
      console.log(`❌ Error creating ${account.account_name}:`, error.message);
    } else {
      console.log(`✅ Created/Updated: ${account.account_name}`);
    }
  }
}

async function fetchFinanceAccounts() {
  console.log('\n🔍 Fetching finance accounts...');
  
  const { data, error } = await supabase
    .from('finance_accounts')
    .select('*')
    .eq('is_active', true)
    .eq('is_payment_method', true)
    .order('account_name');
    
  if (error) {
    console.log('❌ Error fetching accounts:', error.message);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('📭 No finance accounts found');
    return;
  }
  
  console.log(`\n📊 Found ${data.length} finance accounts:`);
  console.log('════════════════════════════════════════');
  
  data.forEach((account, index) => {
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
  
  console.log('🎯 Finance accounts are ready for your POS system!');
}

async function main() {
  try {
    await createFinanceAccounts();
    await fetchFinanceAccounts();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
