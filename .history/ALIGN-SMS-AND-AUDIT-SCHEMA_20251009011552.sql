-- Align SMS and Audit schema with app usage
-- Safe, idempotent changes only

-- Ensure pgcrypto for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure communication_templates exists (minimal) to avoid FKs breaking elsewhere
CREATE TABLE IF NOT EXISTS communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT,
  template_type TEXT,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure sms_logs table exists with baseline columns
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT,
  recipient_phone TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  provider TEXT,
  message_id TEXT,
  cost NUMERIC,
  sent_by UUID,
  device_id UUID,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1) sms_logs: add phone_number (app expects), keep recipient_phone for compatibility
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS recipient_phone TEXT;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS sent_by UUID;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS device_id UUID;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS cost NUMERIC;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill phone_number from recipient_phone when null/empty
UPDATE sms_logs
SET phone_number = COALESCE(NULLIF(phone_number, ''), recipient_phone)
WHERE (phone_number IS NULL OR phone_number = '') AND recipient_phone IS NOT NULL;

-- Ensure sms_triggers table exists
CREATE TABLE IF NOT EXISTS sms_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  trigger_type TEXT,
  message_template UUID,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- legacy fields for compatibility if present in existing DB
  trigger_name TEXT,
  trigger_event TEXT,
  template_id UUID
);

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
-- Ensure audit_logs exists (minimal) so ALTERs won't fail
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Add columns if missing; keep existing (table_name, record_id, old_data, new_data) intact
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_role TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ;

-- No destructive conversions; future app writes will populate these

-- 3b) Create sms_trigger_logs table if missing (used by reports UI)
CREATE TABLE IF NOT EXISTS sms_trigger_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id UUID REFERENCES sms_triggers(id) ON DELETE SET NULL,
  recipient TEXT,
  result TEXT,
  status TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3c) Create customer_communications table if missing (used when sending manual SMS)
CREATE TABLE IF NOT EXISTS customer_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT, -- 'sms', 'email', 'whatsapp', etc.
  message TEXT,
  status TEXT,
  phone_number TEXT,
  sent_by UUID,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4) sms_logs: optional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON sms_logs(phone_number);

-- 5) sms_triggers: helpful index on trigger_type
CREATE INDEX IF NOT EXISTS idx_sms_triggers_type ON sms_triggers(trigger_type);

-- 6) scheduled_sms: used by scheduling API/UI
CREATE TABLE IF NOT EXISTS scheduled_sms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipients JSONB, -- array of phone numbers
  message TEXT NOT NULL,
  template_id UUID,
  variables JSONB,
  ai_enhanced BOOLEAN DEFAULT false,
  personalization_data JSONB,
  scheduled_for TIMESTAMPTZ,
  created_by UUID,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_sms_scheduled_for ON scheduled_sms(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_sms_created_by ON scheduled_sms(created_by);

-- 7) device_status_updates: history of quick status updates
CREATE TABLE IF NOT EXISTS device_status_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  status TEXT,
  message TEXT,
  sent_by TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_status_updates_device_id ON device_status_updates(device_id);

-- 8) diagnostic_checklist_results: ensure all expected columns exist
CREATE TABLE IF NOT EXISTS diagnostic_checklist_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  problem_template_id UUID,
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE diagnostic_checklist_results ADD COLUMN IF NOT EXISTS overall_status TEXT;
ALTER TABLE diagnostic_checklist_results ADD COLUMN IF NOT EXISTS technician_notes TEXT;
ALTER TABLE diagnostic_checklist_results ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 9) devices: store latest diagnostic checklist summary
ALTER TABLE devices ADD COLUMN IF NOT EXISTS diagnostic_checklist JSONB;

-- 10) device_transitions: ensure performed_by exists; create table if missing
CREATE TABLE IF NOT EXISTS device_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  signature TEXT
);

ALTER TABLE device_transitions ADD COLUMN IF NOT EXISTS performed_by UUID;
ALTER TABLE device_transitions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE device_transitions ADD COLUMN IF NOT EXISTS signature TEXT;

CREATE INDEX IF NOT EXISTS idx_device_transitions_device_id ON device_transitions(device_id);
CREATE INDEX IF NOT EXISTS idx_device_transitions_created_at ON device_transitions(created_at DESC);

-- 11) device_notifications: used by deviceServices.updateDevice
CREATE TABLE IF NOT EXISTS device_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  type TEXT,
  title TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_notifications_device_id ON device_notifications(device_id);


