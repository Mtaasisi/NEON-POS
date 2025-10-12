-- ============================================
-- CREATE DEFAULT PAYMENT METHODS
-- ============================================
-- This creates default payment accounts/methods for your POS
-- ============================================

-- 1. Create Cash payment method
INSERT INTO finance_accounts (
  account_name,
  account_type,
  currency,
  current_balance,
  is_active
) VALUES (
  'Cash',
  'cash',
  'TZS',
  0,
  true
) ON CONFLICT DO NOTHING;

-- 2. Create M-Pesa payment method
INSERT INTO finance_accounts (
  account_name,
  account_type,
  currency,
  current_balance,
  is_active
) VALUES (
  'M-Pesa',
  'mobile_money',
  'TZS',
  0,
  true
) ON CONFLICT DO NOTHING;

-- 3. Create Bank Account
INSERT INTO finance_accounts (
  account_name,
  account_type,
  bank_name,
  currency,
  current_balance,
  is_active
) VALUES (
  'CRDB Bank',
  'bank',
  'CRDB Bank',
  'TZS',
  0,
  true
) ON CONFLICT DO NOTHING;

-- 4. Create Card payment method
INSERT INTO finance_accounts (
  account_name,
  account_type,
  currency,
  current_balance,
  is_active
) VALUES (
  'Card Payments',
  'card',
  'TZS',
  0,
  true
) ON CONFLICT DO NOTHING;

-- 5. Create Airtel Money
INSERT INTO finance_accounts (
  account_name,
  account_type,
  currency,
  current_balance,
  is_active
) VALUES (
  'Airtel Money',
  'mobile_money',
  'TZS',
  0,
  true
) ON CONFLICT DO NOTHING;

-- 6. Create Tigo Pesa
INSERT INTO finance_accounts (
  account_name,
  account_type,
  currency,
  current_balance,
  is_active
) VALUES (
  'Tigo Pesa',
  'mobile_money',
  'TZS',
  0,
  true
) ON CONFLICT DO NOTHING;

-- Verify creation
SELECT 
  '✅ PAYMENT METHODS CREATED' as status,
  id,
  account_name,
  account_type,
  currency,
  is_active
FROM finance_accounts
WHERE is_active = true
ORDER BY account_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '✅ Payment Methods Created Successfully!';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Created payment methods:';
  RAISE NOTICE '  💵 Cash';
  RAISE NOTICE '  📱 M-Pesa';
  RAISE NOTICE '  🏦 CRDB Bank';
  RAISE NOTICE '  💳 Card Payments';
  RAISE NOTICE '  📱 Airtel Money';
  RAISE NOTICE '  📱 Tigo Pesa';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '  1. Refresh your POS page (F5)';
  RAISE NOTICE '  2. Payment methods should now appear';
  RAISE NOTICE '  3. Test making a sale!';
  RAISE NOTICE '═══════════════════════════════════════';
END $$;

