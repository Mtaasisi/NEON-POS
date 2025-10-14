#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require');

console.log('\n🔍 Checking if your 90,000 payment created an expense...\n');

// Check if expense was created for the recent payment
const expense = await sql`
  SELECT 
    fe.*,
    fec.category_name,
    fa.name as account_name
  FROM finance_expenses fe
  LEFT JOIN finance_expense_categories fec ON fec.id = fe.expense_category_id
  LEFT JOIN finance_accounts fa ON fa.id = fe.account_id
  WHERE fe.amount = 90000
  AND fe.created_at > NOW() - INTERVAL '2 hours'
  ORDER BY fe.created_at DESC
  LIMIT 1
`;

if (expense.length > 0) {
  console.log('✅ EXPENSE WAS CREATED:');
  console.log(`   Title: ${expense[0].title}`);
  console.log(`   Amount: TZS ${expense[0].amount}`);
  console.log(`   Category: ${expense[0].category_name || 'Unknown'}`);
  console.log(`   Account: ${expense[0].account_name}`);
  console.log(`   Date: ${expense[0].expense_date}`);
  console.log(`   Vendor: ${expense[0].vendor}`);
  console.log('');
  console.log('✅ Your payment IS tracked in expenses!');
} else {
  console.log('❌ NO EXPENSE FOUND for the 90,000 payment');
  console.log('');
  console.log('This means the trigger did not fire.');
  console.log('We need to manually create the expense record.');
}
console.log('');

// Check all recent expenses
const recentExpenses = await sql`
  SELECT 
    fe.title,
    fe.amount,
    fe.vendor,
    fe.expense_date,
    fec.category_name,
    fa.name as account_name
  FROM finance_expenses fe
  LEFT JOIN finance_expense_categories fec ON fec.id = fe.expense_category_id
  LEFT JOIN finance_accounts fa ON fa.id = fe.account_id
  ORDER BY fe.created_at DESC
  LIMIT 10
`;

console.log('📊 Recent Expenses (last 10):');
if (recentExpenses.length > 0) {
  recentExpenses.forEach(exp => {
    console.log(`   ${exp.title || 'Untitled'}: TZS ${exp.amount} (${exp.category_name || 'No category'})`);
  });
} else {
  console.log('   No expenses found');
}
console.log('');

// Check the payment that should have an expense
const payment = await sql`
  SELECT 
    pop.*,
    po.po_number,
    s.name as supplier_name,
    fa.name as account_name
  FROM purchase_order_payments pop
  JOIN lats_purchase_orders po ON po.id = pop.purchase_order_id
  LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
  JOIN finance_accounts fa ON fa.id = pop.payment_account_id
  WHERE pop.id = '69540f19-bd72-4678-b84b-3b2ad5bb90f9'
`;

if (payment.length > 0) {
  const p = payment[0];
  console.log('📋 Your Payment Details:');
  console.log(`   PO: ${p.po_number}`);
  console.log(`   Amount: TZS ${p.amount}`);
  console.log(`   Supplier: ${p.supplier_name || 'Unknown'}`);
  console.log(`   Account: ${p.account_name}`);
  console.log(`   Payment ID: ${p.id}`);
  console.log('');
  
  // Check if expense exists for this specific payment
  const matchingExpense = await sql`
    SELECT * FROM finance_expenses
    WHERE receipt_number LIKE ${`%${p.id.toString().substring(0, 8)}%`}
  `;
  
  if (matchingExpense.length > 0) {
    console.log('✅ Expense exists for this payment!');
  } else {
    console.log('❌ NO expense exists for this payment. Creating it now...');
    
    // Get the Purchase Orders category
    const category = await sql`
      SELECT id FROM finance_expense_categories
      WHERE category_name = 'Purchase Orders'
      LIMIT 1
    `;
    
    if (category.length > 0) {
      // Create the expense manually
      await sql`
        INSERT INTO finance_expenses (
          title,
          expense_category_id,
          account_id,
          amount,
          description,
          expense_date,
          payment_method,
          status,
          receipt_number,
          vendor,
          created_at,
          updated_at
        ) VALUES (
          ${'Purchase Order Payment: ' + p.po_number},
          ${category[0].id},
          ${p.payment_account_id},
          ${p.amount},
          ${p.notes || 'Payment for ' + p.po_number + ' - ' + (p.supplier_name || 'Unknown Supplier')},
          ${p.payment_date || new Date()},
          ${p.method || p.payment_method || 'cash'},
          ${'approved'},
          ${'PO-PAY-' + p.id.toString().substring(0, 8)},
          ${p.supplier_name || 'Unknown Supplier'},
          ${p.created_at || new Date()},
          ${p.created_at || new Date()}
        )
      `;
      
      console.log('✅ Expense created successfully!');
      console.log('');
      console.log('Check your expenses list now - you should see:');
      console.log(`   "Purchase Order Payment: ${p.po_number}"`);
      console.log(`   Amount: TZS ${p.amount}`);
      console.log(`   Vendor: ${p.supplier_name || 'Unknown Supplier'}`);
    }
  }
}

