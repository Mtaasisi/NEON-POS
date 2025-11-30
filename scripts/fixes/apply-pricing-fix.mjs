#!/usr/bin/env node

/**
 * ============================================================================
 * APPLY PRICING FIX - For SKU-1761488427336-DJ5-V01 and All Similar Issues
 * ============================================================================
 * This script applies the permanent pricing fix to your database.
 * 
 * What it does:
 * 1. Fixes SKU-1761488427336-DJ5-V01 child devices (TSh 0 → TSh 150,000)
 * 2. Fixes ALL products with similar issues
 * 3. Creates a trigger to prevent future issues
 * 
 * Run with: node apply-pricing-fix.mjs
 * ============================================================================
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Neon database connection
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  console.error('');
  console.error('Please set it in your .env file or export it:');
  console.error('export DATABASE_URL="postgresql://user:pass@host/db"');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1,
});

async function applyPricingFix() {
  console.log('🔧 Starting Pricing Fix Application...\n');

  try {
    // Step 1: Check current state
    console.log('📊 Step 1: Checking current state for SKU-1761488427336-DJ5-V01...');
    
    const beforeCheck = await sql`
      SELECT 
        pv.name,
        pv.variant_attributes->>'imei' as imei,
        pv.selling_price,
        pv.variant_type
      FROM lats_product_variants pv
      WHERE pv.parent_variant_id = (
        SELECT id FROM lats_product_variants 
        WHERE sku = 'SKU-1761488427336-DJ5-V01' 
          AND variant_type = 'parent'
      )
      ORDER BY pv.created_at
    `;

    console.log('\n📋 Current State:');
    if (beforeCheck.length === 0) {
      console.log('⚠️  No child devices found for this SKU');
    } else {
      beforeCheck.forEach((device, index) => {
        console.log(`   Device ${index + 1}: ${device.imei || 'N/A'} - TSh ${device.selling_price || 0}`);
      });
    }

    // Step 2: Fix the specific product
    console.log('\n🔧 Step 2: Fixing SKU-1761488427336-DJ5-V01...');
    
    const fixSpecific = await sql`
      WITH parent_info AS (
        SELECT 
          id as parent_id,
          selling_price as parent_selling_price,
          cost_price as parent_cost_price
        FROM lats_product_variants
        WHERE sku = 'SKU-1761488427336-DJ5-V01'
          AND variant_type = 'parent'
          AND is_parent = TRUE
        LIMIT 1
      )
      UPDATE lats_product_variants child
      SET 
        selling_price = parent_info.parent_selling_price,
        cost_price = CASE 
          WHEN child.cost_price = 0 OR child.cost_price IS NULL 
          THEN parent_info.parent_cost_price 
          ELSE child.cost_price 
        END,
        updated_at = NOW()
      FROM parent_info
      WHERE child.parent_variant_id = parent_info.parent_id
        AND child.variant_type = 'imei_child'
        AND (child.selling_price = 0 OR child.selling_price IS NULL)
      RETURNING 
        child.name,
        child.variant_attributes->>'imei' as imei,
        child.selling_price as new_price
    `;

    if (fixSpecific.length > 0) {
      console.log(`✅ Fixed ${fixSpecific.length} device(s):`);
      fixSpecific.forEach(device => {
        console.log(`   - ${device.imei || 'N/A'}: Updated to TSh ${device.new_price}`);
      });
    } else {
      console.log('✅ No devices needed fixing for this SKU (already correct)');
    }

    // Step 3: Fix all similar issues
    console.log('\n🔧 Step 3: Fixing ALL products with similar issues...');
    
    const fixAll = await sql`
      UPDATE lats_product_variants child
      SET 
        selling_price = parent.selling_price,
        cost_price = CASE 
          WHEN child.cost_price = 0 OR child.cost_price IS NULL 
          THEN parent.cost_price 
          ELSE child.cost_price 
        END,
        updated_at = NOW()
      FROM lats_product_variants parent
      WHERE child.parent_variant_id = parent.id
        AND child.variant_type = 'imei_child'
        AND parent.is_parent = TRUE
        AND (child.selling_price = 0 OR child.selling_price IS NULL)
      RETURNING child.id
    `;

    console.log(`✅ Fixed ${fixAll.length} device(s) across all products`);

    // Step 4: Create trigger
    console.log('\n🔧 Step 4: Creating database trigger...');
    
    // Drop existing trigger if exists
    await sql`DROP TRIGGER IF EXISTS trigger_inherit_parent_prices ON lats_product_variants`;
    
    // Create trigger function
    await sql`
      CREATE OR REPLACE FUNCTION inherit_parent_variant_prices()
      RETURNS TRIGGER AS $$
      DECLARE
        v_parent_selling_price NUMERIC;
        v_parent_cost_price NUMERIC;
      BEGIN
        -- Only apply to imei_child variants with a parent
        IF NEW.variant_type = 'imei_child' AND NEW.parent_variant_id IS NOT NULL THEN
          
          -- Get parent prices
          SELECT selling_price, cost_price
          INTO v_parent_selling_price, v_parent_cost_price
          FROM lats_product_variants
          WHERE id = NEW.parent_variant_id;
          
          -- Inherit selling price if not set or is 0
          IF NEW.selling_price IS NULL OR NEW.selling_price = 0 THEN
            NEW.selling_price := COALESCE(v_parent_selling_price, 0);
          END IF;
          
          -- Inherit cost price if not set or is 0
          IF NEW.cost_price IS NULL OR NEW.cost_price = 0 THEN
            NEW.cost_price := COALESCE(v_parent_cost_price, 0);
          END IF;
          
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    // Create trigger
    await sql`
      CREATE TRIGGER trigger_inherit_parent_prices
        BEFORE INSERT OR UPDATE ON lats_product_variants
        FOR EACH ROW
        EXECUTE FUNCTION inherit_parent_variant_prices()
    `;

    console.log('✅ Trigger created: trigger_inherit_parent_prices');
    console.log('   → Will automatically inherit prices for future devices');

    // Step 5: Verify the fix
    console.log('\n✅ Step 5: Verifying fix for SKU-1761488427336-DJ5-V01...');
    
    const afterCheck = await sql`
      SELECT 
        pv.name,
        pv.variant_attributes->>'imei' as imei,
        pv.selling_price,
        pv.is_active,
        pv.quantity
      FROM lats_product_variants pv
      WHERE pv.parent_variant_id = (
        SELECT id FROM lats_product_variants 
        WHERE sku = 'SKU-1761488427336-DJ5-V01' 
          AND variant_type = 'parent'
      )
      ORDER BY pv.created_at
    `;

    console.log('\n📋 Final State:');
    if (afterCheck.length === 0) {
      console.log('⚠️  No child devices found');
    } else {
      let totalValue = 0;
      afterCheck.forEach((device, index) => {
        const price = parseFloat(device.selling_price) || 0;
        const isActive = device.is_active && device.quantity > 0;
        const status = isActive ? '✅' : '❌';
        console.log(`   ${status} Device ${index + 1}: ${device.imei || 'N/A'} - TSh ${price.toLocaleString()}`);
        if (isActive) {
          totalValue += price;
        }
      });
      console.log(`\n💰 Total Value: TSh ${totalValue.toLocaleString()}`);
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('🎉 PRICING FIX APPLIED SUCCESSFULLY!');
    console.log('='.repeat(70));
    console.log('');
    console.log('✅ What was done:');
    console.log('   1. Fixed SKU-1761488427336-DJ5-V01 child devices');
    console.log(`   2. Fixed ${fixAll.length} devices across all products`);
    console.log('   3. Created trigger to prevent future issues');
    console.log('');
    console.log('🔄 Next Steps:');
    console.log('   1. Refresh the product page in your browser');
    console.log('   2. Verify devices show correct prices (TSh 150,000 each)');
    console.log('   3. Check Total Value shows TSh 300,000');
    console.log('');
    console.log('🛡️  Protection:');
    console.log('   - Database trigger: Auto-inherits prices ✅');
    console.log('   - Code fix: Passes null instead of 0 ✅');
    console.log('   - UI fallback: Shows parent price if needed ✅');
    console.log('');
    console.log('📖 See PERMANENT_PRICING_FIX_COMPLETE.md for full details');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ ERROR applying pricing fix:');
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the fix
applyPricingFix();

