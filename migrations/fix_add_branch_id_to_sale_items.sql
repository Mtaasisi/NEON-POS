-- ================================================
-- FIX: Add branch_id column to lats_sale_items table
-- ================================================
-- This fixes the error: column "branch_id" does not exist
-- Used by: ProfitMarginChart.tsx and other dashboard components
-- ================================================

-- Add branch_id column to lats_sale_items if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_sale_items' 
        AND column_name = 'branch_id'
    ) THEN
        -- Add the column with a default reference to main branch
        ALTER TABLE lats_sale_items 
        ADD COLUMN branch_id UUID REFERENCES lats_branches(id) DEFAULT '00000000-0000-0000-0000-000000000001';
        
        RAISE NOTICE '✅ Added branch_id column to lats_sale_items';
    ELSE
        RAISE NOTICE '⚠️ branch_id column already exists in lats_sale_items';
    END IF;
END $$;

-- Update existing sale items to inherit branch_id from their sales
UPDATE lats_sale_items si
SET branch_id = s.branch_id
FROM lats_sales s
WHERE si.sale_id = s.id
AND si.branch_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sale_items_branch ON lats_sale_items(branch_id);

-- Verify the fix
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'lats_sale_items' AND column_name = 'branch_id';
    
    IF col_count > 0 THEN
        RAISE NOTICE '================================================';
        RAISE NOTICE '✅ SUCCESS: branch_id column exists in lats_sale_items';
        RAISE NOTICE '================================================';
    ELSE
        RAISE EXCEPTION '❌ FAILED: branch_id column was not created';
    END IF;
END $$;

