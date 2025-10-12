-- ============================================
-- BACKUP: Save Current Data Before Fix
-- ============================================
-- Run this BEFORE applying the fix
-- This creates backup tables you can restore from if needed
-- ============================================

-- Create backup table for sales
CREATE TABLE IF NOT EXISTS lats_sales_backup_before_overflow_fix AS
SELECT * FROM lats_sales;

-- Create backup table for sale items
CREATE TABLE IF NOT EXISTS lats_sale_items_backup_before_overflow_fix AS
SELECT * FROM lats_sale_items;

-- Verify backups
SELECT 
    'Backup Complete! ✅' as status,
    (SELECT COUNT(*) FROM lats_sales_backup_before_overflow_fix) as sales_backed_up,
    (SELECT COUNT(*) FROM lats_sale_items_backup_before_overflow_fix) as sale_items_backed_up,
    NOW() as backup_timestamp;

-- Document what we're backing up
SELECT 
    'Sales with Problems' as report,
    COUNT(*) as count,
    SUM(total_amount) as total_sum,
    MAX(total_amount) as max_amount
FROM lats_sales
WHERE total_amount > 1000000000 OR total_amount < 0;

-- Show sample of problematic data
SELECT 
    id,
    sale_number,
    total_amount,
    created_at
FROM lats_sales
WHERE total_amount > 1000000000 OR total_amount < 0
LIMIT 10;

-- Instructions
SELECT '
✅ BACKUP COMPLETE!

The following tables have been created:
- lats_sales_backup_before_overflow_fix
- lats_sale_items_backup_before_overflow_fix

You can now safely run: fix-sales-total-amount-overflow.sql

If you need to restore, run: restore-from-backup.sql
' as instructions;

