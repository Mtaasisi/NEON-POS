-- ============================================
-- Database Relationships Verification Script
-- ============================================
-- This script checks all foreign key relationships
-- and ensures they are properly configured
-- ============================================

-- 1. Check all foreign key constraints
SELECT 
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY 
    tc.table_name, tc.constraint_name;

-- 2. Check for missing foreign keys (columns that should have FKs but don't)
-- Check lats_spare_parts relationships
SELECT 
    'lats_spare_parts' as table_name,
    'category_id' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%spare_parts%category%'
            AND constraint_type = 'FOREIGN KEY'
        ) THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as foreign_key_status
UNION ALL
SELECT 
    'lats_spare_parts',
    'supplier_id',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%spare_parts%supplier%'
            AND constraint_type = 'FOREIGN KEY'
        ) THEN 'EXISTS' 
        ELSE 'MISSING' 
    END
UNION ALL
SELECT 
    'lats_spare_part_variants',
    'spare_part_id',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%spare_part_variants%spare_part%'
            AND constraint_type = 'FOREIGN KEY'
        ) THEN 'EXISTS' 
        ELSE 'MISSING' 
    END
UNION ALL
SELECT 
    'lats_products',
    'category_id',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%products%category%'
            AND constraint_type = 'FOREIGN KEY'
        ) THEN 'EXISTS' 
        ELSE 'MISSING' 
    END
UNION ALL
SELECT 
    'lats_products',
    'supplier_id',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%products%supplier%'
            AND constraint_type = 'FOREIGN KEY'
        ) THEN 'EXISTS' 
        ELSE 'MISSING' 
    END
UNION ALL
SELECT 
    'lats_products',
    'branch_id',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%products%branch%'
            AND constraint_type = 'FOREIGN KEY'
        ) THEN 'EXISTS' 
        ELSE 'MISSING' 
    END
UNION ALL
SELECT 
    'lats_product_variants',
    'product_id',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%product_variants%product%'
            AND constraint_type = 'FOREIGN KEY'
        ) THEN 'EXISTS' 
        ELSE 'MISSING' 
    END;

-- 3. Check for orphaned records (data integrity check)
-- Orphaned spare parts (category_id doesn't exist)
SELECT 
    'Orphaned spare parts (invalid category_id)' as issue,
    COUNT(*) as count
FROM lats_spare_parts sp
WHERE sp.category_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM lats_categories c WHERE c.id = sp.category_id
  );

-- Orphaned spare parts (supplier_id doesn't exist)
SELECT 
    'Orphaned spare parts (invalid supplier_id)' as issue,
    COUNT(*) as count
FROM lats_spare_parts sp
WHERE sp.supplier_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM lats_suppliers s WHERE s.id = sp.supplier_id
  );

-- Orphaned spare part variants
SELECT 
    'Orphaned spare part variants' as issue,
    COUNT(*) as count
FROM lats_spare_part_variants spv
WHERE NOT EXISTS (
      SELECT 1 FROM lats_spare_parts sp WHERE sp.id = spv.spare_part_id
  );

-- Orphaned products (category_id doesn't exist)
SELECT 
    'Orphaned products (invalid category_id)' as issue,
    COUNT(*) as count
FROM lats_products p
WHERE p.category_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM lats_categories c WHERE c.id = p.category_id
  );

-- Orphaned products (supplier_id doesn't exist)
SELECT 
    'Orphaned products (invalid supplier_id)' as issue,
    COUNT(*) as count
FROM lats_products p
WHERE p.supplier_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM lats_suppliers s WHERE s.id = p.supplier_id
  );

-- Orphaned products (branch_id doesn't exist)
SELECT 
    'Orphaned products (invalid branch_id)' as issue,
    COUNT(*) as count
FROM lats_products p
WHERE p.branch_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM lats_branches b WHERE b.id = p.branch_id
  );

-- Orphaned product variants
SELECT 
    'Orphaned product variants' as issue,
    COUNT(*) as count
FROM lats_product_variants pv
WHERE NOT EXISTS (
      SELECT 1 FROM lats_products p WHERE p.id = pv.product_id
  );

-- 4. Check table structures for relationship columns
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
      'lats_spare_parts',
      'lats_spare_part_variants',
      'lats_products',
      'lats_product_variants',
      'lats_categories',
      'lats_suppliers',
      'lats_branches'
  )
  AND column_name IN (
      'id', 'category_id', 'supplier_id', 'branch_id', 
      'spare_part_id', 'product_id'
  )
ORDER BY table_name, column_name;

-- 5. Test relationship integrity with sample queries
-- Test: Get spare parts with their categories
SELECT 
    'Test: Spare Parts with Categories' as test_name,
    COUNT(*) as matching_records
FROM lats_spare_parts sp
INNER JOIN lats_categories c ON sp.category_id = c.id;

-- Test: Get spare parts with their suppliers
SELECT 
    'Test: Spare Parts with Suppliers' as test_name,
    COUNT(*) as matching_records
FROM lats_spare_parts sp
INNER JOIN lats_suppliers s ON sp.supplier_id = s.id
WHERE sp.supplier_id IS NOT NULL;

-- Test: Get spare part variants with their parent spare parts
SELECT 
    'Test: Spare Part Variants with Parent' as test_name,
    COUNT(*) as matching_records
FROM lats_spare_part_variants spv
INNER JOIN lats_spare_parts sp ON spv.spare_part_id = sp.id;

-- Test: Get products with their categories
SELECT 
    'Test: Products with Categories' as test_name,
    COUNT(*) as matching_records
FROM lats_products p
INNER JOIN lats_categories c ON p.category_id = c.id
WHERE p.category_id IS NOT NULL;

-- Test: Get products with their suppliers
SELECT 
    'Test: Products with Suppliers' as test_name,
    COUNT(*) as matching_records
FROM lats_products p
INNER JOIN lats_suppliers s ON p.supplier_id = s.id
WHERE p.supplier_id IS NOT NULL;

-- Test: Get products with their branches
SELECT 
    'Test: Products with Branches' as test_name,
    COUNT(*) as matching_records
FROM lats_products p
INNER JOIN lats_branches b ON p.branch_id = b.id
WHERE p.branch_id IS NOT NULL;

-- 6. Summary report
SELECT 
    '=== RELATIONSHIP VERIFICATION SUMMARY ===' as summary;

SELECT 
    'Total Foreign Keys' as metric,
    COUNT(*) as value
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_schema = 'public';

SELECT 
    'Tables with Foreign Keys' as metric,
    COUNT(DISTINCT table_name) as value
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_schema = 'public';
