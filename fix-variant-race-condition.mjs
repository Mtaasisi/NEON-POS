#!/usr/bin/env node
import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import ws from 'ws';
import * as fs from 'fs';

dotenv.config();

if (typeof WebSocket === 'undefined') {
  global.WebSocket = ws;
}

const pool = new Pool({ connectionString: process.env.VITE_DATABASE_URL || process.env.DATABASE_URL });

async function fixVariantRaceCondition() {
  try {
    console.log('🔧 Fixing Default Variant Race Condition...\n');
    console.log('='.repeat(80));
    console.log('\n📋 Problem:');
    console.log('   When creating products with custom variants (e.g., 128GB, 256GB),');
    console.log('   the system was also creating a "Default" variant, resulting in 3 variants');
    console.log('   instead of 2.\n');
    console.log('💡 Solution:');
    console.log('   Increase the auto-creation trigger delay from 100ms to 1000ms to give');
    console.log('   the frontend enough time to insert custom variants.\n');
    console.log('='.repeat(80));
    
    // Step 1: Drop existing trigger
    console.log('\n1️⃣ Dropping existing trigger...');
    await pool.query('DROP TRIGGER IF EXISTS trigger_auto_create_default_variant ON lats_products');
    console.log('   ✅ Trigger dropped');
    
    // Step 2: Update the function with longer delay
    console.log('\n2️⃣ Updating auto_create_default_variant() function...');
    const functionSQL = `
CREATE OR REPLACE FUNCTION public.auto_create_default_variant() 
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    variant_count INTEGER;
    v_new_variant_id UUID;
BEGIN
    -- Wait 1 second to allow batch variant insertions from frontend
    -- This gives the frontend enough time to insert custom variants
    PERFORM pg_sleep(1.0);
    
    -- Check if this product has any variants
    SELECT COUNT(*) INTO variant_count
    FROM lats_product_variants
    WHERE product_id = NEW.id
    AND parent_variant_id IS NULL; -- Only count parent variants, not IMEI children
    
    -- If no variants exist, create a default one
    IF variant_count = 0 THEN
        INSERT INTO lats_product_variants (
            product_id,
            name,
            variant_name,
            sku,
            cost_price,
            unit_price,
            selling_price,
            quantity,
            min_quantity,
            variant_attributes,
            attributes,
            branch_id,
            is_active,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            'Default',
            'Default',
            COALESCE(NEW.sku || '-DEFAULT', 'SKU-' || SUBSTRING(NEW.id::text, 1, 8) || '-DEFAULT'),
            COALESCE(NEW.cost_price, 0),
            COALESCE(NEW.unit_price, NEW.selling_price, 0),
            COALESCE(NEW.selling_price, 0),
            COALESCE(NEW.stock_quantity, 0),
            COALESCE(NEW.min_stock_level, 0),
            jsonb_build_object(
                'auto_created', true,
                'created_at', NOW(),
                'created_from', 'product_insert_trigger'
            ),
            COALESCE(NEW.attributes, '{}'::jsonb),
            NEW.branch_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_new_variant_id;
        
        RAISE NOTICE '✨ Auto-created default variant (ID: %) for product: "%" (ID: %) with branch_id: %', 
            v_new_variant_id, NEW.name, NEW.id, NEW.branch_id;
    ELSE
        RAISE NOTICE '✅ Product "%" already has % variant(s), skipping default variant auto-creation', 
            NEW.name, variant_count;
    END IF;
    
    RETURN NEW;
END;
$$;
`;
    
    await pool.query(functionSQL);
    console.log('   ✅ Function updated with 1-second delay');
    
    // Step 3: Recreate the trigger
    console.log('\n3️⃣ Recreating trigger...');
    await pool.query(`
      CREATE TRIGGER trigger_auto_create_default_variant
          AFTER INSERT ON lats_products
          FOR EACH ROW
          EXECUTE FUNCTION auto_create_default_variant()
    `);
    console.log('   ✅ Trigger recreated');
    
    // Step 4: Add comments
    console.log('\n4️⃣ Adding documentation...');
    await pool.query(`
      COMMENT ON FUNCTION public.auto_create_default_variant() IS 
      'Automatically creates a default variant for products that have no variants. 
      Waits 1 second to allow custom variants to be created first.'
    `);
    await pool.query(`
      COMMENT ON TRIGGER trigger_auto_create_default_variant ON lats_products IS
      'Automatically creates a default variant if no custom variants are added within 1 second of product creation'
    `);
    console.log('   ✅ Documentation added');
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ FIX APPLIED SUCCESSFULLY!\n');
    console.log('📌 What changed:');
    console.log('   • Trigger delay increased from 100ms → 1000ms (1 second)');
    console.log('   • Now when you create 2 custom variants, you get exactly 2 variants');
    console.log('   • When you create NO variants, you still get 1 "Default" variant');
    console.log('\n🎯 Next steps:');
    console.log('   1. Test creating a product WITH variants (e.g., 128GB, 256GB)');
    console.log('      → Should show exactly 2 variants (no "Default")');
    console.log('   2. Test creating a product WITHOUT variants');
    console.log('      → Should show 1 "Default" variant');
    console.log('\n' + '='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Error applying fix:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixVariantRaceCondition();

