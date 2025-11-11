-- ============================================
-- COMPREHENSIVE IMEI VALIDATION SYSTEM
-- ============================================
-- Creates tables, views, and functions for complete IMEI validation
-- Compatible with Neon Database serverless

-- ============================================
-- STEP 1: CREATE VALIDATION TABLE
-- ============================================
DROP TABLE IF EXISTS imei_validation CASCADE;

CREATE TABLE imei_validation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imei TEXT NOT NULL UNIQUE,
    imei_status TEXT NOT NULL CHECK (imei_status IN ('valid', 'invalid', 'duplicate', 'empty')),
    validation_reason TEXT,
    source_table TEXT,
    source_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_imei_validation_status ON imei_validation(imei_status);
CREATE INDEX idx_imei_validation_imei ON imei_validation(imei);

-- ============================================
-- STEP 2: POPULATE FROM lats_product_variants
-- ============================================
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
        WHEN imei ~ '^\d{15}$' THEN 'valid'
        WHEN imei ~ '^\d+$' THEN 'invalid'
        ELSE 'invalid'
    END as imei_status,
    CASE 
        WHEN imei ~ '^\d{15}$' THEN 'Valid IMEI - 15 digits'
        WHEN imei ~ '^\d+$' THEN 'Invalid length - must be 15 digits (has ' || LENGTH(imei) || ')'
        ELSE 'Invalid format - IMEI must be numeric only'
    END as validation_reason,
    'lats_product_variants' as source_table,
    source_id
FROM variant_imeis
ON CONFLICT (imei) DO NOTHING;

-- ============================================
-- STEP 3: POPULATE FROM inventory_items
-- ============================================
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
        WHEN imei ~ '^\d{15}$' THEN 'Valid IMEI - 15 digits'
        WHEN imei ~ '^\d+$' THEN 'Invalid length - must be 15 digits (has ' || LENGTH(imei) || ')'
        ELSE 'Invalid format - IMEI must be numeric only'
    END as validation_reason,
    'inventory_items' as source_table,
    source_id
FROM inventory_imeis
ON CONFLICT (imei) DO NOTHING;

-- ============================================
-- STEP 4: DETECT DUPLICATES
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
    validation_reason = 'Duplicate IMEI - appears ' || d.count || ' times in database',
    updated_at = now()
FROM duplicate_imeis d
WHERE imei_validation.imei = d.imei;

-- ============================================
-- STEP 5: UPDATE inventory_items STATUS
-- ============================================
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
-- STEP 6: CREATE VALIDATION VIEW
-- ============================================
CREATE OR REPLACE VIEW v_imei_validation_status AS
SELECT 
    v.id as variant_id,
    p.id as product_id,
    p.name as product_name,
    v.variant_name,
    v.variant_attributes->>'imei' as imei,
    COALESCE(iv.imei_status, 'not_validated') as imei_status,
    iv.validation_reason,
    v.quantity,
    v.is_active,
    v.created_at
FROM lats_product_variants v
LEFT JOIN lats_products p ON p.id = v.product_id
LEFT JOIN imei_validation iv ON iv.imei = v.variant_attributes->>'imei'
WHERE v.variant_attributes->>'imei' IS NOT NULL
ORDER BY iv.imei_status, v.created_at DESC;

-- ============================================
-- STEP 7: CREATE VALIDATION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION validate_single_imei(imei_to_check TEXT)
RETURNS TABLE (
    imei TEXT,
    is_valid BOOLEAN,
    status TEXT,
    reason TEXT,
    appears_in_database BOOLEAN,
    occurrence_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH imei_check AS (
        SELECT 
            imei_to_check as check_imei,
            CASE 
                WHEN imei_to_check ~ '^\d{15}$' THEN true
                ELSE false
            END as is_valid_format,
            CASE 
                WHEN imei_to_check ~ '^\d{15}$' THEN 'valid'
                WHEN imei_to_check ~ '^\d+$' THEN 'invalid'
                ELSE 'invalid'
            END as check_status,
            CASE 
                WHEN imei_to_check ~ '^\d{15}$' THEN 'Valid IMEI - 15 digits'
                WHEN imei_to_check ~ '^\d+$' THEN 'Invalid length - must be 15 digits (has ' || LENGTH(imei_to_check) || ')'
                ELSE 'Invalid format - IMEI must be numeric only'
            END as check_reason
    ),
    occurrence_check AS (
        SELECT COUNT(*) as count
        FROM (
            SELECT variant_attributes->>'imei' as imei
            FROM lats_product_variants
            WHERE variant_attributes->>'imei' = imei_to_check
            UNION ALL
            SELECT imei
            FROM inventory_items
            WHERE imei = imei_to_check
        ) occurrences
    )
    SELECT 
        ic.check_imei,
        ic.is_valid_format,
        ic.check_status,
        ic.check_reason,
        CASE WHEN oc.count > 0 THEN true ELSE false END as appears_in_database,
        oc.count as occurrence_count
    FROM imei_check ic, occurrence_check oc;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 8: CREATE HELPER VIEW FOR DUPLICATES
-- ============================================
CREATE OR REPLACE VIEW v_duplicate_imeis AS
SELECT 
    iv.imei,
    iv.validation_reason,
    COUNT(*) OVER (PARTITION BY iv.imei) as total_occurrences,
    v.id as variant_id,
    p.name as product_name,
    v.variant_name,
    'lats_product_variants' as location,
    v.created_at
FROM imei_validation iv
JOIN lats_product_variants v ON v.variant_attributes->>'imei' = iv.imei
LEFT JOIN lats_products p ON p.id = v.product_id
WHERE iv.imei_status = 'duplicate'

UNION ALL

SELECT 
    iv.imei,
    iv.validation_reason,
    COUNT(*) OVER (PARTITION BY iv.imei) as total_occurrences,
    ii.id as variant_id,
    p.name as product_name,
    ii.serial_number as variant_name,
    'inventory_items' as location,
    ii.created_at
FROM imei_validation iv
JOIN inventory_items ii ON ii.imei = iv.imei
LEFT JOIN lats_products p ON p.id = ii.product_id
WHERE iv.imei_status = 'duplicate'

ORDER BY imei, created_at;

-- ============================================
-- VALIDATION COMPLETE
-- ============================================
-- The following resources have been created:
-- 
-- TABLES:
--   • imei_validation - Main validation tracking table
--
-- VIEWS:
--   • v_imei_validation_status - Complete IMEI status for all variants
--   • v_duplicate_imeis - Detailed view of duplicate IMEIs
--
-- FUNCTIONS:
--   • validate_single_imei(TEXT) - Validate individual IMEI
--
-- USAGE EXAMPLES:
--   SELECT * FROM v_imei_validation_status WHERE imei_status != 'valid';
--   SELECT * FROM v_duplicate_imeis;
--   SELECT * FROM validate_single_imei('123456789012345');
-- ============================================
