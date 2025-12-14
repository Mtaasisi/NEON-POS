#!/usr/bin/env node

/**
 * Cleanup and Validation Script
 * Kusafisha na kuvalidate inventory_items na lats_product_variants
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

console.log('═══════════════════════════════════════════════════════════════');
console.log('🧹 DATA CLEANUP AND VALIDATION');
console.log('═══════════════════════════════════════════════════════════════\n');

// Step 1: Find and mark invalid IMEIs in inventory_items
async function step1_markInvalidIMEIs() {
  console.log('1️⃣ STEP 1: Angalia IMEI isiyo halali katika inventory_items');
  console.log('─────────────────────────────────────────────────────────────\n');

  // First, let's see what would be affected
  const invalidIMEIs = await sql`
    SELECT 
      id,
      imei,
      serial_number,
      status,
      product_id
    FROM inventory_items
    WHERE 
      imei IS NOT NULL 
      AND imei != ''
      AND (
        char_length(imei) < 15
        OR char_length(imei) > 17
        OR imei ~ '[^0-9]'
      )
  `;

  console.log(`📊 IMEI isiyo halali zilizopatikana: ${invalidIMEIs.length}\n`);

  if (invalidIMEIs.length > 0) {
    console.log('Sampuli ya records zitakazo-marked as invalid:\n');
    invalidIMEIs.slice(0, 5).forEach((item, idx) => {
      console.log(`${idx + 1}. IMEI: "${item.imei}" | Status: ${item.status}`);
      console.log(`   ID: ${item.id.substring(0, 20)}...`);
      console.log(`   Serial: ${item.serial_number || 'TUPU'}\n`);
    });

    // Update to mark as damaged (invalid IMEIs)
    console.log('⚙️  Inarekebisha status kuwa "damaged" (IMEI isiyo halali)...\n');
    
    const result = await sql`
      UPDATE inventory_items
      SET status = 'damaged'
      WHERE 
        imei IS NOT NULL 
        AND imei != ''
        AND (
          char_length(imei) < 15
          OR char_length(imei) > 17
          OR imei ~ '[^0-9]'
        )
        AND status != 'damaged'
    `;

    console.log(`✅ Imebadilisha: ${invalidIMEIs.length} records\n`);
  } else {
    console.log('✅ Hakuna IMEI isiyo halali\n');
  }
}

// Step 2: Find parent variants with no children
async function step2_findOrphanParents() {
  console.log('2️⃣ STEP 2: Tafuta parent variants bila watoto');
  console.log('─────────────────────────────────────────────────────────────\n');

  // Check parent variants that don't have any child variants
  const orphanParents = await sql`
    SELECT 
      pv.id,
      pv.variant_name,
      pv.product_id,
      pv.is_parent,
      pv.variant_type,
      pv.quantity
    FROM lats_product_variants pv
    WHERE pv.is_parent = true
      AND NOT EXISTS (
        SELECT 1 
        FROM lats_product_variants child
        WHERE child.parent_variant_id = pv.id
      )
  `;

  console.log(`📊 Parent variants bila watoto: ${orphanParents.length}\n`);

  if (orphanParents.length > 0) {
    console.log('Records zilizopatikana:\n');
    orphanParents.forEach((parent, idx) => {
      console.log(`${idx + 1}. Variant: ${parent.variant_name || 'TUPU'}`);
      console.log(`   ID: ${parent.id.substring(0, 20)}...`);
      console.log(`   Product ID: ${parent.product_id?.substring(0, 20)}...`);
      console.log(`   Quantity: ${parent.quantity}`);
      console.log(`   Type: ${parent.variant_type}\n`);
    });

    return orphanParents;
  } else {
    console.log('✅ Parent variants zote zina watoto\n');
    return [];
  }
}

// Step 3: Check inventory items without valid variant_id
async function step3_checkInventoryConsistency() {
  console.log('3️⃣ STEP 3: Angalia consistency ya inventory_items');
  console.log('─────────────────────────────────────────────────────────────\n');

  // Find inventory items with variant_id that doesn't exist in variants table
  const orphanInventory = await sql`
    SELECT 
      i.id,
      i.imei,
      i.serial_number,
      i.variant_id,
      i.product_id,
      i.status
    FROM inventory_items i
    WHERE i.variant_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 
        FROM lats_product_variants pv
        WHERE pv.id = i.variant_id
      )
  `;

  console.log(`📊 Inventory items zenye variant_id isiyo exist: ${orphanInventory.length}\n`);

  if (orphanInventory.length > 0) {
    console.log('⚠️  TATIZO: Inventory items zinazo-reference variants ambazo hazipatikani!\n');
    orphanInventory.slice(0, 5).forEach((item, idx) => {
      console.log(`${idx + 1}. ID: ${item.id.substring(0, 20)}...`);
      console.log(`   Variant ID (missing): ${item.variant_id?.substring(0, 20)}...`);
      console.log(`   IMEI: ${item.imei || 'TUPU'}`);
      console.log(`   Status: ${item.status}\n`);
    });
    return orphanInventory;
  } else {
    console.log('✅ Inventory items zote zina valid variant_id\n');
    return [];
  }
}

// Step 4: Find variants with IMEI that don't have corresponding inventory items
async function step4_checkVariantInventorySync() {
  console.log('4️⃣ STEP 4: Angalia sync kati ya variants na inventory');
  console.log('─────────────────────────────────────────────────────────────\n');

  // Get IMEI variants that should have inventory items
  const variantsWithoutInventory = await sql`
    SELECT 
      pv.id,
      pv.variant_name,
      pv.product_id,
      pv.variant_type,
      pv.quantity
    FROM lats_product_variants pv
    WHERE pv.variant_type = 'imei_child'
      AND pv.variant_name LIKE '%IMEI:%'
      AND NOT EXISTS (
        SELECT 1 
        FROM inventory_items i
        WHERE i.variant_id = pv.id
      )
  `;

  console.log(`📊 IMEI variants bila inventory items: ${variantsWithoutInventory.length}\n`);

  if (variantsWithoutInventory.length > 0) {
    console.log('Sampuli:\n');
    variantsWithoutInventory.slice(0, 5).forEach((variant, idx) => {
      console.log(`${idx + 1}. Variant: ${variant.variant_name}`);
      console.log(`   ID: ${variant.id.substring(0, 20)}...`);
      console.log(`   Quantity: ${variant.quantity}\n`);
    });
    return variantsWithoutInventory;
  } else {
    console.log('✅ IMEI variants zote zina inventory items\n');
    return [];
  }
}

// Step 5: Generate summary report
async function step5_generateReport() {
  console.log('5️⃣ STEP 5: Report ya jumla');
  console.log('─────────────────────────────────────────────────────────────\n');

  // Count by status in inventory_items
  const inventoryStats = await sql`
    SELECT 
      status,
      COUNT(*) as count,
      COUNT(CASE WHEN imei IS NOT NULL AND imei != '' THEN 1 END) as with_imei,
      COUNT(CASE WHEN imei IS NULL OR imei = '' THEN 1 END) as without_imei
    FROM inventory_items
    GROUP BY status
    ORDER BY count DESC
  `;

  console.log('📊 INVENTORY_ITEMS - Takwimu kwa Status:\n');
  inventoryStats.forEach(stat => {
    console.log(`   ${stat.status}:`);
    console.log(`      • Jumla: ${stat.count}`);
    console.log(`      • Na IMEI: ${stat.with_imei}`);
    console.log(`      • Bila IMEI: ${stat.without_imei}\n`);
  });

  // Count variants by type
  const variantStats = await sql`
    SELECT 
      variant_type,
      is_parent,
      COUNT(*) as count
    FROM lats_product_variants
    GROUP BY variant_type, is_parent
    ORDER BY count DESC
  `;

  console.log('📊 LATS_PRODUCT_VARIANTS - Takwimu kwa Type:\n');
  variantStats.forEach(stat => {
    const parentLabel = stat.is_parent ? '(Parent)' : '(Child)';
    console.log(`   ${stat.variant_type} ${parentLabel}: ${stat.count}`);
  });
  console.log('');

  // Valid inventory items (with proper IMEI)
  const validItems = await sql`
    SELECT COUNT(*) as count
    FROM inventory_items
    WHERE 
      imei IS NOT NULL 
      AND imei != ''
      AND char_length(imei) >= 15
      AND char_length(imei) <= 17
      AND imei ~ '^[0-9]+$'
      AND status != 'damaged'
  `;

  console.log(`✅ Valid inventory items (zenye IMEI halali): ${validItems[0].count}\n`);
}

// Step 6: Optional cleanup - Delete test/dummy IMEIs
async function step6_optionalCleanup(dryRun = true) {
  console.log('6️⃣ STEP 6: Kusafisha test/dummy data (OPTIONAL)');
  console.log('─────────────────────────────────────────────────────────────\n');

  if (dryRun) {
    console.log('ℹ️  DRY RUN MODE - Hakuna data itafutwa\n');
  }

  // Find obvious test data
  const testPatterns = [
    'kljhgf',
    'sadasd',
    'asdasd',
    'dsfdfs',
    'dadfda',
    'sdfdsf',
    'fasdfasd',
    'dsfasdfsd'
  ];

  for (const pattern of testPatterns) {
    const testData = await sql`
      SELECT id, imei, status
      FROM inventory_items
      WHERE imei LIKE ${'%' + pattern + '%'}
    `;

    if (testData.length > 0) {
      console.log(`⚠️  Imepatikana test data na pattern "${pattern}": ${testData.length} records`);
      
      if (!dryRun) {
        await sql`
          DELETE FROM inventory_items
          WHERE imei LIKE ${'%' + pattern + '%'}
        `;
        console.log(`   ✅ Imefutwa\n`);
      } else {
        console.log(`   ℹ️  (Itafutwa kama dry run mode itazimwa)\n`);
      }
    }
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Inaanza cleanup process...\n');

    await step1_markInvalidIMEIs();
    const orphanParents = await step2_findOrphanParents();
    const orphanInventory = await step3_checkInventoryConsistency();
    const variantsWithoutInventory = await step4_checkVariantInventorySync();
    await step5_generateReport();
    await step6_optionalCleanup(true); // Dry run mode

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📋 MUHTASARI WA CLEANUP');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const issues = [];
    
    if (orphanParents.length > 0) {
      issues.push(`${orphanParents.length} parent variants bila watoto`);
    }
    
    if (orphanInventory.length > 0) {
      issues.push(`${orphanInventory.length} inventory items zenye invalid variant_id`);
    }
    
    if (variantsWithoutInventory.length > 0) {
      issues.push(`${variantsWithoutInventory.length} IMEI variants bila inventory items`);
    }

    if (issues.length === 0) {
      console.log('✅ HAKUNA MATATIZO MAKUBWA!');
      console.log('   Data cleanup imekamilika na database iko sawa.\n');
    } else {
      console.log('⚠️  MATATIZO YALIYOBAKI:\n');
      issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`);
      });
      console.log('\n💡 Angalia warnings juu kwa maelezo zaidi.\n');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Cleanup process imekamilika!');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Kosa:', error);
    process.exit(1);
  }
}

main();

