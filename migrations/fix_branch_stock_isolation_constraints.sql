-- ============================================================================
-- BRANCH STOCK ISOLATION CONSTRAINTS AND INDEXES
-- ============================================================================
-- This migration adds database-level constraints to prevent cross-branch
-- stock leakage and improve query performance for branch-filtered operations.
-- ============================================================================

-- ============================================================================
-- 1. ADD INDEXES FOR BRANCH-FILTERED QUERIES
-- ============================================================================

-- Index for variants by branch, product, and active status (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_variants_branch_product_active
ON lats_product_variants(branch_id, product_id, is_active)
WHERE is_active = true;

-- Index for variants by branch and quantity (for stock checks)
CREATE INDEX IF NOT EXISTS idx_variants_branch_quantity
ON lats_product_variants(branch_id, quantity)
WHERE quantity > 0;

-- Index for products by branch (for cleanup and validation)
CREATE INDEX IF NOT EXISTS idx_products_branch_active
ON lats_products(branch_id, is_active)
WHERE is_active = true;

-- ============================================================================
-- 2. ADD CONSTRAINTS TO PREVENT CROSS-BRANCH LEAKAGE
-- ============================================================================

-- Ensure variants always have branch_id when inventory is isolated
-- This prevents NULL branch_id values that could cause data leakage
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'variants_branch_id_not_null_for_isolated_inventory'
    AND table_name = 'lats_product_variants'
  ) THEN
    -- Add constraint: variants must have branch_id
    -- This is critical for branch isolation to work properly
    ALTER TABLE lats_product_variants
    ADD CONSTRAINT variants_branch_id_not_null_for_isolated_inventory
    CHECK (branch_id IS NOT NULL);
  END IF;
END $$;

-- ============================================================================
-- 3. CLEANUP EXISTING DATA ISSUES
-- ============================================================================

-- Remove any products that have branch_id assigned (products should be global)
-- This fixes the issue where products were incorrectly tied to branches
UPDATE lats_products
SET branch_id = NULL
WHERE branch_id IS NOT NULL;

-- Ensure all variants have branch_id (required for stock isolation)
-- If any variants don't have branch_id, assign them to the main branch as fallback
DO $$
DECLARE
  v_main_branch_id UUID;
  v_fixed_count INTEGER := 0;
BEGIN
  -- Get the main branch ID
  SELECT id INTO v_main_branch_id
  FROM store_locations
  WHERE is_main = true
  LIMIT 1;

  -- If no main branch, get the first active branch
  IF v_main_branch_id IS NULL THEN
    SELECT id INTO v_main_branch_id
    FROM store_locations
    WHERE is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Fix variants with NULL branch_id
  IF v_main_branch_id IS NOT NULL THEN
    UPDATE lats_product_variants
    SET branch_id = v_main_branch_id
    WHERE branch_id IS NULL;

    GET DIAGNOSTICS v_fixed_count = ROW_COUNT;
    RAISE NOTICE '✅ Fixed % variants with NULL branch_id by assigning to main branch', v_fixed_count;
  ELSE
    RAISE WARNING '⚠️ No active branch found to assign NULL branch_id variants to';
  END IF;
END $$;

-- ============================================================================
-- 4. VALIDATION FUNCTIONS
-- ============================================================================

-- Function to validate branch stock isolation integrity
CREATE OR REPLACE FUNCTION validate_branch_stock_isolation()
RETURNS TABLE(
  issue_type TEXT,
  description TEXT,
  affected_count BIGINT,
  severity TEXT
) AS $$
BEGIN
  -- Check for products incorrectly assigned to branches
  RETURN QUERY
  SELECT
    'products_with_branch_id'::TEXT,
    'Products incorrectly assigned to specific branches (should be global)'::TEXT,
    COUNT(*)::BIGINT,
    'HIGH'::TEXT
  FROM lats_products
  WHERE branch_id IS NOT NULL;

  -- Check for variants without branch_id
  RETURN QUERY
  SELECT
    'variants_without_branch_id'::TEXT,
    'Variants without branch_id assignment (breaks stock isolation)'::TEXT,
    COUNT(*)::BIGINT,
    'CRITICAL'::TEXT
  FROM lats_product_variants
  WHERE branch_id IS NULL;

  -- Check for variants with quantity but no branch_id
  RETURN QUERY
  SELECT
    'variants_with_stock_no_branch'::TEXT,
    'Variants with stock quantity but no branch_id (stock leakage risk)'::TEXT,
    COUNT(*)::BIGINT,
    'CRITICAL'::TEXT
  FROM lats_product_variants
  WHERE branch_id IS NULL AND quantity > 0;

  -- Check for duplicate SKUs across branches (should be unique per branch)
  RETURN QUERY
  SELECT
    'duplicate_skus_across_branches'::TEXT,
    'Duplicate SKUs found across different branches'::TEXT,
    COUNT(*)::BIGINT,
    'MEDIUM'::TEXT
  FROM (
    SELECT sku, COUNT(DISTINCT branch_id) as branch_count
    FROM lats_product_variants
    WHERE sku IS NOT NULL AND branch_id IS NOT NULL
    GROUP BY sku
    HAVING COUNT(DISTINCT branch_id) > 1
  ) duplicates;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. RUN VALIDATION AND REPORT ISSUES
-- ============================================================================

DO $$
DECLARE
  v_validation_result RECORD;
  v_has_issues BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 VALIDATING BRANCH STOCK ISOLATION...';
  RAISE NOTICE '';

  -- Run validation
  FOR v_validation_result IN SELECT * FROM validate_branch_stock_isolation() LOOP
    IF v_validation_result.affected_count > 0 THEN
      v_has_issues := TRUE;
      RAISE NOTICE '❌ % [%]: % (Count: %)',
        v_validation_result.issue_type,
        v_validation_result.severity,
        v_validation_result.description,
        v_validation_result.affected_count;
    END IF;
  END LOOP;

  IF NOT v_has_issues THEN
    RAISE NOTICE '✅ All branch stock isolation validations passed!';
  ELSE
    RAISE WARNING '⚠️ Branch stock isolation issues found. Please review the issues above.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🎯 BRANCH STOCK ISOLATION CONSTRAINTS APPLIED';
  RAISE NOTICE '';
END $$;