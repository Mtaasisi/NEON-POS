#!/usr/bin/env node

/**
 * Quick Fix: Apply add_imei_to_parent_variant Function
 */

import { neon } from '@neondatabase/serverless';

// Database URL
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log('🔧 Quick Fix: Adding IMEI Function to Database...\n');

const sql = neon(DATABASE_URL);

async function quickFix() {
  try {
    // First, add required columns if they don't exist
    console.log('1️⃣ Ensuring required columns exist...');
    
    await sql`
      ALTER TABLE lats_product_variants 
      ADD COLUMN IF NOT EXISTS parent_variant_id UUID REFERENCES lats_product_variants(id) ON DELETE CASCADE
    `;
    
    await sql`
      ALTER TABLE lats_product_variants 
      ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT FALSE
    `;
    
    await sql`
      ALTER TABLE lats_product_variants 
      ADD COLUMN IF NOT EXISTS variant_type VARCHAR(20) DEFAULT 'standard'
    `;
    
    console.log('✅ Columns ready\n');
    
    // Create the main function
    console.log('2️⃣ Creating add_imei_to_parent_variant function...');
    
    await sql`
      CREATE OR REPLACE FUNCTION add_imei_to_parent_variant(
        parent_variant_id_param UUID,
        imei_param TEXT,
        serial_number_param TEXT DEFAULT NULL,
        mac_address_param TEXT DEFAULT NULL,
        cost_price_param NUMERIC DEFAULT 0,
        selling_price_param NUMERIC DEFAULT 0,
        condition_param TEXT DEFAULT 'new',
        branch_id_param UUID DEFAULT NULL,
        notes_param TEXT DEFAULT NULL
      )
      RETURNS TABLE (
        success BOOLEAN,
        child_variant_id UUID,
        error_message TEXT
      ) AS $$
      DECLARE
        v_parent_variant RECORD;
        v_product_id UUID;
        v_new_sku TEXT;
        v_child_id UUID;
        v_timestamp TEXT;
      BEGIN
        -- Get parent variant info
        SELECT * INTO v_parent_variant
        FROM lats_product_variants
        WHERE id = parent_variant_id_param;
        
        IF NOT FOUND THEN
          RETURN QUERY SELECT FALSE, NULL::UUID, 'Parent variant not found';
          RETURN;
        END IF;
        
        -- Check for duplicate IMEI
        IF EXISTS (
          SELECT 1 FROM lats_product_variants
          WHERE variant_attributes->>'imei' = imei_param
        ) THEN
          RETURN QUERY SELECT FALSE, NULL::UUID, 'Device with IMEI ' || imei_param || ' already exists in inventory';
          RETURN;
        END IF;
        
        -- Get product ID
        v_product_id := v_parent_variant.product_id;
        
        -- Generate unique SKU for child IMEI variant
        v_timestamp := EXTRACT(EPOCH FROM NOW())::TEXT;
        v_new_sku := COALESCE(v_parent_variant.sku, 'VAR') || '-IMEI-' || SUBSTRING(imei_param, 1, 8) || '-' || SUBSTRING(v_timestamp, 1, 10);
        
        -- Mark parent as parent type if not already
        UPDATE lats_product_variants
        SET 
          is_parent = TRUE,
          variant_type = 'parent',
          updated_at = NOW()
        WHERE id = parent_variant_id_param
          AND variant_type != 'parent';
        
        -- Create child IMEI variant
        INSERT INTO lats_product_variants (
          product_id,
          parent_variant_id,
          name,
          variant_name,
          sku,
          cost_price,
          selling_price,
          quantity,
          is_active,
          is_parent,
          variant_type,
          variant_attributes,
          branch_id
        ) VALUES (
          v_product_id,
          parent_variant_id_param,
          'IMEI: ' || imei_param,
          'IMEI: ' || imei_param,
          v_new_sku,
          COALESCE(cost_price_param, v_parent_variant.cost_price),
          COALESCE(selling_price_param, v_parent_variant.selling_price),
          1,
          TRUE,
          FALSE,
          'imei_child',
          jsonb_build_object(
            'imei', imei_param,
            'serial_number', serial_number_param,
            'mac_address', mac_address_param,
            'condition', condition_param,
            'notes', notes_param,
            'source', 'purchase',
            'created_at', NOW()
          ),
          COALESCE(branch_id_param, v_parent_variant.branch_id)
        )
        RETURNING id INTO v_child_id;
        
        -- Create stock movement record
        INSERT INTO lats_stock_movements (
          product_id,
          variant_id,
          branch_id,
          movement_type,
          quantity,
          reference_type,
          notes,
          created_at
        ) VALUES (
          v_product_id,
          v_child_id,
          COALESCE(branch_id_param, v_parent_variant.branch_id),
          'purchase',
          1,
          'imei_receive',
          'Received IMEI ' || imei_param || ' for variant ' || COALESCE(v_parent_variant.variant_name, v_parent_variant.name),
          NOW()
        );
        
        RETURN QUERY SELECT TRUE, v_child_id, NULL::TEXT;
      END;
      $$ LANGUAGE plpgsql
    `;
    
    console.log('✅ Function created!\n');
    
    // Verify
    console.log('3️⃣ Verifying installation...');
    
    const check = await sql`
      SELECT 
        p.proname as function_name,
        pg_get_function_arguments(p.oid) as arguments
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'add_imei_to_parent_variant'
    `;
    
    if (check.length > 0) {
      console.log('✅ Function verified!');
      console.log(`   Name: ${check[0].function_name}`);
      console.log(`   Arguments: ${check[0].arguments}\n`);
      
      console.log('🎉 SUCCESS! The IMEI function is now available!\n');
      console.log('📋 What to do next:');
      console.log('   1. Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)');
      console.log('   2. Try receiving the Purchase Order again');
      console.log('   3. The IMEI serial numbers should now be saved properly\n');
      
      return true;
    } else {
      console.log('⚠️  Function not found');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
    return false;
  }
}

quickFix()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

