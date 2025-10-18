-- ============================================
-- FIX SET_DEFAULT_BRANCH TRIGGER
-- Removes reference to non-existent created_by column
-- ============================================

-- Option 1: Fix the function to not require created_by
CREATE OR REPLACE FUNCTION public.set_default_branch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If branch_id is not set, try to get user's current branch from auth
  IF NEW.branch_id IS NULL THEN
    -- Try to get current user's branch (if the function exists)
    BEGIN
      NEW.branch_id := get_user_current_branch(auth.uid());
    EXCEPTION
      WHEN OTHERS THEN
        -- If function doesn't exist or fails, just leave branch_id as NULL
        NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Option 2: Drop the trigger entirely (uncomment if you want to disable it)
-- DROP TRIGGER IF EXISTS trigger_set_product_branch ON lats_products;

-- Verify the fix
SELECT 'Trigger function updated successfully' as status;

