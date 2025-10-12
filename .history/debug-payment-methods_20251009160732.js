#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function debugPaymentMethods() {
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
  });

  try {
    await client.connect();
    console.log('🔍 Debugging Payment Methods Loading...\n');

    // 1. Check the exact query from financeAccountService.getPaymentMethods()
    console.log('1. Testing financeAccountService.getPaymentMethods() query:');
    const result = await client.query(`
      SELECT *
      FROM finance_accounts
      WHERE is_active = true
        AND is_payment_method = true
      ORDER BY name
    `);

    console.log(`   ✅ Query successful: ${result.rows.length} payment methods found\n`);

    // 2. Check each payment method's structure
    console.log('2. Payment Methods Structure:');
    result.rows.forEach((method, index) => {
      console.log(`   ${index + 1}. ${method.name}`);
      console.log(`      - id: ${method.id}`);
      console.log(`      - type: ${method.type}`);
      console.log(`      - balance: ${method.balance}`);
      console.log(`      - currency: ${method.currency}`);
      console.log(`      - is_active: ${method.is_active}`);
      console.log(`      - is_payment_method: ${method.is_payment_method}`);
      console.log(`      - icon: ${method.icon || 'null'}`);
      console.log(`      - color: ${method.color || 'null'}`);
      console.log(`      - requires_reference: ${method.requires_reference || false}`);
      console.log(`      - requires_account_number: ${method.requires_account_number || false}`);
      console.log('');
    });

    // 3. Check for any data type issues
    console.log('3. Data Type Validation:');
    const typeIssues = [];
    result.rows.forEach(method => {
      // Check if required fields are present and correct type
      if (!method.id || typeof method.id !== 'string') {
        typeIssues.push(`${method.name}: Invalid ID`);
      }
      if (!method.name || typeof method.name !== 'string') {
        typeIssues.push(`${method.name}: Invalid name`);
      }
      if (!method.type || typeof method.type !== 'string') {
        typeIssues.push(`${method.name}: Invalid type`);
      }
      if (typeof method.balance !== 'number' && typeof method.balance !== 'string') {
        typeIssues.push(`${method.name}: Invalid balance type`);
      }
      if (!method.currency || typeof method.currency !== 'string') {
        typeIssues.push(`${method.name}: Invalid currency`);
      }
      if (typeof method.is_active !== 'boolean') {
        typeIssues.push(`${method.name}: Invalid is_active type`);
      }
      if (typeof method.is_payment_method !== 'boolean') {
        typeIssues.push(`${method.name}: Invalid is_payment_method type`);
      }
    });

    if (typeIssues.length === 0) {
      console.log('   ✅ All data types are valid\n');
    } else {
      console.log('   ❌ Data type issues found:');
      typeIssues.forEach(issue => console.log(`      - ${issue}`));
      console.log('');
    }

    // 4. Test the subscription query (what the context uses)
    console.log('4. Testing subscription filter query:');
    const subscriptionResult = await client.query(`
      SELECT *
      FROM finance_accounts
      WHERE is_payment_method = true
    `);
    console.log(`   ✅ Subscription query: ${subscriptionResult.rows.length} rows match filter\n`);

    // 5. Check for any RLS (Row Level Security) issues
    console.log('5. Checking RLS policies...');
    try {
      const rlsResult = await client.query(`
        SELECT schemaname, tablename, rowsecurity, policyname, cmd, qual, with_check
        FROM pg_policies 
        WHERE tablename = 'finance_accounts'
      `);
      
      if (rlsResult.rows.length > 0) {
        console.log(`   ⚠️  RLS policies found: ${rlsResult.rows.length} policies`);
        rlsResult.rows.forEach(policy => {
          console.log(`      - Policy: ${policy.policyname}, Command: ${policy.cmd}`);
        });
        console.log('');
      } else {
        console.log('   ✅ No RLS policies on finance_accounts table\n');
      }
    } catch (rlsError) {
      console.log('   ⚠️  Could not check RLS policies (might not have permission)\n');
    }

    // 6. Summary
    console.log('6. Summary:');
    console.log(`   Total Payment Methods: ${result.rows.length}`);
    console.log(`   Active: ${result.rows.filter(m => m.is_active).length}`);
    console.log(`   Payment Methods Flag: ${result.rows.filter(m => m.is_payment_method).length}`);
    console.log('');

    // 7. Recommendations
    console.log('7. Troubleshooting Recommendations:');
    console.log('   If payment methods still don\'t show in POS:');
    console.log('   1. Check browser console for JavaScript errors');
    console.log('   2. Check if PaymentMethodsContext is loading');
    console.log('   3. Check if usePaymentMethodsContext() is being called');
    console.log('   4. Check network tab for failed API calls');
    console.log('   5. Try refreshing the page');
    console.log('   6. Check if the POS page is using the correct context');

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

debugPaymentMethods();

