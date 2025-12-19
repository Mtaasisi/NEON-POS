-- ============================================
-- CREATE FUNCTION run_sql_query
-- ============================================
-- This migration creates a PostgreSQL function to execute arbitrary SQL queries
-- and return the results as JSONB. This is useful for dynamic queries from the application.
-- It includes SECURITY DEFINER to allow it to bypass RLS for specific trusted calls.
-- ============================================

CREATE OR REPLACE FUNCTION run_sql_query(query_text TEXT)
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec RECORD;
    dynamic_query TEXT;
BEGIN
    -- Ensure only SELECT statements are allowed for security. 
    -- For more complex scenarios, a more robust parser would be needed.
    IF UPPER(TRIM(query_text)) LIKE 'SELECT %' THEN
        dynamic_query := query_text;
    ELSIF UPPER(TRIM(query_text)) LIKE 'WITH %' THEN
        dynamic_query := query_text;
    ELSE
        RAISE EXCEPTION 'Only SELECT or WITH queries are allowed.';
    END IF;

    FOR rec IN EXECUTE dynamic_query
    LOOP
        RETURN NEXT TO_JSONB(rec);
    END LOOP;
END;
$$;

-- Grant execution rights to authenticated users
GRANT EXECUTE ON FUNCTION run_sql_query(TEXT) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION run_sql_query(TEXT) IS
'Executes a given SQL SELECT query and returns the results as JSONB, bypassing RLS. Restricted to SELECT statements.';

-- Verification
-- DO $$
-- DECLARE
--   function_exists BOOLEAN;
-- BEGIN
--   -- Check if function was created
--   SELECT EXISTS (
--     SELECT 1
--     FROM pg_proc
--     WHERE proname = 'run_sql_query'
--       AND oidvectortypes(proargtypes) = 'text'::regtype::oidvector
--   ) INTO function_exists;

--   RAISE NOTICE '================================================';
--   RAISE NOTICE '✅ RUN_SQL_QUERY FUNCTION CREATION COMPLETE';
--   RAISE NOTICE '================================================';

--   IF function_exists THEN
--     RAISE NOTICE '   ✅ run_sql_query(text) function created and accessible.';
--   ELSE
--     RAISE EXCEPTION '   ❌ run_sql_query(text) function FAILED to create or is not accessible.';
--   END IF;

--   RAISE NOTICE '';
--   RAISE NOTICE '================================================';
--   RAISE NOTICE 'Migration for run_sql_query completed!';
--   RAISE NOTICE '================================================';
-- END $$;
