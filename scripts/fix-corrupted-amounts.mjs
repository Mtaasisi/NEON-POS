#!/usr/bin/env node

/**
 * Fix Corrupted Amount Data Script
 * 
 * This script identifies and fixes corrupted amount values that were
 * caused by string concatenation instead of numeric addition.
 * 
 * Usage:
 *   node scripts/fix-corrupted-amounts.mjs --check    # Check for issues only
 *   node scripts/fix-corrupted-amounts.mjs --fix      # Fix corrupted data
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MAX_REALISTIC_AMOUNT = 1_000_000_000_000; // 1 trillion TZS
const MAX_REALISTIC_SALE = 1_000_000_000; // 1 billion TZS

/**
 * Check if a value looks like concatenated strings
 */
function isCorrupted(value) {
  if (value === null || value === undefined) return false;
  
  const strValue = String(value);
  
  // Check for concatenated decimal patterns like "123.45678.90"
  const concatenatedPattern = /[0-9]{2,}\.[0-9]{2}[0-9]{2,}\.[0-9]{2}/;
  if (concatenatedPattern.test(strValue)) return true;
  
  // Check for unrealistic values
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return true;
  if (numValue > MAX_REALISTIC_AMOUNT) return true;
  if (numValue < 0) return true;
  
  return false;
}

/**
 * Check customers table for corrupted data
 */
async function checkCustomers() {
  console.log('\n🔍 Checking customers table...');
  
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, name, total_spent, points')
    .or('total_spent.gt.1000000000000,total_spent.lt.0,points.gt.10000000,points.lt.0');
  
  if (error) {
    console.error('❌ Error querying customers:', error.message);
    return { corrupted: [], count: 0 };
  }
  
  const corrupted = customers?.filter(c => 
    isCorrupted(c.total_spent) || isCorrupted(c.points)
  ) || [];
  
  if (corrupted.length > 0) {
    console.log(`⚠️  Found ${corrupted.length} customers with corrupted data:`);
    corrupted.forEach(c => {
      console.log(`   - ${c.name} (ID: ${c.id})`);
      if (isCorrupted(c.total_spent)) {
        console.log(`     Total Spent: ${c.total_spent} ← CORRUPTED`);
      }
      if (isCorrupted(c.points)) {
        console.log(`     Points: ${c.points} ← CORRUPTED`);
      }
    });
  } else {
    console.log('✅ No corrupted customer data found');
  }
  
  return { corrupted, count: corrupted.length };
}

/**
 * Check sales table for corrupted data
 */
async function checkSales() {
  console.log('\n🔍 Checking sales table...');
  
  const { data: sales, error } = await supabase
    .from('lats_sales')
    .select('id, sale_number, total_amount, subtotal, discount, tax')
    .or('total_amount.gt.1000000000,total_amount.lt.0');
  
  if (error) {
    console.error('❌ Error querying sales:', error.message);
    return { corrupted: [], count: 0 };
  }
  
  const corrupted = sales?.filter(s => 
    isCorrupted(s.total_amount) || 
    isCorrupted(s.subtotal) || 
    isCorrupted(s.discount) || 
    isCorrupted(s.tax)
  ) || [];
  
  if (corrupted.length > 0) {
    console.log(`⚠️  Found ${corrupted.length} sales with corrupted data:`);
    corrupted.forEach(s => {
      console.log(`   - ${s.sale_number} (ID: ${s.id})`);
      if (isCorrupted(s.total_amount)) {
        console.log(`     Total Amount: ${s.total_amount} ← CORRUPTED`);
      }
    });
  } else {
    console.log('✅ No corrupted sales data found');
  }
  
  return { corrupted, count: corrupted.length };
}

/**
 * Check customer_payments table for corrupted data
 */
async function checkPayments() {
  console.log('\n🔍 Checking customer_payments table...');
  
  const { data: payments, error } = await supabase
    .from('customer_payments')
    .select('id, amount, customer_id')
    .or('amount.gt.1000000000,amount.lt.0');
  
  if (error) {
    console.error('❌ Error querying payments:', error.message);
    return { corrupted: [], count: 0 };
  }
  
  const corrupted = payments?.filter(p => isCorrupted(p.amount)) || [];
  
  if (corrupted.length > 0) {
    console.log(`⚠️  Found ${corrupted.length} payments with corrupted data:`);
    corrupted.slice(0, 10).forEach(p => {
      console.log(`   - Payment ID: ${p.id}, Amount: ${p.amount} ← CORRUPTED`);
    });
    if (corrupted.length > 10) {
      console.log(`   ... and ${corrupted.length - 10} more`);
    }
  } else {
    console.log('✅ No corrupted payment data found');
  }
  
  return { corrupted, count: corrupted.length };
}

/**
 * Fix corrupted customer data
 */
async function fixCustomers(corruptedCustomers) {
  console.log('\n🔧 Fixing customer data...');
  
  let fixed = 0;
  for (const customer of corruptedCustomers) {
    const updates = {};
    
    if (isCorrupted(customer.total_spent)) {
      updates.total_spent = 0;
    }
    if (isCorrupted(customer.points)) {
      updates.points = 0;
    }
    
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', customer.id);
      
      if (error) {
        console.error(`❌ Failed to fix customer ${customer.id}:`, error.message);
      } else {
        console.log(`✅ Fixed customer ${customer.name} (ID: ${customer.id})`);
        fixed++;
      }
    }
  }
  
  console.log(`\n✅ Fixed ${fixed} customers`);
  return fixed;
}

/**
 * Fix corrupted sales data
 */
async function fixSales(corruptedSales) {
  console.log('\n🔧 Fixing sales data...');
  
  let fixed = 0;
  for (const sale of corruptedSales) {
    const updates = {};
    
    if (isCorrupted(sale.total_amount)) {
      updates.total_amount = 0;
    }
    if (isCorrupted(sale.subtotal)) {
      updates.subtotal = 0;
    }
    if (isCorrupted(sale.discount)) {
      updates.discount = 0;
    }
    if (isCorrupted(sale.tax)) {
      updates.tax = 0;
    }
    
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('lats_sales')
        .update(updates)
        .eq('id', sale.id);
      
      if (error) {
        console.error(`❌ Failed to fix sale ${sale.id}:`, error.message);
      } else {
        console.log(`✅ Fixed sale ${sale.sale_number} (ID: ${sale.id})`);
        fixed++;
      }
    }
  }
  
  console.log(`\n✅ Fixed ${fixed} sales`);
  return fixed;
}

/**
 * Fix corrupted payment data
 */
async function fixPayments(corruptedPayments) {
  console.log('\n🔧 Fixing payment data...');
  
  let fixed = 0;
  for (const payment of corruptedPayments) {
    if (isCorrupted(payment.amount)) {
      const { error } = await supabase
        .from('customer_payments')
        .update({ amount: 0 })
        .eq('id', payment.id);
      
      if (error) {
        console.error(`❌ Failed to fix payment ${payment.id}:`, error.message);
      } else {
        fixed++;
      }
    }
  }
  
  console.log(`\n✅ Fixed ${fixed} payments`);
  return fixed;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const shouldFix = args.includes('--fix');
  
  if (!checkOnly && !shouldFix) {
    console.log('Usage:');
    console.log('  node scripts/fix-corrupted-amounts.mjs --check    # Check for issues only');
    console.log('  node scripts/fix-corrupted-amounts.mjs --fix      # Fix corrupted data');
    process.exit(0);
  }
  
  console.log('🔍 Scanning database for corrupted amount data...');
  console.log(`📊 Max realistic amount: ${MAX_REALISTIC_AMOUNT.toLocaleString()} TZS`);
  
  // Check all tables
  const customerResults = await checkCustomers();
  const salesResults = await checkSales();
  const paymentResults = await checkPayments();
  
  const totalCorrupted = customerResults.count + salesResults.count + paymentResults.count;
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Summary: Found ${totalCorrupted} corrupted records`);
  console.log(`   - Customers: ${customerResults.count}`);
  console.log(`   - Sales: ${salesResults.count}`);
  console.log(`   - Payments: ${paymentResults.count}`);
  console.log('='.repeat(60));
  
  if (shouldFix && totalCorrupted > 0) {
    console.log('\n⚠️  FIXING CORRUPTED DATA...');
    console.log('This will set corrupted amounts to 0.');
    console.log('');
    
    let totalFixed = 0;
    
    if (customerResults.count > 0) {
      totalFixed += await fixCustomers(customerResults.corrupted);
    }
    if (salesResults.count > 0) {
      totalFixed += await fixSales(salesResults.corrupted);
    }
    if (paymentResults.count > 0) {
      totalFixed += await fixPayments(paymentResults.corrupted);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ COMPLETE: Fixed ${totalFixed} corrupted records`);
    console.log('='.repeat(60));
  } else if (checkOnly && totalCorrupted > 0) {
    console.log('\n💡 Run with --fix to repair corrupted data');
  } else if (totalCorrupted === 0) {
    console.log('\n✅ No corrupted data found! Database is healthy.');
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

