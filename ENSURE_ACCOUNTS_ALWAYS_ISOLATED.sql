-- ============================================================================
-- ENSURE ALL NEW ACCOUNTS ARE ALWAYS ISOLATED WITH BRANCH_ID
-- ============================================================================
-- This trigger ensures that every new account is automatically isolated
-- and assigned to a branch, even if the application code doesn't set it
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_account_isolation ON finance_accounts;
DROP FUNCTION IF EXISTS ensure_account_isolation() CASCADE;

-- Create function to ensure account isolation
CREATE OR REPLACE FUNCTION ensure_account_isolation()
RETURNS TRIGGER AS $$
DECLARE
  default_branch_id UUID;
BEGIN
  -- Force is_shared to false for all new accounts
  NEW.is_shared := false;
  
  -- If branch_id is not set, get the first active branch
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO default_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF default_branch_id IS NOT NULL THEN
      NEW.branch_id := default_branch_id;
      RAISE NOTICE 'Account % assigned to default branch %', NEW.name, default_branch_id;
    ELSE
      RAISE WARNING 'No active branch found. Account % created without branch_id', NEW.name;
    END IF;
  END IF;
  
  -- Ensure account_name is set (required constraint)
  IF NEW.account_name IS NULL OR NEW.account_name = '' THEN
    NEW.account_name := COALESCE(NEW.name, 'Unnamed Account');
  END IF;
  
  -- Ensure name is set if account_name is provided
  IF NEW.name IS NULL OR NEW.name = '' THEN
    NEW.name := NEW.account_name;
  END IF;
  
  -- Ensure account_type is set (required constraint - NOT NULL)
  IF NEW.account_type IS NULL OR NEW.account_type = '' THEN
    NEW.account_type := COALESCE(NEW.type, 'cash');
  END IF;
  
  -- Ensure type is set if account_type is provided (for consistency)
  IF NEW.type IS NULL OR NEW.type = '' THEN
    NEW.type := NEW.account_type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert
CREATE TRIGGER ensure_account_isolation
  BEFORE INSERT ON finance_accounts
  FOR EACH ROW
  EXECUTE FUNCTION ensure_account_isolation();

-- Add comment
COMMENT ON FUNCTION ensure_account_isolation() IS 'Ensures all new accounts are isolated (is_shared=false) and have branch_id assigned';

-- Verify trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'ensure_account_isolation';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger created successfully!';
  RAISE NOTICE 'All new accounts will now be automatically isolated with branch_id assigned.';
END $$;
