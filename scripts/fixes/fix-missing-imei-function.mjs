#!/usr/bin/env node

/**
 * Quick Fix: Create the missing add_imei_to_parent_variant function
 * This resolves the 400 error when receiving Purchase Orders with IMEI tracking
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check for database URL in multiple possible env vars
const DATABASE_URL = 
  process.env.DATABASE_URL || 
  process.env.VITE_DATABASE_URL || 
  process.env.NEON_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Database URL not found in environment variables');
  console.error('💡 Checked for: DATABASE_URL, VITE_DATABASE_URL, NEON_DATABASE_URL');
  console.error('');
  console.error('📝 Please set one of these in your .env file:');
  console.error('   DATABASE_URL="postgresql://..."');
  console.error('   or');
  console.error('   VITE_DATABASE_URL="postgresql://..."');
  console.error('');
  console.error('🔍 Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('NEON')).join(', ') || 'none');
  process.exit(1);
}

console.log('🔧 Fixing missing IMEI function...\n');

const sql = neon(DATABASE_URL);

async function createFunction() {
  try {
    console.log('📝 Creating add_imei_to_parent_variant function...\n');
    
    // Create the function
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
          1, -- Each IMEI is quantity 1
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
      $$ LANGUAGE plpgsql;
    `;
    
    console.log('✅ Function created successfully!\n');
    
    // Verify the function exists
    console.log('🔍 Verifying installation...\n');
    
    const functionCheck = await sql`
      SELECT 
        p.proname as function_name,
        pg_get_function_arguments(p.oid) as arguments
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'add_imei_to_parent_variant'
    `;
    
    if (functionCheck.length > 0) {
      console.log('✅ Function verified and ready to use!');
      console.log(`   Name: ${functionCheck[0].function_name}`);
      console.log(`   Parameters: ${functionCheck[0].arguments}\n`);
      
      console.log('🎉 Fix complete!\n');
      console.log('💡 What this fixes:');
      console.log('   ✓ Receiving Purchase Orders with IMEI tracking');
      console.log('   ✓ Adding individual devices to parent variants');
      console.log('   ✓ Creating child IMEI variants automatically');
      console.log('   ✓ Tracking stock movements for each device\n');
      
      console.log('📝 Next steps:');
      console.log('   1. Refresh your browser page (clear cache if needed)');
      console.log('   2. Try receiving your Purchase Order again');
      console.log('   3. The IMEI devices should now be added successfully\n');
      
      return true;
    } else {
      console.log('⚠️  Function not found after creation');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error creating function:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    // Check if columns exist
    console.log('\n🔍 Checking database schema...');
    try {
      const schemaCheck = await sql`
        SELECT 
          column_name,
          data_type
        FROM information_schema.columns
        WHERE table_name = 'lats_product_variants'
          AND column_name IN ('parent_variant_id', 'is_parent', 'variant_type')
        ORDER BY column_name
      `;
      
      if (schemaCheck.length < 3) {
        console.log('\n⚠️  Missing required columns in lats_product_variants table');
        console.log('📋 Found columns:', schemaCheck.map(c => c.column_name).join(', '));
        console.log('\n💡 You need to run the full migration first:');
        console.log('   node apply-parent-child-variant-functions.mjs\n');
      } else {
        console.log('✅ All required columns exist');
      }
    } catch (schemaError) {
      console.error('Error checking schema:', schemaError.message);
    }
    
    return false;
  }
}

// Run the fix
createFunction()
  .then(success => {
    if (success) {
      console.log('✅ IMEI function fix completed successfully!');
      process.exit(0);
    } else {
      console.log('❌ Fix failed - see errors above');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });

