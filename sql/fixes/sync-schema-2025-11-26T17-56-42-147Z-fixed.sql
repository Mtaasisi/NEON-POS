-- Schema sync from developer to production database (FIXED VERSION)
-- Generated: 2025-11-26T17:56:42.149Z
-- Missing items: 3 tables, 4 columns in 2 tables, 0 functions, 0 triggers, 3 views

BEGIN;

-- Add missing columns
ALTER TABLE lats_inventory_items ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE lats_inventory_items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE lats_inventory_items ADD COLUMN IF NOT EXISTS storage_room_id UUID;
ALTER TABLE lats_spare_parts ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;

-- Create backup_logs table
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  file_path TEXT,
  file_size BIGINT,
  record_count INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create indexes for backup_logs (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_backup_logs_created_at' AND tablename = 'backup_logs') THEN
    CREATE INDEX idx_backup_logs_created_at ON public.backup_logs USING btree (created_at);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_backup_logs_type' AND tablename = 'backup_logs') THEN
    CREATE INDEX idx_backup_logs_type ON public.backup_logs USING btree (backup_type);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_backup_logs_status' AND tablename = 'backup_logs') THEN
    CREATE INDEX idx_backup_logs_status ON public.backup_logs USING btree (status);
  END IF;
END $$;

-- Create lats_stock_transfers table
CREATE TABLE IF NOT EXISTS lats_stock_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  transfer_number TEXT,
  from_branch_id UUID,
  to_branch_id UUID,
  product_id UUID,
  variant_id UUID,
  quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  requested_by UUID,
  approved_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  PRIMARY KEY (id)
);

-- Add foreign key constraints for lats_stock_transfers (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lats_stock_transfers_from_branch_id_fkey') THEN
    ALTER TABLE lats_stock_transfers ADD CONSTRAINT lats_stock_transfers_from_branch_id_fkey 
      FOREIGN KEY (from_branch_id) REFERENCES lats_branches(id) ON UPDATE NO ACTION ON DELETE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lats_stock_transfers_to_branch_id_fkey') THEN
    ALTER TABLE lats_stock_transfers ADD CONSTRAINT lats_stock_transfers_to_branch_id_fkey 
      FOREIGN KEY (to_branch_id) REFERENCES lats_branches(id) ON UPDATE NO ACTION ON DELETE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lats_stock_transfers_product_id_fkey') THEN
    ALTER TABLE lats_stock_transfers ADD CONSTRAINT lats_stock_transfers_product_id_fkey 
      FOREIGN KEY (product_id) REFERENCES lats_products(id) ON UPDATE NO ACTION ON DELETE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lats_stock_transfers_variant_id_fkey') THEN
    ALTER TABLE lats_stock_transfers ADD CONSTRAINT lats_stock_transfers_variant_id_fkey 
      FOREIGN KEY (variant_id) REFERENCES lats_product_variants(id) ON UPDATE NO ACTION ON DELETE NO ACTION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lats_stock_transfers_transfer_number_key') THEN
    ALTER TABLE lats_stock_transfers ADD CONSTRAINT lats_stock_transfers_transfer_number_key UNIQUE (transfer_number);
  END IF;
END $$;

-- Create indexes for lats_stock_transfers (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lats_stock_transfers_from_branch' AND tablename = 'lats_stock_transfers') THEN
    CREATE INDEX idx_lats_stock_transfers_from_branch ON public.lats_stock_transfers USING btree (from_branch_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lats_stock_transfers_to_branch' AND tablename = 'lats_stock_transfers') THEN
    CREATE INDEX idx_lats_stock_transfers_to_branch ON public.lats_stock_transfers USING btree (to_branch_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lats_stock_transfers_status' AND tablename = 'lats_stock_transfers') THEN
    CREATE INDEX idx_lats_stock_transfers_status ON public.lats_stock_transfers USING btree (status);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lats_stock_transfers_product' AND tablename = 'lats_stock_transfers') THEN
    CREATE INDEX idx_lats_stock_transfers_product ON public.lats_stock_transfers USING btree (product_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lats_stock_transfers_variant' AND tablename = 'lats_stock_transfers') THEN
    CREATE INDEX idx_lats_stock_transfers_variant ON public.lats_stock_transfers USING btree (variant_id);
  END IF;
END $$;

-- Create loyalty_points table
CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  customer_id UUID,
  branch_id UUID,
  points NUMERIC NOT NULL DEFAULT 0,
  points_type TEXT NOT NULL,
  reason TEXT,
  reference_id UUID,
  reference_type TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (id)
);

-- Add foreign key constraint for loyalty_points (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loyalty_points_branch_id_fkey') THEN
    ALTER TABLE loyalty_points ADD CONSTRAINT loyalty_points_branch_id_fkey 
      FOREIGN KEY (branch_id) REFERENCES lats_branches(id) ON UPDATE NO ACTION ON DELETE NO ACTION;
  END IF;
END $$;

-- Create indexes for loyalty_points (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_loyalty_points_customer' AND tablename = 'loyalty_points') THEN
    CREATE INDEX idx_loyalty_points_customer ON public.loyalty_points USING btree (customer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_loyalty_points_branch' AND tablename = 'loyalty_points') THEN
    CREATE INDEX idx_loyalty_points_branch ON public.loyalty_points USING btree (branch_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_loyalty_points_type' AND tablename = 'loyalty_points') THEN
    CREATE INDEX idx_loyalty_points_type ON public.loyalty_points USING btree (points_type);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_loyalty_points_created_at' AND tablename = 'loyalty_points') THEN
    CREATE INDEX idx_loyalty_points_created_at ON public.loyalty_points USING btree (created_at);
  END IF;
END $$;

-- Create views
CREATE OR REPLACE VIEW installment_plans AS  
  SELECT id,
    plan_number,
    customer_id,
    sale_id,
    branch_id,
    total_amount,
    down_payment,
    amount_financed,
    total_paid,
    balance_due,
    installment_amount,
    number_of_installments,
    installments_paid,
    payment_frequency,
    start_date,
    next_payment_date,
    end_date,
    completion_date,
    status,
    late_fee_amount,
    late_fee_applied,
    days_overdue,
    last_reminder_sent,
    reminder_count,
    terms_accepted,
    terms_accepted_date,
    notes,
    created_by,
    created_at,
    updated_at
   FROM customer_installment_plans;

CREATE OR REPLACE VIEW lats_storage_rooms AS  
  SELECT id,
    name,
    description,
    location,
    capacity,
    is_active,
    created_at,
    updated_at,
    store_location_id,
    code,
    floor_level,
    area_sqm,
    max_capacity,
    current_capacity,
    is_secure,
    requires_access_card,
    color_code,
    notes
   FROM lats_store_rooms;

CREATE OR REPLACE VIEW special_orders AS  
  SELECT id,
    order_number,
    customer_id,
    branch_id,
    product_name,
    product_description,
    quantity,
    unit_price,
    total_amount,
    deposit_paid,
    balance_due,
    status,
    order_date,
    expected_arrival_date,
    actual_arrival_date,
    delivery_date,
    supplier_name,
    supplier_reference,
    country_of_origin,
    tracking_number,
    notes,
    internal_notes,
    customer_notified_arrival,
    created_by,
    created_at,
    updated_at
   FROM customer_special_orders;

COMMIT;

