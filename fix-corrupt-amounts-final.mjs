#!/usr/bin/env node

/**
 * Fix Corrupt Amounts Script
 * 
 * This script identifies and fixes corrupt amount data in the database
 * caused by string concatenation instead of numeric addition.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const MAX_REALISTIC_AMOUNT = 1_000_000_000_000; // 1 trillion

async function fixCorruptAmounts() {
  console.log('🔍 Scanning for corrupt amounts in lats_sales...\n');

  try {
    // Fetch all sales
    const { data: sales, error } = await supabase
      .from('lats_sales')
      .select('id, total_amount, subtotal, discount, tax_amount')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching sales:', error);
      return;
    }

    console.log(`✅ Found ${sales.length} sales records\n`);

    let corruptCount = 0;
    const corruptRecords = [];

    // Identify corrupt records
    for (const sale of sales) {
      const amount = typeof sale.total_amount === 'number' 
        ? sale.total_amount 
        : parseFloat(sale.total_amount) || 0;

      if (Math.abs(amount) > MAX_REALISTIC_AMOUNT) {
        corruptCount++;
        corruptRecords.push({
          id: sale.id,
          corrupt_amount: amount,
          subtotal: sale.subtotal,
          discount: sale.discount,
          tax_amount: sale.tax_amount
        });

        console.log(`⚠️  Corrupt record found:`);
        console.log(`   ID: ${sale.id}`);
        console.log(`   Corrupt Amount: ${amount}`);
        console.log(`   Amount String: ${sale.total_amount}`);
        console.log('');
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total Sales: ${sales.length}`);
    console.log(`   Corrupt Records: ${corruptCount}`);

    if (corruptCount === 0) {
      console.log('\n✅ No corrupt amounts found! Database is clean.');
      return;
    }

    console.log('\n⚠️  WARNING: Corrupt amounts detected!');
    console.log('   These records likely have amounts that were concatenated as strings.');
    console.log('   Manual review is needed to determine correct amounts.\n');

    console.log('📝 Corrupt Records:');
    corruptRecords.forEach((record, index) => {
      console.log(`\n${index + 1}. Sale ID: ${record.id}`);
      console.log(`   Corrupt Amount: ${record.corrupt_amount}`);
      console.log(`   Subtotal: ${record.subtotal}`);
      console.log(`   Discount: ${record.discount}`);
      console.log(`   Tax: ${record.tax_amount}`);
    });

    console.log('\n💡 Recommendations:');
    console.log('   1. Review these sales in the database');
    console.log('   2. Check sale_items for actual product prices');
    console.log('   3. Recalculate correct totals from sale items');
    console.log('   4. Update records manually or using a targeted script');
    console.log('\n⚠️  This script does NOT automatically fix data to prevent data loss.');
    console.log('   Manual intervention required for data integrity.\n');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Also check customers table
async function fixCorruptCustomerAmounts() {
  console.log('\n🔍 Scanning for corrupt amounts in customers...\n');

  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, name, total_spent')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching customers:', error);
      return;
    }

    console.log(`✅ Found ${customers.length} customer records\n`);

    let corruptCount = 0;
    const corruptRecords = [];

    for (const customer of customers) {
      const amount = typeof customer.total_spent === 'number' 
        ? customer.total_spent 
        : parseFloat(customer.total_spent) || 0;

      if (Math.abs(amount) > MAX_REALISTIC_AMOUNT) {
        corruptCount++;
        corruptRecords.push({
          id: customer.id,
          name: customer.name,
          corrupt_amount: amount
        });

        console.log(`⚠️  Corrupt customer record:`);
        console.log(`   ID: ${customer.id}`);
        console.log(`   Name: ${customer.name}`);
        console.log(`   Corrupt Total Spent: ${amount}`);
        console.log('');
      }
    }

    console.log(`\n📊 Customer Summary:`);
    console.log(`   Total Customers: ${customers.length}`);
    console.log(`   Corrupt Records: ${corruptCount}`);

    if (corruptCount === 0) {
      console.log('\n✅ No corrupt customer amounts found!');
      return;
    }

    console.log('\n⚠️  WARNING: Corrupt customer amounts detected!');
    console.log('\n📝 To fix customer totals, run:');
    console.log('   UPDATE customers SET total_spent = (');
    console.log('     SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)');
    console.log('     FROM lats_sales');
    console.log('     WHERE customer_id = customers.id');
    console.log('   );');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run both checks
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║          CORRUPT AMOUNTS DETECTION AND ANALYSIS               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  await fixCorruptAmounts();
  await fixCorruptCustomerAmounts();

  console.log('\n✅ Scan complete!\n');
}

main();

