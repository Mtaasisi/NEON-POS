#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require');

console.log('\n🔍 Verifying expense in database...\n');

// Check if expense exists
const expenses = await sql`
  SELECT 
    fe.id,
    fe.title,
    fe.amount,
    fe.vendor,
    fe.expense_date,
    fe.status,
    fe.receipt_number,
    fe.description,
    fe.payment_method,
    fe.created_at,
    fec.category_name,
    fa.name as account_name
  FROM finance_expenses fe
  LEFT JOIN finance_expense_categories fec ON fec.id = fe.expense_category_id
  LEFT JOIN finance_accounts fa ON fa.id = fe.account_id
  WHERE fe.amount = 90000
  ORDER BY fe.created_at DESC
  LIMIT 5
`;

if (expenses.length > 0) {
  console.log(`✅ Found ${expenses.length} expense(s) with amount 90,000:\n`);
  expenses.forEach((exp, i) => {
    console.log(`Expense ${i + 1}:`);
    console.log(`   ID: ${exp.id}`);
    console.log(`   Title: ${exp.title || 'No title'}`);
    console.log(`   Amount: TZS ${exp.amount}`);
    console.log(`   Vendor: ${exp.vendor || 'No vendor'}`);
    console.log(`   Category: ${exp.category_name || 'No category'}`);
    console.log(`   Account: ${exp.account_name || 'No account'}`);
    console.log(`   Status: ${exp.status || 'No status'}`);
    console.log(`   Date: ${exp.expense_date}`);
    console.log(`   Created: ${exp.created_at}`);
    console.log('');
  });
} else {
  console.log('❌ NO expenses found with amount 90,000\n');
}

// Check ALL recent expenses
console.log('📊 ALL Recent Expenses (last 20):\n');
const allExpenses = await sql`
  SELECT 
    fe.id,
    fe.title,
    fe.amount,
    fe.vendor,
    fec.category_name,
    fe.created_at
  FROM finance_expenses fe
  LEFT JOIN finance_expense_categories fec ON fec.id = fe.expense_category_id
  ORDER BY fe.created_at DESC
  LIMIT 20
`;

if (allExpenses.length > 0) {
  console.log(`Found ${allExpenses.length} expenses:\n`);
  allExpenses.forEach((exp, i) => {
    console.log(`${i + 1}. ${exp.title || 'Untitled'} - TZS ${exp.amount} (${exp.category_name || 'No category'})`);
  });
} else {
  console.log('❌ NO expenses found in the database at all!\n');
  console.log('This means the expenses table is empty.');
}

console.log('\n');
console.log('═══════════════════════════════════════════════════════');
console.log('💡 TROUBLESHOOTING:');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('If expense exists in database but not visible in UI:');
console.log('1. Clear browser cache (Ctrl+Shift+Delete)');
console.log('2. Hard refresh the page (Ctrl+Shift+R)');
console.log('3. Check if there are any filters applied');
console.log('4. Make sure you are in the right branch/account');
console.log('5. Try logging out and back in');
console.log('');
console.log('If expense does NOT exist in database:');
console.log('We need to create it again with proper settings.');
console.log('═══════════════════════════════════════════════════════');

