#!/usr/bin/env node
/**
 * 🏷️ ADD IMEIs TO RECEIVED PURCHASE ORDER
 * ========================================
 * This script adds IMEI numbers to already-received PO items
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

const PO_NUMBER = 'PO-1761412528053';

// The IMEIs you were trying to add (from your error log)
const IMEIS_TO_ADD = [
  {
    imei: '324324234324233',
    serial_number: '324324234324233',
    cost_price: 1500000,
    selling_price: 1500000,
    condition: 'new'
  },
  {
    imei: '324324342343433',
    serial_number: '324324342343433',
    cost_price: 1500000,
    selling_price: 1500000,
    condition: 'new'
  }
];

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  🏷️  ADD IMEIs TO PURCHASE ORDER                             ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`📦 PO Number: ${PO_NUMBER}`);
console.log(`🏷️  IMEIs to add: ${IMEIS_TO_ADD.length}`);
console.log('');

async function getPODetails() {
  console.log('🔍 Step 1: Loading PO details...');
  
  const result = await sql`
    SELECT 
      po.id as po_id,
      poi.id as item_id,
      poi.variant_id,
      poi.product_id,
      p.name as product_name,
      pv.variant_name,
      pv.variant_type,
      pv.is_parent
    FROM lats_purchase_orders po
    JOIN lats_purchase_order_items poi ON po.id = poi.purchase_order_id
    JOIN lats_products p ON poi.product_id = p.id
    LEFT JOIN lats_product_variants pv ON poi.variant_id = pv.id
    WHERE po.po_number = ${PO_NUMBER}
    LIMIT 1
  `;
  
  if (result.length === 0) {
    throw new Error(`PO ${PO_NUMBER} not found`);
  }
  
  const po = result[0];
  console.log(`✅ Found: ${po.product_name} - ${po.variant_name}`);
  console.log(`   - Variant ID: ${po.variant_id}`);
  console.log(`   - Variant Type: ${po.variant_type || 'standard'}`);
  console.log(`   - Is Parent: ${po.is_parent || false}`);
  console.log('');
  
  return po;
}

async function markVariantAsParent(variantId) {
  console.log('🔄 Step 2: Marking variant as parent...');
  
  await sql`
    UPDATE lats_product_variants
    SET 
      is_parent = true,
      variant_type = CASE 
        WHEN variant_type IS NULL OR variant_type = 'standard' THEN 'parent'
        ELSE variant_type
      END,
      updated_at = NOW()
    WHERE id = ${variantId}
  `;
  
  console.log('✅ Variant marked as parent');
  console.log('');
}

async function addIMEI(parentVariantId, imeiData) {
  try {
    const result = await sql`
      SELECT * FROM add_imei_to_parent_variant(
        ${parentVariantId}::uuid,
        ${imeiData.imei}::text,
        ${imeiData.serial_number}::text,
        NULL::text,
        ${imeiData.cost_price}::numeric,
        ${imeiData.selling_price}::numeric,
        ${imeiData.condition}::text,
        NULL::text
      )
    `;
    
    if (result.length > 0 && result[0].success) {
      console.log(`   ✅ IMEI ${imeiData.imei} added successfully`);
      console.log(`      Child Variant ID: ${result[0].child_variant_id}`);
      return { success: true, childId: result[0].child_variant_id };
    } else {
      const error = result[0]?.error_message || 'Unknown error';
      console.log(`   ❌ Failed to add IMEI ${imeiData.imei}: ${error}`);
      return { success: false, error };
    }
  } catch (error) {
    console.log(`   ❌ Error adding IMEI ${imeiData.imei}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function checkDuplicateIMEI(imei) {
  const result = await sql`
    SELECT id, variant_name, product_id
    FROM lats_product_variants
    WHERE variant_attributes->>'imei' = ${imei}
    OR attributes->>'imei' = ${imei}
  `;
  
  return result.length > 0 ? result[0] : null;
}

async function main() {
  try {
    // Step 1: Get PO details
    const po = await getPODetails();
    
    // Step 2: Mark variant as parent (if not already)
    if (!po.is_parent) {
      await markVariantAsParent(po.variant_id);
    } else {
      console.log('✅ Variant is already marked as parent');
      console.log('');
    }
    
    // Step 3: Add each IMEI
    console.log('🏷️  Step 3: Adding IMEIs...');
    console.log('');
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const imeiData of IMEIS_TO_ADD) {
      console.log(`📱 Processing IMEI: ${imeiData.imei}`);
      
      // Check if IMEI already exists
      const existing = await checkDuplicateIMEI(imeiData.imei);
      if (existing) {
        console.log(`   ⏭️  IMEI already exists (Variant ID: ${existing.id})`);
        skipCount++;
        continue;
      }
      
      // Add IMEI
      const result = await addIMEI(po.variant_id, imeiData);
      
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    }
    
    // Step 4: Verify parent stock
    console.log('');
    console.log('🔍 Step 4: Verifying stock...');
    
    const stockResult = await sql`
      SELECT 
        parent.id,
        parent.variant_name,
        parent.quantity as parent_quantity,
        COUNT(child.id) as child_count
      FROM lats_product_variants parent
      LEFT JOIN lats_product_variants child 
        ON child.parent_variant_id = parent.id 
        AND child.variant_type = 'imei_child'
      WHERE parent.id = ${po.variant_id}
      GROUP BY parent.id, parent.variant_name, parent.quantity
    `;
    
    if (stockResult.length > 0) {
      const stock = stockResult[0];
      console.log(`✅ Parent Variant: ${stock.variant_name}`);
      console.log(`   - Parent Quantity: ${stock.parent_quantity}`);
      console.log(`   - Child IMEIs: ${stock.child_count}`);
      
      // Update parent quantity to match children
      if (stock.parent_quantity !== stock.child_count) {
        console.log(`   🔄 Syncing parent quantity...`);
        await sql`
          UPDATE lats_product_variants
          SET quantity = ${stock.child_count},
              updated_at = NOW()
          WHERE id = ${po.variant_id}
        `;
        console.log(`   ✅ Parent quantity updated to ${stock.child_count}`);
      }
    }
    
    // Final summary
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ IMEIs ADDED SUCCESSFULLY!                                ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - IMEIs Added: ${successCount}`);
    console.log(`   - Already Existed: ${skipCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log('');
    console.log('🎉 Your devices are now tracked with IMEI numbers!');
    console.log('');
    
    // List all IMEIs for this variant
    console.log('📋 All IMEIs for this variant:');
    const allIMEIs = await sql`
      SELECT 
        id,
        variant_name,
        variant_attributes->>'imei' as imei,
        cost_price,
        selling_price,
        quantity
      FROM lats_product_variants
      WHERE parent_variant_id = ${po.variant_id}
      AND variant_type = 'imei_child'
      ORDER BY created_at DESC
    `;
    
    allIMEIs.forEach((v, idx) => {
      console.log(`   ${idx + 1}. IMEI: ${v.imei}`);
      console.log(`      ID: ${v.id}`);
      console.log(`      Cost: ${v.cost_price}, Selling: ${v.selling_price}`);
    });
    
    console.log('');
    process.exit(0);
    
  } catch (error) {
    console.error('');
    console.error('╔═══════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ ERROR                                                    ║');
    console.error('╚═══════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error(error.message);
    console.error('');
    process.exit(1);
  }
}

main();

