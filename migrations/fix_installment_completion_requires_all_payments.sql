-- ================================================
-- FIX: Installment Completion Requires All Payments
-- ================================================
-- This migration fixes the installment plan completion logic to ensure
-- that installments are only marked as completed when ALL payments have been received,
-- not just when the balance is zero. This prevents premature completion.

-- Drop and recreate the trigger function with proper completion logic
CREATE OR REPLACE FUNCTION update_installment_plan_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid NUMERIC;
    v_balance_due NUMERIC;
    v_installments_paid INTEGER;
    v_total_installments INTEGER;
    v_amount_financed NUMERIC;
    v_all_paid BOOLEAN;
BEGIN
    -- Calculate totals from all payments
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM installment_payments
    WHERE installment_plan_id = NEW.installment_plan_id;
    
    -- Get plan details
    SELECT amount_financed, number_of_installments INTO v_amount_financed, v_total_installments
    FROM customer_installment_plans
    WHERE id = NEW.installment_plan_id;
    
    -- Calculate balance due
    v_balance_due := v_amount_financed - v_total_paid;
    
    -- Count unique paid installments (excluding down payment which is installment_number 0)
    SELECT COUNT(DISTINCT installment_number) INTO v_installments_paid
    FROM installment_payments
    WHERE installment_plan_id = NEW.installment_plan_id
    AND status = 'paid'
    AND installment_number > 0;
    
    -- Check if all installments are paid (must have paid all required installments AND balance is zero/negative)
    -- This ensures completion only happens when ALL installments are received
    v_all_paid := (v_installments_paid >= v_total_installments) AND (v_balance_due <= 0);
    
    -- Update the plan
    UPDATE customer_installment_plans
    SET 
        total_paid = v_total_paid,
        balance_due = v_balance_due,
        installments_paid = v_installments_paid,
        status = CASE
            -- Only mark as completed if ALL installments are paid AND balance is zero
            WHEN v_all_paid THEN 'completed'
            -- Reset to active if status was incorrectly set to completed but not all installments are paid
            WHEN status = 'completed' AND NOT v_all_paid THEN 'active'
            ELSE status
        END,
        completion_date = CASE
            -- Only set completion date when truly completed
            WHEN v_all_paid THEN now()
            -- Clear completion date if not truly completed
            ELSE NULL
        END,
        updated_at = now()
    WHERE id = NEW.installment_plan_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger is already created, so we don't need to recreate it
-- But we'll add a comment to document the fix
COMMENT ON FUNCTION update_installment_plan_balance() IS 
'Updates installment plan balance and status. Only marks as completed when ALL installments are paid AND balance is zero. This prevents premature completion when payments are missing.';

-- Fix any existing plans that were incorrectly marked as completed
-- Reset them to active if they don't have all installments paid
UPDATE customer_installment_plans
SET 
    status = 'active',
    completion_date = NULL,
    updated_at = now()
WHERE status = 'completed'
AND (
    -- Check if installments_paid is less than total installments
    installments_paid < number_of_installments
    OR
    -- Check if balance is not zero (allowing for small rounding differences)
    ABS(balance_due) > 0.01
);

-- Log the fix
DO $$
DECLARE
    v_fixed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_fixed_count
    FROM customer_installment_plans
    WHERE status = 'completed'
    AND (
        installments_paid < number_of_installments
        OR ABS(balance_due) > 0.01
    );
    
    IF v_fixed_count > 0 THEN
        RAISE NOTICE 'Fixed % installment plan(s) that were incorrectly marked as completed', v_fixed_count;
    ELSE
        RAISE NOTICE 'No installment plans needed fixing. All completed plans have all payments received.';
    END IF;
END $$;

