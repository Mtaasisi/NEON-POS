-- Complete the pricing for all items received from our test PO
DO $$
DECLARE
  v_product_id UUID;
  v_cost_price DECIMAL := 100;
  v_selling_price DECIMAL := 104;
BEGIN
  -- Get the product ID for 'sada'
  SELECT id INTO v_product_id 
  FROM lats_products 
  WHERE name = 'sada' 
  LIMIT 1;
  
  RAISE NOTICE 'Product ID: %', v_product_id;
  
  -- Update all inventory items with IMEI 987654321098765
  UPDATE inventory_items
  SET 
    cost_price = v_cost_price,
    selling_price = v_selling_price,
    status = 'available',
    updated_at = NOW()
  WHERE imei = '987654321098765';
  
  RAISE NOTICE 'Updated inventory items with IMEI 987654321098765';
  
  -- Also update any items in pending_pricing status for this product
  UPDATE inventory_items
  SET 
    status = 'available',
    updated_at = NOW()
  WHERE product_id = v_product_id
    AND status = 'pending_pricing'
    AND selling_price IS NOT NULL
    AND selling_price > 0;
  
  RAISE NOTICE 'Updated pending_pricing items for product %', v_product_id;
  
END $$;

-- Show the results
SELECT 
  id,
  product_id,
  imei,
  cost_price,
  selling_price,
  status,
  created_at
FROM inventory_items
WHERE imei = '987654321098765'
ORDER BY created_at DESC
LIMIT 5;

