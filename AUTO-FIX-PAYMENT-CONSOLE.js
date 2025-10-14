/**
 * 🚀 AUTOMATIC PAYMENT FIX - RUN IN BROWSER CONSOLE
 * 
 * INSTRUCTIONS:
 * 1. Open your POS app in the browser
 * 2. Open Developer Console (F12 or Cmd+Option+I)
 * 3. Copy and paste this entire file into the console
 * 4. Press Enter
 * 5. The fix will apply automatically!
 */

(async function autoFixPaymentError() {
  console.log('🚀 Starting Automatic Payment Fix...\n');
  console.log('='.repeat(60));
  
  try {
    // Get Supabase client from window (should be available in your app)
    const supabase = window.supabase || window.__SUPABASE_CLIENT__;
    
    if (!supabase) {
      console.error('❌ Supabase client not found in window object.');
      console.error('Please ensure you are on a page where Supabase is loaded.\n');
      throw new Error('Supabase client not available');
    }
    
    console.log('✅ Supabase client found\n');
    console.log('📝 Step 1: Applying database fix...\n');
    
    // The complete SQL fix
    const sqlFix = `
-- Fix the trigger function to use proper JOIN
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
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create account transaction: %', SQLERRM;
    END;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_track_po_payment_spending ON purchase_order_payments;

CREATE TRIGGER trigger_track_po_payment_spending
  AFTER INSERT OR UPDATE OF status ON purchase_order_payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION track_po_payment_as_expense();
`;

    // Try to execute using RPC if available
    console.log('📤 Sending SQL to database...\n');
    
    // Check if there's an RPC function to execute SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlFix })
      .catch(err => {
        console.log('⚠️  exec_sql RPC not available, trying alternative...\n');
        return { data: null, error: err };
      });
    
    if (error && error.message?.includes('exec_sql')) {
      // exec_sql doesn't exist, show manual instructions
      console.log('⚠️  Direct SQL execution not available via Supabase client.\n');
      console.log('=' .repeat(60));
      console.log('📋 MANUAL FIX REQUIRED (2 minutes):');
      console.log('=' .repeat(60));
      console.log('\n1️⃣  Open Neon Dashboard: https://console.neon.tech');
      console.log('2️⃣  Go to: SQL Editor');
      console.log('3️⃣  Copy the SQL from: FIX-SUPPLIER-NAME-COLUMN-ERROR.sql');
      console.log('4️⃣  Paste and click "Run"');
      console.log('5️⃣  Refresh this page\n');
      console.log('=' .repeat(60));
      console.log('\n💡 OR: Copy this SQL and run it directly:\n');
      console.log(sqlFix);
      console.log('\n=' .repeat(60));
      
      return;
    }
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Step 1 Complete: Database fix applied!\n');
    console.log('=' .repeat(60));
    console.log('✅ FIX APPLIED SUCCESSFULLY!\n');
    console.log('CHANGES MADE:');
    console.log('  ✅ Updated track_po_payment_as_expense() function');
    console.log('  ✅ Fixed supplier_name column error');
    console.log('  ✅ Added support for method/payment_method columns');
    console.log('  ✅ Recreated trigger\n');
    console.log('🎯 NEXT STEPS:');
    console.log('  1. Refresh this page (Cmd+Shift+R / Ctrl+Shift+R)');
    console.log('  2. Try processing a purchase order payment');
    console.log('  3. The error should be gone! ✨\n');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message || error);
    console.log('\n=' .repeat(60));
    console.log('📋 FALLBACK: MANUAL FIX REQUIRED');
    console.log('=' .repeat(60));
    console.log('\nPlease run the fix manually:');
    console.log('1. Open: Neon Dashboard > SQL Editor');
    console.log('2. Run file: FIX-SUPPLIER-NAME-COLUMN-ERROR.sql\n');
    console.log('=' .repeat(60));
  }
})();

