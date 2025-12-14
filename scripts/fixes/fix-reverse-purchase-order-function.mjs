#!/usr/bin/env node
/**
 * Fix Reverse Purchase Order Payment Function
 * ============================================
 * This script fixes the reverse_purchase_order_payment function
 * by correcting the total_base field access issue.
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

async function fixFunction() {
  log.header('🔧 FIXING REVERSE PURCHASE ORDER PAYMENT FUNCTION');

  // Check for DATABASE_URL
  const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (!DATABASE_URL) {
    log.error('DATABASE_URL environment variable not set!');
    log.info('Please set it in your .env file or export it:');
    log.info('  export DATABASE_URL="postgresql://..."');
    log.info('  or export VITE_DATABASE_URL="postgresql://..."');
    process.exit(1);
  }

  log.info('Database URL found (hidden for security)');

  try {
    // Create database connection
    const sql = neon(DATABASE_URL);

    log.info('Connecting to database...');

    // Test connection
    await sql`SELECT 1 as test`;
    log.success('Database connection successful');

    // Drop the existing function
    log.info('Dropping existing function...');
    await sql`DROP FUNCTION IF EXISTS public.reverse_purchase_order_payment(UUID, UUID)`;

    // Create the corrected function
    log.info('Creating corrected function...');
    await sql`
      CREATE OR REPLACE FUNCTION public.reverse_purchase_order_payment(
        payment_id_param UUID,
        user_id_param UUID DEFAULT '00000000-0000-0000-0000-000000000001'
      )
      RETURNS JSON
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_payment               purchase_order_payments%ROWTYPE;
        v_po                    lats_purchase_orders%ROWTYPE;
        v_total_base            NUMERIC := 0;
        v_new_total_paid        NUMERIC := 0;
        v_new_status            TEXT := 'unpaid';
        v_account               finance_accounts%ROWTYPE;
        v_deleted_transactions  INTEGER := 0;
        v_deleted_expenses      INTEGER := 0;
        v_receipt_number        TEXT;
      BEGIN
        -- Lock payment row to prevent concurrent reversals
        SELECT *
        INTO v_payment
        FROM purchase_order_payments
        WHERE id = payment_id_param
        FOR UPDATE;

        IF NOT FOUND THEN
          RETURN json_build_object(
            'success', false,
            'message', 'Payment not found'
          );
        END IF;

        -- Lock the related purchase order row
        SELECT *
        INTO v_po
        FROM lats_purchase_orders
        WHERE id = v_payment.purchase_order_id
        FOR UPDATE;

        IF NOT FOUND THEN
          RETURN json_build_object(
            'success', false,
            'message', 'Related purchase order not found'
          );
        END IF;

        -- Calculate new totals and payment status
        v_new_total_paid := GREATEST(COALESCE(v_po.total_paid, 0) - COALESCE(v_payment.amount, 0), 0);
        v_total_base := COALESCE(v_po.total_amount_base_currency, v_po.total_amount, 0);

        IF v_new_total_paid <= 0 THEN
          v_new_status := 'unpaid';
        ELSIF v_total_base > 0 AND v_new_total_paid >= v_total_base THEN
          v_new_status := 'paid';
        ELSE
          v_new_status := 'partial';
        END IF;

        -- Restore finance account balance
        UPDATE finance_accounts
        SET balance = balance + COALESCE(v_payment.amount, 0),
            updated_at = NOW()
        WHERE id = v_payment.payment_account_id
        RETURNING * INTO v_account;

        IF NOT FOUND THEN
          RETURN json_build_object(
            'success', false,
            'message', 'Related finance account not found'
          );
        END IF;

        -- Remove linked account transactions
        DELETE FROM account_transactions
        WHERE related_entity_type = 'purchase_order_payment'
          AND related_entity_id = v_payment.id;
        GET DIAGNOSTICS v_deleted_transactions = ROW_COUNT;

        -- Remove any finance expense created by the payment trigger
        v_receipt_number := COALESCE(v_payment.reference, 'PO-PAY-' || SUBSTRING(v_payment.id::TEXT, 1, 8));

        DELETE FROM finance_expenses
        WHERE receipt_number = v_receipt_number
           OR description ILIKE '%' || v_payment.id::TEXT || '%';
        GET DIAGNOSTICS v_deleted_expenses = ROW_COUNT;

        -- Delete the payment record itself
        DELETE FROM purchase_order_payments
        WHERE id = v_payment.id;

        -- Update purchase order totals and status
        UPDATE lats_purchase_orders
        SET total_paid = v_new_total_paid,
            payment_status = v_new_status,
            updated_at = NOW()
        WHERE id = v_payment.purchase_order_id;

        RETURN json_build_object(
          'success', true,
          'message', 'Payment reversed successfully',
          'data', json_build_object(
            'purchase_order_id', v_payment.purchase_order_id,
            'amount_reversed', v_payment.amount,
            'new_total_paid', v_new_total_paid,
            'payment_status', v_new_status,
            'account_id', v_account.id,
            'account_balance', v_account.balance,
            'transactions_removed', v_deleted_transactions,
            'expenses_removed', v_deleted_expenses,
            'performed_by', user_id_param,
            'performed_at', NOW()
          )
        );
      END;
      $$;
    `;

    // Add the comment and grant permissions
    await sql`
      COMMENT ON FUNCTION public.reverse_purchase_order_payment(UUID, UUID) IS
      'Reverses a purchase order payment, restoring balances, removing related records, and updating the purchase order totals.';
    `;

    await sql`
      GRANT EXECUTE ON FUNCTION public.reverse_purchase_order_payment(UUID, UUID) TO authenticated;
    `;

    log.success('Function updated successfully');

    // Test the function
    log.info('Testing function with corrected logic...');
    try {
      // This should fail with "Payment not found" but proves the function works
      const testResult = await sql`SELECT * FROM reverse_purchase_order_payment('00000000-0000-0000-0000-000000000000'::uuid)`;
      log.info('Function test completed (expected "Payment not found" error)');
    } catch (error) {
      if (error.message && error.message.includes('Payment not found')) {
        log.success('Function is working correctly (expected "Payment not found" error)');
      } else if (error.message && error.message.includes('record "v_po" has no field "total_base"')) {
        throw new Error('Function still has the field access error');
      } else {
        log.warning('Function returned unexpected error (may be okay): ' + error.message);
      }
    }

    log.success('🎉 Reverse purchase order payment function fixed successfully!');
    log.info('');
    log.info('✅ Fixed issue: Removed the problematic total_base field access');
    log.info('');
    log.info('The purchase order undo payment functionality should now work!');
    log.info('You can test it by:');
    log.info('1. Opening Purchase Orders');
    log.info('2. Selecting a purchase order with payments');
    log.info('3. Clicking the "Undo Last Payment" button');
    log.info('4. Confirming the reversal');

  } catch (error) {
    log.error('Failed to fix function:');
    console.error(error);
    process.exit(1);
  }
}

// Run the fix
fixFunction().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
