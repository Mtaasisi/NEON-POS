#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log('\n📦 Applying expense tracking fix...\n');

const sql = neon(DATABASE_URL);

try {
  // Step 0: Ensure "Purchase Orders" category exists
  console.log('0️⃣ Ensuring "Purchase Orders" expense category exists...');
  
  let categoryResult = await sql`
    SELECT id FROM finance_expense_categories 
    WHERE name = 'Purchase Orders'
    LIMIT 1
  `;
  
  let categoryId;
  if (categoryResult.length === 0) {
    console.log('   Creating "Purchase Orders" category...');
    const newCategory = await sql`
      INSERT INTO finance_expense_categories (name, description, icon, color, is_active, is_shared)
      VALUES (
        'Purchase Orders',
        'Payments made for purchase orders and supplier invoices',
        'ShoppingCart',
        '#FF9800',
        true,
        true
      )
      RETURNING id
    `;
    categoryId = newCategory[0].id;
    console.log(`   ✅ Category created with ID: ${categoryId}`);
  } else {
    categoryId = categoryResult[0].id;
    console.log(`   ✅ Category exists with ID: ${categoryId}\n`);
  }
  
  // Step 1: Create trigger function
  console.log('1️⃣ Creating trigger function...');
  await sql`
    CREATE OR REPLACE FUNCTION track_po_payment_as_expense()
    RETURNS TRIGGER AS $$
    DECLARE
      v_po_reference TEXT;
      v_po_supplier TEXT;
      v_account_name TEXT;
      v_user_id UUID;
      v_category_id UUID;
    BEGIN
      IF NEW.status = 'completed' THEN
        
        -- Get PO category ID
        SELECT id INTO v_category_id
        FROM finance_expense_categories
        WHERE name = 'Purchase Orders'
        LIMIT 1;
        
        SELECT 
          COALESCE(po.po_number, 'PO-' || po.id::TEXT),
          COALESCE(s.name, 'Unknown Supplier')
        INTO v_po_reference, v_po_supplier
        FROM lats_purchase_orders po
        LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
        WHERE po.id = NEW.purchase_order_id;
        
        SELECT name INTO v_account_name
        FROM finance_accounts
        WHERE id = NEW.payment_account_id;
        
        v_user_id := NEW.created_by;
        IF v_user_id IS NULL THEN
          SELECT id INTO v_user_id FROM users LIMIT 1;
        END IF;
        
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'finance_expenses'
          ) THEN
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
              created_by,
              approved_by,
              created_at,
              updated_at
            ) VALUES (
              'Purchase Order Payment: ' || v_po_reference,
              v_category_id,
              NEW.payment_account_id,
              NEW.amount,
              COALESCE(NEW.notes, 'Payment for ' || v_po_reference || ' - ' || v_po_supplier),
              COALESCE(NEW.payment_date::DATE, CURRENT_DATE),
              COALESCE(NEW.method, NEW.payment_method, 'cash'),
              'approved',
              COALESCE(NEW.reference, 'PO-PAY-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)),
              v_po_supplier,
              v_user_id,
              v_user_id,
              NOW(),
              NOW()
            )
            ON CONFLICT DO NOTHING;
            
            RAISE NOTICE 'Created expense record for PO payment %', NEW.id;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Failed to create expense record: %', SQLERRM;
        END;
        
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `;
  console.log('   ✅ Trigger function created\n');
  
  // Step 2: Drop existing trigger
  console.log('2️⃣ Dropping existing trigger if exists...');
  await sql`DROP TRIGGER IF EXISTS trigger_track_po_payment_spending ON purchase_order_payments`;
  console.log('   ✅ Old trigger dropped\n');
  
  // Step 3: Create new trigger
  console.log('3️⃣ Creating new trigger...');
  await sql`
    CREATE TRIGGER trigger_track_po_payment_spending
      AFTER INSERT OR UPDATE OF status ON purchase_order_payments
      FOR EACH ROW
      WHEN (NEW.status = 'completed')
      EXECUTE FUNCTION track_po_payment_as_expense()
  `;
  console.log('   ✅ Trigger created\n');
  
  // Step 4: Backfill existing payments
  console.log('4️⃣ Backfilling existing PO payments as expenses...');
  
  const payments = await sql`
    SELECT pop.*, po.po_number, s.name as supplier_name, fa.name as account_name
    FROM purchase_order_payments pop
    JOIN lats_purchase_orders po ON po.id = pop.purchase_order_id
    LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
    JOIN finance_accounts fa ON fa.id = pop.payment_account_id
    WHERE pop.status = 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM finance_expenses fe
        WHERE fe.receipt_number = COALESCE(pop.reference, 'PO-PAY-' || SUBSTRING(pop.id::TEXT FROM 1 FOR 8))
      )
    ORDER BY pop.created_at DESC
  `;
  
  console.log(`   Found ${payments.length} payments to backfill`);
  
  let successCount = 0;
  for (const payment of payments) {
    try {
      const userId = await sql`SELECT id FROM users LIMIT 1`;
      const validUserId = userId[0]?.id || payment.created_by || '00000000-0000-0000-0000-000000000001';
      
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
          created_by,
          approved_by,
          created_at,
          updated_at
        ) VALUES (
          ${'Purchase Order Payment: ' + payment.po_number},
          ${categoryId},
          ${payment.payment_account_id},
          ${payment.amount},
          ${payment.notes || 'Payment for ' + payment.po_number + ' - ' + (payment.supplier_name || 'Unknown Supplier')},
          ${payment.payment_date ? new Date(payment.payment_date) : new Date()},
          ${payment.method || payment.payment_method || 'cash'},
          ${'approved'},
          ${payment.reference || 'PO-PAY-' + payment.id.toString().substring(0, 8)},
          ${payment.supplier_name || 'Unknown Supplier'},
          ${validUserId},
          ${validUserId},
          ${payment.created_at || new Date()},
          ${payment.created_at || new Date()}
        )
        ON CONFLICT DO NOTHING
      `;
      successCount++;
      console.log(`   ✅ Backfilled expense for ${payment.po_number}`);
    } catch (err) {
      console.warn(`   ⚠️ Failed to backfill payment ${payment.id}:`, err.message);
    }
  }
  
  console.log(`   ✅ Backfilled ${successCount} expenses\n`);
  
  // Step 5: Verify
  console.log('5️⃣ Verifying results...');
  const expenseCount = await sql`
    SELECT COUNT(*) as count 
    FROM finance_expenses 
    WHERE expense_category_id = ${categoryId}
  `;
  
  const paymentCount = await sql`
    SELECT COUNT(*) as count 
    FROM purchase_order_payments 
    WHERE status = 'completed'
  `;
  
  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log('✅ EXPENSE TRACKING FIX APPLIED SUCCESSFULLY');
  console.log(`═══════════════════════════════════════════════════════`);
  console.log(`Total Completed PO Payments: ${paymentCount[0].count}`);
  console.log(`Tracked as Expenses: ${expenseCount[0].count}`);
  console.log(`Category ID: ${categoryId}`);
  console.log(`\n🔄 Trigger active: All future PO payments will automatically create expenses`);
  console.log(`═══════════════════════════════════════════════════════\n`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error);
  process.exit(1);
}

