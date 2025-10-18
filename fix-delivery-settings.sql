
-- Fix for Delivery Settings Empty Array Issue
-- This adds default values for empty arrays

DO $$ 
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lats_pos_delivery_settings') THEN
    -- Update any rows with NULL arrays to empty JSONB arrays
    UPDATE lats_pos_delivery_settings 
    SET 
      delivery_zones = COALESCE(delivery_zones, '[]'::jsonb),
      delivery_hours = COALESCE(delivery_hours, '[]'::jsonb)
    WHERE delivery_zones IS NULL OR delivery_hours IS NULL;
    
    RAISE NOTICE 'Delivery settings updated successfully';
  END IF;
END $$;
