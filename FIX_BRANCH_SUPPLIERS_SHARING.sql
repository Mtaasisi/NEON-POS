-- ================================================
-- FIX: Ensure Branches Have Suppliers Sharing Enabled
-- ================================================
-- Ensures all branches have share_suppliers = true
-- so suppliers are visible even in isolated/hybrid mode
-- ================================================
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- URL: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new
-- ================================================

BEGIN;

-- ================================================
-- Check current branch settings
-- ================================================

SELECT 
  id,
  name,
  data_isolation_mode,
  share_suppliers,
  share_customers,
  share_products
FROM store_locations
ORDER BY name;

-- ================================================
-- Update all branches to share suppliers
-- ================================================

UPDATE store_locations
SET share_suppliers = true
WHERE share_suppliers IS NOT true;

-- Show updated settings
SELECT 
  id,
  name,
  data_isolation_mode,
  share_suppliers as suppliers_shared,
  share_customers as customers_shared
FROM store_locations
ORDER BY name;

COMMIT;

-- ================================================
-- ✅ DONE! 
-- ================================================
-- All branches now have share_suppliers = true
-- This ensures suppliers are visible regardless of isolation mode!
-- ================================================
