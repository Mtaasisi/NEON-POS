-- ============================================================================
-- MAKE ALL CUSTOMERS SHARED
-- ============================================================================
-- This script makes all customers shared across branches
-- Sets is_shared = true for all customers
-- ============================================================================

DO $$
DECLARE
  customers_updated INT := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MAKING ALL CUSTOMERS SHARED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Make all customers shared
  UPDATE customers
  SET 
    is_shared = true,
    updated_at = now()
  WHERE is_shared = false OR is_shared IS NULL;
  
  GET DIAGNOSTICS customers_updated = ROW_COUNT;
  
  RAISE NOTICE '✅ Updated % customers to is_shared = true', customers_updated;
  RAISE NOTICE '';
  RAISE NOTICE '✅ All customers are now shared across branches!';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Make sure share_customers = true in store_locations table';
  
END $$;

-- Update branch settings to ensure customers are shared
UPDATE store_locations
SET share_customers = true
WHERE is_active = true;

-- Show updated settings
SELECT 
  id,
  name,
  data_isolation_mode,
  share_customers
FROM store_locations
WHERE is_active = true;
