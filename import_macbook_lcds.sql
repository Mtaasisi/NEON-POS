-- ============================================================================
-- IMPORT MacBook LCD Models to lats_spare_parts Table
-- ============================================================================

-- First, let's create a MacBook LCD category if it doesn't exist
INSERT INTO lats_categories (id, name, description, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'MacBook LCD Screens',
    'MacBook LCD Display Screens and Assemblies',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM lats_categories WHERE name = 'MacBook LCD Screens'
);

-- Get the category ID for MacBook LCD Screens
-- We'll use this in the INSERT statements below

-- ============================================================================
-- MacBook Pro 13" Models (USB-C Only)
-- ============================================================================

-- 1. MacBook Pro 13" LCD A1708 (Function Keys + Touch Bar Compatible)
INSERT INTO lats_spare_parts (
    name, part_number, category_id, brand, condition, description, 
    cost_price, selling_price, quantity, min_quantity, location, is_active
) VALUES (
    'MacBook Pro 13" LCD A1708',
    'LCD-MBP13-A1708-A1706',
    (SELECT id FROM lats_categories WHERE name = 'MacBook LCD Screens' LIMIT 1),
    'Apple',
    'new',
    '13.3" Retina display. Resolution: 2560x1600. Compatible with Function Keys and Touch Bar models',
    150.00,
    200.00,
    0,
    2,
    'Storage Room A',
    true
);

-- 2. MacBook Pro 13" LCD A1989 (Touch Bar 2018-2020 Compatible)
INSERT INTO lats_spare_parts (
    name, part_number, category_id, brand, condition, description, 
    cost_price, selling_price, quantity, min_quantity, location, is_active
) VALUES (
    'MacBook Pro 13" LCD A1989',
    'LCD-MBPT13-A1989-A2159-A2251-A2289',
    (SELECT id FROM lats_categories WHERE name = 'MacBook LCD Screens' LIMIT 1),
    'Apple',
    'new',
    '13.3" Retina display. Resolution: 2560x1600, True Tone, P3 Wide Color. Touch Bar model, 4x Thunderbolt 3 ports only. Compatible with A1989, A2159, A2251, A2289',
    180.00,
    240.00,
    0,
    3,
    'Storage Room A',
    true
);

-- 3. MacBook Pro 13" M1/M2 LCD A2338
INSERT INTO lats_spare_parts (
    name, part_number, category_id, brand, condition, description, 
    cost_price, selling_price, quantity, min_quantity, location, is_active
) VALUES (
    'MacBook Pro 13" M1/M2 LCD A2338',
    'LCD-MBP13-A2338-A2686',
    (SELECT id FROM lats_categories WHERE name = 'MacBook LCD Screens' LIMIT 1),
    'Apple',
    'new',
    '13.3" Retina display. Resolution: 2560x1600, True Tone, P3 Wide Color. Touch Bar model, 4x Thunderbolt 3 ports only. Compatible with A2338, A2686',
    200.00,
    280.00,
    0,
    2,
    'Storage Room A',
    true
);

-- ============================================================================
-- MacBook Pro 14" Models (USB-C Only)
-- ============================================================================

-- 4. MacBook Pro 14" M1/M2/M3 Pro/Max LCD A2442
INSERT INTO lats_spare_parts (
    name, part_number, category_id, brand, condition, description, 
    cost_price, selling_price, quantity, min_quantity, location, is_active
) VALUES (
    'MacBook Pro 14" M1/M2/M3 Pro/Max LCD A2442',
    'LCD-MBP14-A2442-A2779-A2918',
    (SELECT id FROM lats_categories WHERE name = 'MacBook LCD Screens' LIMIT 1),
    'Apple',
    'new',
    '14.2" Liquid Retina XDR Mini-LED display. Resolution: 3024x1964, ProMotion 120Hz, 1000 nits sustained, 1600 nits peak, HDR. Compatible with A2442, A2779, A2918',
    350.00,
    480.00,
    0,
    2,
    'Storage Room A',
    true
);

-- ============================================================================
-- MacBook Pro 16" Models (USB-C Only)
-- ============================================================================

-- 5. MacBook Pro 16" Intel LCD A2141
INSERT INTO lats_spare_parts (
    name, part_number, category_id, brand, condition, description, 
    cost_price, selling_price, quantity, min_quantity, location, is_active
) VALUES (
    'MacBook Pro 16" Intel LCD A2141',
    'LCD-MBP16-A2141',
    (SELECT id FROM lats_categories WHERE name = 'MacBook LCD Screens' LIMIT 1),
    'Apple',
    'new',
    '16" Retina display. Resolution: 3072x1920, True Tone, P3 Wide Color, 500 nits',
    280.00,
    380.00,
    0,
    1,
    'Storage Room A',
    true
);

-- 6. MacBook Pro 16" M1/M2/M3 Pro/Max LCD A2485
INSERT INTO lats_spare_parts (
    name, part_number, category_id, brand, condition, description, 
    cost_price, selling_price, quantity, min_quantity, location, is_active
) VALUES (
    'MacBook Pro 16" M1/M2/M3 Pro/Max LCD A2485',
    'LCD-MBP16-A2485-A2780',
    (SELECT id FROM lats_categories WHERE name = 'MacBook LCD Screens' LIMIT 1),
    'Apple',
    'new',
    '16.2" Liquid Retina XDR Mini-LED display. Resolution: 3456x2234, ProMotion 120Hz, 1000 nits sustained, 1600 nits peak, HDR. Compatible with A2485, A2780',
    450.00,
    620.00,
    0,
    1,
    'Storage Room A',
    true
);

-- ============================================================================
-- MacBook Air Models (USB-C Only)
-- ============================================================================

-- 7. MacBook Air 13" Retina LCD A1932
INSERT INTO lats_spare_parts (
    name, part_number, category_id, brand, condition, description, 
    cost_price, selling_price, quantity, min_quantity, location, is_active
) VALUES (
    'MacBook Air 13" Retina LCD A1932',
    'LCD-MBA13R-A1932',
    (SELECT id FROM lats_categories WHERE name = 'MacBook LCD Screens' LIMIT 1),
    'Apple',
    'new',
    '13.3" Retina display. Resolution: 2560x1600, True Tone. USB-C ports only',
    120.00,
    180.00,
    0,
    2,
    'Storage Room A',
    true
);

-- 8. MacBook Air 13" Intel LCD A2179
INSERT INTO lats_spare_parts (
    name, part_number, category_id, brand, condition, description, 
    cost_price, selling_price, quantity, min_quantity, location, is_active
) VALUES (
    'MacBook Air 13" Intel LCD A2179',
    'LCD-MBA13R-A2179',
    (SELECT id FROM lats_categories WHERE name = 'MacBook LCD Screens' LIMIT 1),
    'Apple',
    'new',
    '13.3" Retina display. Resolution: 2560x1600, True Tone, P3 Wide Color. USB-C ports only',
    130.00,
    190.00,
    0,
    2,
    'Storage Room A',
    true
);

-- 9. MacBook Air 13" M1 LCD A2337
INSERT INTO lats_spare_parts (
    name, part_number, category_id, brand, condition, description, 
    cost_price, selling_price, quantity, min_quantity, location, is_active
) VALUES (
    'MacBook Air 13" M1 LCD A2337',
    'LCD-MBA13R-A2337',
    (SELECT id FROM lats_categories WHERE name = 'MacBook LCD Screens' LIMIT 1),
    'Apple',
    'new',
    '13.3" Retina display. Resolution: 2560x1600, True Tone, P3 Wide Color. USB-C ports only',
    140.00,
    200.00,
    0,
    2,
    'Storage Room A',
    true
);

-- 10. MacBook Air 13.6" M2 LCD A2681
INSERT INTO lats_spare_parts (
    name, part_number, category_id, brand, condition, description, 
    cost_price, selling_price, quantity, min_quantity, location, is_active
) VALUES (
    'MacBook Air 13.6" M2 LCD A2681',
    'LCD-MBA13.6-A2681',
    (SELECT id FROM lats_categories WHERE name = 'MacBook LCD Screens' LIMIT 1),
    'Apple',
    'new',
    '13.6" Liquid Retina display. Resolution: 2560x1664, True Tone, P3 Wide Color, 500 nits. USB-C ports only',
    160.00,
    220.00,
    0,
    1,
    'Storage Room A',
    true
);

-- 11. MacBook Air 15.3" M2 LCD A2941
INSERT INTO lats_spare_parts (
    name, part_number, category_id, brand, condition, description, 
    cost_price, selling_price, quantity, min_quantity, location, is_active
) VALUES (
    'MacBook Air 15.3" M2 LCD A2941',
    'LCD-MBA15.3-A2941',
    (SELECT id FROM lats_categories WHERE name = 'MacBook LCD Screens' LIMIT 1),
    'Apple',
    'new',
    '15.3" Liquid Retina display. Resolution: 2880x1864, True Tone, P3 Wide Color, 500 nits. USB-C ports only',
    200.00,
    280.00,
    0,
    1,
    'Storage Room A',
    true
);

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Run this query to verify all records were inserted successfully
SELECT 
    name,
    part_number,
    brand,
    condition,
    cost_price,
    selling_price,
    quantity,
    min_quantity,
    location,
    is_active,
    created_at
FROM lats_spare_parts 
WHERE part_number LIKE 'LCD-MBP%' OR part_number LIKE 'LCD-MBA%'
ORDER BY name;

-- ============================================================================
-- Summary
-- ============================================================================

-- Total Records Inserted: 11 MacBook LCD Models
-- Compatible Models Grouped: 5 groups with multiple compatible models
-- Categories: 1 new category created (MacBook LCD Screens)
-- All models are USB-C only (no legacy ports)
-- Price range: $120-$450 cost, $180-$620 selling price
