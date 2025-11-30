-- ================================================
-- FIX: Installment Balance Due Calculation
-- ================================================
-- This migration fixes the balance_due calculation to use total_amount instead of amount_financed
-- because total_paid includes the down payment, so balance_due should be total_amount - total_paid

-- Drop and recreate the trigger function with correct balance calculation
CREATE OR REPLACE FUNCTION update_installment_plan_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid NUMERIC;
    v_balance_due NUMERIC;
    v_installments_paid INTEGER;
    v_total_installments INTEGER;
    v_total_amount NUMERIC;
    v_all_paid BOOLEAN;
BEGIN
    -- Calculate totals from all payments
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM installment_payments
    WHERE installment_plan_id = NEW.installment_plan_id;
    
    -- Get plan details
    SELECT total_amount, number_of_installments INTO v_total_amount, v_total_installments
    FROM customer_installment_plans
    WHERE id = NEW.installment_plan_id;
    
    -- Calculate balance due: total_amount - total_paid (because total_paid includes down payment)
    v_balance_due := v_total_amount - v_total_paid;
    
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

-- Add comment to document the fix
COMMENT ON FUNCTION update_installment_plan_balance() IS 
'Updates installment plan balance and status. Balance due is calculated as total_amount - total_paid (not amount_financed - total_paid) because total_paid includes the down payment. Only marks as completed when ALL installments are paid AND balance is zero.';

-- Manually trigger the update for all plans to recalculate balance_due correctly
UPDATE customer_installment_plans
SET updated_at = now()
WHERE id IN (
    SELECT DISTINCT installment_plan_id 
    FROM installment_payments
);

