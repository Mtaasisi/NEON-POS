-- ================================================================================
-- HARD DELETE: Delete products AND related sales
-- ================================================================================
-- ⚠️ WARNING: This will DELETE SALES HISTORY!
-- Only use this if you're cleaning up test data
-- ================================================================================

BEGIN;

-- First, check what sales will be affected
SELECT 
    '⚠️ SALES TO BE DELETED' as warning,
    COUNT(DISTINCT s.id) as sales_count,
    COUNT(si.id) as sale_items_count,
    SUM(si.total_amount) as total_value
FROM lats_sale_items si
JOIN lats_sales s ON si.sale_id = s.id
WHERE si.product_id IN (
    '09d74b2e-fd68-41ad-8bee-b401949b9fbe',
    '0dd9005a-50ab-4121-81cf-9b3a1dfaba0d',
    '1a9b1117-78cf-40fa-b9f2-9b7919a0a8f4',
    '40eec2cc-3aa2-4137-81f0-38b05e507292',
    '45300d7a-d69e-4017-a62d-c6e08d067e0d',
    '462f8664-66fb-4967-a0d3-51d478b19965',
    '5a6b8fa4-a891-4875-b11e-8affbfaacbfc',
    '78f754db-debd-4b0d-a8c1-b5faa01bda1e',
    '8b3478be-922a-4c8b-b9bb-a7f622cbad7c',
    '943a7359-5238-471b-8d73-35b3aafeb6aa',
    'cce1ad33-c47a-460a-b033-bb64f5e80c58',
    'd78271f8-b1f0-4b7d-a428-b5d9148800b9',
    'dca97d63-ff8e-4ddd-b0c9-2a28b9f4fdfc',
    'f898e927-02fc-41f3-ac97-5bfaf2fe17a6',
    'fc1d8640-72fe-4a71-ae96-45670bacb4d0'
);

-- Delete sale items first
DELETE FROM lats_sale_items
WHERE product_id IN (
    '09d74b2e-fd68-41ad-8bee-b401949b9fbe',
    '0dd9005a-50ab-4121-81cf-9b3a1dfaba0d',
    '1a9b1117-78cf-40fa-b9f2-9b7919a0a8f4',
    '40eec2cc-3aa2-4137-81f0-38b05e507292',
    '45300d7a-d69e-4017-a62d-c6e08d067e0d',
    '462f8664-66fb-4967-a0d3-51d478b19965',
    '5a6b8fa4-a891-4875-b11e-8affbfaacbfc',
    '78f754db-debd-4b0d-a8c1-b5faa01bda1e',
    '8b3478be-922a-4c8b-b9bb-a7f622cbad7c',
    '943a7359-5238-471b-8d73-35b3aafeb6aa',
    'cce1ad33-c47a-460a-b033-bb64f5e80c58',
    'd78271f8-b1f0-4b7d-a428-b5d9148800b9',
    'dca97d63-ff8e-4ddd-b0c9-2a28b9f4fdfc',
    'f898e927-02fc-41f3-ac97-5bfaf2fe17a6',
    'fc1d8640-72fe-4a71-ae96-45670bacb4d0'
);

-- Delete orphaned sales (sales with no items left)
DELETE FROM lats_sales
WHERE id NOT IN (SELECT DISTINCT sale_id FROM lats_sale_items);

-- Now delete the products
DELETE FROM lats_products
WHERE id IN (
    '09d74b2e-fd68-41ad-8bee-b401949b9fbe',
    '0dd9005a-50ab-4121-81cf-9b3a1dfaba0d',
    '1a9b1117-78cf-40fa-b9f2-9b7919a0a8f4',
    '40eec2cc-3aa2-4137-81f0-38b05e507292',
    '45300d7a-d69e-4017-a62d-c6e08d067e0d',
    '462f8664-66fb-4967-a0d3-51d478b19965',
    '5a6b8fa4-a891-4875-b11e-8affbfaacbfc',
    '78f754db-debd-4b0d-a8c1-b5faa01bda1e',
    '8b3478be-922a-4c8b-b9bb-a7f622cbad7c',
    '943a7359-5238-471b-8d73-35b3aafeb6aa',
    'cce1ad33-c47a-460a-b033-bb64f5e80c58',
    'd78271f8-b1f0-4b7d-a428-b5d9148800b9',
    'dca97d63-ff8e-4ddd-b0c9-2a28b9f4fdfc',
    'f898e927-02fc-41f3-ac97-5bfaf2fe17a6',
    'fc1d8640-72fe-4a71-ae96-45670bacb4d0'
);

COMMIT;

SELECT '✅ Products and related sales deleted.' as result;

