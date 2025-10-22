-- ============================================
-- CREATE PURCHASE ORDER PAYMENT HELPER FUNCTIONS
-- ============================================

-- Function to get payment summary for a purchase order
CREATE OR REPLACE FUNCTION get_purchase_order_payment_summary(
  purchase_order_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
  v_total_paid DECIMAL;
  v_payment_count INTEGER;
  v_last_payment_date TIMESTAMP WITH TIME ZONE;
  v_total_amount DECIMAL;
  v_remaining DECIMAL;
  v_payment_status VARCHAR;
BEGIN
  -- Get purchase order details
  SELECT total_amount, COALESCE(total_paid, 0), payment_status
  INTO v_total_amount, v_total_paid, v_payment_status
  FROM lats_purchase_orders
  WHERE id = purchase_order_id_param;

  -- Check if purchase order exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Purchase order not found'
    );
  END IF;

  -- Get payment count and last payment date
  SELECT 
    COUNT(*),
    MAX(payment_date)
  INTO v_payment_count, v_last_payment_date
  FROM purchase_order_payments
  WHERE purchase_order_id = purchase_order_id_param
    AND status = 'completed';

  v_remaining := v_total_amount - v_total_paid;

  -- Build result
  v_result := json_build_object(
    'total_amount', v_total_amount,
    'total_paid', v_total_paid,
    'remaining', v_remaining,
    'payment_count', COALESCE(v_payment_count, 0),
    'last_payment_date', v_last_payment_date,
    'payment_status', v_payment_status
  );

  RETURN v_result;
END;
$$;

-- Function to get payment history for a purchase order
CREATE OR REPLACE FUNCTION get_purchase_order_payment_history(
  purchase_order_id_param UUID
)
RETURNS TABLE (
  id UUID,
  purchase_order_id UUID,
  payment_account_id UUID,
  amount DECIMAL,
  currency VARCHAR,
  payment_method VARCHAR,
  payment_method_id UUID,
  reference TEXT,
  notes TEXT,
  status VARCHAR,
  payment_date TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.purchase_order_id,
    p.payment_account_id,
    p.amount,
    p.currency,
    p.payment_method,
    p.payment_method_id,
    p.reference,
    p.notes,
    p.status,
    p.payment_date,
    p.created_by,
    p.created_at,
    p.updated_at
  FROM purchase_order_payments p
  WHERE p.purchase_order_id = purchase_order_id_param
  ORDER BY p.payment_date DESC, p.created_at DESC;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION get_purchase_order_payment_summary IS 'Gets payment summary for a purchase order including total paid, remaining, and payment count';
COMMENT ON FUNCTION get_purchase_order_payment_history IS 'Gets full payment history for a purchase order ordered by date';

