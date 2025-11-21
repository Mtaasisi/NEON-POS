-- ================================================
-- VERIFY DATABASE RELATIONSHIPS
-- ================================================
-- This script verifies that all foreign key relationships
-- in the database match what the codebase expects
-- ================================================

-- 1. Check lats_products foreign keys
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'lats_products'
ORDER BY tc.table_name, kcu.column_name;

-- 2. Check lats_product_variants foreign keys
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'lats_product_variants'
ORDER BY tc.table_name, kcu.column_name;

-- 3. Verify column names exist
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('lats_products', 'lats_product_variants', 'lats_categories', 'lats_suppliers')
  AND column_name IN ('category_id', 'supplier_id', 'product_id', 'parent_variant_id', 'id')
ORDER BY table_name, column_name;

-- 4. Summary of expected relationships
SELECT 
    'lats_products.category_id -> lats_categories.id' AS relationship,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'lats_products' 
              AND kcu.column_name = 'category_id'
              AND ccu.table_name = 'lats_categories'
              AND ccu.column_name = 'id'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END AS status
UNION ALL
SELECT 
    'lats_products.supplier_id -> lats_suppliers.id' AS relationship,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'lats_products' 
              AND kcu.column_name = 'supplier_id'
              AND ccu.table_name = 'lats_suppliers'
              AND ccu.column_name = 'id'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END AS status
UNION ALL
SELECT 
    'lats_product_variants.product_id -> lats_products.id' AS relationship,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'lats_product_variants' 
              AND kcu.column_name = 'product_id'
              AND ccu.table_name = 'lats_products'
              AND ccu.column_name = 'id'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END AS status
UNION ALL
SELECT 
    'lats_product_variants.parent_variant_id -> lats_product_variants.id' AS relationship,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'lats_product_variants' 
              AND kcu.column_name = 'parent_variant_id'
              AND ccu.table_name = 'lats_product_variants'
              AND ccu.column_name = 'id'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END AS status;

