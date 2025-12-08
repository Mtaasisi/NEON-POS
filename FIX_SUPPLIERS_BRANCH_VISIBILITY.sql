-- ================================================
-- FIX: Ensure Suppliers Are Visible to All Branches
-- ================================================
-- Fixes: Suppliers exist but are filtered out by branch isolation
-- 
-- Makes all existing suppliers visible to all branches by:
-- 1. Setting branch_id to NULL (shared)
-- 2. Setting is_shared to true
-- ================================================
-- 
-- IMPORTANT: Run this in Supabase SQL Editor
-- URL: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new
-- ================================================

BEGIN;

-- ================================================
-- Update all suppliers to be shared across branches
-- ================================================

-- Update suppliers to be visible to all branches
UPDATE public.lats_suppliers
SET 
  branch_id = NULL,
  is_shared = true
WHERE 
  is_trade_in_customer = false
  AND (branch_id IS NOT NULL OR is_shared IS NOT true);

-- Show what was updated
SELECT 
  COUNT(*) as total_suppliers,
  COUNT(*) FILTER (WHERE branch_id IS NULL) as shared_suppliers,
  COUNT(*) FILTER (WHERE branch_id IS NOT NULL) as branch_specific_suppliers,
  COUNT(*) FILTER (WHERE is_shared = true) as marked_shared,
  COUNT(*) FILTER (WHERE is_active = true AND is_trade_in_customer = false) as active_real_suppliers
FROM public.lats_suppliers;

-- Show the updated suppliers
SELECT 
  id,
  name,
  branch_id,
  is_shared,
  is_active,
  is_trade_in_customer,
  company_name
FROM public.lats_suppliers 
WHERE is_active = true 
  AND is_trade_in_customer = false
ORDER BY name;

COMMIT;

-- ================================================
-- ✅ DONE! 
-- ================================================
-- All suppliers are now:
-- - Set with branch_id = NULL (visible to all branches)
-- - Set with is_shared = true (explicitly marked as shared)
-- 
-- This ensures they appear regardless of branch isolation settings!
-- ================================================
