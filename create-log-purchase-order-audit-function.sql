-- ============================================================================
-- CREATE: log_purchase_order_audit function
-- ============================================================================
-- This function logs audit entries for purchase orders
-- Supports UUID for user_id parameter (as used by the application)

-- Drop existing function if it exists (to avoid conflicts)
DROP FUNCTION IF EXISTS public.log_purchase_order_audit(uuid, text, text, uuid);
DROP FUNCTION IF EXISTS public.log_purchase_order_audit(uuid, text, text, text);

-- Create function that accepts UUID for user_id (matching application code)
CREATE OR REPLACE FUNCTION public.log_purchase_order_audit(
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
  -- Generate new audit ID
  v_audit_id := gen_random_uuid();
  
  -- Insert into purchase_order_audit table
  -- Try purchase_order_audit first, then fallback to lats_purchase_order_audit_log
  BEGIN
    INSERT INTO purchase_order_audit (
      id,
      purchase_order_id,
      action,
      user_id,
      created_by,
      details,
      timestamp,
      created_at
    ) VALUES (
      v_audit_id,
      p_purchase_order_id,
      p_action,
      p_user_id,
      p_user_id,
      p_details,
      NOW(),
      NOW()
    );
  EXCEPTION WHEN undefined_table OR OTHERS THEN
    -- If purchase_order_audit doesn't exist, try lats_purchase_order_audit_log
    BEGIN
      INSERT INTO lats_purchase_order_audit_log (
        id,
        purchase_order_id,
        action,
        user_id,
        notes,
        created_at
      ) VALUES (
        v_audit_id,
        p_purchase_order_id,
        p_action,
        p_user_id,
        p_details,
        NOW()
      );
    EXCEPTION WHEN undefined_table OR OTHERS THEN
      -- If neither table exists, just return NULL (don't fail)
      RAISE WARNING 'Audit table not found. Purchase order audit logging disabled.';
      RETURN NULL;
    END;
  END;

  RETURN v_audit_id;

EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the operation
  RAISE WARNING 'Error logging audit entry: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.log_purchase_order_audit(uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_purchase_order_audit(uuid, text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.log_purchase_order_audit(uuid, text, text, uuid) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.log_purchase_order_audit(uuid, text, text, uuid) IS 
'Logs audit entries for purchase orders. Returns the audit entry ID or NULL on error.';
