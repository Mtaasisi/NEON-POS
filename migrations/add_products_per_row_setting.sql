-- Migration: Add products_per_row column to lats_pos_general_settings table
-- Created: 2025-10-27
-- Description: Adds a new setting to control the number of products displayed per row in the POS grid

-- Add products_per_row column with default value of 4
ALTER TABLE lats_pos_general_settings
ADD COLUMN IF NOT EXISTS products_per_row INTEGER DEFAULT 4;

-- Add a check constraint to ensure the value is reasonable (between 2 and 12)
ALTER TABLE lats_pos_general_settings
ADD CONSTRAINT lats_pos_general_settings_products_per_row_check 
CHECK (products_per_row >= 2 AND products_per_row <= 12);

-- Add a comment to document the column
COMMENT ON COLUMN lats_pos_general_settings.products_per_row IS 'Number of products to display per row in the POS grid (2-12)';

-- Update any existing records to have the default value
UPDATE lats_pos_general_settings
SET products_per_row = 4
WHERE products_per_row IS NULL;

