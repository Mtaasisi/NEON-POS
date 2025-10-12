-- ================================================================================
-- ADD SONY WH-1000XM5 HEADPHONES TO DATABASE
-- ================================================================================
-- This script adds the Sony WH-1000XM5 product that's missing from your database
-- ================================================================================

-- First, check if the product already exists
DO $$
DECLARE
    v_product_id UUID;
    v_category_id UUID;
    v_supplier_id UUID;
BEGIN
    -- Get or create a category for headphones/audio
    SELECT id INTO v_category_id
    FROM lats_categories
    WHERE name ILIKE '%audio%' OR name ILIKE '%headphone%' OR name ILIKE '%accessory%'
    LIMIT 1;
    
    -- If no audio category, use the first available category
    IF v_category_id IS NULL THEN
        SELECT id INTO v_category_id
        FROM lats_categories
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;
    
    -- Get a supplier (use first active supplier)
    SELECT id INTO v_supplier_id
    FROM lats_suppliers
    WHERE is_active = true
    LIMIT 1;
    
    -- Check if Sony WH-1000XM5 already exists
    SELECT id INTO v_product_id
    FROM lats_products
    WHERE name ILIKE '%Sony%WH-1000XM5%'
    LIMIT 1;
    
    -- If product doesn't exist, create it
    IF v_product_id IS NULL THEN
        -- Insert the product
        INSERT INTO lats_products (
            id,
            name,
            description,
            sku,
            unit_price,
            cost_price,
            category_id,
            supplier_id,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'Sony WH-1000XM5 Headphones',
            'Premium noise-cancelling wireless headphones with industry-leading sound quality',
            'SONY-WH1000XM5',
            350000,  -- 350,000 TZS selling price
            270000,  -- 270,000 TZS cost price
            v_category_id,
            v_supplier_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_product_id;
        
        -- Insert default variant
        INSERT INTO lats_product_variants (
            id,
            product_id,
            sku,
            variant_name,
            unit_price,
            cost_price,
            quantity,
            min_quantity,
            attributes,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_product_id,
            'SONY-WH1000XM5-DEFAULT',
            'Default',
            350000,  -- 350,000 TZS
            270000,  -- 270,000 TZS
            25,      -- Stock quantity
            5,       -- Minimum stock level
            '{"color": "Black", "condition": "New"}'::jsonb,
            NOW(),
            NOW()
        );
        
        -- Insert premium variant (optional)
        INSERT INTO lats_product_variants (
            id,
            product_id,
            sku,
            variant_name,
            unit_price,
            cost_price,
            quantity,
            min_quantity,
            attributes,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_product_id,
            'SONY-WH1000XM5-PREMIUM',
            'Premium',
            400000,  -- 400,000 TZS
            300000,  -- 300,000 TZS
            15,      -- Stock quantity
            3,       -- Minimum stock level
            '{"color": "Silver", "condition": "New", "warranty": "2 years"}'::jsonb,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ Sony WH-1000XM5 Headphones added successfully!';
        RAISE NOTICE '   Product ID: %', v_product_id;
        RAISE NOTICE '   Price: 350,000 TZS';
        RAISE NOTICE '   Stock: 25 units (Default), 15 units (Premium)';
    ELSE
        RAISE NOTICE 'ℹ️  Sony WH-1000XM5 already exists (ID: %)', v_product_id;
    END IF;
END $$;

-- Verify the product was added
SELECT 
    'Product Created' as status,
    p.id,
    p.name,
    p.sku,
    p.unit_price,
    c.name as category,
    (SELECT COUNT(*) FROM lats_product_variants WHERE product_id = p.id) as variant_count
FROM lats_products p
LEFT JOIN lats_categories c ON c.id = p.category_id
WHERE p.name ILIKE '%Sony%WH-1000XM5%';

-- Show variants
SELECT 
    'Variants' as info,
    pv.variant_name,
    pv.sku,
    pv.unit_price,
    pv.quantity as stock
FROM lats_product_variants pv
JOIN lats_products p ON p.id = pv.product_id
WHERE p.name ILIKE '%Sony%WH-1000XM5%';

