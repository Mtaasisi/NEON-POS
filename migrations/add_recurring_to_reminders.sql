-- ============================================
-- ADD RECURRING COLUMN TO REMINDERS TABLE
-- Date: October 18, 2025
-- ============================================

-- Add recurring column to support recurring reminders
ALTER TABLE reminders 
ADD COLUMN IF NOT EXISTS recurring JSONB;

-- Add comment for documentation
COMMENT ON COLUMN reminders.recurring IS 'JSON object: {enabled: boolean, type: daily|weekly|monthly, interval: number, endDate?: string}';

-- Create index for recurring reminders
CREATE INDEX IF NOT EXISTS idx_reminders_recurring ON reminders((recurring->>'enabled'));

SELECT '✅ Recurring column added to reminders table successfully!' as status;

