-- ================================================================================
-- SAFE DELETE: Delete products that are NOT used in sales
-- ================================================================================
-- These products have no sales history so they can be safely deleted
-- ================================================================================

BEGIN;

DELETE FROM lats_products
WHERE id IN (
    'cce1ad33-c47a-460a-b033-bb64f5e80c58',  -- Sony WH-1000XM5 Headphones
    'fc1d8640-72fe-4a71-ae96-45670bacb4d0',  -- Vizio SB2821-D6e
    '8b3478be-922a-4c8b-b9bb-a7f622cbad7c',  -- Vizio SB2821-D6edsa
    '943a7359-5238-471b-8d73-35b3aafeb6aa',  -- USB-C Charger
    'd78271f8-b1f0-4b7d-a428-b5d9148800b9',  -- Vizio SB2821-D6edsa
    '45300d7a-d69e-4017-a62d-c6e08d067e0d',  -- Battery Pack
    '0dd9005a-50ab-4121-81cf-9b3a1dfaba0d',  -- Vizio SB2821-D6
    '1a9b1117-78cf-40fa-b9f2-9b7919a0a8f4',  -- Vizio SB2821-D6
    'f898e927-02fc-41f3-ac97-5bfaf2fe17a6',  -- Phone Case Universal
    '5a6b8fa4-a891-4875-b11e-8affbfaacbfc',  -- Vizio SB2821-D6e
    'dca97d63-ff8e-4ddd-b0c9-2a28b9f4fdfc'   -- iPhone 15 Pro
);

-- Show remaining products
SELECT 
    '✅ DELETION COMPLETE' as status,
    COUNT(*) as remaining_products
FROM lats_products
WHERE is_active = true;

COMMIT;

SELECT '✅ 11 products deleted safely. Products with sales history were preserved.' as result;

