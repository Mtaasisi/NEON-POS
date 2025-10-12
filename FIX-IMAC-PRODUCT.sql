-- Fix 1: Out of stock variant: Default
UPDATE lats_product_variants SET quantity = 43 WHERE id = 'f727cd61-0bcd-4efc-98d5-7208ffa4fa50';
