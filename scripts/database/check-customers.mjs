#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

console.log('🔍 Checking your database for customers...\n');

async function checkCustomers() {
  try {
    // Check customers table
    console.log('📊 Checking "customers" table...');
    const customers = await sql`SELECT COUNT(*) as count FROM customers`;
    console.log(`   Found ${customers[0].count} records in customers table`);
    
    if (customers[0].count > 0) {
      const sample = await sql`SELECT id, name, phone, email FROM customers LIMIT 5`;
      console.log('\n   Sample records:');
      sample.forEach(c => {
        console.log(`   - ${c.name} | ${c.phone || 'No phone'} | ${c.email || 'No email'}`);
      });
    }

    // Check lats_customers table
    console.log('\n📊 Checking "lats_customers" table...');
    const latsCustomers = await sql`SELECT COUNT(*) as count FROM lats_customers`;
    console.log(`   Found ${latsCustomers[0].count} records in lats_customers table`);
    
    if (latsCustomers[0].count > 0) {
      const sample = await sql`SELECT id, name, phone, email FROM lats_customers LIMIT 5`;
      console.log('\n   Sample records:');
      sample.forEach(c => {
        console.log(`   - ${c.name} | ${c.phone || 'No phone'} | ${c.email || 'No email'}`);
      });
    }

    // Summary
    const total = parseInt(customers[0].count) + parseInt(latsCustomers[0].count);
    console.log('\n' + '='.repeat(50));
    console.log(`\n📈 TOTAL CUSTOMERS: ${total}`);
    
    if (total === 0) {
      console.log('\n⚠️  No customers found in database!');
      console.log('\n💡 To fix this, you can:');
      console.log('   1. Add customers through the desktop app');
      console.log('   2. Import customers from CSV');
      console.log('   3. Add a test customer directly to the database');
      console.log('\n📝 Example SQL to add a test customer:');
      console.log(`
INSERT INTO customers (name, phone, email, total_spent, points)
VALUES ('Test Customer', '+255 700 000 000', 'test@example.com', 0, 0);
      `);
    } else {
      console.log('\n✅ Customers found! They should appear in your mobile app.');
      console.log('   If not showing, check:');
      console.log('   - Browser console for errors (F12)');
      console.log('   - Network tab to see the API request');
      console.log('   - Make sure VITE_DATABASE_URL is set in .env');
    }

  } catch (error) {
    console.error('\n❌ Error checking database:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   - Your database connection string is correct');
    console.error('   - The tables exist in your database');
    console.error('   - You have network connection');
  }
}

checkCustomers();















