-- Migration: Add products_per_row column to lats_pos_general_settings
-- Date: 2025-10-27
-- Description: Adds the missing products_per_row column that is used in the UI but missing from the database schema

-- Add products_per_row column if it doesn't exist
ALTER TABLE public.lats_pos_general_settings 
ADD COLUMN IF NOT EXISTS products_per_row integer DEFAULT 4;

-- Add comment for documentation
COMMENT ON COLUMN public.lats_pos_general_settings.products_per_row IS 'Number of products to display per row in the POS grid';

