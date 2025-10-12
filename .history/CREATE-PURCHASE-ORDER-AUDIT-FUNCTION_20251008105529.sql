-- ============================================
-- CREATE PURCHASE ORDER AUDIT FUNCTION
-- ============================================
-- This function logs audit entries for purchase orders
-- Run this in your Neon Database SQL Editor
-- ============================================

-- First, ensure the purchase_order_audit table exists
CREATE TABLE IF NOT EXISTS purchase_order_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  user_id UUID,
  created_by UUID,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_order_audit_order_id 
  ON purchase_order_audit(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_audit_timestamp 
  ON purchase_order_audit(timestamp DESC);

-- ============================================
-- CREATE THE AUDIT LOGGING FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION log_purchase_order_audit(
  p_purchase_order_id UUID,
  p_action TEXT,
  p_details TEXT,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  -- Insert the audit entry
  INSERT INTO purchase_order_audit (
    purchase_order_id,
    action,
    user_id,
    created_by,
    details,
    timestamp,
    created_at
  ) VALUES (
    p_purchase_order_id,
    p_action,
    p_user_id,
    p_user_id,
    p_details,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_audit_id;
  
  -- Return the ID of the created audit entry
  RETURN v_audit_id;
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_purchase_order_audit(UUID, TEXT, TEXT, UUID) 
  TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT ON purchase_order_audit TO authenticated;

-- ============================================
-- TEST THE FUNCTION
-- ============================================

-- Test query (uncomment to test):
-- SELECT log_purchase_order_audit(
--   '4bbd7c73-1d49-45cc-97c0-3c869b68d45c'::UUID,
--   'test_action',
--   'Test audit entry',
--   (SELECT auth.uid())
-- );

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the function was created
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'log_purchase_order_audit'
  AND n.nspname = 'public';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Purchase order audit function created successfully!';
  RAISE NOTICE '✅ You can now update purchase order statuses without errors.';
END $$;

