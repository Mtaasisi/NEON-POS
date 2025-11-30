#!/usr/bin/env node

/**
 * Detailed IMEI Analysis
 * Uchunguzi wa kina wa IMEI katika inventory_items na lats_product_variants
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

console.log('═══════════════════════════════════════════════════════════════');
console.log('📊 UCHUNGUZI WA KINA WA IMEI');
console.log('═══════════════════════════════════════════════════════════════\n');

// Validate IMEI format
function validateIMEI(imei) {
  if (!imei || imei.trim() === '') {
    return { valid: false, reason: 'TUPU' };
  }
  
  const trimmed = imei.trim();
  const length = trimmed.length;
  
  // Valid IMEI should be 15 or 17 digits
  if (length !== 15 && length !== 17) {
    return { valid: false, reason: `Urefu si sahihi (${length} badala ya 15 au 17)` };
  }
  
  // Check if it's mostly numeric (IMEI should be numeric)
  const numericChars = (trimmed.match(/\d/g) || []).length;
  const percentNumeric = (numericChars / length) * 100;
  
  if (percentNumeric < 80) {
    return { valid: false, reason: `IMEI haina tarakimu za kutosha (${percentNumeric.toFixed(0)}% ni tarakimu)` };
  }
  
  return { valid: true, reason: 'Halali' };
}

async function analyzeInventoryIMEIs() {
  console.log('🔍 JEDWALI: inventory_items');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  const items = await sql`
    SELECT 
      id,
      imei,
      serial_number,
      variant_id,
      product_id,
      status,
      created_at
    FROM inventory_items
    ORDER BY created_at DESC
  `;

  console.log(`📦 Jumla ya records: ${items.length}\n`);

  // Analyze IMEIs
  const emptyIMEIs = [];
  const invalidIMEIs = [];
  const validIMEIs = [];
  const imeiCounts = {};

  items.forEach(item => {
    const validation = validateIMEI(item.imei);
    
    if (!item.imei || item.imei.trim() === '') {
      emptyIMEIs.push(item);
    } else if (!validation.valid) {
      invalidIMEIs.push({ ...item, invalidReason: validation.reason });
    } else {
      validIMEIs.push(item);
      // Count duplicates
      const imei = item.imei.trim();
      imeiCounts[imei] = (imeiCounts[imei] || []);
      imeiCounts[imei].push(item);
    }
  });

  // Find duplicates
  const duplicates = Object.entries(imeiCounts).filter(([imei, items]) => items.length > 1);

  // Report
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1️⃣ IMEI TUPU');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  if (emptyIMEIs.length > 0) {
    console.log(`⚠️  Jumla: ${emptyIMEIs.length} records\n`);
    console.log('Sampuli (wa kwanza 10):\n');
    
    emptyIMEIs.slice(0, 10).forEach((item, idx) => {
      console.log(`${idx + 1}. ID: ${item.id.substring(0, 13)}...`);
      console.log(`   Serial Number: ${item.serial_number || 'TUPU'}`);
      console.log(`   Status: ${item.status}`);
      console.log(`   Product ID: ${item.product_id?.substring(0, 13)}...`);
      console.log(`   Variant ID: ${item.variant_id?.substring(0, 13)}...`);
      console.log('');
    });
    
    if (emptyIMEIs.length > 10) {
      console.log(`   ... na ${emptyIMEIs.length - 10} zaidi\n`);
    }
  } else {
    console.log('✅ Hakuna IMEI tupu\n');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('2️⃣ IMEI ISIYO HALALI (Invalid)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  if (invalidIMEIs.length > 0) {
    console.log(`❌ Jumla: ${invalidIMEIs.length} records\n`);
    
    invalidIMEIs.forEach((item, idx) => {
      console.log(`${idx + 1}. IMEI: "${item.imei}"`);
      console.log(`   ID: ${item.id.substring(0, 13)}...`);
      console.log(`   Sababu: ${item.invalidReason}`);
      console.log(`   Status: ${item.status}`);
      console.log(`   Product ID: ${item.product_id?.substring(0, 13)}...`);
      console.log('');
    });
  } else {
    console.log('✅ Hakuna IMEI isiyo halali\n');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('3️⃣ IMEI RUDUFU (Duplicates)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  if (duplicates.length > 0) {
    console.log(`⚠️  Jumla ya IMEI rudufu: ${duplicates.length}\n`);
    
    duplicates.forEach(([imei, items], idx) => {
      console.log(`${idx + 1}. IMEI: ${imei}`);
      console.log(`   Inaonekana mara: ${items.length}`);
      console.log(`   Records:`);
      items.forEach((item, i) => {
        console.log(`     ${i + 1}. ID: ${item.id.substring(0, 13)}... | Status: ${item.status} | Created: ${new Date(item.created_at).toLocaleDateString()}`);
      });
      console.log('');
    });
  } else {
    console.log('✅ Hakuna IMEI rudufu\n');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('4️⃣ IMEI HALALI');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`✅ Jumla: ${validIMEIs.length} records zenye IMEI halali\n`);
  
  if (validIMEIs.length > 0) {
    console.log('Sampuli (wa kwanza 5):\n');
    validIMEIs.slice(0, 5).forEach((item, idx) => {
      console.log(`${idx + 1}. IMEI: ${item.imei}`);
      console.log(`   ID: ${item.id.substring(0, 13)}...`);
      console.log(`   Status: ${item.status}`);
      console.log('');
    });
  }

  return { emptyIMEIs, invalidIMEIs, validIMEIs, duplicates };
}

async function analyzeVariantIMEIs() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🔍 JEDWALI: lats_product_variants');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const variants = await sql`
    SELECT 
      id,
      product_id,
      variant_name,
      parent_variant_id,
      is_parent,
      variant_type,
      sku,
      quantity
    FROM lats_product_variants
    WHERE is_parent = false
    ORDER BY created_at DESC
  `;

  console.log(`📦 Jumla ya child variants: ${variants.length}\n`);

  // Extract IMEIs from variant_name
  const variantIMEIs = [];
  const imeiPattern = /IMEI:\s*([^\s-]+)/g;

  variants.forEach(variant => {
    if (variant.variant_name) {
      const matches = variant.variant_name.matchAll(imeiPattern);
      for (const match of matches) {
        variantIMEIs.push({
          imei: match[1],
          variant_id: variant.id,
          variant_name: variant.variant_name,
          product_id: variant.product_id,
          variant_type: variant.variant_type
        });
      }
    }
  });

  console.log(`📊 IMEI zilizopatikana kwenye variant_name: ${variantIMEIs.length}\n`);

  // Validate variant IMEIs
  const invalidVariantIMEIs = [];
  const validVariantIMEIs = [];

  variantIMEIs.forEach(item => {
    const validation = validateIMEI(item.imei);
    if (!validation.valid) {
      invalidVariantIMEIs.push({ ...item, invalidReason: validation.reason });
    } else {
      validVariantIMEIs.push(item);
    }
  });

  if (invalidVariantIMEIs.length > 0) {
    console.log('⚠️  IMEI ISIYO HALALI katika variants:\n');
    invalidVariantIMEIs.slice(0, 10).forEach((item, idx) => {
      console.log(`${idx + 1}. IMEI: "${item.imei}"`);
      console.log(`   Variant Name: ${item.variant_name}`);
      console.log(`   Sababu: ${item.invalidReason}`);
      console.log(`   Variant ID: ${item.variant_id.substring(0, 13)}...`);
      console.log('');
    });
  } else {
    console.log('✅ IMEI zote za variants ni halali\n');
  }

  return { variantIMEIs, invalidVariantIMEIs, validVariantIMEIs };
}

async function crossReferenceIMEIs(inventoryData, variantData) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('5️⃣ CROSS-REFERENCE: inventory_items ↔️ lats_product_variants');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const inventoryIMEIs = new Set(
    inventoryData.validIMEIs.map(item => item.imei.trim())
  );
  
  const variantIMEIs = new Set(
    variantData.validVariantIMEIs.map(item => item.imei.trim())
  );

  // Find IMEIs in both tables
  const inBothTables = [...inventoryIMEIs].filter(imei => variantIMEIs.has(imei));
  
  // Find IMEIs only in inventory
  const onlyInInventory = [...inventoryIMEIs].filter(imei => !variantIMEIs.has(imei));
  
  // Find IMEIs only in variants
  const onlyInVariants = [...variantIMEIs].filter(imei => !inventoryIMEIs.has(imei));

  console.log('📊 MUHTASARI:\n');
  console.log(`   • IMEI katika jedwali ZOTE mbili: ${inBothTables.length}`);
  console.log(`   • IMEI PEKE YA inventory_items: ${onlyInInventory.length}`);
  console.log(`   • IMEI PEKE YA lats_product_variants: ${onlyInVariants.length}\n`);

  if (inBothTables.length > 0) {
    console.log('✅ IMEI zinazo MATCH (katika jedwali ZOTE mbili):\n');
    inBothTables.slice(0, 10).forEach((imei, idx) => {
      console.log(`   ${idx + 1}. ${imei}`);
    });
    if (inBothTables.length > 10) {
      console.log(`   ... na ${inBothTables.length - 10} zaidi`);
    }
    console.log('');
  }

  if (onlyInInventory.length > 0) {
    console.log('⚠️  IMEI PEKE YA inventory_items (haziko kwenye variants):\n');
    onlyInInventory.slice(0, 10).forEach((imei, idx) => {
      console.log(`   ${idx + 1}. ${imei}`);
    });
    if (onlyInInventory.length > 10) {
      console.log(`   ... na ${onlyInInventory.length - 10} zaidi`);
    }
    console.log('');
  }

  if (onlyInVariants.length > 0) {
    console.log('⚠️  IMEI PEKE YA lats_product_variants (haziko kwenye inventory):\n');
    onlyInVariants.slice(0, 10).forEach((imei, idx) => {
      console.log(`   ${idx + 1}. ${imei}`);
    });
    if (onlyInVariants.length > 10) {
      console.log(`   ... na ${onlyInVariants.length - 10} zaidi`);
    }
    console.log('');
  }
}

async function generateSummary(inventoryData, variantData) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 MUHTASARI WA JUMLA');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const totalInventoryRecords = inventoryData.emptyIMEIs.length + 
                                 inventoryData.invalidIMEIs.length + 
                                 inventoryData.validIMEIs.length;

  console.log('📊 INVENTORY_ITEMS:');
  console.log(`   • Jumla ya records: ${totalInventoryRecords}`);
  console.log(`   • IMEI tupu: ${inventoryData.emptyIMEIs.length} (${((inventoryData.emptyIMEIs.length/totalInventoryRecords)*100).toFixed(1)}%)`);
  console.log(`   • IMEI isiyo halali: ${inventoryData.invalidIMEIs.length} (${((inventoryData.invalidIMEIs.length/totalInventoryRecords)*100).toFixed(1)}%)`);
  console.log(`   • IMEI halali: ${inventoryData.validIMEIs.length} (${((inventoryData.validIMEIs.length/totalInventoryRecords)*100).toFixed(1)}%)`);
  console.log(`   • IMEI rudufu: ${inventoryData.duplicates.length}`);
  console.log('');

  console.log('📊 LATS_PRODUCT_VARIANTS:');
  console.log(`   • IMEI zilizopatikana: ${variantData.variantIMEIs.length}`);
  console.log(`   • IMEI isiyo halali: ${variantData.invalidVariantIMEIs.length}`);
  console.log(`   • IMEI halali: ${variantData.validVariantIMEIs.length}`);
  console.log('');

  // Generate recommendations
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('💡 MAPENDEKEZO');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const issues = [];

  if (inventoryData.emptyIMEIs.length > 0) {
    console.log(`1. ⚠️  ${inventoryData.emptyIMEIs.length} records za inventory_items hazina IMEI`);
    console.log('   → Angalia kama hizi ni bidhaa za IMEI au la');
    console.log('   → Kama ni bidhaa za IMEI, ongeza IMEI sahihi\n');
    issues.push('IMEI tupu');
  }

  if (inventoryData.invalidIMEIs.length > 0) {
    console.log(`2. ❌ ${inventoryData.invalidIMEIs.length} records zina IMEI isiyo halali`);
    console.log('   → Safisha au sahihisha IMEI hizi');
    console.log('   → Zinajionekana kuwa test/dummy data\n');
    issues.push('IMEI isiyo halali');
  }

  if (inventoryData.duplicates.length > 0) {
    console.log(`3. ⚠️  ${inventoryData.duplicates.length} IMEI zinaonekana mara nyingi`);
    console.log('   → Kila IMEI lazima iwe unique');
    console.log('   → Kagua na usafishe duplicates\n');
    issues.push('IMEI rudufu');
  }

  if (issues.length === 0) {
    console.log('✅ HAKUNA MATATIZO MAKUBWA!');
    console.log('   Data yote ya IMEI iko sawa.\n');
  }
}

async function main() {
  try {
    const inventoryData = await analyzeInventoryIMEIs();
    const variantData = await analyzeVariantIMEIs();
    await crossReferenceIMEIs(inventoryData, variantData);
    await generateSummary(inventoryData, variantData);
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Uchunguzi wa kina umekamilika!');
    console.log('═══════════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Kosa:', error);
    process.exit(1);
  }
}

main();

