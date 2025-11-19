#!/usr/bin/env node

/**
 * Add Supporting IMEI Functions
 * These functions help manage the parent-child IMEI variant system
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log('🔧 Adding Supporting IMEI Functions...\n');

const sql = neon(DATABASE_URL);

async function addSupportingFunctions() {
  try {
    // Function 1: Get child IMEIs
    console.log('1️⃣ Creating get_child_imeis function...');
    await sql`
      CREATE OR REPLACE FUNCTION get_child_imeis(parent_variant_id_param UUID)
      RETURNS TABLE (
        child_id UUID,
        imei TEXT,
        serial_number TEXT,
        status TEXT,
        quantity INTEGER,
        cost_price NUMERIC,
        selling_price NUMERIC,
        variant_attributes JSONB,
        created_at TIMESTAMPTZ
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          v.id as child_id,
          v.variant_attributes->>'imei' as imei,
          v.variant_attributes->>'serial_number' as serial_number,
          CASE 
            WHEN v.is_active = TRUE AND v.quantity > 0 THEN 'available'
            WHEN v.is_active = FALSE THEN 'sold'
            ELSE 'unavailable'
          END as status,
          v.quantity,
          v.cost_price,
          v.selling_price,
          v.variant_attributes,
          v.created_at
        FROM lats_product_variants v
        WHERE v.parent_variant_id = parent_variant_id_param
          AND v.variant_type = 'imei_child'
        ORDER BY v.created_at DESC;
      END;
      $$ LANGUAGE plpgsql
    `;
    console.log('✅ get_child_imeis created\n');
    
    // Function 2: Calculate parent stock
    console.log('2️⃣ Creating calculate_parent_variant_stock function...');
    await sql`
      CREATE OR REPLACE FUNCTION calculate_parent_variant_stock(parent_variant_id_param UUID)
      RETURNS INTEGER AS $$
      DECLARE
        total_stock INTEGER;
      BEGIN
        SELECT COALESCE(SUM(quantity), 0)
        INTO total_stock
        FROM lats_product_variants
        WHERE parent_variant_id = parent_variant_id_param
          AND variant_type = 'imei_child'
          AND is_active = TRUE
          AND quantity > 0;
          
        RETURN total_stock;
      END;
      $$ LANGUAGE plpgsql
    `;
    console.log('✅ calculate_parent_variant_stock created\n');
    
    // Function 3: Update parent stock trigger
    console.log('3️⃣ Creating update_parent_variant_stock trigger function...');
    await sql`
      CREATE OR REPLACE FUNCTION update_parent_variant_stock()
      RETURNS TRIGGER AS $$
      DECLARE
        v_parent_id UUID;
        v_new_stock INTEGER;
      BEGIN
        -- Get parent variant ID
        IF TG_OP = 'DELETE' THEN
          v_parent_id := OLD.parent_variant_id;
        ELSE
          v_parent_id := NEW.parent_variant_id;
        END IF;
        
        -- Only process if this is a child variant
        IF v_parent_id IS NULL THEN
          RETURN NEW;
        END IF;
        
        -- Calculate new stock
        v_new_stock := calculate_parent_variant_stock(v_parent_id);
        
        -- Update parent variant
        UPDATE lats_product_variants
        SET 
          quantity = v_new_stock,
          updated_at = NOW()
        WHERE id = v_parent_id;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;
    
    // Drop and recreate trigger
    await sql`DROP TRIGGER IF EXISTS trigger_update_parent_stock ON lats_product_variants`;
    await sql`
      CREATE TRIGGER trigger_update_parent_stock
        AFTER INSERT OR UPDATE OF quantity, is_active OR DELETE ON lats_product_variants
        FOR EACH ROW
        EXECUTE FUNCTION update_parent_variant_stock()
    `;
    console.log('✅ update_parent_variant_stock trigger created\n');
    
    // Function 4: Get available IMEIs for POS
    console.log('4️⃣ Creating get_available_imeis_for_pos function...');
    await sql`
      CREATE OR REPLACE FUNCTION get_available_imeis_for_pos(parent_variant_id_param UUID)
      RETURNS TABLE (
        child_id UUID,
        imei TEXT,
        serial_number TEXT,
        condition TEXT,
        cost_price NUMERIC,
        selling_price NUMERIC,
        created_at TIMESTAMPTZ
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          v.id as child_id,
          v.variant_attributes->>'imei' as imei,
          v.variant_attributes->>'serial_number' as serial_number,
          v.variant_attributes->>'condition' as condition,
          v.cost_price,
          v.selling_price,
          v.created_at
        FROM lats_product_variants v
        WHERE v.parent_variant_id = parent_variant_id_param
          AND v.variant_type = 'imei_child'
          AND v.is_active = TRUE
          AND v.quantity > 0
        ORDER BY v.created_at ASC;
      END;
      $$ LANGUAGE plpgsql
    `;
    console.log('✅ get_available_imeis_for_pos created\n');
    
    // Function 5: Mark IMEI as sold
    console.log('5️⃣ Creating mark_imei_as_sold function...');
    await sql`
      CREATE OR REPLACE FUNCTION mark_imei_as_sold(
        child_variant_id_param UUID,
        sale_id_param UUID DEFAULT NULL
      )
      RETURNS BOOLEAN AS $$
      BEGIN
        UPDATE lats_product_variants
        SET 
          quantity = 0,
          is_active = FALSE,
          variant_attributes = variant_attributes || jsonb_build_object(
            'sold_at', NOW(),
            'sale_id', sale_id_param
          ),
          updated_at = NOW()
        WHERE id = child_variant_id_param
          AND variant_type = 'imei_child';
          
        RETURN FOUND;
      END;
      $$ LANGUAGE plpgsql
    `;
    console.log('✅ mark_imei_as_sold created\n');
    
    // Verify all functions
    console.log('6️⃣ Verifying all functions...');
    const functions = await sql`
      SELECT proname as function_name
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname IN (
          'add_imei_to_parent_variant',
          'get_child_imeis',
          'calculate_parent_variant_stock',
          'update_parent_variant_stock',
          'get_available_imeis_for_pos',
          'mark_imei_as_sold'
        )
      ORDER BY p.proname
    `;
    
    console.log('\n✅ All functions installed:');
    functions.forEach(fn => {
      console.log(`   ✓ ${fn.function_name}`);
    });
    
    console.log('\n🎉 Complete IMEI Parent-Child System is Ready!\n');
    console.log('📋 Available Functions:');
    console.log('   • add_imei_to_parent_variant() - Add IMEI to parent variant');
    console.log('   • get_child_imeis() - Get all child IMEIs');
    console.log('   • calculate_parent_variant_stock() - Calculate stock from children');
    console.log('   • get_available_imeis_for_pos() - Get available IMEIs for sale');
    console.log('   • mark_imei_as_sold() - Mark IMEI as sold\n');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

addSupportingFunctions()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

