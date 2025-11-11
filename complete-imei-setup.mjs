#!/usr/bin/env node

/**
 * Complete IMEI Setup - Add Missing Components
 * This script adds the functions, triggers, and views that may be missing
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.VITE_DATABASE_URL || process.env.VITE_NEON_DATABASE_URL);

console.log('🔧 Completing IMEI Variant Setup\n');
console.log('═'.repeat(60));

async function executeSafe(name, sqlString) {
  try {
    await sql.unsafe(sqlString);
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`⚠️  ${name} (already exists)`);
      return true;
    } else {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
      return false;
    }
  }
}

console.log('\n📦 Adding missing components...\n');

// 1. Create IMEI index
await executeSafe('IMEI index on variant_attributes', `
  CREATE INDEX IF NOT EXISTS idx_variant_imei 
  ON lats_product_variants ((variant_attributes->>'imei'))
  WHERE variant_attributes->>'imei' IS NOT NULL
`);

// 2. Create GIN index for full variant_attributes
await executeSafe('GIN index on variant_attributes', `
  CREATE INDEX IF NOT EXISTS idx_variant_attributes_imei 
  ON lats_product_variants USING gin (variant_attributes)
`);

// 3. Create check_duplicate_imei function
await executeSafe('check_duplicate_imei() function', `
  CREATE OR REPLACE FUNCTION check_duplicate_imei()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.variant_attributes->>'imei' IS NOT NULL AND NEW.variant_attributes->>'imei' != '' THEN
      IF EXISTS (
        SELECT 1 
        FROM lats_product_variants 
        WHERE variant_attributes->>'imei' = NEW.variant_attributes->>'imei'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      ) THEN
        RAISE EXCEPTION 'Device with IMEI % already exists in inventory', NEW.variant_attributes->>'imei';
      END IF;
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql
`);

// 4. Create trigger
await executeSafe('enforce_unique_imei trigger', `
  DROP TRIGGER IF EXISTS enforce_unique_imei ON lats_product_variants;
  CREATE TRIGGER enforce_unique_imei
    BEFORE INSERT OR UPDATE ON lats_product_variants
    FOR EACH ROW
    EXECUTE FUNCTION check_duplicate_imei()
`);

// 5. Create get_variant_by_imei function
await executeSafe('get_variant_by_imei() function', `
  CREATE OR REPLACE FUNCTION get_variant_by_imei(search_imei TEXT)
  RETURNS TABLE (
    variant_id UUID,
    product_id UUID,
    product_name TEXT,
    variant_name TEXT,
    imei TEXT,
    serial_number TEXT,
    selling_price NUMERIC
  ) AS $$
  BEGIN
    RETURN QUERY
    SELECT 
      v.id as variant_id,
      v.product_id,
      p.name as product_name,
      v.variant_name,
      v.variant_attributes->>'imei' as imei,
      v.variant_attributes->>'serial_number' as serial_number,
      v.selling_price
    FROM lats_product_variants v
    JOIN lats_products p ON p.id = v.product_id
    WHERE v.variant_attributes->>'imei' = search_imei
    AND v.is_active = true;
  END;
  $$ LANGUAGE plpgsql
`);

// 6. Create decrement_variant_quantity function
await executeSafe('decrement_variant_quantity() function', `
  CREATE OR REPLACE FUNCTION decrement_variant_quantity(
    variant_id_param UUID,
    quantity_param INTEGER DEFAULT 1
  )
  RETURNS BOOLEAN AS $$
  DECLARE
    current_quantity INTEGER;
  BEGIN
    SELECT quantity INTO current_quantity
    FROM lats_product_variants
    WHERE id = variant_id_param;
    
    IF current_quantity < quantity_param THEN
      RAISE EXCEPTION 'Insufficient quantity. Available: %, Requested: %', current_quantity, quantity_param;
    END IF;
    
    UPDATE lats_product_variants
    SET 
      quantity = quantity - quantity_param,
      is_active = CASE 
        WHEN quantity - quantity_param <= 0 THEN false 
        ELSE is_active 
      END,
      updated_at = NOW()
    WHERE id = variant_id_param;
    
    UPDATE lats_products p
    SET 
      stock_quantity = stock_quantity - quantity_param,
      updated_at = NOW()
    WHERE id = (SELECT product_id FROM lats_product_variants WHERE id = variant_id_param);
    
    RETURN true;
  END;
  $$ LANGUAGE plpgsql
`);

// 7. Create available_imei_variants view
await executeSafe('available_imei_variants view', `
  CREATE OR REPLACE VIEW available_imei_variants AS
  SELECT 
    v.id as variant_id,
    v.product_id,
    p.name as product_name,
    p.sku as product_sku,
    v.variant_name,
    v.sku as variant_sku,
    v.variant_attributes->>'imei' as imei,
    v.variant_attributes->>'serial_number' as serial_number,
    v.variant_attributes->>'mac_address' as mac_address,
    v.variant_attributes->>'condition' as condition,
    v.variant_attributes->>'source' as source,
    v.cost_price,
    v.selling_price,
    v.quantity,
    v.is_active,
    v.branch_id,
    v.created_at,
    v.updated_at
  FROM lats_product_variants v
  JOIN lats_products p ON p.id = v.product_id
  WHERE 
    v.variant_attributes->>'imei' IS NOT NULL 
    AND v.variant_attributes->>'imei' != ''
    AND v.quantity > 0
    AND v.is_active = true
  ORDER BY v.created_at DESC
`);

// 8. Grant permissions
await executeSafe('Permissions granted', `
  GRANT SELECT ON available_imei_variants TO authenticated
`);

console.log('\n' + '═'.repeat(60));
console.log('\n✅ Setup completed!\n');

// Run verification
console.log('📊 Running verification...\n');

const checks = [
  { name: 'IMEI index', query: `SELECT indexname FROM pg_indexes WHERE indexname = 'idx_variant_imei'` },
  { name: 'check_duplicate_imei function', query: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'check_duplicate_imei'` },
  { name: 'enforce_unique_imei trigger', query: `SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'enforce_unique_imei'` },
  { name: 'get_variant_by_imei function', query: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'get_variant_by_imei'` },
  { name: 'decrement_variant_quantity function', query: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'decrement_variant_quantity'` },
  { name: 'available_imei_variants view', query: `SELECT table_name FROM information_schema.views WHERE table_name = 'available_imei_variants'` },
];

let allPass = true;
for (const check of checks) {
  try {
    const result = await sql.unsafe(check.query);
    if (result.length > 0) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`❌ ${check.name}`);
      allPass = false;
    }
  } catch (error) {
    console.log(`❌ ${check.name}: ${error.message}`);
    allPass = false;
  }
}

console.log('\n' + '═'.repeat(60));

if (allPass) {
  console.log('\n✅ All components verified! System is ready.\n');
  console.log('Next steps:');
  console.log('1. ✅ Database is fully configured');
  console.log('2. ✅ Start receiving POs with IMEI numbers');
  console.log('3. ✅ IMEI variants will be created automatically');
  console.log('4. ✅ POS will detect and use IMEI variants');
  console.log('5. ⚠️  Optional: Migrate old data');
  console.log('   → node migrate-inventory-items-to-imei-variants.mjs\n');
} else {
  console.log('\n⚠️  Some components are missing. Please check errors above.\n');
}

process.exit(allPass ? 0 : 1);

