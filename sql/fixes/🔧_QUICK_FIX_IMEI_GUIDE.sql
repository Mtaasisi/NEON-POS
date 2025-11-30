-- ════════════════════════════════════════════════════════════════════
-- 🔧 QUICK FIX GUIDE - SAHIHISHA IMEIs HARAKA
-- ════════════════════════════════════════════════════════════════════
-- Run these queries moja baada ya nyingine kusahihisha IMEIs
-- ════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════
-- 📋 HATUA 1: KAGUA HALI YA SASA
-- ════════════════════════════════════════════════════════════════════

-- 1.1 Ona summary ya validation
SELECT 
    imei_status,
    COUNT(*) as idadi,
    ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2)::TEXT || '%' as asilimia
FROM imei_validation
GROUP BY imei_status
ORDER BY COUNT(*) DESC;

-- 1.2 Ona IMEIs invalid zote
SELECT 
    v.id,
    v.variant_name,
    v.variant_attributes->>'imei' as imei,
    LENGTH(v.variant_attributes->>'imei') as urefu,
    iv.validation_reason,
    v.quantity,
    v.is_active
FROM lats_product_variants v
INNER JOIN imei_validation iv ON iv.imei = v.variant_attributes->>'imei'
WHERE iv.imei_status = 'invalid'
ORDER BY LENGTH(v.variant_attributes->>'imei') DESC;

-- 1.3 Ona IMEIs duplicate
SELECT 
    iv.imei,
    COUNT(*) as mara_ngapi,
    array_agg(v.id) as variant_ids,
    array_agg(v.variant_name) as variant_names,
    array_agg(v.quantity) as quantities
FROM imei_validation iv
INNER JOIN lats_product_variants v ON v.variant_attributes->>'imei' = iv.imei
WHERE iv.imei_status = 'duplicate'
GROUP BY iv.imei;

-- ════════════════════════════════════════════════════════════════════
-- 🔧 HATUA 2: SAHIHISHA IMEIs INVALID
-- ════════════════════════════════════════════════════════════════════

-- ⚠️ ONYO: Kabla ya kufanya chochote, ona kwanza ni variants gani zitaathirika

-- 2.1 CHAGUO #1: Ondoa IMEI kutoka variants invalid (recommended)
-- Hii itaweka IMEI kuwa NULL, lakini variant itabaki

-- PREVIEW: Ona variants zitatathirika
SELECT 
    id,
    variant_name,
    variant_attributes->>'imei' as imei_ya_sasa,
    'NULL' as imei_mpya
FROM lats_product_variants
WHERE variant_attributes->>'imei' IN (
    SELECT imei FROM imei_validation WHERE imei_status = 'invalid'
);

-- EXECUTE: Ondoa IMEIs invalid
-- UNCOMMENT LINE HIZI BAADA YA KUHAKIKI:
/*
UPDATE lats_product_variants
SET 
    variant_attributes = variant_attributes - 'imei',
    updated_at = NOW()
WHERE variant_attributes->>'imei' IN (
    SELECT imei FROM imei_validation WHERE imei_status = 'invalid'
);
*/

-- 2.2 CHAGUO #2: Futa variants zote zenye IMEIs invalid
-- ⚠️ WARNING: Hii itafuta variants KABISA!

-- PREVIEW: Ona variants zitafutwa
SELECT 
    id,
    product_id,
    variant_name,
    variant_attributes->>'imei' as imei,
    quantity,
    cost_price,
    selling_price
FROM lats_product_variants
WHERE id IN (
    SELECT source_id 
    FROM imei_validation 
    WHERE imei_status = 'invalid' 
    AND source_table = 'lats_product_variants'
);

-- EXECUTE: Futa variants (HATARI!)
-- UNCOMMENT LINE HIZI BAADA YA KUHAKIKI:
/*
DELETE FROM lats_product_variants
WHERE id IN (
    SELECT source_id 
    FROM imei_validation 
    WHERE imei_status = 'invalid' 
    AND source_table = 'lats_product_variants'
);
*/

-- 2.3 CHAGUO #3: Sahihisha IMEI moja kwa mkono
-- Tumia hii kwa kila variant unayotaka kubadilisha

-- Mfano: Badilisha IMEI ya variant fulani
-- BADILISHA 'VARIANT_ID_HAPA' na 'NEW_IMEI_15_DIGITS'
/*
UPDATE lats_product_variants
SET 
    variant_attributes = jsonb_set(
        variant_attributes,
        '{imei}',
        '"123456789012345"'::jsonb
    ),
    updated_at = NOW()
WHERE id = 'VARIANT_ID_HAPA';
*/

-- ════════════════════════════════════════════════════════════════════
-- 🔁 HATUA 3: SAHIHISHA IMEIs DUPLICATE
-- ════════════════════════════════════════════════════════════════════

-- 3.1 Ona kwa makini variants zenye duplicate IMEI
SELECT 
    id,
    product_id,
    variant_name,
    variant_attributes->>'imei' as imei,
    quantity,
    cost_price,
    selling_price,
    is_active,
    created_at
FROM lats_product_variants
WHERE variant_attributes->>'imei' = '356789012345671'  -- IMEI duplicate iliyopatikana
ORDER BY created_at DESC;

-- 3.2 CHAGUO #1: Futa variant ya pili (ya mwisho)
-- UNCOMMENT na BADILISHA 'VARIANT_ID_YA_DUPLICATE_HAPA':
/*
DELETE FROM lats_product_variants
WHERE id = 'VARIANT_ID_YA_DUPLICATE_HAPA';
*/

-- 3.3 CHAGUO #2: Badilisha IMEI ya variant moja
-- UNCOMMENT na BADILISHA IDs na IMEI:
/*
UPDATE lats_product_variants
SET 
    variant_attributes = jsonb_set(
        variant_attributes,
        '{imei}',
        '"NEW_UNIQUE_IMEI_HERE"'::jsonb
    ),
    updated_at = NOW()
WHERE id = 'VARIANT_ID_HAPA';
*/

-- 3.4 CHAGUO #3: Merge variants (kama ni same product)
-- Tumia hii kama variants mbili ni za product moja na unataka kuunganisha
-- HATUA 1: Ongeza quantity
/*
UPDATE lats_product_variants
SET 
    quantity = quantity + (SELECT quantity FROM lats_product_variants WHERE id = 'VARIANT_2_ID'),
    updated_at = NOW()
WHERE id = 'VARIANT_1_ID';
*/

-- HATUA 2: Futa variant ya pili
/*
DELETE FROM lats_product_variants
WHERE id = 'VARIANT_2_ID';
*/

-- ════════════════════════════════════════════════════════════════════
-- ✅ HATUA 4: VALIDATE TENA BAADA YA KUSAHIHISHA
-- ════════════════════════════════════════════════════════════════════

-- 4.1 Futa data za validation za zamani
TRUNCATE imei_validation;

-- 4.2 Validate tena IMEIs zote
INSERT INTO imei_validation (imei, imei_status, validation_reason, source_table, source_id)
SELECT DISTINCT ON (variant_attributes->>'imei')
    variant_attributes->>'imei' as imei,
    CASE 
        WHEN variant_attributes->>'imei' IS NULL OR TRIM(variant_attributes->>'imei') = '' THEN 'empty'
        WHEN variant_attributes->>'imei' ~ '^\d{15}$' THEN 'valid'
        ELSE 'invalid'
    END as imei_status,
    CASE 
        WHEN variant_attributes->>'imei' IS NULL OR TRIM(variant_attributes->>'imei') = '' THEN 'IMEI ni tupu'
        WHEN variant_attributes->>'imei' ~ '^\d{15}$' THEN 'IMEI halali - 15 digits'
        ELSE 'Format si sahihi au urefu sio 15 digits (urefu: ' || LENGTH(variant_attributes->>'imei') || ')'
    END as validation_reason,
    'lats_product_variants' as source_table,
    id as source_id
FROM lats_product_variants
WHERE variant_attributes->>'imei' IS NOT NULL
    AND variant_attributes->>'imei' != ''
ORDER BY variant_attributes->>'imei', created_at DESC
ON CONFLICT (imei) DO NOTHING;

-- 4.3 Flag duplicates tena
WITH duplicate_imeis AS (
    SELECT 
        variant_attributes->>'imei' as imei,
        COUNT(*) as count
    FROM lats_product_variants
    WHERE variant_attributes->>'imei' IS NOT NULL
        AND variant_attributes->>'imei' != ''
    GROUP BY variant_attributes->>'imei'
    HAVING COUNT(*) > 1
)
UPDATE imei_validation
SET 
    imei_status = 'duplicate',
    validation_reason = 'IMEI duplicate - inaonekana mara ' || d.count || ' kwenye database',
    updated_at = now()
FROM duplicate_imeis d
WHERE imei_validation.imei = d.imei;

-- 4.4 Ona summary mpya
SELECT 
    imei_status,
    COUNT(*) as idadi,
    ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2)::TEXT || '%' as asilimia
FROM imei_validation
GROUP BY imei_status
ORDER BY COUNT(*) DESC;

-- ════════════════════════════════════════════════════════════════════
-- 🎯 ADVANCED: AUTO-FIX COMMON ISSUES
-- ════════════════════════════════════════════════════════════════════

-- 5.1 Remove IMEIs that are too short (less than 10 chars)
-- These are obviously test data
/*
UPDATE lats_product_variants
SET 
    variant_attributes = variant_attributes - 'imei',
    updated_at = NOW()
WHERE LENGTH(variant_attributes->>'imei') < 10;
*/

-- 5.2 Remove IMEIs with letters (non-numeric)
/*
UPDATE lats_product_variants
SET 
    variant_attributes = variant_attributes - 'imei',
    updated_at = NOW()
WHERE variant_attributes->>'imei' ~ '[A-Za-z]';
*/

-- 5.3 Find variants without IMEI but should have one
SELECT 
    id,
    product_id,
    variant_name,
    variant_type,
    quantity,
    cost_price
FROM lats_product_variants
WHERE variant_type = 'imei_child'
    AND (variant_attributes->>'imei' IS NULL OR variant_attributes->>'imei' = '');

-- 5.4 Find parent variants that should not have IMEIs
SELECT 
    id,
    product_id,
    variant_name,
    variant_type,
    variant_attributes->>'imei' as imei
FROM lats_product_variants
WHERE variant_type = 'parent'
    AND variant_attributes->>'imei' IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════
-- 💡 USEFUL QUERIES FOR MONITORING
-- ════════════════════════════════════════════════════════════════════

-- 6.1 Count variants by type with IMEI status
SELECT 
    v.variant_type,
    COUNT(*) as total_variants,
    COUNT(v.variant_attributes->>'imei') as variants_with_imei,
    COUNT(*) - COUNT(v.variant_attributes->>'imei') as variants_without_imei
FROM lats_product_variants v
GROUP BY v.variant_type;

-- 6.2 Find recently added variants with invalid IMEIs
SELECT 
    v.id,
    v.variant_name,
    v.variant_attributes->>'imei' as imei,
    iv.validation_reason,
    v.created_at
FROM lats_product_variants v
INNER JOIN imei_validation iv ON iv.imei = v.variant_attributes->>'imei'
WHERE iv.imei_status = 'invalid'
    AND v.created_at > NOW() - INTERVAL '7 days'
ORDER BY v.created_at DESC;

-- 6.3 Find products with most invalid IMEIs
SELECT 
    p.id,
    p.name,
    COUNT(*) as invalid_imei_count
FROM lats_products p
INNER JOIN lats_product_variants v ON v.product_id = p.id
INNER JOIN imei_validation iv ON iv.imei = v.variant_attributes->>'imei'
WHERE iv.imei_status = 'invalid'
GROUP BY p.id, p.name
ORDER BY invalid_imei_count DESC;

-- ════════════════════════════════════════════════════════════════════
-- 📝 NOTES
-- ════════════════════════════════════════════════════════════════════
-- 
-- IMPORTANT REMINDERS:
-- 
-- 1. BACKUP: Fanya backup ya database kabla ya kufanya UPDATE au DELETE
-- 
-- 2. TEST: Kila wakati tumia SELECT (preview) kabla ya UPDATE au DELETE
-- 
-- 3. VALIDATION: Baada ya kusahihisha, run validation script tena:
--    node run-complete-imei-validation.mjs
-- 
-- 4. DOCUMENTATION: Andika notes za mabadiliko uliyofanya
-- 
-- 5. MONITORING: Check IMEIs regularly to prevent future issues
-- 
-- ════════════════════════════════════════════════════════════════════

