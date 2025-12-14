#!/usr/bin/env node

/**
 * Check Inventory Items and Product Variants
 * Muhtasari wa data kutoka jedwali la inventory_items na lats_product_variants
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

console.log('═══════════════════════════════════════════════════════════════');
console.log('📊 UCHUNGUZI WA INVENTORY_ITEMS NA LATS_PRODUCT_VARIANTS');
console.log('═══════════════════════════════════════════════════════════════\n');

async function checkInventoryItems() {
  console.log('🔍 JEDWALI: inventory_items');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  try {
    const items = await sql`
      SELECT 
        id,
        imei,
        variant_id,
        product_id,
        status,
        serial_number,
        created_at
      FROM inventory_items
      ORDER BY created_at DESC
    `;

    console.log(`📦 Jumla ya records: ${items.length}\n`);

    if (items.length === 0) {
      console.log('⚠️  Hakuna data katika jedwali la inventory_items\n');
      return [];
    }

    // Display all records
    items.forEach((item, index) => {
      console.log(`Record #${index + 1}:`);
      console.log(`  ID: ${item.id}`);
      console.log(`  IMEI: ${item.imei || '❌ TUPU'}`);
      console.log(`  Serial Number: ${item.serial_number || '❌ TUPU'}`);
      console.log(`  Variant ID: ${item.variant_id || '❌ TUPU'}`);
      console.log(`  Product ID: ${item.product_id || '❌ TUPU'}`);
      console.log(`  Status: ${item.status || '❌ TUPU'}`);
      console.log(`  Created: ${item.created_at}`);
      console.log('');
    });

    return items;
  } catch (error) {
    console.error('❌ Kosa wakati wa kusoma inventory_items:', error.message);
    return [];
  }
}

async function checkProductVariants() {
  console.log('🔍 JEDWALI: lats_product_variants');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  try {
    const variants = await sql`
      SELECT 
        id,
        product_id,
        variant_name,
        parent_variant_id,
        is_parent,
        is_active,
        variant_type,
        sku,
        quantity,
        created_at
      FROM lats_product_variants
      ORDER BY created_at DESC
    `;

    console.log(`📦 Jumla ya records: ${variants.length}\n`);

    if (variants.length === 0) {
      console.log('⚠️  Hakuna data katika jedwali la lats_product_variants\n');
      return [];
    }

    // Display all records
    variants.forEach((variant, index) => {
      console.log(`Record #${index + 1}:`);
      console.log(`  ID: ${variant.id}`);
      console.log(`  Product ID: ${variant.product_id || '❌ TUPU'}`);
      console.log(`  Variant Name: ${variant.variant_name || '❌ TUPU'}`);
      console.log(`  Parent Variant ID: ${variant.parent_variant_id || '❌ TUPU'}`);
      console.log(`  Is Parent: ${variant.is_parent ? '✅ Ndio' : '❌ Hapana'}`);
      console.log(`  Variant Type: ${variant.variant_type || '❌ TUPU'}`);
      console.log(`  Is Active: ${variant.is_active ? '✅ Ndio' : '❌ Hapana'}`);
      console.log(`  SKU: ${variant.sku || '❌ TUPU'}`);
      console.log(`  Quantity: ${variant.quantity ?? '❌ TUPU'}`);
      console.log(`  Created: ${variant.created_at}`);
      console.log('');
    });

    return variants;
  } catch (error) {
    console.error('❌ Kosa wakati wa kusoma lats_product_variants:', error.message);
    return [];
  }
}

function analyzeData(inventoryItems, variants) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 UCHAMBUZI WA MATATIZO');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const issues = [];

  // Check inventory_items for issues
  console.log('🔍 Uchunguzi wa inventory_items:\n');
  
  const emptyImeiInventory = inventoryItems.filter(item => !item.imei || item.imei.trim() === '');
  const invalidImeiInventory = inventoryItems.filter(item => 
    item.imei && item.imei.length !== 15 && item.imei.length !== 17
  );
  const noVariantId = inventoryItems.filter(item => !item.variant_id);
  const noProductId = inventoryItems.filter(item => !item.product_id);
  
  // Find duplicate IMEIs in inventory
  const imeiCount = {};
  inventoryItems.forEach(item => {
    if (item.imei) {
      imeiCount[item.imei] = (imeiCount[item.imei] || 0) + 1;
    }
  });
  const duplicateImeis = Object.entries(imeiCount).filter(([imei, count]) => count > 1);

  if (emptyImeiInventory.length > 0) {
    console.log(`⚠️  IMEI tupu: ${emptyImeiInventory.length} records`);
    emptyImeiInventory.slice(0, 5).forEach(item => {
      console.log(`   - ID ${item.id.substring(0, 8)}... | Serial: ${item.serial_number || 'TUPU'} | Status: ${item.status}`);
    });
    if (emptyImeiInventory.length > 5) {
      console.log(`   ... na ${emptyImeiInventory.length - 5} zaidi`);
    }
    issues.push(`inventory_items: ${emptyImeiInventory.length} records zenye IMEI tupu`);
  } else {
    console.log('✅ Hakuna IMEI tupu');
  }

  if (invalidImeiInventory.length > 0) {
    console.log(`⚠️  IMEI isiyo halali: ${invalidImeiInventory.length} records`);
    invalidImeiInventory.forEach(item => {
      console.log(`   - ID ${item.id.substring(0, 8)}...: IMEI="${item.imei}" (urefu: ${item.imei?.length || 0})`);
    });
    issues.push(`inventory_items: ${invalidImeiInventory.length} records zenye IMEI isiyo halali`);
  } else {
    console.log('✅ Hakuna IMEI isiyo halali');
  }

  if (duplicateImeis.length > 0) {
    console.log(`⚠️  IMEI rudufu: ${duplicateImeis.length} IMEI`);
    duplicateImeis.forEach(([imei, count]) => {
      console.log(`   - IMEI ${imei}: inaonekana mara ${count}`);
    });
    issues.push(`inventory_items: ${duplicateImeis.length} IMEI rudufu`);
  } else {
    console.log('✅ Hakuna IMEI rudufu');
  }

  if (noVariantId.length > 0) {
    console.log(`⚠️  Bila variant_id: ${noVariantId.length} records`);
    issues.push(`inventory_items: ${noVariantId.length} records bila variant_id`);
  } else {
    console.log('✅ Records zote zina variant_id');
  }

  if (noProductId.length > 0) {
    console.log(`⚠️  Bila product_id: ${noProductId.length} records`);
    issues.push(`inventory_items: ${noProductId.length} records bila product_id`);
  } else {
    console.log('✅ Records zote zina product_id');
  }

  // Check variants for issues
  console.log('\n🔍 Uchunguzi wa lats_product_variants:\n');
  
  const childNoParent = variants.filter(v => 
    !v.is_parent && v.variant_type === 'imei' && !v.parent_variant_id
  );
  const parentVariants = variants.filter(v => v.is_parent);
  const childVariants = variants.filter(v => !v.is_parent);
  const imeiVariants = variants.filter(v => v.variant_type === 'imei');
  const standardVariants = variants.filter(v => v.variant_type === 'standard');
  const noProductIdVariants = variants.filter(v => !v.product_id);
  const inactiveVariants = variants.filter(v => !v.is_active);

  console.log(`📊 Parent Variants: ${parentVariants.length}`);
  console.log(`📊 Child Variants: ${childVariants.length}`);
  console.log(`📊 IMEI Variants: ${imeiVariants.length}`);
  console.log(`📊 Standard Variants: ${standardVariants.length}`);
  console.log('');

  if (childNoParent.length > 0) {
    console.log(`⚠️  IMEI variants bila parent_variant_id: ${childNoParent.length} records`);
    childNoParent.slice(0, 5).forEach(v => {
      console.log(`   - ID ${v.id.substring(0, 8)}... | Name: ${v.variant_name || 'TUPU'} | SKU: ${v.sku || 'TUPU'}`);
    });
    if (childNoParent.length > 5) {
      console.log(`   ... na ${childNoParent.length - 5} zaidi`);
    }
    issues.push(`lats_product_variants: ${childNoParent.length} IMEI variants bila parent_variant_id`);
  } else {
    console.log('✅ IMEI variants zote zina parent_variant_id');
  }

  if (noProductIdVariants.length > 0) {
    console.log(`⚠️  Variants bila product_id: ${noProductIdVariants.length} records`);
    issues.push(`lats_product_variants: ${noProductIdVariants.length} variants bila product_id`);
  } else {
    console.log('✅ Variants zote zina product_id');
  }

  if (inactiveVariants.length > 0) {
    console.log(`ℹ️  Inactive variants: ${inactiveVariants.length} records`);
  }

  // Check for orphaned parent variants (parent with no children)
  const orphanedParents = parentVariants.filter(parent => {
    const hasChildren = variants.some(v => v.parent_variant_id === parent.id);
    return !hasChildren;
  });

  if (orphanedParents.length > 0) {
    console.log(`⚠️  Parent variants bila watoto (children): ${orphanedParents.length} records`);
    orphanedParents.slice(0, 5).forEach(p => {
      console.log(`   - ID ${p.id.substring(0, 8)}... | Name: ${p.variant_name || 'TUPU'} | Product: ${p.product_id?.substring(0, 8) || 'TUPU'}...`);
    });
    if (orphanedParents.length > 5) {
      console.log(`   ... na ${orphanedParents.length - 5} zaidi`);
    }
    issues.push(`lats_product_variants: ${orphanedParents.length} parent variants bila watoto`);
  } else if (parentVariants.length > 0) {
    console.log('✅ Parent variants zote zina watoto');
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 MUHTASARI');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  if (issues.length === 0) {
    console.log('✅ HAKUNA MATATIZO YALIYOPATIKANA!');
    console.log('   Data yote iko sawa na sahihi.\n');
  } else {
    console.log(`⚠️  MATATIZO ${issues.length} YAMEPATIKANA:\n`);
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
    console.log('');
  }

  // Stats
  console.log('📈 TAKWIMU:');
  console.log(`   - inventory_items: ${inventoryItems.length} records`);
  console.log(`   - lats_product_variants: ${variants.length} records`);
  console.log(`     • Parent variants: ${parentVariants.length}`);
  console.log(`     • Child variants: ${childVariants.length}`);
  console.log(`     • IMEI variants: ${imeiVariants.length}`);
  console.log(`     • Standard variants: ${standardVariants.length}`);
  console.log(`     • Inactive: ${inactiveVariants.length}`);
  console.log('');
}

async function main() {
  try {
    const inventoryItems = await checkInventoryItems();
    const variants = await checkProductVariants();
    analyzeData(inventoryItems, variants);
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Uchunguzi umekamilika!');
    console.log('═══════════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Kosa:', error);
    process.exit(1);
  }
}

main();

