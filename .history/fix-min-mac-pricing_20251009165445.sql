-- ================================================================================
-- FIX MIN MAC A1347 PRODUCT PRICING
-- ================================================================================
-- This script fixes the "Min Mac A1347" product that has TSh 0 price
-- Product ID: f03c9b46-5af4-4f75-85df-2bf1730d1eab
-- Variant SKU: MINMACA134-VAR-1760017176930-20GE4A
-- Cost Price: TSh 34
-- ================================================================================

-- Step 1: Verify current state
SELECT 
    'BEFORE FIX - Product' as status,
    id,
    name,
    sku,
    unit_price,
    cost_price,
    CASE 
        WHEN cost_price > 0 AND unit_price > 0 
        THEN ROUND(((unit_price - cost_price) / cost_price * 100)::numeric, 2)
        ELSE 0 
    END as markup_percentage
FROM lats_products
WHERE id = 'f03c9b46-5af4-4f75-85df-2bf1730d1eab';

SELECT 
    'BEFORE FIX - Variant' as status,
    pv.id,
    pv.variant_name,
    pv.sku,
    pv.unit_price,
    pv.cost_price,
    pv.stock_quantity,
    CASE 
        WHEN pv.cost_price > 0 AND pv.unit_price > 0 
        THEN ROUND(((pv.unit_price - pv.cost_price) / pv.cost_price * 100)::numeric, 2)
        ELSE 0 
    END as markup_percentage
FROM lats_product_variants pv
WHERE pv.sku = 'MINMACA134-VAR-1760017176930-20GE4A'
   OR pv.product_id = 'f03c9b46-5af4-4f75-85df-2bf1730d1eab';

-- ================================================================================
-- Step 2: Fix the product price
-- ================================================================================
-- Set unit_price to cost_price * 1.5 (50% markup)
-- This gives: 34 * 1.5 = 51 TZS

UPDATE lats_products
SET 
    unit_price = CASE 
        WHEN cost_price > 0 THEN cost_price * 1.5
        ELSE 51  -- Fallback price
    END,
    updated_at = NOW()
WHERE id = 'f03c9b46-5af4-4f75-85df-2bf1730d1eab';

-- ================================================================================
-- Step 3: Fix the product variant price
-- ================================================================================
UPDATE lats_product_variants
SET 
    unit_price = CASE 
        WHEN cost_price > 0 THEN cost_price * 1.5
        ELSE 51  -- Fallback price
    END,
    updated_at = NOW()
WHERE sku = 'MINMACA134-VAR-1760017176930-20GE4A'
   OR product_id = 'f03c9b46-5af4-4f75-85df-2bf1730d1eab';

-- ================================================================================
-- Step 4: Verify the fix
-- ================================================================================
SELECT 
    'AFTER FIX - Product' as status,
    id,
    name,
    sku,
    unit_price,
    cost_price,
    CASE 
        WHEN cost_price > 0 AND unit_price > 0 
        THEN ROUND(((unit_price - cost_price) / cost_price * 100)::numeric, 2)
        ELSE 0 
    END as markup_percentage,
    CASE 
        WHEN cost_price > 0 AND unit_price > 0 
        THEN unit_price - cost_price
        ELSE 0 
    END as profit_per_unit
FROM lats_products
WHERE id = 'f03c9b46-5af4-4f75-85df-2bf1730d1eab';

SELECT 
    'AFTER FIX - Variant' as status,
    pv.id,
    pv.variant_name,
    pv.sku,
    pv.unit_price,
    pv.cost_price,
    pv.stock_quantity,
    CASE 
        WHEN pv.cost_price > 0 AND pv.unit_price > 0 
        THEN ROUND(((pv.unit_price - pv.cost_price) / pv.cost_price * 100)::numeric, 2)
        ELSE 0 
    END as markup_percentage,
    CASE 
        WHEN pv.cost_price > 0 AND pv.unit_price > 0 
        THEN pv.unit_price - pv.cost_price
        ELSE 0 
    END as profit_per_unit,
    CASE 
        WHEN pv.cost_price > 0 AND pv.unit_price > 0 
        THEN (pv.unit_price - pv.cost_price) * pv.stock_quantity
        ELSE 0 
    END as total_profit
FROM lats_product_variants pv
WHERE pv.sku = 'MINMACA134-VAR-1760017176930-20GE4A'
   OR pv.product_id = 'f03c9b46-5af4-4f75-85df-2bf1730d1eab';

-- ================================================================================
-- Expected Results After Fix:
-- ================================================================================
-- Product Price: TSh 51 (was TSh 0)
-- Variant Price: TSh 51 (was TSh 0)
-- Cost Price: TSh 34
-- Profit per Unit: TSh 17
-- Markup: 50%
-- Total Profit (3 units): TSh 51 (was -TSh 102)
-- Total Value (3 units): TSh 153 (was TSh 0)
-- ================================================================================

