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

-- 12) Compatibility views for legacy vs new columns (drop/create for idempotence)
DROP VIEW IF EXISTS v_sms_logs;
CREATE VIEW v_sms_logs AS
SELECT 
  id,
  COALESCE(phone_number, recipient_phone) AS phone,
  message,
  status,
  provider,
  message_id,
  cost,
  sent_at,
  created_at,
  device_id,
  sent_by
FROM sms_logs;

DROP VIEW IF EXISTS v_sms_triggers;
CREATE VIEW v_sms_triggers AS
SELECT 
  id,
  COALESCE(name, trigger_name) AS name,
  COALESCE(trigger_type, trigger_event) AS status,
  COALESCE(message_template, template_id) AS template_id,
  is_active,
  created_by,
  created_at,
  updated_at
FROM sms_triggers;

-- 13) Seed default SMS triggers (idempotent)
INSERT INTO sms_triggers (name, trigger_type, message_template, is_active)
SELECT t.name, t.trigger_type, t.message_template, true
FROM (
  VALUES
    ('Assigned', 'assigned', NULL::uuid),
    ('Diagnosis Started', 'diagnosis-started', NULL::uuid),
    ('In Repair', 'in-repair', NULL::uuid),
    ('Testing', 'reassembled-testing', NULL::uuid),
    ('Repair Complete', 'repair-complete', NULL::uuid),
    ('Back to CC', 'returned-to-customer-care', NULL::uuid),
    ('Done', 'done', NULL::uuid)
) AS t(name, trigger_type, message_template)
WHERE NOT EXISTS (
  SELECT 1 FROM sms_triggers s WHERE COALESCE(s.trigger_type, s.trigger_event) = t.trigger_type
);

-- 14) CHECK constraint for devices.status (not validating existing rows)
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_status_check;
ALTER TABLE devices
  ADD CONSTRAINT devices_status_check
  CHECK (status IN (
    'assigned','diagnosis-started','awaiting-parts','parts-arrived','in-repair',
    'reassembled-testing','repair-complete','process-payments','returned-to-customer-care','done','failed'
  )) NOT VALID;

-- 15) repair_parts alignment
CREATE TABLE IF NOT EXISTS repair_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  spare_part_id UUID,
  quantity_needed INTEGER DEFAULT 1,
  quantity_received INTEGER DEFAULT 0,
  cost_per_unit NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'needed',
  notes TEXT,
  estimated_arrival TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow UI statuses alongside legacy 'needed'
ALTER TABLE repair_parts ADD COLUMN IF NOT EXISTS status TEXT;
-- Keep total_cost in sync on write
CREATE OR REPLACE FUNCTION set_repair_part_total_cost()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_cost := COALESCE(NEW.quantity_needed,0) * COALESCE(NEW.cost_per_unit,0);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_repair_parts_total_cost ON repair_parts;
CREATE TRIGGER trg_repair_parts_total_cost
BEFORE INSERT OR UPDATE ON repair_parts
FOR EACH ROW EXECUTE FUNCTION set_repair_part_total_cost();

CREATE INDEX IF NOT EXISTS idx_repair_parts_device ON repair_parts(device_id);
CREATE INDEX IF NOT EXISTS idx_repair_parts_status ON repair_parts(status);

-- 16) lats_spare_part_usage table for stock movements
CREATE TABLE IF NOT EXISTS lats_spare_part_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spare_part_id UUID,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  reason TEXT,
  notes TEXT,
  used_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spare_part_usage_part ON lats_spare_part_usage(spare_part_id);
CREATE INDEX IF NOT EXISTS idx_spare_part_usage_device ON lats_spare_part_usage(device_id);

-- 17) Minimal lats_spare_parts table to support repair flow (no FKs)
CREATE TABLE IF NOT EXISTS lats_spare_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  part_number TEXT,
  quantity INTEGER DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  category_id UUID,
  brand TEXT,
  description TEXT,
  condition TEXT,
  location TEXT,
  min_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lats_spare_parts_name ON lats_spare_parts(name);

-- 18) Ensure customer_payments has fields used by UI
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS payment_account_id UUID;
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS payment_method_id UUID;
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_customer_payments_device ON customer_payments(device_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer ON customer_payments(customer_id);

-- 19) Selling workflow alignment
-- lats_sales core columns and constraint
CREATE TABLE IF NOT EXISTS lats_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number TEXT UNIQUE,
  customer_id UUID,
  total_amount NUMERIC NOT NULL,
  payment_method JSONB,
  status TEXT DEFAULT 'completed',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- optional fields commonly used
  subtotal NUMERIC,
  discount_amount NUMERIC,
  discount_type TEXT,
  discount_value NUMERIC,
  customer_name TEXT,
  customer_phone TEXT,
  tax NUMERIC,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_lats_sales_created_at ON lats_sales(created_at DESC);

-- lats_sale_items
CREATE TABLE IF NOT EXISTS lats_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES lats_sales(id) ON DELETE CASCADE,
  product_id UUID,
  variant_id UUID,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure required columns exist if table already existed
ALTER TABLE lats_sale_items ADD COLUMN IF NOT EXISTS variant_id UUID;
ALTER TABLE lats_sale_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;
ALTER TABLE lats_sale_items ADD COLUMN IF NOT EXISTS total_price NUMERIC DEFAULT 0;
ALTER TABLE lats_sale_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
ALTER TABLE lats_sale_items ADD COLUMN IF NOT EXISTS profit NUMERIC DEFAULT 0;
ALTER TABLE lats_sale_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_lats_sale_items_sale ON lats_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_lats_sale_items_variant ON lats_sale_items(variant_id);

-- stock movements table for non-serialized items
CREATE TABLE IF NOT EXISTS lats_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID,
  variant_id UUID,
  type TEXT, -- 'in' | 'out'
  quantity NUMERIC,
  previous_quantity NUMERIC,
  new_quantity NUMERIC,
  reason TEXT,
  reference TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON lats_stock_movements(variant_id);

-- serialized sales linking
CREATE TABLE IF NOT EXISTS sale_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES lats_sales(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  customer_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_inventory_items_sale ON sale_inventory_items(sale_id);

-- serial number movements (audit)
CREATE TABLE IF NOT EXISTS serial_number_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID,
  movement_type TEXT,
  from_status TEXT,
  to_status TEXT,
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_serial_movements_item ON serial_number_movements(inventory_item_id);

