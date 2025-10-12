-- ============================================
-- RESTORE: Rollback to Backup (if needed)
-- ============================================
-- ⚠️ ONLY run this if the fix didn't work as expected
-- This will restore your data from the backup
-- ============================================

-- Check if backup exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'lats_sales_backup_before_overflow_fix'
    ) THEN
        RAISE EXCEPTION 'Backup table not found! Did you run backup-before-fix.sql first?';
    END IF;
END $$;

-- Show what will be restored
SELECT 
    'Restore Preview' as status,
    (SELECT COUNT(*) FROM lats_sales_backup_before_overflow_fix) as sales_to_restore,
    (SELECT COUNT(*) FROM lats_sale_items_backup_before_overflow_fix) as items_to_restore;

-- Confirm restore (uncomment the lines below if you're sure you want to restore)
-- ⚠️ WARNING: This will overwrite current data!

/*
BEGIN;

-- Delete current data
TRUNCATE lats_sale_items CASCADE;
TRUNCATE lats_sales CASCADE;

-- Restore from backup
INSERT INTO lats_sales SELECT * FROM lats_sales_backup_before_overflow_fix;
INSERT INTO lats_sale_items SELECT * FROM lats_sale_items_backup_before_overflow_fix;

-- Verify restore
SELECT 
    'Restore Complete! ✅' as status,
    (SELECT COUNT(*) FROM lats_sales) as sales_restored,
    (SELECT COUNT(*) FROM lats_sale_items) as items_restored;

COMMIT;
*/

SELECT '
⚠️ RESTORE NOT EXECUTED YET

To actually restore the backup:
1. Uncomment the section between /* and */
2. Re-run this script

Only do this if the fix caused problems!
' as instructions;

