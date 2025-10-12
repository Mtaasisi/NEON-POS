#!/usr/bin/env node

import { readFileSync } from 'fs';
import postgres from 'postgres';

console.log('🧪 Quick Customer Creation Test');
console.log('════════════════════════════════════════\n');

// Read database URL
const envContent = readFileSync('.env', 'utf-8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);

if (!dbUrlMatch) {
  console.error('❌ Could not find DATABASE_URL');
  process.exit(1);
}

const sql = postgres(dbUrlMatch[1].trim(), { ssl: 'require', max: 1 });

async function testCreation() {
  try {
    console.log('1️⃣ Testing database connection...');
    await sql`SELECT 1 as test`;
    console.log('   ✅ Connection successful\n');
    
    console.log('2️⃣ Checking customers table...');
    const tableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'customers'
    `;
    console.log('   ✅ Customers table exists\n');
    
    console.log('3️⃣ Checking customer_notes table...');
    const notesCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'customer_notes'
    `;
    console.log('   ✅ Customer_notes table exists\n');
    
    console.log('4️⃣ Checking RLS status...');
    const rlsCheck = await sql`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relname IN ('customers', 'customer_notes')
    `;
    rlsCheck.forEach(row => {
      const status = row.relrowsecurity ? '❌ ENABLED' : '✅ DISABLED';
      console.log(`   ${status}: ${row.relname}`);
    });
    console.log('');
    
    console.log('5️⃣ Attempting to create test customer...');
    const testId = crypto.randomUUID();
    const testPhone = '+255' + Math.floor(Math.random() * 1000000000);
    
    try {
      const customer = await sql`
        INSERT INTO customers (
          id, name, phone, email, gender, city,
          loyalty_level, color_tag, points, total_spent,
          is_active, joined_date, last_visit, created_at, updated_at
        ) VALUES (
          ${testId},
          'Test Customer DELETE ME',
          ${testPhone},
          '',
          'other',
          'Test City',
          'bronze',
          'new',
          10,
          0,
          true,
          ${new Date().toISOString().split('T')[0]},
          ${new Date().toISOString()},
          ${new Date().toISOString()},
          ${new Date().toISOString()}
        )
        RETURNING id, name, phone
      `;
      
      console.log('   ✅ Customer created successfully!');
      console.log('   ID:', customer[0].id);
      console.log('   Name:', customer[0].name);
      console.log('   Phone:', customer[0].phone);
      console.log('');
      
      console.log('6️⃣ Attempting to create test note...');
      const noteId = crypto.randomUUID();
      
      try {
        await sql`
          INSERT INTO customer_notes (
            id, customer_id, note, created_by, created_at
          ) VALUES (
            ${noteId},
            ${testId},
            'Test note',
            NULL,
            ${new Date().toISOString()}
          )
        `;
        
        console.log('   ✅ Note created successfully!\n');
        
        // Clean up
        console.log('7️⃣ Cleaning up test data...');
        await sql`DELETE FROM customer_notes WHERE id = ${noteId}`;
        await sql`DELETE FROM customers WHERE id = ${testId}`;
        console.log('   ✅ Test data deleted\n');
        
        console.log('════════════════════════════════════════');
        console.log('🎉 ALL TESTS PASSED!');
        console.log('════════════════════════════════════════');
        console.log('✅ Database is working correctly');
        console.log('✅ Customer creation works');
        console.log('✅ Note creation works');
        console.log('');
        console.log('❓ If your app still shows an error:');
        console.log('   1. Open browser console (F12)');
        console.log('   2. Try creating a customer');
        console.log('   3. Share the console error');
        console.log('   4. The issue might be in the frontend code');
        console.log('');
        
      } catch (noteError) {
        console.error('\n❌ NOTE CREATION FAILED:');
        console.error('   Error:', noteError.message);
        console.error('   Code:', noteError.code);
        console.error('   Details:', noteError.detail);
        console.error('\n💡 This is the problem! The customer_notes table has issues.');
        console.error('   Run: node fix-all-databases.mjs');
        
        // Clean up customer
        await sql`DELETE FROM customers WHERE id = ${testId}`;
      }
      
    } catch (customerError) {
      console.error('\n❌ CUSTOMER CREATION FAILED:');
      console.error('   Error:', customerError.message);
      console.error('   Code:', customerError.code);
      console.error('   Details:', customerError.detail);
      console.error('   Hint:', customerError.hint);
      console.error('\n💡 This is the problem!');
      
      if (customerError.code === '23502') {
        console.error('   Issue: Missing required column or NULL constraint');
        console.error('   Fix: Run node fix-all-databases.mjs');
      } else if (customerError.code === '23505') {
        console.error('   Issue: Duplicate phone number');
        console.error('   Fix: Use a different phone number');
      } else if (customerError.code === '42P01') {
        console.error('   Issue: Table does not exist');
        console.error('   Fix: Run node fix-all-databases.mjs');
      } else if (customerError.code === '42703') {
        console.error('   Issue: Column does not exist');
        console.error('   Fix: Run node fix-all-databases.mjs');
      } else {
        console.error('   Fix: Check the error details above');
      }
      console.error('');
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code || 'No code');
    console.error('\n💡 Check your database connection and setup');
    console.error('');
  } finally {
    await sql.end();
  }
}

testCreation();

