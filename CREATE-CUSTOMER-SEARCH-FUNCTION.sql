-- ============================================================================
-- CREATE CUSTOMER SEARCH FUNCTION FOR NEON DATABASE
-- ============================================================================
-- This function provides a proper search that works with Neon's SQL parser

-- Drop the existing function first (if it exists)
DROP FUNCTION IF EXISTS search_customers_fn(text, integer, integer);

CREATE OR REPLACE FUNCTION search_customers_fn(
  search_query TEXT,
  page_number INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  color_tag TEXT,
  points INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  total_count BIGINT
) AS $$
DECLARE
  offset_val INTEGER;
BEGIN
  offset_val := (page_number - 1) * page_size;
  
  RETURN QUERY
  WITH search_results AS (
    SELECT 
      c.id,
      c.name,
      c.phone,
      c.email,
      c.city,
      c.color_tag,
      c.points,
      c.created_at,
      c.updated_at,
      COUNT(*) OVER() as total_count
    FROM customers c
    WHERE 
      c.name ILIKE '%' || search_query || '%' OR
      c.phone ILIKE '%' || search_query || '%' OR
      COALESCE(c.email, '') ILIKE '%' || search_query || '%' OR
      COALESCE(c.city, '') ILIKE '%' || search_query || '%' OR
      COALESCE(c.referral_source, '') ILIKE '%' || search_query || '%' OR
      COALESCE(c.customer_tag, '') ILIKE '%' || search_query || '%' OR
      COALESCE(c.initial_notes, '') ILIKE '%' || search_query || '%'
    ORDER BY c.created_at DESC
    LIMIT page_size
    OFFSET offset_val
  )
  SELECT * FROM search_results;
END;
$$ LANGUAGE plpgsql;

-- Function created successfully!
-- To test it, run:
-- SELECT * FROM search_customers_fn('test', 1, 10);

