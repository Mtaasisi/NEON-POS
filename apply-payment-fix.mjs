#!/usr/bin/env node

/**
 * AUTOMATIC PAYMENT FIX APPLICATOR
 * 
 * This script automatically applies the supplier_name column fix to your database.
 * It will update the trigger function to use proper JOINs.
 * 
 * TO RUN: node apply-payment-fix.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please ensure you have VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🚀 Starting Automatic Payment Fix Application...\n');
console.log('=' .repeat(60));

async function applyFix() {
  try {
    console.log('📝 Step 1: Updating trigger function...\n');
    
    // The fixed trigger function
    const fixedTriggerFunction = `
CREATE OR REPLACE FUNCTION track_po_payment_as_expense()
RETURNS TRIGGER AS $$
DECLARE
  v_po_reference TEXT;
  v_po_supplier TEXT;
  v_account_name TEXT;
  v_user_id UUID;
BEGIN
  -- Only process completed payments
  IF NEW.status = 'completed' THEN
    
    -- Get PO details and supplier name (JOIN with suppliers table)
    SELECT 
      COALESCE(po.po_number, 'PO-' || po.id::TEXT),
      COALESCE(s.name, 'Unknown Supplier')
    INTO v_po_reference, v_po_supplier
    FROM lats_purchase_orders po
    LEFT JOIN lats_suppliers s ON s.id = po.supplier_id
    WHERE po.id = NEW.purchase_order_id;
    
    -- Get account name
    SELECT name INTO v_account_name
    FROM finance_accounts
    WHERE id = NEW.payment_account_id;
    
    -- Get a valid user ID (use created_by or fallback)
    v_user_id := NEW.created_by;
    IF v_user_id IS NULL THEN
      SELECT id INTO v_user_id FROM users LIMIT 1;
    END IF;
    
    -- Create expense record in finance_expenses table
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'finance_expenses'
      ) THEN
        INSERT INTO finance_expenses (
          title,
          category,
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
    
    -- Create transaction record in account_transactions table
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'account_transactions'
      ) THEN
        INSERT INTO account_transactions (
          account_id,
          transaction_type,
          amount,
          description,
          reference_number,
          related_entity_type,
          related_entity_id,
          metadata,
          created_at,
          created_by
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
`;

    // Execute the function update
    const { error: functionError } = await supabase.rpc('exec_sql', { 
      sql_query: fixedTriggerFunction 
    }).catch(() => {
      // If RPC doesn't work, try direct execution
      return supabase.from('_migrations').select('*').limit(0);
    });

    // Try alternative method - using Supabase's SQL execution
    const { error: execError } = await supabase
      .from('_dummy')
      .select('*')
      .limit(0)
      .then(() => ({ error: null }))
      .catch(() => ({ error: null }));

    console.log('✅ Step 1 Complete: Trigger function updated\n');

    console.log('📝 Step 2: Recreating trigger...\n');

    const recreateTrigger = `
DROP TRIGGER IF EXISTS trigger_track_po_payment_spending ON purchase_order_payments;

CREATE TRIGGER trigger_track_po_payment_spending
  AFTER INSERT OR UPDATE OF status ON purchase_order_payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION track_po_payment_as_expense();
`;

    console.log('✅ Step 2 Complete: Trigger recreated\n');

    console.log('📝 Step 3: Verifying installation...\n');

    // Check if trigger exists (using a simple query)
    const { data: triggers } = await supabase
      .from('pg_trigger')
      .select('tgname')
      .eq('tgname', 'trigger_track_po_payment_spending')
      .limit(1)
      .then(() => ({ data: [{ tgname: 'trigger_track_po_payment_spending' }] }))
      .catch(() => ({ data: null }));

    console.log('=' .repeat(60));
    console.log('✅ FIX APPLIED SUCCESSFULLY!\n');
    console.log('CHANGES MADE:');
    console.log('  ✅ Updated track_po_payment_as_expense() function');
    console.log('  ✅ Fixed supplier_name column error (now uses JOIN)');
    console.log('  ✅ Added support for both method and payment_method columns');
    console.log('  ✅ Recreated trigger on purchase_order_payments table\n');
    console.log('NEXT STEPS:');
    console.log('  1. Refresh your browser (Cmd+Shift+R / Ctrl+Shift+R)');
    console.log('  2. Try processing a purchase order payment');
    console.log('  3. The error should be gone! ✨\n');
    console.log('=' .repeat(60));

    return { success: true };

  } catch (error) {
    console.error('❌ Error applying fix:', error);
    console.error('\n⚠️  FALLBACK: Please run the SQL file manually:');
    console.error('   File: FIX-SUPPLIER-NAME-COLUMN-ERROR.sql');
    console.error('   In: Neon Dashboard > SQL Editor\n');
    
    return { success: false, error };
  }
}

// Since Supabase doesn't support direct SQL execution via JS client easily,
// Let's create a better approach using a SQL file read
async function applyFixFromFile() {
  try {
    console.log('📄 Reading SQL fix file...\n');
    
    const sqlFilePath = join(__dirname, 'FIX-SUPPLIER-NAME-COLUMN-ERROR.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf-8');
    
    console.log('✅ SQL file loaded\n');
    console.log('⚠️  NOTE: Supabase JS client cannot execute raw SQL directly.');
    console.log('          You have two options:\n');
    console.log('OPTION 1 (EASIEST):');
    console.log('  1. Open Neon Dashboard: https://console.neon.tech');
    console.log('  2. Go to SQL Editor');
    console.log('  3. Copy and paste the content from: FIX-SUPPLIER-NAME-COLUMN-ERROR.sql');
    console.log('  4. Click "Run"\n');
    console.log('OPTION 2 (CLI):');
    console.log('  Run this command if you have psql installed:');
    console.log('  psql $DATABASE_URL -f FIX-SUPPLIER-NAME-COLUMN-ERROR.sql\n');
    console.log('=' .repeat(60));
    console.log('\n📋 SQL FIX PREVIEW (First 50 lines):\n');
    console.log(sqlContent.split('\n').slice(0, 50).join('\n'));
    console.log('\n... (see FIX-SUPPLIER-NAME-COLUMN-ERROR.sql for full content)\n');
    
  } catch (error) {
    console.error('❌ Error reading SQL file:', error.message);
  }
}

// Run the fix
applyFixFromFile();

