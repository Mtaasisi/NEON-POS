-- ============================================================================
-- EXPORT IMEI DEVICES TO CSV
-- ============================================================================
-- This script exports all IMEI-tracked devices to a CSV file
-- Usage: psql "your-connection-string" -f export-imei-to-csv.sql
-- Output: imei-devices-export-[date].csv
-- ============================================================================

-- Set output format to CSV
\pset format csv

-- Set output file
\o imei-devices-export.csv

-- Export query with all device details
SELECT 
  child.id as "Device ID",
  p.name as "Product",
  parent.name as "Parent Variant",
  child.variant_attributes->>'imei' as "IMEI",
  child.variant_attributes->>'serial_number' as "Serial Number",
  child.variant_attributes->>'mac_address' as "MAC Address",
  child.variant_attributes->>'condition' as "Condition",
  child.cost_price as "Cost Price",
  child.selling_price as "Selling Price",
  child.quantity as "Quantity",
  CASE 
    WHEN child.is_active = TRUE AND child.quantity > 0 THEN 'Available'
    WHEN child.is_active = FALSE THEN 'Sold'
    ELSE 'Unavailable'
  END as "Status",
  child.is_active as "Is Active",
  child.created_at as "Created Date",
  child.updated_at as "Last Updated",
  child.variant_attributes->>'notes' as "Notes",
  parent.id as "Parent Variant ID",
  p.id as "Product ID",
  child.sku as "SKU"
FROM lats_product_variants child
LEFT JOIN lats_product_variants parent ON parent.id = child.parent_variant_id
LEFT JOIN lats_products p ON p.id = child.product_id
WHERE child.variant_type = 'imei_child'
ORDER BY child.created_at DESC;

-- Reset output
\o

-- Reset format
\pset format aligned

\echo 'CSV export completed: imei-devices-export.csv'

