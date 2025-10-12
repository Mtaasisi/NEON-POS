#!/usr/bin/env node
/**
 * 🧪 TEST ALL QUERIES
 * Tests all the queries that were failing to make sure they work now
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('\n🧪 TESTING ALL PREVIOUSLY FAILING QUERIES\n');
  console.log('='.repeat(70));
  
  const sql = neon(DATABASE_URL);
  
  const tests = [
    {
      name: '1. Settings table - SMS config',
      query: `SELECT key, value FROM settings WHERE key IN ('sms_provider_api_key', 'sms_api_url', 'sms_provider_password')`
    },
    {
      name: '2. Finance Accounts - Payment Methods',
      query: `SELECT * FROM finance_accounts WHERE is_active = TRUE AND is_payment_method = TRUE ORDER BY name ASC`
    },
    {
      name: '3. Devices - All required columns',
      query: `SELECT 
        id, customer_id, brand, model, serial_number,
        issue_description, status, assigned_to, expected_return_date,
        created_at, updated_at, estimated_hours, diagnosis_required,
        device_notes, device_cost, repair_cost, repair_price, deposit_amount
      FROM devices 
      ORDER BY created_at DESC 
      LIMIT 5`
    },
    {
      name: '4. Customers - Full column set',
      query: `SELECT 
        id, name, phone, email, gender, city, color_tag,
        loyalty_level, points, total_spent, last_visit, is_active,
        referral_source, birth_month, birth_day, total_returns,
        profile_image, whatsapp, whatsapp_opt_out, initial_notes,
        notes, referrals, customer_tag, created_at, updated_at,
        created_by, last_purchase_date, total_purchases, birthday,
        referred_by, total_calls, total_call_duration_minutes,
        incoming_calls, outgoing_calls, missed_calls,
        avg_call_duration_minutes, first_call_date, last_call_date,
        call_loyalty_level
      FROM customers 
      ORDER BY created_at DESC 
      LIMIT 5`
    },
    {
      name: '5. User Daily Goals',
      query: `SELECT * FROM user_daily_goals WHERE user_id = '287ec561-d5f2-4113-840e-e9335b9d3f69' AND is_active = TRUE ORDER BY goal_type ASC`
    },
    {
      name: '6. Notifications',
      query: `SELECT * FROM notifications WHERE user_id = '287ec561-d5f2-4113-840e-e9335b9d3f69' ORDER BY created_at DESC LIMIT 5`
    },
    {
      name: '7. WhatsApp Instances',
      query: `SELECT * FROM whatsapp_instances_comprehensive WHERE user_id = '287ec561-d5f2-4113-840e-e9335b9d3f69' ORDER BY created_at DESC`
    },
    {
      name: '8. Devices with Customer (simple)',
      query: `SELECT 
        d.id, d.serial_number, d.brand, d.model, d.status,
        c.name as customer_name, c.phone as customer_phone
      FROM devices d
      LEFT JOIN customers c ON d.customer_id = c.id
      LIMIT 5`
    },
    {
      name: '9. Test INSERT INTO user_daily_goals',
      query: `INSERT INTO user_daily_goals (user_id, goal_type, goal_value, date, is_active) 
              VALUES ('test-user-id', 'new_customers', 5, CURRENT_DATE, true) 
              RETURNING *`
    },
    {
      name: '10. Clean up test INSERT',
      query: `DELETE FROM user_daily_goals WHERE user_id = 'test-user-id'`
    }
  ];
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n${test.name}`);
    console.log('─'.repeat(70));
    
    try {
      const result = await sql.unsafe(test.query);
      const rowCount = Array.isArray(result) ? result.length : 'N/A';
      console.log(`✅ PASSED - Returned ${rowCount} row(s)`);
      passedTests++;
      
      if (rowCount > 0 && i < tests.length - 2) {
        // Show first row for data queries (but not for the cleanup queries)
        console.log(`   Sample:`, JSON.stringify(result[0]).substring(0, 80) + '...');
      }
    } catch (err) {
      console.log(`❌ FAILED`);
      console.log(`   Error: ${err.message}`);
      console.log(`   Code: ${err.code || 'N/A'}`);
      failedTests++;
      
      // Show what needs to be fixed
      if (err.message.includes('column') && err.message.includes('does not exist')) {
        const match = err.message.match(/column "([^"]+)" does not exist/);
        if (match) {
          console.log(`   🔧 FIX NEEDED: Add column "${match[1]}"`);
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 RESULTS: ${passedTests}/${tests.length} tests passed`);
  
  if (failedTests === 0) {
    console.log('\n✨ 🎉 ALL TESTS PASSED! 🎉 ✨\n');
    console.log('Your database is fully fixed and ready to use!');
    console.log('\n📝 FINAL STEP:');
    console.log('   → Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)');
    console.log('   → All 400 errors should be gone!\n');
  } else {
    console.log(`\n⚠️  ${failedTests} test(s) failed - may need additional fixes\n`);
  }
}

main();

