#!/usr/bin/env node

/**
 * Quick verification script to check the pricing fix
 * Run: node verify-pricing-fix.mjs
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Set DATABASE_URL first');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 });

async function verify() {
  console.log('🔍 Verifying Pricing Fix for SKU-1761488427336-DJ5-V01\n');

  try {
    // Get parent
    const parent = await sql`
      SELECT name, sku, selling_price, quantity
      FROM lats_product_variants
      WHERE sku = 'SKU-1761488427336-DJ5-V01'
        AND variant_type = 'parent'
    `;

    if (parent.length === 0) {
      console.log('⚠️  Parent variant not found');
      return;
    }

    console.log('📦 Parent Variant:');
    console.log(`   Name: ${parent[0].name}`);
    console.log(`   SKU: ${parent[0].sku}`);
    console.log(`   Price: TSh ${parseFloat(parent[0].selling_price).toLocaleString()}`);
    console.log(`   Stock: ${parent[0].quantity}`);

    // Get children
    const children = await sql`
      SELECT 
        name,
        variant_attributes->>'imei' as imei,
        variant_attributes->>'serial_number' as serial_number,
        selling_price,
        cost_price,
        is_active,
        quantity
      FROM lats_product_variants
      WHERE parent_variant_id = (
        SELECT id FROM lats_product_variants 
        WHERE sku = 'SKU-1761488427336-DJ5-V01' 
          AND variant_type = 'parent'
      )
      ORDER BY created_at
    `;

    console.log(`\n📱 Child Devices (${children.length}):`);
    let totalValue = 0;
    let availableCount = 0;

    children.forEach((child, index) => {
      const price = parseFloat(child.selling_price) || 0;
      const isAvailable = child.is_active && child.quantity > 0;
      const status = isAvailable ? '✅' : '❌';
      
      console.log(`   ${status} Device ${index + 1}:`);
      console.log(`      IMEI: ${child.imei || 'N/A'}`);
      console.log(`      S/N: ${child.serial_number || 'N/A'}`);
      console.log(`      Price: TSh ${price.toLocaleString()}`);
      console.log(`      Status: ${isAvailable ? 'Available' : 'Sold/Inactive'}`);
      
      if (isAvailable) {
        totalValue += price;
        availableCount++;
      }
    });

    console.log(`\n💰 Summary:`);
    console.log(`   Total Devices: ${children.length}`);
    console.log(`   Available: ${availableCount}`);
    console.log(`   Total Value: TSh ${totalValue.toLocaleString()}`);

    // Check trigger
    console.log(`\n🔧 Trigger Status:`);
    const trigger = await sql`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE trigger_name = 'trigger_inherit_parent_prices'
        AND event_object_table = 'lats_product_variants'
    `;

    if (trigger.length > 0) {
      console.log(`   ✅ trigger_inherit_parent_prices - ACTIVE`);
      console.log(`   ✅ Will auto-inherit prices for new devices`);
    } else {
      console.log(`   ❌ Trigger not found - run apply-pricing-fix.mjs`);
    }

    console.log('\n' + '='.repeat(50));
    if (totalValue === 300000 && availableCount === 2) {
      console.log('✅ PRICING FIX VERIFIED - Everything looks perfect!');
    } else {
      console.log('⚠️  Something might be wrong - check the details above');
    }
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

verify();

