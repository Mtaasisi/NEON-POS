-- ============================================
-- 🔄 PROCESS DUE RECURRING EXPENSES
-- Run this daily to process automatic expenses
-- ============================================

-- Show expenses due today
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";
SELECT '   EXPENSES DUE TODAY OR OVERDUE' as "STATUS";
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";

SELECT 
  name,
  category,
  amount,
  frequency,
  next_due_date,
  auto_process,
  CASE 
    WHEN auto_process THEN '⚡ Will Auto-Process'
    ELSE '📝 Manual Approval Required'
  END as processing_mode
FROM recurring_expenses
WHERE is_active = true
  AND next_due_date <= CURRENT_DATE
ORDER BY next_due_date;

-- Process the expenses
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";
SELECT '   PROCESSING RESULTS' as "STATUS";
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";

SELECT * FROM process_due_recurring_expenses();

-- Show updated status
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";
SELECT '   NEXT DUE DATES UPDATED' as "STATUS";
SELECT '═══════════════════════════════════════════════' as "═══════════════════════════════════════════════";

SELECT 
  name,
  category,
  amount,
  next_due_date as new_due_date,
  last_processed_date,
  CASE 
    WHEN last_processed_date = CURRENT_DATE THEN '✅ PROCESSED TODAY'
    ELSE '⏳ WAITING'
  END as status
FROM recurring_expenses
WHERE is_active = true
ORDER BY next_due_date;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Recurring expense processing complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'What happened:';
  RAISE NOTICE '  • Auto-process expenses were created';
  RAISE NOTICE '  • Account balances were updated';
  RAISE NOTICE '  • Next due dates calculated';
  RAISE NOTICE '  • Manual expenses were skipped (notification only)';
  RAISE NOTICE '';
  RAISE NOTICE 'Schedule this script to run daily:';
  RAISE NOTICE '  • Linux/Mac: cron job';
  RAISE NOTICE '  • Windows: Task Scheduler';
  RAISE NOTICE '  • Or run manually when needed';
  RAISE NOTICE '';
END $$;

