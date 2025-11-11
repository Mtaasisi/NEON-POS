#!/usr/bin/env node
/**
 * 🚀 AUTO RECEIVE PURCHASE ORDER SCRIPT
 * =====================================
 * This script automatically:
 * 1. Fixes the missing database function
 * 2. Receives the specified Purchase Order
 * 
 * Usage: node auto-receive-po.mjs PO-1761412528053
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

// Get DATABASE_URL from environment or use default
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

// Get PO number from command line args
const PO_NUMBER = process.argv[2] || 'PO-1761412528053';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  🚀 AUTO RECEIVE PURCHASE ORDER SCRIPT                       ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`📦 Target PO: ${PO_NUMBER}`);
console.log('');

// ============================================================================
// STEP 1: Check and Create Database Function
// ============================================================================

async function checkAndCreateFunction() {
  console.log('🔍 STEP 1: Checking if database function exists...');
  
  try {
    // Check if function exists
    const checkResult = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'add_imei_to_parent_variant'
      ) as exists
    `;
    
    const functionExists = checkResult[0]?.exists;
    
    if (functionExists) {
      console.log('✅ Function already exists - skipping creation');
      return true;
    }
    
    console.log('⚠️  Function does not exist - creating it now...');
    
    // Drop any old versions
    await sql`
      DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) CASCADE
    `;
    await sql`
      DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, TEXT, TEXT) CASCADE
    `;
    await sql`
      DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) CASCADE
    `;
    await sql`
      DROP FUNCTION IF EXISTS add_imei_to_parent_variant(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, UUID, TEXT) CASCADE
    `;
    await sql`
      DROP FUNCTION IF EXISTS add_imei_to_parent_variant CASCADE
    `;
    
    // Create the function with proper signature
    await sql`
      CREATE OR REPLACE FUNCTION add_imei_to_parent_variant(
        parent_variant_id_param UUID,
        imei_param TEXT,
        serial_number_param TEXT DEFAULT NULL,
        mac_address_param TEXT DEFAULT NULL,
        cost_price_param NUMERIC DEFAULT 0,
        selling_price_param NUMERIC DEFAULT 0,
        condition_param TEXT DEFAULT 'new',
        notes_param TEXT DEFAULT NULL
      )
      RETURNS TABLE(
        success BOOLEAN,
        child_variant_id UUID,
        error_message TEXT
      ) AS $$
      DECLARE
        v_child_variant_id UUID;
        v_parent_product_id UUID;
        v_parent_sku TEXT;
        v_parent_name TEXT;
        v_parent_variant_name TEXT;
        v_parent_branch_id UUID;
        v_duplicate_count INT;
      BEGIN
        -- Validate IMEI format (15 digits)
        IF imei_param !~ '^\\d{15}$' THEN
          RETURN QUERY SELECT 
            FALSE, 
            NULL::UUID, 
            'Invalid IMEI format. Must be exactly 15 digits.' AS error_message;
          RETURN;
        END IF;

        -- Check for duplicate IMEI
        SELECT COUNT(*) INTO v_duplicate_count
        FROM lats_product_variants
        WHERE (
          variant_attributes->>'imei' = imei_param 
          OR attributes->>'imei' = imei_param
        );

        IF v_duplicate_count > 0 THEN
          RETURN QUERY SELECT 
            FALSE, 
            NULL::UUID, 
            format('IMEI %s already exists in the system', imei_param) AS error_message;
          RETURN;
        END IF;

        -- Get parent variant details
        SELECT 
          product_id, 
          sku, 
          name,
          COALESCE(variant_name, name) as variant_name,
          branch_id
        INTO 
          v_parent_product_id, 
          v_parent_sku, 
          v_parent_name,
          v_parent_variant_name,
          v_parent_branch_id
        FROM lats_product_variants
        WHERE id = parent_variant_id_param;

        IF v_parent_product_id IS NULL THEN
          RETURN QUERY SELECT 
            FALSE, 
            NULL::UUID, 
            format('Parent variant %s not found', parent_variant_id_param) AS error_message;
          RETURN;
        END IF;

        -- Create IMEI child variant
        INSERT INTO lats_product_variants (
          product_id,
          parent_variant_id,
          variant_type,
          name,
          variant_name,
          sku,
          attributes,
          variant_attributes,
          quantity,
          cost_price,
          selling_price,
          is_active,
          branch_id
        ) VALUES (
          v_parent_product_id,
          parent_variant_id_param,
          'imei_child',
          COALESCE(serial_number_param, imei_param),
          format('IMEI: %s', imei_param),
          v_parent_sku || '-IMEI-' || SUBSTRING(imei_param, 10, 6),
          jsonb_build_object(
            'imei', imei_param,
            'serial_number', serial_number_param,
            'mac_address', mac_address_param,
            'condition', condition_param,
            'imei_status', 'available',
            'parent_variant_name', v_parent_variant_name,
            'added_at', NOW(),
            'notes', notes_param
          ),
          jsonb_build_object(
            'imei', imei_param,
            'serial_number', serial_number_param,
            'mac_address', mac_address_param,
            'condition', condition_param,
            'imei_status', 'available',
            'parent_variant_name', v_parent_variant_name,
            'added_at', NOW(),
            'notes', notes_param
          ),
          1,
          COALESCE(cost_price_param, 0),
          COALESCE(selling_price_param, 0),
          true,
          v_parent_branch_id
        ) RETURNING id INTO v_child_variant_id;

        -- Mark parent as parent type
        UPDATE lats_product_variants
        SET 
          is_parent = true,
          variant_type = CASE 
            WHEN variant_type IS NULL OR variant_type = 'standard' THEN 'parent'
            ELSE variant_type
          END,
          updated_at = NOW()
        WHERE id = parent_variant_id_param
          AND (is_parent IS NULL OR is_parent = false);

        -- Update parent quantity
        UPDATE lats_product_variants
        SET 
          quantity = (
            SELECT COALESCE(SUM(quantity), 0)
            FROM lats_product_variants
            WHERE parent_variant_id = parent_variant_id_param
            AND variant_type = 'imei_child'
          ),
          updated_at = NOW()
        WHERE id = parent_variant_id_param;

        RETURN QUERY SELECT 
          TRUE, 
          v_child_variant_id, 
          NULL::TEXT AS error_message;
      END;
      $$ LANGUAGE plpgsql
    `;
    
    console.log('✅ Function created successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error creating function:', error.message);
    return false;
  }
}

// ============================================================================
// STEP 2: Get Purchase Order Details
// ============================================================================

async function getPurchaseOrder() {
  console.log('');
  console.log('🔍 STEP 2: Loading Purchase Order details...');
  
  try {
    const result = await sql`
      SELECT 
        po.id,
        po.po_number,
        po.supplier_id,
        po.status,
        po.total_amount,
        po.branch_id
      FROM lats_purchase_orders po
      WHERE po.po_number = ${PO_NUMBER}
      LIMIT 1
    `;
    
    if (result.length === 0) {
      console.error(`❌ Purchase Order ${PO_NUMBER} not found`);
      return null;
    }
    
    const po = result[0];
    console.log('✅ Purchase Order found:');
    console.log(`   - ID: ${po.id}`);
    console.log(`   - Status: ${po.status}`);
    console.log(`   - Total: ${po.total_amount}`);
    console.log(`   - Branch ID: ${po.branch_id}`);
    
    return po;
    
  } catch (error) {
    console.error('❌ Error loading PO:', error.message);
    return null;
  }
}

// ============================================================================
// STEP 3: Get PO Items
// ============================================================================

async function getPOItems(poId) {
  console.log('');
  console.log('🔍 STEP 3: Loading PO items...');
  
  try {
    const result = await sql`
      SELECT 
        poi.id,
        poi.product_id,
        poi.variant_id,
        poi.quantity_ordered,
        poi.quantity_received,
        poi.unit_cost,
        p.name as product_name,
        pv.variant_name,
        pv.sku,
        pv.variant_type
      FROM lats_purchase_order_items poi
      LEFT JOIN lats_products p ON poi.product_id = p.id
      LEFT JOIN lats_product_variants pv ON poi.variant_id = pv.id
      WHERE poi.purchase_order_id = ${poId}
    `;
    
    console.log(`✅ Found ${result.length} items in PO`);
    
    result.forEach((item, idx) => {
      const pending = item.quantity_ordered - (item.quantity_received || 0);
      console.log(`   ${idx + 1}. ${item.product_name} - ${item.variant_name}`);
      console.log(`      Ordered: ${item.quantity_ordered}, Received: ${item.quantity_received || 0}, Pending: ${pending}`);
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Error loading PO items:', error.message);
    return [];
  }
}

// ============================================================================
// STEP 4: Receive PO Items
// ============================================================================

async function receivePOItem(item, quantityToReceive) {
  try {
    // Update received quantity
    await sql`
      UPDATE lats_purchase_order_items
      SET 
        quantity_received = COALESCE(quantity_received, 0) + ${quantityToReceive},
        updated_at = NOW()
      WHERE id = ${item.id}
    `;
    
    // Update variant stock
    await sql`
      UPDATE lats_product_variants
      SET 
        quantity = COALESCE(quantity, 0) + ${quantityToReceive},
        updated_at = NOW()
      WHERE id = ${item.variant_id}
    `;
    
    // Create stock movement record
    await sql`
      INSERT INTO lats_stock_movements (
        product_id,
        variant_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_at
      ) VALUES (
        ${item.product_id},
        ${item.variant_id},
        'purchase',
        ${quantityToReceive},
        'purchase_order',
        ${item.id},
        'Auto-received via script',
        NOW()
      )
    `;
    
    return true;
  } catch (error) {
    console.error(`   ❌ Error receiving item: ${error.message}`);
    return false;
  }
}

// ============================================================================
// STEP 5: Update PO Status
// ============================================================================

async function updatePOStatus(poId) {
  try {
    // Check if all items are fully received
    const result = await sql`
      SELECT 
        SUM(quantity_ordered) as total_ordered,
        SUM(COALESCE(quantity_received, 0)) as total_received
      FROM lats_purchase_order_items
      WHERE purchase_order_id = ${poId}
    `;
    
    const { total_ordered, total_received } = result[0];
    
    const newStatus = total_received >= total_ordered ? 'received' : 'partially_received';
    
    await sql`
      UPDATE lats_purchase_orders
      SET 
        status = ${newStatus},
        received_date = CASE 
          WHEN ${newStatus} = 'received' THEN NOW() 
          ELSE received_date 
        END,
        updated_at = NOW()
      WHERE id = ${poId}
    `;
    
    console.log(`✅ PO status updated to: ${newStatus}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error updating PO status:', error.message);
    return false;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    // Step 1: Ensure function exists
    const functionReady = await checkAndCreateFunction();
    if (!functionReady) {
      console.error('');
      console.error('❌ FAILED: Could not create database function');
      process.exit(1);
    }
    
    // Step 2: Get PO
    const po = await getPurchaseOrder();
    if (!po) {
      console.error('');
      console.error('❌ FAILED: Purchase Order not found');
      process.exit(1);
    }
    
    // Step 3: Get items
    const items = await getPOItems(po.id);
    if (items.length === 0) {
      console.error('');
      console.error('❌ FAILED: No items found in Purchase Order');
      process.exit(1);
    }
    
    // Step 4: Receive all pending items
    console.log('');
    console.log('📦 STEP 4: Receiving PO items...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of items) {
      const pending = item.quantity_ordered - (item.quantity_received || 0);
      
      if (pending > 0) {
        console.log(`   📥 Receiving ${pending} units of ${item.product_name}...`);
        const success = await receivePOItem(item, pending);
        
        if (success) {
          successCount++;
          console.log(`   ✅ Successfully received`);
        } else {
          errorCount++;
        }
      } else {
        console.log(`   ⏭️  Skipping ${item.product_name} (already fully received)`);
      }
    }
    
    // Step 5: Update PO status
    console.log('');
    console.log('🔄 STEP 5: Updating PO status...');
    await updatePOStatus(po.id);
    
    // Final summary
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ PURCHASE ORDER RECEIVED SUCCESSFULLY!                    ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📊 Summary:`);
    console.log(`   - PO Number: ${PO_NUMBER}`);
    console.log(`   - Items Received: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log('');
    console.log('🎉 You can now refresh your browser to see the updated PO!');
    console.log('');
    
    process.exit(0);
    
  } catch (error) {
    console.error('');
    console.error('╔═══════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ ERROR OCCURRED                                           ║');
    console.error('╚═══════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error(error);
    console.error('');
    process.exit(1);
  }
}

// Run the script
main();

