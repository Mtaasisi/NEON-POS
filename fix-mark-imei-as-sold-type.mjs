#!/usr/bin/env node
/**
 * Fix mark_imei_as_sold function to include 'type' column
 */

import { Pool } from 'pg';

const dbUrl = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

const fixSQL = `
CREATE OR REPLACE FUNCTION public.mark_imei_as_sold(child_variant_id_param uuid, sale_id_param uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_variant_id UUID;
  v_parent_id UUID;
BEGIN
  -- Find the variant by ID
  SELECT id, parent_variant_id INTO v_variant_id, v_parent_id
  FROM lats_product_variants
  WHERE id = child_variant_id_param
    AND variant_type = 'imei_child'
    AND is_active = TRUE
    AND quantity > 0
  LIMIT 1;

  IF v_variant_id IS NULL THEN
    -- Try to find if it exists but is already sold or inactive
    SELECT id INTO v_variant_id
    FROM lats_product_variants
    WHERE id = child_variant_id_param
      AND variant_type = 'imei_child'
    LIMIT 1;
    
    IF v_variant_id IS NULL THEN
      RAISE EXCEPTION 'IMEI child variant % not found', child_variant_id_param;
    ELSE
      RAISE EXCEPTION 'IMEI child variant % is already sold or inactive', child_variant_id_param;
    END IF;
  END IF;

  -- Mark as sold and set quantity to 0
  UPDATE lats_product_variants
  SET 
    quantity = 0,
    is_active = FALSE,
    variant_attributes = jsonb_set(
      jsonb_set(
        COALESCE(variant_attributes, '{}'::jsonb),
        '{sold_at}',
        to_jsonb(NOW())
      ),
      '{sale_id}',
      CASE 
        WHEN sale_id_param IS NOT NULL THEN to_jsonb(sale_id_param::TEXT)
        ELSE 'null'::jsonb
      END
    ),
    updated_at = NOW()
  WHERE id = v_variant_id;

  -- Create stock movement (FIXED: Added 'type' column which is NOT NULL)
  INSERT INTO lats_stock_movements (
    product_id,
    variant_id,
    type,
    movement_type,
    quantity,
    previous_quantity,
    new_quantity,
    reason,
    reference_type,
    reference_id,
    notes,
    created_at
  )
  SELECT 
    product_id,
    v_variant_id,
    'sale',  -- ✅ FIX: Set 'type' column (NOT NULL)
    'sale',  -- Also set movement_type for compatibility
    -1,
    1,  -- Previous quantity (was 1 before sale)
    0,  -- New quantity (0 after sale)
    'IMEI child variant sold',
    'pos_sale',
    sale_id_param,
    'IMEI child variant ' || v_variant_id || ' sold' || COALESCE(' - Sale: ' || sale_id_param::TEXT, ''),
    NOW()
  FROM lats_product_variants
  WHERE id = v_variant_id;

  -- Parent stock will be updated automatically by trigger
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error marking IMEI as sold: %', SQLERRM;
    RAISE;
END;
$$;
`;

async function applyFix() {
  let client;
  try {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  🔧 FIXING mark_imei_as_sold FUNCTION                 ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    client = await pool.connect();
    console.log('1️⃣ Applying fix...');
    
    await client.query(fixSQL);
    console.log('   ✅ Function updated successfully!\n');

    console.log('✅ Fix complete!');
    console.log('   The function now sets the required "type" column.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

applyFix().catch(console.error);

