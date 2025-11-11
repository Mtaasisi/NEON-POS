-- ============================================
-- IMEI VALIDATION NA UPDATE YA INVENTORY STATUS
-- ============================================
-- Script hii inafanya:
-- 1. Kuunda jedwali la imei_validation (kama halipo)
-- 2. Kujaza na IMEIs zote
-- 3. Kuvalidate kila IMEI (15 digits, format sahihi)
-- 4. Ku-update status za inventory_items
-- 5. Kutoa report kamili
-- ============================================

-- HATUA 1: Unda jedwali la imei_validation
-- ============================================
-- Futa jedwali la zamani kama lipo (fresh start)
DROP TABLE IF EXISTS imei_validation CASCADE;

-- Unda jedwali jipya
CREATE TABLE imei_validation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imei TEXT NOT NULL UNIQUE,
    imei_status TEXT NOT NULL CHECK (imei_status IN ('valid', 'invalid', 'duplicate', 'empty')),
    validation_reason TEXT,
    source_table TEXT, -- 'lats_product_variants' au 'inventory_items'
    source_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unda indexes
CREATE INDEX idx_imei_validation_status ON imei_validation(imei_status);
CREATE INDEX idx_imei_validation_imei ON imei_validation(imei);

-- HATUA 2: Jaza IMEIs kutoka lats_product_variants
-- ============================================
-- Tumia CTE ili kupata IMEI moja kwa kila unique value (kuchagua ya kwanza)
WITH variant_imeis AS (
    SELECT DISTINCT ON (variant_attributes->>'imei')
        variant_attributes->>'imei' as imei,
        id as source_id
    FROM lats_product_variants
    WHERE variant_attributes->>'imei' IS NOT NULL
        AND TRIM(variant_attributes->>'imei') != ''
    ORDER BY variant_attributes->>'imei', created_at DESC
)
INSERT INTO imei_validation (imei, imei_status, validation_reason, source_table, source_id)
SELECT 
    imei,
    CASE 
        -- Check if exactly 15 digits
        WHEN imei ~ '^\d{15}$' THEN 'valid'
        -- Check if it's numeric but wrong length
        WHEN imei ~ '^\d+$' THEN 'invalid'
        -- Contains non-numeric characters
        ELSE 'invalid'
    END as imei_status,
    CASE 
        WHEN imei ~ '^\d{15}$' THEN 'IMEI halali - 15 digits'
        WHEN imei ~ '^\d+$' THEN 'Urefu si sahihi - lazima iwe 15 digits (ina ' || LENGTH(imei) || ')'
        ELSE 'Format si sahihi - IMEI lazima iwe tarakimu tu'
    END as validation_reason,
    'lats_product_variants' as source_table,
    source_id
FROM variant_imeis
ON CONFLICT (imei) DO NOTHING;

-- HATUA 3: Jaza IMEIs kutoka inventory_items
-- ============================================
-- Tumia CTE ili kupata IMEI moja kwa kila unique value
WITH inventory_imeis AS (
    SELECT DISTINCT ON (imei)
        imei,
        id as source_id
    FROM inventory_items
    WHERE imei IS NOT NULL
        AND TRIM(imei) != ''
    ORDER BY imei, created_at DESC
)
INSERT INTO imei_validation (imei, imei_status, validation_reason, source_table, source_id)
SELECT 
    imei,
    CASE 
        WHEN imei ~ '^\d{15}$' THEN 'valid'
        WHEN imei ~ '^\d+$' THEN 'invalid'
        ELSE 'invalid'
    END as imei_status,
    CASE 
        WHEN imei ~ '^\d{15}$' THEN 'IMEI halali - 15 digits'
        WHEN imei ~ '^\d+$' THEN 'Urefu si sahihi - lazima iwe 15 digits (ina ' || LENGTH(imei) || ')'
        ELSE 'Format si sahihi - IMEI lazima iwe tarakimu tu'
    END as validation_reason,
    'inventory_items' as source_table,
    source_id
FROM inventory_imeis
ON CONFLICT (imei) DO NOTHING;

-- HATUA 4: Tafuta IMEIs duplicate
-- ============================================
WITH duplicate_imeis AS (
    SELECT imei, COUNT(*) as count
    FROM (
        SELECT variant_attributes->>'imei' as imei
        FROM lats_product_variants
        WHERE variant_attributes->>'imei' IS NOT NULL
        UNION ALL
        SELECT imei
        FROM inventory_items
        WHERE imei IS NOT NULL
    ) all_imeis
    WHERE imei IS NOT NULL AND TRIM(imei) != ''
    GROUP BY imei
    HAVING COUNT(*) > 1
)
UPDATE imei_validation
SET 
    imei_status = 'duplicate',
    validation_reason = 'IMEI duplicate - inaonekana mara ' || d.count || ' kwenye database',
    updated_at = now()
FROM duplicate_imeis d
WHERE imei_validation.imei = d.imei;

-- HATUA 5: Update status za inventory_items
-- ============================================
-- Weka status kulingana na validation
UPDATE inventory_items ii
SET 
    status = CASE 
        WHEN iv.imei_status = 'valid' THEN 'available'
        WHEN iv.imei_status = 'duplicate' THEN 'on_hold'
        ELSE 'pending_quality_check'
    END,
    updated_at = now()
FROM imei_validation iv
WHERE ii.imei = iv.imei
    AND ii.imei IS NOT NULL
    AND TRIM(ii.imei) != '';

-- ============================================
-- REPORT: MATOKEO YA VALIDATION
-- ============================================

-- Summary ya kila status
SELECT 
    '╔═══════════════════════════════════════════════════════════════╗' as line
UNION ALL
SELECT '║           📊 REPORT YA IMEI VALIDATION                      ║'
UNION ALL
SELECT '╚═══════════════════════════════════════════════════════════════╝'
UNION ALL
SELECT '';

-- 1. JUMLA YA IMEIS ZOTE
SELECT 
    '═══ 1. JUMLA YA IMEIs ═══' as section,
    '' as imei_status,
    '' as count,
    '' as percentage;

SELECT 
    '' as section,
    imei_status,
    COUNT(*) as count,
    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM imei_validation)), 2)::TEXT || '%' as percentage
FROM imei_validation
GROUP BY imei_status
ORDER BY COUNT(*) DESC;

-- 2. IMEIs KUTOKA LATS_PRODUCT_VARIANTS
SELECT '' as section, '' as source, '' as valid_count, '' as invalid_count, '' as total;
SELECT '═══ 2. IMEIs KUTOKA lats_product_variants ═══' as section, '' as source, '' as valid_count, '' as invalid_count, '' as total;

SELECT 
    '' as section,
    source_table,
    SUM(CASE WHEN imei_status = 'valid' THEN 1 ELSE 0 END) as valid_count,
    SUM(CASE WHEN imei_status IN ('invalid', 'empty', 'duplicate') THEN 1 ELSE 0 END) as invalid_count,
    COUNT(*) as total
FROM imei_validation
WHERE source_table = 'lats_product_variants'
GROUP BY source_table;

-- 3. IMEIs KUTOKA INVENTORY_ITEMS
SELECT '' as section, '' as source, '' as valid_count, '' as invalid_count, '' as total;
SELECT '═══ 3. IMEIs KUTOKA inventory_items ═══' as section, '' as source, '' as valid_count, '' as invalid_count, '' as total;

SELECT 
    '' as section,
    source_table,
    SUM(CASE WHEN imei_status = 'valid' THEN 1 ELSE 0 END) as valid_count,
    SUM(CASE WHEN imei_status IN ('invalid', 'empty', 'duplicate') THEN 1 ELSE 0 END) as invalid_count,
    COUNT(*) as total
FROM imei_validation
WHERE source_table = 'inventory_items'
GROUP BY source_table;

-- 4. RECORDS ZILIZOUPDATE KWENYE INVENTORY_ITEMS
SELECT '' as section, '' as new_status, '' as count;
SELECT '═══ 4. INVENTORY_ITEMS ZILIZOUPDATE ═══' as section, '' as new_status, '' as count;

SELECT 
    '' as section,
    ii.status as new_status,
    COUNT(*) as count
FROM inventory_items ii
INNER JOIN imei_validation iv ON ii.imei = iv.imei
GROUP BY ii.status
ORDER BY COUNT(*) DESC;

-- 5. IMEIs AMBAZO HAZINA MATCH KWENYE INVENTORY_ITEMS
SELECT '' as section, '' as imei, '' as status, '' as source;
SELECT '═══ 5. IMEIs HAZINA MATCH KWENYE INVENTORY_ITEMS ═══' as section, '' as imei, '' as status, '' as source;

SELECT 
    '' as section,
    iv.imei,
    iv.imei_status as status,
    iv.source_table as source
FROM imei_validation iv
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_items ii 
    WHERE ii.imei = iv.imei
)
AND iv.imei IS NOT NULL
AND TRIM(iv.imei) != ''
ORDER BY iv.imei_status, iv.imei
LIMIT 20;

-- 6. IMEIs DUPLICATE (Detailed)
SELECT '' as section, '' as imei, '' as occurrences;
SELECT '═══ 6. IMEIs DUPLICATE (DETAILED) ═══' as section, '' as imei, '' as occurrences;

SELECT 
    '' as section,
    iv.imei,
    COUNT(*) as occurrences
FROM imei_validation iv
WHERE iv.imei_status = 'duplicate'
GROUP BY iv.imei
ORDER BY COUNT(*) DESC
LIMIT 10;

-- 7. IMEIs INVALID (Examples)
SELECT '' as section, '' as imei, '' as reason;
SELECT '═══ 7. IMEIs INVALID (MIFANO) ═══' as section, '' as imei, '' as reason;

SELECT 
    '' as section,
    imei,
    validation_reason as reason
FROM imei_validation
WHERE imei_status = 'invalid'
ORDER BY imei
LIMIT 10;

-- 8. SUMMARY YA MWISHO
SELECT '' as line;
SELECT '╔═══════════════════════════════════════════════════════════════╗' as line
UNION ALL
SELECT '║                    📈 SUMMARY YA MWISHO                      ║'
UNION ALL
SELECT '╚═══════════════════════════════════════════════════════════════╝';

WITH summary AS (
    SELECT 
        COUNT(*) as total_imeis,
        SUM(CASE WHEN imei_status = 'valid' THEN 1 ELSE 0 END) as valid_imeis,
        SUM(CASE WHEN imei_status = 'invalid' THEN 1 ELSE 0 END) as invalid_imeis,
        SUM(CASE WHEN imei_status = 'duplicate' THEN 1 ELSE 0 END) as duplicate_imeis,
        SUM(CASE WHEN imei_status = 'empty' THEN 1 ELSE 0 END) as empty_imeis
    FROM imei_validation
),
inventory_updated AS (
    SELECT COUNT(*) as updated_count
    FROM inventory_items ii
    INNER JOIN imei_validation iv ON ii.imei = iv.imei
),
no_match AS (
    SELECT COUNT(*) as no_match_count
    FROM imei_validation iv
    WHERE NOT EXISTS (
        SELECT 1 FROM inventory_items ii WHERE ii.imei = iv.imei
    )
    AND iv.imei IS NOT NULL
    AND TRIM(iv.imei) != ''
)
SELECT 
    '✅ Jumla ya IMEIs zilizochunguzwa: ' || total_imeis as result
FROM summary
UNION ALL
SELECT '  ├─ Halali (valid): ' || valid_imeis || ' (' || ROUND((valid_imeis::NUMERIC / total_imeis * 100), 1) || '%)'
FROM summary
UNION ALL
SELECT '  ├─ Si halali (invalid): ' || invalid_imeis || ' (' || ROUND((invalid_imeis::NUMERIC / total_imeis * 100), 1) || '%)'
FROM summary
UNION ALL
SELECT '  ├─ Duplicate: ' || duplicate_imeis || ' (' || ROUND((duplicate_imeis::NUMERIC / total_imeis * 100), 1) || '%)'
FROM summary
UNION ALL
SELECT '  └─ Tupu (empty): ' || empty_imeis || ' (' || ROUND((empty_imeis::NUMERIC / total_imeis * 100), 1) || '%)'
FROM summary
UNION ALL
SELECT ''
UNION ALL
SELECT '📝 Records za inventory_items zilizoupdate: ' || updated_count
FROM inventory_updated
UNION ALL
SELECT ''
UNION ALL
SELECT '⚠️  IMEIs hazina match kwenye inventory_items: ' || no_match_count
FROM no_match
UNION ALL
SELECT ''
UNION ALL
SELECT '═══════════════════════════════════════════════════════════════';

-- ============================================
-- QUERY ZA KUHAKIKISHA (OPTIONAL)
-- ============================================

-- Query ya kuona inventory_items zilizoupdate
-- SELECT 
--     ii.id,
--     ii.imei,
--     ii.status as current_status,
--     iv.imei_status,
--     iv.validation_reason
-- FROM inventory_items ii
-- INNER JOIN imei_validation iv ON ii.imei = iv.imei
-- ORDER BY ii.updated_at DESC
-- LIMIT 20;

-- Query ya kuona IMEIs zote za product fulani
-- SELECT 
--     p.name as product_name,
--     v.variant_name,
--     v.variant_attributes->>'imei' as imei,
--     iv.imei_status,
--     iv.validation_reason
-- FROM lats_products p
-- JOIN lats_product_variants v ON v.product_id = p.id
-- LEFT JOIN imei_validation iv ON iv.imei = v.variant_attributes->>'imei'
-- WHERE p.name ILIKE '%iPhone%'
-- ORDER BY p.name, v.variant_name;

