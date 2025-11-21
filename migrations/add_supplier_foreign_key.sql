-- ================================================
-- ADD MISSING FOREIGN KEY: supplier_id
-- ================================================
-- This adds the missing foreign key constraint for
-- lats_products.supplier_id -> lats_suppliers.id
-- ================================================

-- Check if foreign key already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'lats_products_supplier_id_fkey'
          AND table_name = 'lats_products'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE lats_products
        ADD CONSTRAINT lats_products_supplier_id_fkey
        FOREIGN KEY (supplier_id) 
        REFERENCES lats_suppliers(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Added foreign key constraint: lats_products.supplier_id -> lats_suppliers.id';
    ELSE
        RAISE NOTICE '⚠️ Foreign key constraint already exists';
    END IF;
END $$;

-- Verify the constraint was added
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_name = 'lats_products_supplier_id_fkey';

