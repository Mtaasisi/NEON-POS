-- Add unique constraint to prevent duplicate deliveries for the same sale
-- This ensures one delivery per sale

ALTER TABLE lats_delivery_orders
ADD CONSTRAINT lats_delivery_orders_sale_id_unique
UNIQUE (sale_id);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT lats_delivery_orders_sale_id_unique ON lats_delivery_orders
IS 'Ensures only one delivery can exist per sale to prevent duplicates';