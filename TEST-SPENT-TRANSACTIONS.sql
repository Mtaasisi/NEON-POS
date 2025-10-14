-- ============================================
-- TEST SPENT TRANSACTIONS
-- ============================================
-- This script creates sample outgoing transactions to test the "Spent" feature
-- Run this to immediately see spent amounts on your Payment Accounts page

-- ⚠️ WARNING: This adds test transactions to your database
-- Only run this if you want to test the "Spent" feature

-- ============================================
-- 1. GET ACCOUNT IDs
-- ============================================

-- First, let's see your payment accounts
SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";
SELECT '   YOUR PAYMENT ACCOUNTS' as "INFO";
SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";

SELECT 
  id,
  name,
  type,
  balance as current_balance,
  currency
FROM finance_accounts
WHERE is_payment_method = true
  AND is_active = true
ORDER BY name;

-- ============================================
-- 2. CREATE TEST EXPENSE TRANSACTIONS
-- ============================================
-- Uncomment the sections below to create test transactions

/*
-- Example 1: Office Rent paid from Cash account
INSERT INTO account_transactions (
  account_id,
  transaction_type,
  amount,
  description,
  reference_number,
  created_at
)
SELECT 
  id,
  'expense',
  25000,
  'Monthly office rent - November',
  'RENT-NOV-2025',
  NOW()
FROM finance_accounts
WHERE name = 'Cash'
  AND is_payment_method = true
LIMIT 1;

-- Example 2: Utility bills paid from CRDB Bank
INSERT INTO account_transactions (
  account_id,
  transaction_type,
  amount,
  description,
  reference_number,
  created_at
)
SELECT 
  id,
  'expense',
  15000,
  'Electricity and water bills',
  'UTIL-001',
  NOW()
FROM finance_accounts
WHERE name = 'CRDB Bank'
  AND is_payment_method = true
LIMIT 1;

-- Example 3: Office supplies paid from M-Pesa
INSERT INTO account_transactions (
  account_id,
  transaction_type,
  amount,
  description,
  reference_number,
  created_at
)
SELECT 
  id,
  'expense',
  5000,
  'Stationery and office supplies',
  'SUPPLIES-001',
  NOW()
FROM finance_accounts
WHERE name = 'M-Pesa'
  AND is_payment_method = true
LIMIT 1;

-- Example 4: Payment to supplier from CRDB Bank
INSERT INTO account_transactions (
  account_id,
  transaction_type,
  amount,
  description,
  reference_number,
  created_at
)
SELECT 
  id,
  'payment_made',
  150000,
  'Payment to supplier - Invoice #INV-2025-001',
  'PAY-SUPPLIER-001',
  NOW()
FROM finance_accounts
WHERE name = 'CRDB Bank'
  AND is_payment_method = true
LIMIT 1;

-- Example 5: Transfer from Cash to CRDB Bank
DO $$
DECLARE
  v_cash_account_id UUID;
  v_bank_account_id UUID;
  v_transfer_amount NUMERIC := 10000;
BEGIN
  -- Get account IDs
  SELECT id INTO v_cash_account_id FROM finance_accounts WHERE name = 'Cash' AND is_payment_method = true LIMIT 1;
  SELECT id INTO v_bank_account_id FROM finance_accounts WHERE name = 'CRDB Bank' AND is_payment_method = true LIMIT 1;
  
  IF v_cash_account_id IS NOT NULL AND v_bank_account_id IS NOT NULL THEN
    -- Transfer OUT from Cash
    INSERT INTO account_transactions (
      account_id,
      transaction_type,
      amount,
      description,
      reference_number,
      created_at
    ) VALUES (
      v_cash_account_id,
      'transfer_out',
      v_transfer_amount,
      'Transfer to CRDB Bank',
      'TRANSFER-001',
      NOW()
    );
    
    -- Transfer IN to Bank
    INSERT INTO account_transactions (
      account_id,
      transaction_type,
      amount,
      description,
      reference_number,
      created_at
    ) VALUES (
      v_bank_account_id,
      'transfer_in',
      v_transfer_amount,
      'Transfer from Cash',
      'TRANSFER-001',
      NOW()
    );
    
    RAISE NOTICE 'Transfer created: TSh % from Cash to CRDB Bank', v_transfer_amount;
  END IF;
END $$;

*/

-- ============================================
-- 3. SIMPLE TEST - ADD ONE EXPENSE
-- ============================================
-- This is a safe, simple test - adds just ONE expense to Cash account

/*
-- Uncomment this to add a single test expense
INSERT INTO account_transactions (
  account_id,
  transaction_type,
  amount,
  description,
  reference_number,
  created_at
)
SELECT 
  id,
  'expense',
  1000,
  'TEST EXPENSE - Please ignore',
  'TEST-001',
  NOW()
FROM finance_accounts
WHERE name = 'Cash'
  AND is_payment_method = true
LIMIT 1
RETURNING 
  id,
  'Created test expense of TSh 1,000 for Cash account' as message;
*/

-- ============================================
-- 4. VERIFY TEST TRANSACTIONS
-- ============================================

SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";
SELECT '   AFTER CREATING TEST TRANSACTIONS' as "INFO";
SELECT '═══════════════════════════════════════════════════' as "═══════════════════════════════════════════════════";

-- Show spent amounts by account
SELECT 
  fa.name as account_name,
  COALESCE(
    (SELECT SUM(amount) 
     FROM account_transactions 
     WHERE account_id = fa.id 
       AND transaction_type IN ('payment_received', 'transfer_in')),
    0
  ) as total_received,
  COALESCE(
    (SELECT SUM(amount) 
     FROM account_transactions 
     WHERE account_id = fa.id 
       AND transaction_type IN ('payment_made', 'expense', 'transfer_out')),
    0
  ) as total_spent,
  COALESCE(
    (SELECT SUM(amount) 
     FROM account_transactions 
     WHERE account_id = fa.id 
       AND transaction_type IN ('payment_received', 'transfer_in')),
    0
  ) - COALESCE(
    (SELECT SUM(amount) 
     FROM account_transactions 
     WHERE account_id = fa.id 
       AND transaction_type IN ('payment_made', 'expense', 'transfer_out')),
    0
  ) as calculated_balance,
  fa.currency
FROM finance_accounts fa
WHERE fa.is_payment_method = true
  AND fa.is_active = true
ORDER BY fa.name;

-- ============================================
-- 5. INSTRUCTIONS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '   HOW TO TEST THE SPENT FEATURE';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 STEP 1: Uncomment one of the test sections above';
  RAISE NOTICE '   - Start with section 3 (simple test) for safety';
  RAISE NOTICE '   - Or uncomment section 2 for multiple examples';
  RAISE NOTICE '';
  RAISE NOTICE '📋 STEP 2: Run this script again';
  RAISE NOTICE '';
  RAISE NOTICE '📋 STEP 3: Navigate to Finance → Payment Accounts';
  RAISE NOTICE '';
  RAISE NOTICE '📋 STEP 4: Verify the "Spent" amounts are showing';
  RAISE NOTICE '';
  RAISE NOTICE '💡 TIP: Start with the simple test (section 3)';
  RAISE NOTICE '   It adds just TSh 1,000 expense to Cash account';
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  TO REMOVE TEST DATA:';
  RAISE NOTICE '   DELETE FROM account_transactions';
  RAISE NOTICE '   WHERE reference_number LIKE ''TEST-%'';';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

