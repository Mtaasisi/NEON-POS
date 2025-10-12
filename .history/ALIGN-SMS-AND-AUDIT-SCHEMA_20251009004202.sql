-- Align SMS and Audit schema with app usage
-- Safe, idempotent changes only

-- 1) sms_logs: add phone_number (app expects), keep recipient_phone for compatibility
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Backfill phone_number from recipient_phone when null/empty
UPDATE sms_logs
SET phone_number = COALESCE(NULLIF(phone_number, ''), recipient_phone)
WHERE (phone_number IS NULL OR phone_number = '') AND recipient_phone IS NOT NULL;

-- 2) sms_triggers: app uses (name, trigger_type, message_template, is_active, created_by)
-- Create missing columns and keep legacy ones for compatibility
ALTER TABLE sms_triggers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE sms_triggers ADD COLUMN IF NOT EXISTS trigger_type TEXT;
ALTER TABLE sms_triggers ADD COLUMN IF NOT EXISTS message_template UUID;
ALTER TABLE sms_triggers ADD COLUMN IF NOT EXISTS created_by UUID;

-- Backfill from legacy names where possible
UPDATE sms_triggers
SET name = COALESCE(name, trigger_name)
WHERE trigger_name IS NOT NULL;

UPDATE sms_triggers st
SET trigger_type = COALESCE(st.trigger_type, st.trigger_event)
WHERE st.trigger_type IS NULL AND st.trigger_event IS NOT NULL;

UPDATE sms_triggers st
SET message_template = COALESCE(st.message_template, st.template_id)
WHERE st.message_template IS NULL AND st.template_id IS NOT NULL;

-- 3) audit_logs: app inserts details (TEXT/JSON), entity_type, entity_id, user_role, timestamp
-- Add columns if missing; keep existing (table_name, record_id, old_data, new_data) intact
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_role TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ;

-- No destructive conversions; future app writes will populate these

-- 4) sms_logs: optional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON sms_logs(phone_number);

-- 5) sms_triggers: helpful index on trigger_type
CREATE INDEX IF NOT EXISTS idx_sms_triggers_type ON sms_triggers(trigger_type);


