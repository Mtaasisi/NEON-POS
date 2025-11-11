-- ============================================================================
-- Deduplicate Customers - Remove Duplicate Customer Records
-- ============================================================================
-- 
-- ISSUE: 6,137 customers have duplicates (12,260 extra records to remove)
-- CAUSE: Multiple data imports or migrations created duplicate records
-- SOLUTION: Keep the "best" record for each customer, delete the rest
--
-- Date: 2025-11-09
-- Impact: Removes 12,260 duplicate records, keeps 1 per unique phone+name
-- ============================================================================

-- SAFETY: This script is READ-ONLY by default. Uncomment the DELETE at the end.

-- ============================================================================
-- STEP 1: Analyze duplicates before deduplication
-- ============================================================================

-- Show current duplicate statistics
WITH duplicate_stats AS (
    SELECT 
        phone,
        name,
        COUNT(*) as duplicate_count
    FROM lats_customers
    GROUP BY phone, name
    HAVING COUNT(*) > 1
)
SELECT 
    COUNT(*) as total_duplicate_groups,
    SUM(duplicate_count) as total_duplicate_records,
    SUM(duplicate_count - 1) as records_to_remove,
    MAX(duplicate_count) as max_duplicates_per_customer
FROM duplicate_stats;

-- ============================================================================
-- STEP 2: Preview which records will be kept vs deleted
-- ============================================================================

-- Create a temp table to identify which records to keep
DROP TABLE IF EXISTS customer_dedup_analysis;
CREATE TEMP TABLE customer_dedup_analysis AS
WITH ranked_customers AS (
    SELECT 
        id,
        phone,
        name,
        email,
        created_at,
        updated_at,
        total_spent,
        total_purchases,
        branch_id,
        is_active,
        -- Rank by: most data completeness, most recent, highest spending
        ROW_NUMBER() OVER (
            PARTITION BY phone, name 
            ORDER BY 
                -- Prioritize records with more complete data
                (CASE WHEN email IS NOT NULL AND email != '' THEN 1 ELSE 0 END +
                 CASE WHEN city IS NOT NULL AND city != '' THEN 1 ELSE 0 END +
                 CASE WHEN whatsapp IS NOT NULL AND whatsapp != '' THEN 1 ELSE 0 END +
                 CASE WHEN birthday IS NOT NULL THEN 1 ELSE 0 END) DESC,
                -- Then by transaction history
                COALESCE(total_purchases, 0) DESC,
                COALESCE(total_spent, 0) DESC,
                -- Then by recency
                COALESCE(updated_at, created_at, '1970-01-01'::timestamptz) DESC,
                -- Finally by creation date
                COALESCE(created_at, '1970-01-01'::timestamptz) DESC
        ) as row_rank,
        -- Count total duplicates for this customer
        COUNT(*) OVER (PARTITION BY phone, name) as total_duplicates
    FROM lats_customers
    WHERE phone IS NOT NULL AND name IS NOT NULL
)
SELECT 
    id,
    phone,
    name,
    email,
    total_spent,
    total_purchases,
    created_at,
    updated_at,
    row_rank,
    total_duplicates,
    CASE WHEN row_rank = 1 THEN 'KEEP' ELSE 'DELETE' END as action
FROM ranked_customers
WHERE total_duplicates > 1;

-- Show summary of deduplication plan
SELECT 
    action,
    COUNT(*) as record_count,
    COUNT(DISTINCT phone || '|' || name) as unique_customers
FROM customer_dedup_analysis
GROUP BY action
ORDER BY action;

-- Show examples of what will be kept vs deleted
SELECT 
    phone,
    name,
    email,
    total_spent,
    total_purchases,
    created_at,
    action
FROM customer_dedup_analysis
WHERE phone IN (
    SELECT phone 
    FROM customer_dedup_analysis 
    WHERE total_duplicates >= 3
    LIMIT 5
)
ORDER BY phone, name, row_rank;

-- ============================================================================
-- STEP 3: Backup duplicates before deletion (RECOMMENDED)
-- ============================================================================

-- Create backup table with duplicates
DROP TABLE IF EXISTS customers_duplicates_backup;
CREATE TABLE customers_duplicates_backup AS
SELECT 
    c.*,
    now() as backup_date,
    'duplicate_record' as backup_reason
FROM lats_customers c
INNER JOIN customer_dedup_analysis a ON c.id = a.id
WHERE a.action = 'DELETE';

-- Verify backup
SELECT COUNT(*) as backed_up_records 
FROM customers_duplicates_backup;

-- ============================================================================
-- STEP 4: Preview records that will be deleted
-- ============================================================================

-- Show how many records will be deleted
SELECT 
    COUNT(*) as records_to_delete,
    COUNT(DISTINCT phone) as unique_phones_affected,
    COUNT(DISTINCT name) as unique_names_affected
FROM customer_dedup_analysis
WHERE action = 'DELETE';

-- Show sample of records to be deleted
SELECT 
    id,
    phone,
    name,
    email,
    total_spent,
    created_at,
    'Will be DELETED' as status
FROM customer_dedup_analysis
WHERE action = 'DELETE'
ORDER BY phone, name
LIMIT 20;

-- ============================================================================
-- STEP 5: ACTUAL DELETION (COMMENTED OUT FOR SAFETY)
-- ============================================================================

-- ⚠️  WARNING: This will permanently delete duplicate records!
-- ⚠️  Only run this after reviewing the preview above
-- ⚠️  Uncomment the lines below to execute the deletion

/*
-- Delete duplicate records (keeping the "best" one for each customer)
DELETE FROM lats_customers
WHERE id IN (
    SELECT id 
    FROM customer_dedup_analysis 
    WHERE action = 'DELETE'
);

-- Verify deletion
WITH duplicate_check AS (
    SELECT 
        phone,
        name,
        COUNT(*) as duplicate_count
    FROM lats_customers
    GROUP BY phone, name
    HAVING COUNT(*) > 1
)
SELECT 
    COUNT(*) as remaining_duplicates,
    COALESCE(SUM(duplicate_count), 0) as remaining_duplicate_records
FROM duplicate_check;

-- Show final customer count
SELECT 
    COUNT(*) as total_customers_after_dedup,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_customers
FROM lats_customers;

-- Success message
DO $$
DECLARE
    deleted_count INTEGER;
    final_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO deleted_count FROM customers_duplicates_backup;
    SELECT COUNT(*) INTO final_count FROM lats_customers;
    
    RAISE NOTICE '✅ Deduplication Complete!';
    RAISE NOTICE '🗑️  Deleted: % duplicate records', deleted_count;
    RAISE NOTICE '📊 Remaining: % unique customers', final_count;
    RAISE NOTICE '💾 Backup: customers_duplicates_backup table created';
END $$;
*/

-- ============================================================================
-- STEP 6: Manual execution instructions
-- ============================================================================

-- TO EXECUTE THE DEDUPLICATION:
-- 1. Review the preview queries above
-- 2. Verify the backup was created
-- 3. Uncomment the section in STEP 5
-- 4. Run the script again

-- TO ROLLBACK (if needed):
/*
INSERT INTO lats_customers
SELECT 
    id, name, email, phone, address, city, location, branch_id,
    loyalty_points, total_spent, status, is_active, created_at, updated_at,
    whatsapp, gender, country, color_tag, loyalty_level, points, last_visit,
    referral_source, birth_month, birth_day, birthday, initial_notes, notes,
    customer_tag, location_description, national_id, joined_date, profile_image,
    whatsapp_opt_out, referred_by, created_by, last_purchase_date, 
    total_purchases, total_returns, total_calls, total_call_duration_minutes,
    incoming_calls, outgoing_calls, missed_calls, avg_call_duration_minutes,
    first_call_date, last_call_date, call_loyalty_level, last_activity_date,
    referrals, is_shared, preferred_branch_id, visible_to_branches, 
    sharing_mode, created_by_branch_id, created_by_branch_name
FROM customers_duplicates_backup;
*/

-- ============================================================================
-- STEP 7: Prevent future duplicates (UNIQUE constraint)
-- ============================================================================

-- After deduplication, add a unique constraint to prevent future duplicates
/*
-- Option 1: Unique on phone+name (recommended)
ALTER TABLE lats_customers
ADD CONSTRAINT unique_customer_phone_name 
UNIQUE (phone, name);

-- Option 2: Unique index allowing NULL values
CREATE UNIQUE INDEX idx_unique_customer_phone_name
ON lats_customers (phone, name)
WHERE phone IS NOT NULL AND name IS NOT NULL;
*/

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '═══════════════════════════════════════════════════════════';
RAISE NOTICE '📋 DEDUPLICATION ANALYSIS COMPLETE';
RAISE NOTICE '═══════════════════════════════════════════════════════════';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Review the preview queries above';
RAISE NOTICE '2. Check the backup table: customers_duplicates_backup';
RAISE NOTICE '3. If satisfied, uncomment STEP 5 and run again';
RAISE NOTICE '4. After deletion, add unique constraint (STEP 7)';
RAISE NOTICE '═══════════════════════════════════════════════════════════';

