-- ============================================================================
-- CREATE AUTH SCHEMA FOR NEON DATABASE
-- ============================================================================
-- This creates a mock auth schema and auth.uid() function
-- to make Supabase-style SQL work in regular PostgreSQL/Neon
-- ============================================================================

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Create a function to return current user ID
-- This is a placeholder - you'll need to implement your own auth logic
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  -- Return NULL by default (no authenticated user)
  -- You can modify this to return a specific user ID for testing
  -- or integrate with your own authentication system
  SELECT NULL::uuid;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC;

-- For testing, you can create a function that sets a user context:
CREATE OR REPLACE FUNCTION auth.set_user_id(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_uuid::text, false);
END;
$$;

-- Modified auth.uid() that reads from session variable
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_id text;
BEGIN
  user_id := current_setting('app.current_user_id', true);
  
  IF user_id IS NULL OR user_id = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN user_id::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

COMMIT;

-- Usage example (uncomment to test):
-- SELECT auth.set_user_id('123e4567-e89b-12d3-a456-426614174000');
-- SELECT auth.uid(); -- Should return the UUID you set

-- To use in your app, call auth.set_user_id() at the start of each session
-- with your authenticated user's ID

