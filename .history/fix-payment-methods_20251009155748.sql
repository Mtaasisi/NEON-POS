-- ================================================================================
-- FIX PAYMENT METHODS/ACCOUNTS FOR POS
-- ================================================================================
-- This script fixes payment method types and ensures they display correctly in POS
-- ================================================================================

-- 1. Fix the 'card' type to 'credit_card' (TypeScript interface expects 'credit_card')
UPDATE finance_accounts
SET type = 'credit_card', account_type = 'credit_card'
WHERE type = 'card' OR account_type = 'card';

-- 2. Ensure all payment methods have consistent name/account_name
UPDATE finance_accounts
SET name = COALESCE(name, account_name),
    account_name = COALESCE(account_name, name)
WHERE is_payment_method = true;

-- 3. Ensure all payment methods have consistent balance/current_balance
UPDATE finance_accounts
SET balance = COALESCE(balance::numeric, current_balance::numeric, 0),
    current_balance = COALESCE(current_balance::numeric, balance::numeric, 0)
WHERE is_payment_method = true;

-- 4. Ensure all payment methods have proper icons and colors
UPDATE finance_accounts
SET 
    icon = CASE 
        WHEN type = 'cash' THEN 'Wallet'
        WHEN type = 'mobile_money' THEN 'Smartphone'
        WHEN type = 'credit_card' THEN 'CreditCard'
        WHEN type = 'bank' THEN 'Building2'
        ELSE 'Wallet'
    END,
    color = CASE 
        WHEN type = 'cash' THEN '#10B981'
        WHEN type = 'mobile_money' THEN '#8B5CF6'
        WHEN type = 'credit_card' THEN '#EC4899'
        WHEN type = 'bank' THEN '#3B82F6'
        ELSE '#6B7280'
    END
WHERE is_payment_method = true
  AND (icon IS NULL OR color IS NULL);

-- 5. Ensure all payment methods are active
UPDATE finance_accounts
SET is_active = true
WHERE is_payment_method = true;

-- Verify payment methods
SELECT 
    'Payment Methods After Fix' as status,
    id,
    name,
    type,
    balance,
    currency,
    is_active,
    is_payment_method,
    icon,
    color
FROM finance_accounts
WHERE is_payment_method = true
ORDER BY name;

-- Summary
SELECT 
    'Summary' as info,
    COUNT(*) as total_payment_methods,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_payment_methods,
    COUNT(CASE WHEN type = 'cash' THEN 1 END) as cash_methods,
    COUNT(CASE WHEN type = 'mobile_money' THEN 1 END) as mobile_money_methods,
    COUNT(CASE WHEN type = 'credit_card' THEN 1 END) as card_methods,
    COUNT(CASE WHEN type = 'bank' THEN 1 END) as bank_methods
FROM finance_accounts
WHERE is_payment_method = true;

