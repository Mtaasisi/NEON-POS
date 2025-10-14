/**
 * RUN PO PAYMENT SPENDING FIX
 * 
 * This script applies the database fix to track PO payments as expenses.
 * It uses your existing Neon database connection.
 * 
 * TO RUN: Open your browser console on your app and paste this code, OR
 *         Add this to a temporary component and run it once.
 */

import { sql } from './src/lib/supabaseClient';
import { readFile } from 'fs/promises';

async function applyPOSpendingFix() {
  console.log('🚀 Starting PO Payment Spending Fix...\n');
  
  try {
    // The SQL fix inline (so you don't need to read a file)
    const sqlFix = `
-- ============================================
-- CREATE TRIGGER FUNCTION TO TRACK PO PAYMENTS AS EXPENSES
-- ============================================

CREATE OR REPLACE FUNCTION track_po_payment_as_expense()
RETURNS TRIGGER AS $$
DECLARE
  v_po_reference TEXT;
  v_po_supplier TEXT;
  v_account_name TEXT;
  v_user_id UUID;
BEGIN
  IF NEW.status = 'completed' THEN
    
    -- Get PO details and supplier name (JOIN with suppliers table)
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
          title, category, account_id, amount, description, expense_date,
          payment_method, status, receipt_number, vendor, created_by,
          approved_by, created_at, updated_at
        ) VALUES (
          'Purchase Order Payment: ' || v_po_reference,
          'Purchase Orders',
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
        );
        
        RAISE NOTICE '✅ Created expense record for PO payment %', NEW.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create expense record: %', SQLERRM;
    END;
    
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'account_transactions'
      ) THEN
        INSERT INTO account_transactions (
          account_id, transaction_type, amount, description, reference_number,
          related_entity_type, related_entity_id, metadata, created_at, created_by
        ) VALUES (
          NEW.payment_account_id,
          'expense',
          NEW.amount,
          'PO Payment: ' || v_po_reference || ' - ' || v_po_supplier,
          COALESCE(NEW.reference, 'PO-PAY-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)),
          'purchase_order_payment',
          NEW.id,
          jsonb_build_object(
            'purchase_order_id', NEW.purchase_order_id,
            'po_reference', v_po_reference,
            'supplier', v_po_supplier,
            'payment_method', COALESCE(NEW.method, NEW.payment_method),
            'account_name', v_account_name
          ),
          NOW(),
          v_user_id
        );
        
        RAISE NOTICE '✅ Created account transaction for PO payment %', NEW.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create account transaction: %', SQLERRM;
    END;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS trigger_track_po_payment_spending ON purchase_order_payments;

CREATE TRIGGER trigger_track_po_payment_spending
  AFTER INSERT OR UPDATE OF status ON purchase_order_payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION track_po_payment_as_expense();

-- ============================================
-- CREATE PURCHASE ORDERS CATEGORY
-- ============================================

INSERT INTO finance_expense_categories (name, description, icon, color, is_active, is_shared)
VALUES (
  'Purchase Orders',
  'Payments made for purchase orders and supplier invoices',
  'ShoppingCart',
  '#FF9800',
  true,
  true
)
ON CONFLICT (name) DO NOTHING;

-- Success message
SELECT 'PO Payment Spending Tracking Fix Applied Successfully!' as status;
    `;
    
    console.log('📝 Executing SQL fix...');
    
    // Execute the SQL
    const result = await sql([sqlFix] as any);
    
    console.log('✅ SQL fix executed successfully!');
    console.log('\n📊 Results:', result);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ FIX APPLIED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n🎯 What was fixed:');
    console.log('  ✅ Created trigger to auto-track PO payments as expenses');
    console.log('  ✅ Added "Purchase Orders" expense category');
    console.log('  ✅ All future PO payments will now appear in spending reports');
    console.log('\n💡 Next: Refresh your browser and check spending reports!');
    console.log('   Look for "Purchase Orders" category in expenses.\n');
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error applying fix:', error);
    console.error('\n⚠️  Please run the SQL file manually:');
    console.error('   File: FIX-PO-PAYMENT-SPENDING-TRACKING.sql');
    console.error('   In: Neon Dashboard > SQL Editor\n');
    
    return { success: false, error };
  }
}

// Auto-run if this is executed directly
if (typeof window !== 'undefined') {
  applyPOSpendingFix();
} else {
  console.log('Run this in your browser console or import and call applyPOSpendingFix()');
}

export default applyPOSpendingFix;

