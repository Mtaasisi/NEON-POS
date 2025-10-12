#!/usr/bin/env node
/**
 * 🔍 CAPTURE REMAINING ERRORS
 * Simulates the exact queries that are still failing
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('\n🔍 TESTING QUERIES THAT ARE STILL FAILING...\n');
  
  const sql = neon(DATABASE_URL);
  
  const queries = [
    {
      name: 'SMS Settings Query',
      query: `SELECT key, value FROM settings WHERE key IN ('sms_provider_api_key', 'sms_api_url', 'sms_provider_password')`
    },
    {
      name: 'Devices with Customer JOIN',
      query: `SELECT 
        d.id,
        d.serial_number,
        d.brand,
        d.model,
        d.status,
        d.updated_at,
        d.customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email
      FROM devices d
      LEFT JOIN customers c ON d.customer_id = c.id
      WHERE d.status = 'repair-complete' 
      AND d.updated_at < NOW() - INTERVAL '1 day'
      LIMIT 5`
    },
    {
      name: 'Customers Full Query',
      query: `SELECT 
        id, name, phone, email, gender, city, color_tag,
        loyalty_level, points, total_spent, last_visit, is_active,
        referral_source, birth_month, birth_day, total_returns,
        profile_image, whatsapp, whatsapp_opt_out, initial_notes,
        notes, referrals, customer_tag, created_at, updated_at,
        created_by, last_purchase_date, total_purchases, birthday,
        referred_by
      FROM customers 
      LIMIT 5`
    },
    {
      name: 'User Daily Goals',
      query: `SELECT * FROM user_daily_goals WHERE user_id = '287ec561-d5f2-4113-840e-e9335b9d3f69' AND is_active = TRUE ORDER BY goal_type ASC`
    }
  ];
  
  for (const test of queries) {
    console.log(`\n📋 Testing: ${test.name}`);
    console.log('─'.repeat(60));
    
    try {
      const result = await sql.unsafe(test.query);
      console.log(`✅ SUCCESS - Returned ${result.length} rows`);
    } catch (err) {
      console.log(`❌ FAILED`);
      console.log(`   Error: ${err.message}`);
      console.log(`   Code: ${err.code || 'N/A'}`);
      
      // Try to fix the error
      if (err.message.includes('column') && err.message.includes('does not exist')) {
        const match = err.message.match(/column "([^"]+)" does not exist/);
        if (match) {
          const missingCol = match[1];
          console.log(`   ⚠️  Missing column: ${missingCol}`);
        }
      }
      
      if (err.message.includes('relation') && err.message.includes('does not exist')) {
        const match = err.message.match(/relation "([^"]+)" does not exist/);
        if (match) {
          const missingTable = match[1];
          console.log(`   ⚠️  Missing table: ${missingTable}`);
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ TEST COMPLETE\n');
}

main();

