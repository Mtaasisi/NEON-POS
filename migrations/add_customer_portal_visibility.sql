-- ================================================
-- ADD CUSTOMER PORTAL VISIBILITY TO PRODUCTS
-- ================================================
-- Adds a column to control which products are visible in the customer portal
-- ================================================

-- Add is_customer_portal_visible column to lats_products table
ALTER TABLE lats_products
ADD COLUMN IF NOT EXISTS is_customer_portal_visible BOOLEAN DEFAULT true;

-- Add comment to the column for documentation
COMMENT ON COLUMN lats_products.is_customer_portal_visible IS 'Controls whether this product is visible in the customer portal. True = visible, False = hidden';

-- Create an index for better query performance when filtering by customer portal visibility
CREATE INDEX IF NOT EXISTS idx_lats_products_customer_portal_visible
ON lats_products(is_customer_portal_visible, is_active)
WHERE is_active = true;

-- Update existing products to be visible by default (backwards compatibility)
UPDATE lats_products
SET is_customer_portal_visible = true
WHERE is_customer_portal_visible IS NULL;