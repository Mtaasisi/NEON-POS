-- Migration: Update Loyalty Levels from Old System to New System
-- Date: 2025-10-28
-- Description: Updates all customer loyalty levels from the old 4-tier system 
--              (bronze, silver, gold, platinum) to the new 7-tier system
--              (interested, engaged, payment_customer, active, regular, premium, vip)

-- Backup the current loyalty levels before making changes
-- (Optional: Create a backup table)
-- CREATE TABLE customers_loyalty_backup AS 
-- SELECT id, name, loyalty_level FROM customers;

-- Update loyalty levels based on a mapping strategy
-- Strategy: Map old levels to new levels based on tier position
-- Old -> New mapping:
-- bronze -> interested (lowest tier)
-- silver -> active (mid-low tier)
-- gold -> premium (mid-high tier)
-- platinum -> vip (highest tier)

BEGIN;

-- Update platinum customers to vip
UPDATE customers 
SET loyalty_level = 'vip' 
WHERE loyalty_level = 'platinum';

-- Update gold customers to premium
UPDATE customers 
SET loyalty_level = 'premium' 
WHERE loyalty_level = 'gold';

-- Update silver customers to active
UPDATE customers 
SET loyalty_level = 'active' 
WHERE loyalty_level = 'silver';

-- Update bronze customers to interested
UPDATE customers 
SET loyalty_level = 'interested' 
WHERE loyalty_level = 'bronze';

-- Update any NULL or empty loyalty levels to interested (default)
UPDATE customers 
SET loyalty_level = 'interested' 
WHERE loyalty_level IS NULL OR loyalty_level = '';

-- Verify the migration
-- SELECT loyalty_level, COUNT(*) as customer_count 
-- FROM customers 
-- GROUP BY loyalty_level 
-- ORDER BY 
--   CASE loyalty_level
--     WHEN 'vip' THEN 1
--     WHEN 'premium' THEN 2
--     WHEN 'regular' THEN 3
--     WHEN 'active' THEN 4
--     WHEN 'payment_customer' THEN 5
--     WHEN 'engaged' THEN 6
--     WHEN 'interested' THEN 7
--     ELSE 8
--   END;

COMMIT;

-- Print completion message
DO $$
BEGIN
  RAISE NOTICE 'Loyalty level migration completed successfully!';
  RAISE NOTICE 'Old system (4 tiers): bronze, silver, gold, platinum';
  RAISE NOTICE 'New system (7 tiers): interested, engaged, payment_customer, active, regular, premium, vip';
END $$;

