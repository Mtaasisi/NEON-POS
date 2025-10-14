-- ============================================
-- 🔧 UPDATE EXPENSE CATEGORY ICONS
-- Replace emoji icons with icon identifiers
-- ============================================

-- Update expense categories to use icon names instead of emojis
UPDATE expense_categories SET icon = 'Building' WHERE name = 'Rent';
UPDATE expense_categories SET icon = 'Lightbulb' WHERE name = 'Utilities';
UPDATE expense_categories SET icon = 'User' WHERE name = 'Salaries';
UPDATE expense_categories SET icon = 'Package' WHERE name = 'Supplies';
UPDATE expense_categories SET icon = 'Home' WHERE name = 'Maintenance';
UPDATE expense_categories SET icon = 'FileText' WHERE name = 'Marketing';
UPDATE expense_categories SET icon = 'Truck' WHERE name = 'Transportation';
UPDATE expense_categories SET icon = 'Shield' WHERE name = 'Insurance';
UPDATE expense_categories SET icon = 'Receipt' WHERE name = 'Taxes';
UPDATE expense_categories SET icon = 'FileText' WHERE name = 'Other';

-- Show updated categories
SELECT 
  name,
  icon,
  description,
  is_active
FROM expense_categories
ORDER BY name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Expense category icons updated!';
  RAISE NOTICE '✅ Now using Lucide React icon names';
  RAISE NOTICE '';
  RAISE NOTICE 'Icon mapping:';
  RAISE NOTICE '  Rent → Building';
  RAISE NOTICE '  Utilities → Lightbulb';
  RAISE NOTICE '  Salaries → User';
  RAISE NOTICE '  Supplies → Package';
  RAISE NOTICE '  Maintenance → Home';
  RAISE NOTICE '  Marketing → FileText';
  RAISE NOTICE '  Transportation → Truck';
  RAISE NOTICE '  Insurance → Shield';
  RAISE NOTICE '  Taxes → Receipt';
  RAISE NOTICE '  Other → FileText';
  RAISE NOTICE '';
  RAISE NOTICE 'UI components will now render actual icons!';
  RAISE NOTICE '';
END $$;

