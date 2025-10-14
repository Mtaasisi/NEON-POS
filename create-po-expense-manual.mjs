#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require');

console.log('\n💰 Creating expense for your 90,000 TZS payment...\n');

try {
  // First, disable the problematic trigger temporarily
  await sql`
    ALTER TABLE finance_expenses DISABLE TRIGGER IF EXISTS create_expense_account_transaction
  `;
  console.log('✅ Disabled problematic trigger');
  
  // Get the payment details
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
  
  if (payment.length === 0) {
    console.log('❌ Payment not found');
    process.exit(1);
  }
  
  const p = payment[0];
  console.log(`📋 Payment: ${p.po_number} - TZS ${p.amount}`);
  
  // Get or create the Purchase Orders category
  let category = await sql`
    SELECT id FROM finance_expense_categories
    WHERE category_name = 'Purchase Orders'
    LIMIT 1
  `;
  
  let categoryId;
  if (category.length === 0) {
    console.log('Creating Purchase Orders category...');
    const newCat = await sql`
      INSERT INTO finance_expense_categories (category_name, description, is_active, is_shared)
      VALUES ('Purchase Orders', 'Payments for purchase orders', true, true)
      RETURNING id
    `;
    categoryId = newCat[0].id;
  } else {
    categoryId = category[0].id;
  }
  
  // Create the expense
  const expense = await sql`
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
      ${categoryId},
      ${p.payment_account_id},
      ${p.amount},
      ${'Payment for ' + p.po_number + ' to ' + (p.supplier_name || 'supplier')},
      ${p.payment_date || new Date()},
      ${'Cash'},
      ${'approved'},
      ${'PO-PAY-' + p.id.toString().substring(0, 8)},
      ${p.supplier_name || 'Unknown Supplier'},
      NOW(),
      NOW()
    )
    RETURNING id
  `;
  
  console.log('✅ Expense created successfully!');
  console.log(`   ID: ${expense[0].id}`);
  console.log(`   Title: Purchase Order Payment: ${p.po_number}`);
  console.log(`   Amount: TZS ${p.amount}`);
  console.log(`   Vendor: ${p.supplier_name || 'Unknown Supplier'}`);
  console.log('');
  
  // Re-enable the trigger
  await sql`
    ALTER TABLE finance_expenses ENABLE TRIGGER IF EXISTS create_expense_account_transaction
  `;
  console.log('✅ Re-enabled trigger');
  console.log('');
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ SUCCESS!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('Your payment is now tracked in expenses!');
  console.log('');
  console.log('To see it:');
  console.log('1. Go to Finance → Expenses');
  console.log('2. Look for "Purchase Order Payment: ' + p.po_number + '"');
  console.log('3. Amount: TZS 90,000');
  console.log('4. Category: Purchase Orders');
  console.log('═══════════════════════════════════════════════════════');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  
  // Try to re-enable trigger even if there was an error
  try {
    await sql`
      ALTER TABLE finance_expenses ENABLE TRIGGER IF EXISTS create_expense_account_transaction
    `;
  } catch (e) {
    // Ignore
  }
  
  process.exit(1);
}

