-- =====================================================
-- Cross-Branch Product Visibility (Without Stock Data)
-- =====================================================
-- This migration creates views and functions that allow
-- users to see all products from all branches, but:
-- - Stock quantities are hidden (shown as 0)
-- - Parent variants are visible
-- - Children variants (IMEI) are hidden
-- - Useful for catalog browsing without revealing inventory
-- =====================================================

-- Print start message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '👁️ =====================================================';
    RAISE NOTICE '👁️ Adding Cross-Branch Product Visibility';
    RAISE NOTICE '👁️ =====================================================';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- 1. Create View: All Products (Cross-Branch, No Stock)
-- =====================================================

CREATE OR REPLACE VIEW cross_branch_products_no_stock AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.category_id,
    c.name as category_name,
    p.sku,
    p.barcode,
    p.selling_price,
    p.cost_price,
    p.unit_price,
    p.image_url,
    p.is_active,
    p.brand,
    p.model,
    p.condition,
    p.attributes,
    p.metadata,
    p.tags,
    p.branch_id,
    b.name as branch_name,
    0 as stock_quantity,  -- Always show 0 for cross-branch viewing
    0 as available_quantity,
    p.is_shared,
    p.sharing_mode,
    EXISTS(SELECT 1 FROM lats_product_variants pv WHERE pv.product_id = p.id LIMIT 1) as has_variants,
    p.created_at,
    p.updated_at
FROM lats_products p
LEFT JOIN lats_categories c ON p.category_id = c.id
LEFT JOIN lats_branches b ON p.branch_id = b.id
WHERE p.is_active = true;

COMMENT ON VIEW cross_branch_products_no_stock IS 
'Shows all products from all branches with stock quantities hidden (shown as 0). Useful for catalog browsing without revealing inventory levels.';

-- =====================================================
-- 2. Create View: All Variants (Parent Only, No Stock)
-- =====================================================

CREATE OR REPLACE VIEW cross_branch_variants_no_stock AS
SELECT 
    pv.id,
    pv.product_id,
    p.name as product_name,
    pv.name as variant_name,
    pv.variant_name as full_variant_name,
    pv.sku,
    pv.barcode,
    pv.cost_price,
    pv.unit_price,
    pv.selling_price,
    pv.variant_attributes,
    pv.attributes,
    pv.is_active,
    pv.variant_type,
    pv.is_parent,
    pv.branch_id,
    b.name as branch_name,
    0 as quantity,  -- Always show 0 for cross-branch viewing
    0 as available_quantity,
    pv.parent_variant_id,
    CASE 
        WHEN pv.parent_variant_id IS NULL THEN true
        ELSE false
    END as is_parent_variant,
    pv.is_shared,
    pv.sharing_mode,
    pv.created_at,
    pv.updated_at
FROM lats_product_variants pv
JOIN lats_products p ON pv.product_id = p.id
LEFT JOIN lats_branches b ON pv.branch_id = b.id
WHERE pv.is_active = true
  AND pv.parent_variant_id IS NULL;  -- Only show parent variants (exclude IMEI children)

COMMENT ON VIEW cross_branch_variants_no_stock IS 
'Shows all parent variants from all branches with stock quantities hidden. Children variants (IMEI-tracked items) are excluded.';

-- =====================================================
-- 3. Create Function: Get Products for Cross-Branch View
-- =====================================================

CREATE OR REPLACE FUNCTION get_cross_branch_products(
    p_current_branch_id UUID DEFAULT NULL,
    p_include_inactive BOOLEAN DEFAULT false,
    p_category_id UUID DEFAULT NULL,
    p_search_term TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    category_name TEXT,
    sku TEXT,
    barcode TEXT,
    selling_price NUMERIC,
    cost_price NUMERIC,
    image_url TEXT,
    is_active BOOLEAN,
    brand TEXT,
    has_variants BOOLEAN,
    variant_count INTEGER,
    branch_id UUID,
    branch_name TEXT,
    is_own_branch BOOLEAN,
    stock_quantity INTEGER,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.description,
        p.category_name,
        p.sku,
        p.barcode,
        p.selling_price,
        p.cost_price,
        p.image_url,
        p.is_active,
        p.brand,
        p.has_variants,
        COALESCE((
            SELECT COUNT(*)::INTEGER 
            FROM lats_product_variants pv 
            WHERE pv.product_id = p.id 
            AND pv.parent_variant_id IS NULL
        ), 0) as variant_count,
        p.branch_id,
        p.branch_name,
        (p.branch_id = p_current_branch_id) as is_own_branch,
        CASE 
            WHEN p.branch_id = p_current_branch_id THEN p.stock_quantity
            ELSE 0
        END as stock_quantity,
        p.created_at
    FROM cross_branch_products_no_stock p
    WHERE (p_include_inactive = true OR p.is_active = true)
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_search_term IS NULL OR 
           p.name ILIKE '%' || p_search_term || '%' OR
           p.sku ILIKE '%' || p_search_term || '%' OR
           p.barcode ILIKE '%' || p_search_term || '%')
    ORDER BY 
        (p.branch_id = p_current_branch_id) DESC,  -- Own branch products first
        p.name ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_cross_branch_products IS 
'Returns all products across branches with stock hidden for other branches. Own branch products show actual stock.';

-- =====================================================
-- 4. Create Function: Get Variants for Cross-Branch View
-- =====================================================

CREATE OR REPLACE FUNCTION get_cross_branch_variants(
    p_product_id UUID,
    p_current_branch_id UUID DEFAULT NULL,
    p_include_children BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id UUID,
    product_id UUID,
    product_name TEXT,
    variant_name TEXT,
    full_variant_name TEXT,
    sku TEXT,
    selling_price NUMERIC,
    cost_price NUMERIC,
    is_active BOOLEAN,
    variant_type TEXT,
    branch_id UUID,
    branch_name TEXT,
    is_own_branch BOOLEAN,
    quantity INTEGER,
    is_parent_variant BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pv.id,
        pv.product_id,
        pv.product_name,
        pv.variant_name,
        pv.full_variant_name,
        pv.sku,
        pv.selling_price,
        pv.cost_price,
        pv.is_active,
        pv.variant_type,
        pv.branch_id,
        pv.branch_name,
        (pv.branch_id = p_current_branch_id) as is_own_branch,
        CASE 
            WHEN pv.branch_id = p_current_branch_id THEN pv.quantity
            ELSE 0
        END as quantity,
        pv.is_parent_variant,
        pv.created_at
    FROM cross_branch_variants_no_stock pv
    WHERE pv.product_id = p_product_id
      AND pv.is_active = true
      AND (p_include_children = true OR pv.is_parent_variant = true)
    ORDER BY 
        (pv.branch_id = p_current_branch_id) DESC,  -- Own branch variants first
        pv.variant_name ASC;
END;
$$;

COMMENT ON FUNCTION get_cross_branch_variants IS 
'Returns variants for a product across branches with stock hidden for other branches. Children variants excluded by default.';

-- =====================================================
-- 5. Create Setting to Control Cross-Branch Visibility
-- =====================================================

-- Add column to general settings if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lats_pos_general_settings' 
        AND column_name = 'enable_cross_branch_product_view'
    ) THEN
        ALTER TABLE lats_pos_general_settings 
        ADD COLUMN enable_cross_branch_product_view BOOLEAN DEFAULT false;
        
        COMMENT ON COLUMN lats_pos_general_settings.enable_cross_branch_product_view IS 
        'When true, users can see products from all branches (with stock hidden). When false, only own branch products are visible.';
        
        RAISE NOTICE '✅ Added enable_cross_branch_product_view setting';
    ELSE
        RAISE NOTICE 'ℹ️  enable_cross_branch_product_view setting already exists';
    END IF;
END $$;

-- =====================================================
-- 6. Create Helper Function: Check if Cross-Branch View Enabled
-- =====================================================

CREATE OR REPLACE FUNCTION is_cross_branch_view_enabled(p_user_id UUID, p_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_enabled BOOLEAN;
BEGIN
    SELECT enable_cross_branch_product_view 
    INTO v_enabled
    FROM lats_pos_general_settings
    WHERE user_id = p_user_id 
      AND branch_id = p_branch_id
    LIMIT 1;
    
    RETURN COALESCE(v_enabled, false);
END;
$$;

COMMENT ON FUNCTION is_cross_branch_view_enabled IS 
'Checks if cross-branch product visibility is enabled for a user and branch.';

-- =====================================================
-- 7. Create View: Product Summary by Branch
-- =====================================================

CREATE OR REPLACE VIEW product_summary_by_branch AS
SELECT 
    b.id as branch_id,
    b.name as branch_name,
    COUNT(DISTINCT p.id) as total_products,
    COUNT(DISTINCT CASE WHEN p.is_active THEN p.id END) as active_products,
    COUNT(DISTINCT pv.id) FILTER (WHERE pv.parent_variant_id IS NULL) as total_parent_variants,
    COUNT(DISTINCT pv.id) FILTER (WHERE pv.parent_variant_id IS NOT NULL) as total_child_variants,
    COUNT(DISTINCT c.id) as total_categories
FROM lats_branches b
LEFT JOIN lats_products p ON b.id = p.branch_id
LEFT JOIN lats_product_variants pv ON b.id = pv.branch_id
LEFT JOIN lats_categories c ON b.id = c.branch_id
GROUP BY b.id, b.name
ORDER BY b.name;

COMMENT ON VIEW product_summary_by_branch IS 
'Shows product statistics per branch. Useful for understanding catalog distribution.';

-- =====================================================
-- 8. Create Function: Search Products Across All Branches
-- =====================================================

CREATE OR REPLACE FUNCTION search_products_all_branches(
    p_search_term TEXT,
    p_current_branch_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    sku TEXT,
    barcode TEXT,
    selling_price NUMERIC,
    image_url TEXT,
    branch_name TEXT,
    is_own_branch BOOLEAN,
    has_variants BOOLEAN,
    variant_count INTEGER,
    stock_display TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.sku,
        p.barcode,
        p.selling_price,
        p.image_url,
        p.branch_name,
        (p.branch_id = p_current_branch_id) as is_own_branch,
        p.has_variants,
        COALESCE((
            SELECT COUNT(*)::INTEGER 
            FROM lats_product_variants pv 
            WHERE pv.product_id = p.id 
            AND pv.parent_variant_id IS NULL
        ), 0) as variant_count,
        CASE 
            WHEN p.branch_id = p_current_branch_id THEN 'In Stock'
            ELSE 'Other Branch'
        END as stock_display
    FROM cross_branch_products_no_stock p
    WHERE p.is_active = true
      AND (
          p.name ILIKE '%' || p_search_term || '%' OR
          p.sku ILIKE '%' || p_search_term || '%' OR
          p.barcode ILIKE '%' || p_search_term || '%' OR
          p.description ILIKE '%' || p_search_term || '%'
      )
    ORDER BY 
        (p.branch_id = p_current_branch_id) DESC,
        SIMILARITY(p.name, p_search_term) DESC,
        p.name ASC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_products_all_branches IS 
'Searches for products across all branches with stock info hidden for other branches.';

-- =====================================================
-- 9. Create Usage Examples View
-- =====================================================

CREATE OR REPLACE VIEW cross_branch_usage_examples AS
SELECT 
    '1. Get all products with stock hidden' as example_name,
    'SELECT * FROM cross_branch_products_no_stock;' as query
UNION ALL
SELECT 
    '2. Get all parent variants (no IMEI children)',
    'SELECT * FROM cross_branch_variants_no_stock;'
UNION ALL
SELECT 
    '3. Search products across branches',
    'SELECT * FROM search_products_all_branches(''iPhone'', ''00000000-0000-0000-0000-000000000001'', 50);'
UNION ALL
SELECT 
    '4. Get products for specific branch',
    'SELECT * FROM get_cross_branch_products(''00000000-0000-0000-0000-000000000001'', false, NULL, NULL, 100, 0);'
UNION ALL
SELECT 
    '5. Get variants for a product',
    'SELECT * FROM get_cross_branch_variants(''product-uuid-here'', ''branch-uuid-here'', false);'
UNION ALL
SELECT 
    '6. Check if cross-branch view is enabled',
    'SELECT is_cross_branch_view_enabled(''user-uuid'', ''branch-uuid'');'
UNION ALL
SELECT 
    '7. View product summary by branch',
    'SELECT * FROM product_summary_by_branch;';

-- =====================================================
-- 10. Success message
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '✅ Cross-Branch Product Visibility Added!';
    RAISE NOTICE '✅ =====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What was created:';
    RAISE NOTICE '  1. ✅ View: cross_branch_products_no_stock';
    RAISE NOTICE '  2. ✅ View: cross_branch_variants_no_stock';
    RAISE NOTICE '  3. ✅ Function: get_cross_branch_products()';
    RAISE NOTICE '  4. ✅ Function: get_cross_branch_variants()';
    RAISE NOTICE '  5. ✅ Function: search_products_all_branches()';
    RAISE NOTICE '  6. ✅ Function: is_cross_branch_view_enabled()';
    RAISE NOTICE '  7. ✅ View: product_summary_by_branch';
    RAISE NOTICE '  8. ✅ Setting: enable_cross_branch_product_view';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Features:';
    RAISE NOTICE '  • See all products from all branches';
    RAISE NOTICE '  • Stock quantities hidden (shown as 0)';
    RAISE NOTICE '  • Parent variants visible';
    RAISE NOTICE '  • Children variants (IMEI) hidden';
    RAISE NOTICE '  • Own branch products show actual stock';
    RAISE NOTICE '';
    RAISE NOTICE '📖 Usage examples:';
    RAISE NOTICE '  SELECT * FROM cross_branch_usage_examples;';
    RAISE NOTICE '';
    RAISE NOTICE '⚙️  To enable in settings:';
    RAISE NOTICE '  UPDATE lats_pos_general_settings';
    RAISE NOTICE '  SET enable_cross_branch_product_view = true';
    RAISE NOTICE '  WHERE user_id = ''your-user-id'' AND branch_id = ''your-branch-id'';';
    RAISE NOTICE '';
END $$;

