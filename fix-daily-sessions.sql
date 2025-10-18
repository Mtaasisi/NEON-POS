
-- Fix for Daily Opening Sessions Duplicate Key Issue

DO $$
BEGIN
  -- Close any duplicate active sessions
  WITH duplicates AS (
    SELECT id, date, is_active,
           ROW_NUMBER() OVER (PARTITION BY date, is_active ORDER BY opened_at DESC) as rn
    FROM daily_opening_sessions
    WHERE is_active = true
  )
  UPDATE daily_opening_sessions
  SET is_active = false
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  RAISE NOTICE 'Duplicate sessions fixed successfully';
END $$;
