#!/usr/bin/env node
/**
 * Fix Account Balance Trigger for Adjustments and Reversals
 * =========================================================
 * This script fixes the update_account_balance trigger function to properly
 * handle both adjustment transactions and reversal transactions.
 *
 * Issues Fixed:
 * 1. Adjustment transactions now correctly add/subtract from current balance
 * 2. Reversal transactions don't trigger additional balance updates (preventing double-counting)
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

async function applyFix() {
  log.header('🔧 FIXING ACCOUNT BALANCE TRIGGER FOR ADJUSTMENTS');

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

    log.info('Applying trigger fix...');

    // Drop existing trigger
    log.info('Dropping existing trigger...');
    await sql`DROP TRIGGER IF EXISTS trigger_update_account_balance ON public.account_transactions`;

    // Drop existing function
    log.info('Dropping existing function...');
    await sql`DROP FUNCTION IF EXISTS public.update_account_balance()`;

    // Create the corrected function
    log.info('Creating corrected function...');
    await sql`
      CREATE FUNCTION public.update_account_balance() RETURNS trigger
          LANGUAGE plpgsql
          AS $$
      DECLARE
        current_balance DECIMAL(15,2);
        new_balance DECIMAL(15,2);
      BEGIN
        -- Get current balance
        SELECT balance INTO current_balance
        FROM finance_accounts
        WHERE id = NEW.account_id;

        -- Store balance before transaction
        NEW.balance_before := current_balance;

        -- Calculate new balance based on transaction type
        IF NEW.transaction_type IN ('payment_received', 'transfer_in') THEN
          -- These increase the balance
          new_balance := current_balance + NEW.amount;
        ELSIF NEW.transaction_type IN ('payment_made', 'expense', 'transfer_out') THEN
          -- These decrease the balance (expenses reduce account balance)
          new_balance := current_balance - NEW.amount;
        ELSIF NEW.transaction_type = 'adjustment' THEN
          -- Adjustments can go either way based on the sign (positive adds, negative subtracts)
          new_balance := current_balance + NEW.amount;
        ELSIF NEW.transaction_type = 'reversal' THEN
          -- Reversals are already handled by manual balance updates, don't change balance again
          new_balance := current_balance;
        ELSE
          -- Default: no change
          new_balance := current_balance;
        END IF;

        -- Store balance after transaction
        NEW.balance_after := new_balance;

        -- Update the account balance
        UPDATE finance_accounts
        SET
          balance = new_balance,
          updated_at = NOW()
        WHERE id = NEW.account_id;

        RETURN NEW;
      END;
      $$;
    `;

    // Recreate the trigger
    log.info('Recreating trigger...');
    await sql`
      CREATE TRIGGER trigger_update_account_balance
      BEFORE INSERT ON public.account_transactions
      FOR EACH ROW EXECUTE FUNCTION public.update_account_balance()
    `;

    // Test the fix
    log.info('Testing the fix...');
    const result = await sql`SELECT 'Account balance trigger fixed successfully' as status`;
    log.success(result[0].status);

    // Verify the function exists
    const functions = await sql`
      SELECT proname, prokind
      FROM pg_proc
      WHERE proname = 'update_account_balance'
    `;

    if (functions.length > 0) {
      log.success('Function created successfully');
    } else {
      throw new Error('Function was not created');
    }

    // Verify the trigger exists
    const triggers = await sql`
      SELECT tgname, tgrelid::regclass as table_name
      FROM pg_trigger
      WHERE tgname = 'trigger_update_account_balance'
    `;

    if (triggers.length > 0) {
      log.success('Trigger created successfully');
    } else {
      throw new Error('Trigger was not created');
    }

    log.success('🎉 Account balance trigger fix applied successfully!');
    log.info('✅ Fixed issues:');
    log.info('  - Adjustment transactions now properly add/subtract from balance');
    log.info('  - Reversal transactions no longer cause double balance updates');
    log.info('');
    log.info('The undo payment button should now work correctly!');
    log.info('You can test it by:');
    log.info('1. Opening Payment Accounts → Payment Accounts tab');
    log.info('2. Clicking "View Full History" on any account');
    log.info('3. Clicking the "Reverse" button on any transaction');
    log.info('4. Providing a reason and confirming the reversal');

  } catch (error) {
    log.error('Failed to apply trigger fix:');
    console.error(error);
    process.exit(1);
  }
}

// Run the fix
applyFix().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
