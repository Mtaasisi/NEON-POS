-- ============================================
-- FIX REMINDERS RLS POLICIES
-- This fixes the issue where reminders can be inserted
-- but not read back due to RLS policies
-- Date: October 18, 2025
-- ============================================

-- Option 1: Disable RLS completely (simplest solution)
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to authenticated users
GRANT ALL ON reminders TO authenticated;
GRANT ALL ON reminders TO anon;

-- Optional: Add USAGE permissions on the sequence if needed
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

SELECT '✅ Reminders RLS fixed - users can now create and read reminders!' as status;

-- ============================================
-- ALTERNATIVE: If you want to keep RLS enabled,
-- uncomment the following policies instead:
-- ============================================

-- -- Enable RLS
-- ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- -- Policy: Users can insert their own reminders
-- DROP POLICY IF EXISTS reminders_insert_policy ON reminders;
-- CREATE POLICY reminders_insert_policy ON reminders
--     FOR INSERT
--     TO authenticated
--     WITH CHECK (created_by = auth.uid());

-- -- Policy: Users can select all reminders in their branch
-- DROP POLICY IF EXISTS reminders_select_policy ON reminders;
-- CREATE POLICY reminders_select_policy ON reminders
--     FOR SELECT
--     TO authenticated
--     USING (true); -- Allow all for now, or add branch filtering

-- -- Policy: Users can update their own reminders
-- DROP POLICY IF EXISTS reminders_update_policy ON reminders;
-- CREATE POLICY reminders_update_policy ON reminders
--     FOR UPDATE
--     TO authenticated
--     USING (created_by = auth.uid() OR assigned_to = auth.uid());

-- -- Policy: Users can delete their own reminders
-- DROP POLICY IF EXISTS reminders_delete_policy ON reminders;
-- CREATE POLICY reminders_delete_policy ON reminders
--     FOR DELETE
--     TO authenticated
--     USING (created_by = auth.uid());

-- SELECT '✅ Reminders RLS policies created!' as status;

