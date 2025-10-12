#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function testPaymentContext() {
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
  });

  try {
    await client.connect();
    console.log('🧪 Testing PaymentMethodsContext Query...\n');

    // Test 1: Exact query from financeAccountService.getPaymentMethods()
    console.log('1. Testing financeAccountService.getPaymentMethods() query:');
    const result = await client.query(`
      SELECT *
      FROM finance_accounts
      WHERE is_active = true
        AND is_payment_method = true
      ORDER BY name
    `);

    console.log(`   ✅ Query successful: ${result.rows.length} payment methods`);
    if (result.rows.length > 0) {
      console.log('   📋 Payment methods found:');
      result.rows.forEach((method, index) => {
        console.log(`      ${index + 1}. ${method.name} (${method.type})`);
      });
    }
    console.log('');

    // Test 2: Check if there are any RLS policies blocking access
    console.log('2. Checking for RLS policies:');
    try {
      const rlsResult = await client.query(`
        SELECT schemaname, tablename, rowsecurity, policyname, cmd
        FROM pg_policies 
        WHERE tablename = 'finance_accounts'
      `);
      
      if (rlsResult.rows.length > 0) {
        console.log(`   ⚠️  Found ${rlsResult.rows.length} RLS policies:`);
        rlsResult.rows.forEach(policy => {
          console.log(`      - ${policy.policyname} (${policy.cmd})`);
        });
        console.log('   ⚠️  This might be blocking frontend access!');
      } else {
        console.log('   ✅ No RLS policies found');
      }
    } catch (rlsError) {
      console.log('   ⚠️  Could not check RLS policies');
    }
    console.log('');

    // Test 3: Check table permissions
    console.log('3. Checking table permissions:');
    try {
      const permResult = await client.query(`
        SELECT grantee, privilege_type
        FROM information_schema.table_privileges
        WHERE table_name = 'finance_accounts'
          AND table_schema = 'public'
      `);
      
      if (permResult.rows.length > 0) {
        console.log(`   ✅ Found ${permResult.rows.length} table privileges:`);
        permResult.rows.forEach(perm => {
          console.log(`      - ${perm.grantee}: ${perm.privilege_type}`);
        });
      } else {
        console.log('   ⚠️  No table privileges found - this might be the issue!');
      }
    } catch (permError) {
      console.log('   ⚠️  Could not check table permissions');
    }
    console.log('');

    // Test 4: Check if user has proper access
    console.log('4. Checking current user access:');
    try {
      const userResult = await client.query('SELECT current_user, session_user');
      console.log(`   Current user: ${userResult.rows[0].current_user}`);
      console.log(`   Session user: ${userResult.rows[0].session_user}`);
    } catch (userError) {
      console.log('   ⚠️  Could not check user info');
    }
    console.log('');

    // Test 5: Try to simulate frontend access
    console.log('5. Simulating frontend query with error handling:');
    try {
      const { data, error } = await client.query(`
        SELECT id, name, type, balance, currency, is_active, is_payment_method
        FROM finance_accounts
        WHERE is_active = true
          AND is_payment_method = true
        ORDER BY name
      `);
      
      if (error) {
        console.log('   ❌ Query failed:', error.message);
        console.log('   ❌ Error details:', error.details);
      } else {
        console.log(`   ✅ Frontend simulation successful: ${data.rows.length} methods`);
      }
    } catch (simError) {
      console.log('   ❌ Frontend simulation failed:', simError.message);
    }
    console.log('');

    // Summary and recommendations
    console.log('📋 Summary:');
    console.log(`   Payment methods in DB: ${result.rows.length}`);
    console.log('   Status: Database has payment methods');
    console.log('');
    
    console.log('💡 Troubleshooting steps for frontend:');
    console.log('   1. Check browser console for JavaScript errors');
    console.log('   2. Check Network tab for failed API calls');
    console.log('   3. Verify PaymentMethodsContext is loading');
    console.log('   4. Check if Supabase client is properly configured');
    console.log('   5. Try refreshing the page');
    console.log('   6. Check if there are any CORS issues');

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testPaymentContext();

