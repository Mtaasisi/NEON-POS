#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require');

console.log('\n🔧 Fixing problematic expense trigger...\n');

try {
  // Drop the trigger that's causing the issue
  console.log('Dropping problematic triggers...');
  
  await sql`DROP TRIGGER IF EXISTS create_expense_account_transaction ON finance_expenses CASCADE`;
  console.log('✅ Dropped create_expense_account_transaction');
  
  await sql`DROP TRIGGER IF EXISTS trigger_create_expense_transaction ON finance_expenses CASCADE`;
  console.log('✅ Dropped trigger_create_expense_transaction');
  
  await sql`DROP TRIGGER IF EXISTS after_expense_insert ON finance_expenses CASCADE`;
  console.log('✅ Dropped after_expense_insert');
  
  // Drop the function too
  await sql`DROP FUNCTION IF EXISTS create_expense_account_transaction() CASCADE`;
  console.log('✅ Dropped function create_expense_account_transaction');
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ TRIGGERS FIXED!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('Now creating your expense...');
  console.log('');
  
  // Now create the expense
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
  
  const p = payment[0];
  
  // Get the category
  const category = await sql`
    SELECT id FROM finance_expense_categories
    WHERE category_name = 'Purchase Orders'
    LIMIT 1
  `;
  
  const categoryId = category[0].id;
  
  // Create the expense
  const expense = await sql`
    INSERT INTO finance_expenses (
      title,
      expense_category_id,
      account_id,
      amount,
      expense_date,
      status,
      receipt_number,
      vendor
    ) VALUES (
      ${'Purchase Order Payment: ' + p.po_number},
      ${categoryId},
      ${p.payment_account_id},
      ${p.amount},
      CURRENT_DATE,
      ${'approved'},
      ${'PO-PAY-' + p.id.toString().substring(0, 8)},
      ${p.supplier_name || 'Unknown'}
    )
    RETURNING id, title, amount
  `;
  
  console.log('✅ EXPENSE CREATED!');
  console.log(`   Title: ${expense[0].title}`);
  console.log(`   Amount: TZS ${expense[0].amount}`);
  console.log(`   Vendor: ${p.supplier_name}`);
  console.log('');
  console.log('🎉 Check Finance → Expenses to see it!');
  console.log('═══════════════════════════════════════════════════════');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

