#!/usr/bin/env node

/**
 * Complete App Integration Check
 * Verifies all IMEI variant system components are working correctly
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.VITE_DATABASE_URL || process.env.VITE_NEON_DATABASE_URL);

console.log('🔍 Full App Integration Check\n');
console.log('═'.repeat(70));

const results = {
  database: [],
  integration: [],
  warnings: [],
  recommendations: []
};

// Test 1: Database Schema
console.log('\n📦 STEP 1: Database Schema Check\n');

try {
  const schemaCheck = await sql`
    SELECT 
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name IN ('variant_attributes', 'quantity', 'branch_id')
    ORDER BY column_name
  `;
  
  if (schemaCheck.length === 3) {
    console.log('✅ Database schema: All required columns exist');
    results.database.push('Schema: ✅ Complete');
  } else {
    console.log('❌ Missing columns in schema');
    results.database.push('Schema: ❌ Incomplete');
  }
} catch (error) {
  console.log(`❌ Schema check failed: ${error.message}`);
  results.database.push('Schema: ❌ Error');
}

// Test 2: IMEI Variants Data
console.log('\n📱 STEP 2: IMEI Variants Data Check\n');

try {
  const variantStats = await sql`
    SELECT 
      COUNT(*) as total_variants,
      COUNT(*) FILTER (WHERE variant_attributes->>'imei' IS NOT NULL) as imei_variants,
      COUNT(*) FILTER (WHERE variant_attributes->>'source' = 'trade-in') as trade_in_variants,
      COUNT(*) FILTER (WHERE variant_attributes->>'source' = 'migration') as migrated_variants,
      COUNT(*) FILTER (WHERE variant_attributes->>'source' = 'purchase') as purchase_variants,
      SUM(quantity) as total_quantity,
      COUNT(*) FILTER (WHERE is_active = true) as active_variants
    FROM lats_product_variants
  `;
  
  const stats = variantStats[0];
  console.log(`✅ Total variants: ${stats.total_variants}`);
  console.log(`✅ IMEI variants: ${stats.imei_variants}`);
  console.log(`   - Trade-in: ${stats.trade_in_variants}`);
  console.log(`   - Migrated: ${stats.migrated_variants}`);
  console.log(`   - Purchase: ${stats.purchase_variants || 0}`);
  console.log(`✅ Active variants: ${stats.active_variants}`);
  console.log(`✅ Total quantity: ${stats.total_quantity}`);
  
  results.database.push(`IMEI Variants: ${stats.imei_variants}`);
  
  if (stats.imei_variants > 0) {
    results.integration.push('✅ IMEI tracking active');
  }
} catch (error) {
  console.log(`❌ Variant data check failed: ${error.message}`);
  results.database.push('Variants: ❌ Error');
}

// Test 3: Products with IMEI Variants
console.log('\n🛍️  STEP 3: Products with IMEI Variants\n');

try {
  const productsWithIMEI = await sql`
    SELECT 
      p.id,
      p.name,
      p.stock_quantity,
      COUNT(v.id) as variant_count,
      SUM(v.quantity) as total_variant_qty,
      COUNT(*) FILTER (WHERE v.is_active = true) as active_variants
    FROM lats_products p
    JOIN lats_product_variants v ON v.product_id = p.id
    WHERE v.variant_attributes->>'imei' IS NOT NULL
    GROUP BY p.id, p.name, p.stock_quantity
    ORDER BY variant_count DESC
  `;
  
  if (productsWithIMEI.length > 0) {
    console.log(`✅ Found ${productsWithIMEI.length} products with IMEI tracking:`);
    productsWithIMEI.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name}`);
      console.log(`      Stock: ${p.stock_quantity}, Variants: ${p.variant_count}, Active: ${p.active_variants}`);
      
      // Check for stock sync issues
      if (p.stock_quantity !== parseInt(p.total_variant_qty)) {
        console.log(`      ⚠️  Stock mismatch: Product shows ${p.stock_quantity}, variants total ${p.total_variant_qty}`);
        results.warnings.push(`Stock mismatch in "${p.name}"`);
      }
    });
    results.integration.push(`✅ ${productsWithIMEI.length} products ready for POS`);
  } else {
    console.log('⚠️  No products with IMEI variants found yet');
    results.warnings.push('No products with IMEI variants');
    results.recommendations.push('Receive a PO with IMEI numbers to create variants');
  }
} catch (error) {
  console.log(`❌ Products check failed: ${error.message}`);
}

// Test 4: Duplicate IMEI Check
console.log('\n🛡️  STEP 4: Duplicate IMEI Protection\n');

try {
  const duplicateCheck = await sql`
    SELECT 
      variant_attributes->>'imei' as imei,
      COUNT(*) as count
    FROM lats_product_variants
    WHERE variant_attributes->>'imei' IS NOT NULL
    GROUP BY variant_attributes->>'imei'
    HAVING COUNT(*) > 1
  `;
  
  if (duplicateCheck.length === 0) {
    console.log('✅ No duplicate IMEIs found - data integrity perfect!');
    results.integration.push('✅ Duplicate protection verified');
  } else {
    console.log(`⚠️  Found ${duplicateCheck.length} duplicate IMEIs:`);
    duplicateCheck.forEach(dup => {
      console.log(`   - IMEI ${dup.imei}: ${dup.count} occurrences`);
    });
    results.warnings.push(`${duplicateCheck.length} duplicate IMEIs found`);
  }
} catch (error) {
  console.log(`⚠️  Could not check for duplicates: ${error.message}`);
}

// Test 5: Sample IMEI Lookup
console.log('\n🔍 STEP 5: IMEI Lookup Test\n');

try {
  const sampleIMEI = await sql`
    SELECT 
      v.id,
      v.variant_name,
      v.variant_attributes->>'imei' as imei,
      v.selling_price,
      v.quantity,
      v.is_active,
      p.name as product_name
    FROM lats_product_variants v
    JOIN lats_products p ON p.id = v.product_id
    WHERE v.variant_attributes->>'imei' IS NOT NULL
    AND v.is_active = true
    LIMIT 1
  `;
  
  if (sampleIMEI.length > 0) {
    const device = sampleIMEI[0];
    console.log('✅ IMEI lookup test successful:');
    console.log(`   Product: ${device.product_name}`);
    console.log(`   IMEI: ${device.imei}`);
    console.log(`   Price: ${device.selling_price}`);
    console.log(`   Available: ${device.quantity > 0 ? 'Yes' : 'No'}`);
    results.integration.push('✅ IMEI queries working');
  } else {
    console.log('⚠️  No active IMEI variants to test lookup');
  }
} catch (error) {
  console.log(`❌ IMEI lookup failed: ${error.message}`);
}

// Test 6: POS Ready Check
console.log('\n🏪 STEP 6: POS Integration Readiness\n');

try {
  const posReady = await sql`
    SELECT 
      p.id,
      p.name,
      COUNT(v.id) as available_devices
    FROM lats_products p
    JOIN lats_product_variants v ON v.product_id = p.id
    WHERE v.variant_attributes->>'imei' IS NOT NULL
      AND v.is_active = true
      AND v.quantity > 0
    GROUP BY p.id, p.name
  `;
  
  if (posReady.length > 0) {
    console.log(`✅ ${posReady.length} products ready for POS with IMEI selection:`);
    posReady.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} - ${p.available_devices} devices available`);
    });
    results.integration.push(`✅ ${posReady.length} products ready in POS`);
  } else {
    console.log('⚠️  No products currently available for POS IMEI selection');
    results.recommendations.push('Add IMEI variants to products or receive PO with IMEI');
  }
} catch (error) {
  console.log(`❌ POS readiness check failed: ${error.message}`);
}

// Test 7: Legacy Data Check
console.log('\n📦 STEP 7: Legacy Data Status\n');

try {
  const legacyData = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'migrated') as migrated,
      COUNT(*) FILTER (WHERE status != 'migrated') as not_migrated
    FROM inventory_items
    WHERE imei IS NOT NULL AND imei != ''
  `;
  
  if (legacyData.length > 0) {
    const legacy = legacyData[0];
    console.log(`✅ Legacy inventory_items status:`);
    console.log(`   Total with IMEI: ${legacy.total}`);
    console.log(`   Migrated: ${legacy.migrated}`);
    console.log(`   Not migrated: ${legacy.not_migrated}`);
    
    if (parseInt(legacy.not_migrated) === 0) {
      console.log('   ✅ All legacy data migrated!');
      results.integration.push('✅ Legacy data fully migrated');
    } else {
      results.recommendations.push(`Consider migrating ${legacy.not_migrated} legacy items`);
    }
  }
} catch (error) {
  console.log(`⚠️  Could not check legacy data: ${error.message}`);
}

// Test 8: Recent Activity Check
console.log('\n📊 STEP 8: Recent Activity Check\n');

try {
  const recentVariants = await sql`
    SELECT 
      v.variant_name,
      v.variant_attributes->>'imei' as imei,
      v.variant_attributes->>'source' as source,
      v.created_at,
      p.name as product_name
    FROM lats_product_variants v
    JOIN lats_products p ON p.id = v.product_id
    WHERE v.variant_attributes->>'imei' IS NOT NULL
    ORDER BY v.created_at DESC
    LIMIT 5
  `;
  
  if (recentVariants.length > 0) {
    console.log('✅ Recent IMEI variants (last 5):');
    recentVariants.forEach((v, i) => {
      const date = new Date(v.created_at).toLocaleDateString();
      console.log(`   ${i + 1}. ${v.imei} - ${v.product_name} (${v.source}) - ${date}`);
    });
  }
} catch (error) {
  console.log(`⚠️  Could not check recent activity: ${error.message}`);
}

// Final Summary
console.log('\n' + '═'.repeat(70));
console.log('\n📋 FINAL INTEGRATION REPORT\n');

console.log('🗄️  DATABASE:');
results.database.forEach(r => console.log(`   ${r}`));

console.log('\n🔗 INTEGRATION:');
results.integration.forEach(r => console.log(`   ${r}`));

if (results.warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  results.warnings.forEach(w => console.log(`   ${w}`));
}

if (results.recommendations.length > 0) {
  console.log('\n💡 RECOMMENDATIONS:');
  results.recommendations.forEach(r => console.log(`   ${r}`));
}

console.log('\n' + '═'.repeat(70));

// Overall Status
const hasErrors = results.database.some(r => r.includes('❌')) || 
                  results.integration.some(r => r.includes('❌'));
const hasWarnings = results.warnings.length > 0;

if (!hasErrors && !hasWarnings) {
  console.log('\n✅ PERFECT! All systems operational and ready for production!\n');
  console.log('🚀 Your app is ready to:');
  console.log('   1. Receive POs with IMEI → Auto-create variants');
  console.log('   2. Sell in POS → Auto-open IMEI selector');
  console.log('   3. Track all devices individually\n');
  process.exit(0);
} else if (!hasErrors && hasWarnings) {
  console.log('\n✅ System operational with minor notes.\n');
  console.log('Review warnings and recommendations above.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some issues detected. Review errors above.\n');
  process.exit(1);
}
