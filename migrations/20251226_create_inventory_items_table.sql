-- Migration: create inventory_items table
-- Purpose: Create legacy `inventory_items` table referenced by application code and other migrations.
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_id uuid,
  variant_id uuid,
  serial_number text,
  status text DEFAULT 'available' NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  branch_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_items_pkey PRIMARY KEY (id)
);

-- Indexes to speed lookups used by app (search by serial, variant, product, branch and metadata queries)
CREATE INDEX IF NOT EXISTS idx_inventory_items_serial_number ON public.inventory_items (serial_number);
CREATE INDEX IF NOT EXISTS idx_inventory_items_variant_id ON public.inventory_items (variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_product_id ON public.inventory_items (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_branch_id ON public.inventory_items (branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_metadata_gin ON public.inventory_items USING gin (metadata);

-- NOTE:
-- 1) This migration intentionally avoids strong FK constraints to preserve compatibility with legacy data and
--    to ensure applying the migration won't fail if referenced tables are not yet present.
-- 2) Run the separate RLS/permissions fix migration `migrations/fix_inventory_items_rls_for_pos.sql` after applying this.

