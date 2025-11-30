#!/usr/bin/env node

/**
 * IMEI Cleanup and Synchronization Script
 * 
 * This script performs comprehensive IMEI validation and synchronization:
 * 1. Validates IMEIs in inventory_items (marks invalid ones)
 * 2. Validates IMEIs in lats_product_variants (marks invalid ones)
 * 3. Flags items with missing IMEIs
 * 4. Syncs valid IMEIs from lats_product_variants to inventory_items
 * 5. Generates detailed report
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get database URL
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'bright');
  console.log('='.repeat(70));
}

/**
 * Step 1: Get initial status before cleanup
 */
async function getInitialStatus() {
  logSection('📊 INITIAL STATUS - BEFORE CLEANUP');
  
  try {
    // Check inventory_items status distribution
    const inventoryStatus = await sql`
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
      FROM inventory_items
      GROUP BY status
      ORDER BY count DESC
    `;
    
    log('\n📦 Inventory Items Status:', 'cyan');
    console.table(inventoryStatus);
    
    // Check lats_product_variants IMEI status (stored in variant_attributes JSONB)
    const variantsStatus = await sql`
      SELECT 
        CASE 
          WHEN variant_attributes->>'imei' IS NULL OR variant_attributes->>'imei' = '' THEN 'missing_imei'
          WHEN char_length(variant_attributes->>'imei') < 15 OR char_length(variant_attributes->>'imei') > 17 THEN 'invalid_length'
          WHEN variant_attributes->>'imei' ~ '[^0-9]' THEN 'non_numeric'
          ELSE 'valid'
        END as imei_category,
        COUNT(*) as count,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
      FROM lats_product_variants
      WHERE variant_type = 'imei_child' OR variant_attributes ? 'imei'
      GROUP BY imei_category
      ORDER BY count DESC
    `;
    
    log('\n📱 Product Variants IMEI Status:', 'cyan');
    console.table(variantsStatus);
    
    // Check for IMEIs that exist in variants but not in inventory
    const missingInInventory = await sql`
      SELECT COUNT(*) as count
      FROM lats_product_variants lv
      LEFT JOIN inventory_items i ON (lv.variant_attributes->>'imei') = i.serial_number
      WHERE i.id IS NULL 
        AND lv.variant_attributes->>'imei' IS NOT NULL 
        AND lv.variant_attributes->>'imei' != ''
        AND char_length(lv.variant_attributes->>'imei') BETWEEN 15 AND 17
        AND lv.variant_attributes->>'imei' ~ '^[0-9]+$'
        AND (lv.variant_type = 'imei_child' OR lv.variant_attributes ? 'imei')
    `;
    
    log(`\n🔍 Valid IMEIs in variants but missing in inventory: ${missingInInventory[0].count}`, 'yellow');
    
    return {
      inventoryStatus,
      variantsStatus,
      missingInInventory: missingInInventory[0].count
    };
  } catch (error) {
    log(`❌ Error getting initial status: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Step 2: Cleanup invalid IMEIs in inventory_items
 */
async function cleanupInventoryItems() {
  logSection('🧹 STEP 1: Cleaning up inventory_items');
  
  try {
    // First, show what will be affected
    const toBeMarkedInvalid = await sql`
      SELECT 
        id,
        serial_number,
        status,
        CASE 
          WHEN serial_number IS NULL OR serial_number = '' THEN 'empty_or_null'
          WHEN char_length(serial_number) < 15 THEN 'too_short'
          WHEN char_length(serial_number) > 17 THEN 'too_long'
          WHEN serial_number ~ '[^0-9]' THEN 'non_numeric'
          ELSE 'unknown'
        END as invalid_reason
      FROM inventory_items
      WHERE status NOT IN ('damaged', 'sold', 'returned')
        AND (
          serial_number IS NULL 
          OR serial_number = ''
          OR char_length(serial_number) < 15
          OR char_length(serial_number) > 17
          OR serial_number ~ '[^0-9]'
        )
      LIMIT 10
    `;
    
    if (toBeMarkedInvalid.length > 0) {
      log('\n📋 Sample items to be marked as invalid:', 'yellow');
      console.table(toBeMarkedInvalid);
    }
    
    // Get count before update
    const countBefore = await sql`
      SELECT COUNT(*) as count
      FROM inventory_items
      WHERE status NOT IN ('damaged', 'sold', 'returned')
        AND (
          serial_number IS NULL 
          OR serial_number = ''
          OR char_length(serial_number) < 15
          OR char_length(serial_number) > 17
          OR serial_number ~ '[^0-9]'
        )
    `;
    
    if (countBefore[0].count === 0) {
      log('✅ No invalid IMEIs found in inventory_items', 'green');
      return { updated: 0 };
    }
    
    log(`\n⚠️  Found ${countBefore[0].count} items with invalid IMEIs`, 'yellow');
    
    // Perform the update - use 'damaged' status for invalid IMEIs
    const result = await sql`
      UPDATE inventory_items
      SET status = 'damaged',
          notes = COALESCE(notes, '') || ' [INVALID IMEI]',
          updated_at = NOW()
      WHERE status NOT IN ('damaged', 'sold', 'returned')
        AND (
          serial_number IS NULL 
          OR serial_number = ''
          OR char_length(serial_number) < 15
          OR char_length(serial_number) > 17
          OR serial_number ~ '[^0-9]'
        )
    `;
    
    log(`✅ Marked ${result.length} items as 'damaged' (invalid IMEI) in inventory_items`, 'green');
    
    return { updated: result.length };
  } catch (error) {
    log(`❌ Error cleaning inventory_items: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Step 3: Cleanup invalid IMEIs in lats_product_variants
 */
async function cleanupProductVariants() {
  logSection('🧹 STEP 2: Cleaning up lats_product_variants');
  
  try {
    // Show what will be affected (check invalid IMEIs in variant_attributes)
    const toBeMarkedInvalid = await sql`
      SELECT 
        id,
        variant_attributes->>'imei' as imei,
        variant_type,
        CASE 
          WHEN variant_attributes->>'imei' IS NULL OR variant_attributes->>'imei' = '' THEN 'empty_or_null'
          WHEN char_length(variant_attributes->>'imei') < 15 THEN 'too_short'
          WHEN char_length(variant_attributes->>'imei') > 17 THEN 'too_long'
          WHEN variant_attributes->>'imei' ~ '[^0-9]' THEN 'non_numeric'
          ELSE 'unknown'
        END as invalid_reason
      FROM lats_product_variants
      WHERE (variant_type = 'imei_child' OR variant_attributes ? 'imei')
        AND (
          variant_attributes->>'imei' IS NULL 
          OR variant_attributes->>'imei' = ''
          OR char_length(variant_attributes->>'imei') < 15
          OR char_length(variant_attributes->>'imei') > 17
          OR variant_attributes->>'imei' ~ '[^0-9]'
        )
      LIMIT 10
    `;
    
    if (toBeMarkedInvalid.length > 0) {
      log('\n📋 Sample variants to be marked as invalid:', 'yellow');
      console.table(toBeMarkedInvalid);
    }
    
    // Get count before update
    const countBefore = await sql`
      SELECT COUNT(*) as count
      FROM lats_product_variants
      WHERE (variant_type = 'imei_child' OR variant_attributes ? 'imei')
        AND is_active = TRUE
        AND (
          variant_attributes->>'imei' IS NULL 
          OR variant_attributes->>'imei' = ''
          OR char_length(variant_attributes->>'imei') < 15
          OR char_length(variant_attributes->>'imei') > 17
          OR variant_attributes->>'imei' ~ '[^0-9]'
        )
    `;
    
    if (countBefore[0].count === 0) {
      log('✅ No invalid IMEIs found in lats_product_variants', 'green');
      return { updated: 0 };
    }
    
    log(`\n⚠️  Found ${countBefore[0].count} variants with invalid IMEIs`, 'yellow');
    
    // Perform the update - mark variant as inactive and update variant_attributes
    const result = await sql`
      UPDATE lats_product_variants
      SET is_active = FALSE,
          variant_attributes = variant_attributes || '{"imei_status": "invalid"}'::jsonb,
          updated_at = NOW()
      WHERE (variant_type = 'imei_child' OR variant_attributes ? 'imei')
        AND is_active = TRUE
        AND (
          variant_attributes->>'imei' IS NULL 
          OR variant_attributes->>'imei' = ''
          OR char_length(variant_attributes->>'imei') < 15
          OR char_length(variant_attributes->>'imei') > 17
          OR variant_attributes->>'imei' ~ '[^0-9]'
        )
    `;
    
    log(`✅ Marked ${result.length} variants as invalid (is_active=false) in lats_product_variants`, 'green');
    
    return { updated: result.length };
  } catch (error) {
    log(`❌ Error cleaning lats_product_variants: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Step 4: Flag items with missing IMEIs
 */
async function flagMissingIMEIs() {
  logSection('🏷️  STEP 3: Flagging items with missing IMEIs');
  
  try {
    // Get count before update
    const countBefore = await sql`
      SELECT COUNT(*) as count
      FROM inventory_items
      WHERE (serial_number IS NULL OR serial_number = '')
        AND status NOT IN ('pending_quality_check', 'damaged', 'sold', 'returned')
    `;
    
    if (countBefore[0].count === 0) {
      log('✅ No items with missing IMEIs found', 'green');
      return { updated: 0 };
    }
    
    log(`\n⚠️  Found ${countBefore[0].count} items with missing IMEIs`, 'yellow');
    
    // Perform the update - use 'pending_quality_check' for missing IMEIs
    const result = await sql`
      UPDATE inventory_items
      SET status = 'pending_quality_check',
          notes = COALESCE(notes, '') || ' [MISSING IMEI]',
          updated_at = NOW()
      WHERE (serial_number IS NULL OR serial_number = '')
        AND status NOT IN ('pending_quality_check', 'damaged', 'sold', 'returned')
    `;
    
    log(`✅ Flagged ${result.length} items as 'pending_quality_check' (missing IMEI)`, 'green');
    
    return { updated: result.length };
  } catch (error) {
    log(`❌ Error flagging missing IMEIs: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Step 5: Sync valid IMEIs from variants to inventory
 */
async function syncIMEIsToInventory() {
  logSection('🔄 STEP 4: Syncing valid IMEIs to inventory_items');
  
  try {
    // Find valid IMEIs in variants that don't exist in inventory
    const missingIMEIs = await sql`
      SELECT 
        lv.id as variant_id,
        lv.variant_attributes->>'imei' as imei,
        lv.product_id,
        p.name as product_name,
        lv.variant_type
      FROM lats_product_variants lv
      LEFT JOIN inventory_items i ON (lv.variant_attributes->>'imei') = i.serial_number
      LEFT JOIN lats_products p ON lv.product_id = p.id
      WHERE i.id IS NULL 
        AND lv.variant_attributes->>'imei' IS NOT NULL 
        AND lv.variant_attributes->>'imei' != ''
        AND char_length(lv.variant_attributes->>'imei') BETWEEN 15 AND 17
        AND lv.variant_attributes->>'imei' ~ '^[0-9]+$'
        AND lv.is_active = TRUE
        AND (lv.variant_type = 'imei_child' OR lv.variant_attributes ? 'imei')
      LIMIT 10
    `;
    
    if (missingIMEIs.length > 0) {
      log('\n📋 Sample IMEIs to be synced:', 'yellow');
      console.table(missingIMEIs);
    }
    
    // Get total count
    const countToSync = await sql`
      SELECT COUNT(*) as count
      FROM lats_product_variants lv
      LEFT JOIN inventory_items i ON (lv.variant_attributes->>'imei') = i.serial_number
      WHERE i.id IS NULL 
        AND lv.variant_attributes->>'imei' IS NOT NULL 
        AND lv.variant_attributes->>'imei' != ''
        AND char_length(lv.variant_attributes->>'imei') BETWEEN 15 AND 17
        AND lv.variant_attributes->>'imei' ~ '^[0-9]+$'
        AND lv.is_active = TRUE
        AND (lv.variant_type = 'imei_child' OR lv.variant_attributes ? 'imei')
    `;
    
    if (countToSync[0].count === 0) {
      log('✅ All valid IMEIs from variants already exist in inventory', 'green');
      return { synced: 0 };
    }
    
    log(`\n⚠️  Found ${countToSync[0].count} valid IMEIs to sync`, 'yellow');
    
    // Perform the sync - Note: inventory_items has variant_id, not parent_variant_id
    const result = await sql`
      INSERT INTO inventory_items (
        serial_number, 
        imei,
        status, 
        product_id, 
        variant_id, 
        created_at,
        updated_at
      )
      SELECT 
        lv.variant_attributes->>'imei' as serial_number,
        lv.variant_attributes->>'imei' as imei,
        'available' as status,
        lv.product_id,
        lv.id as variant_id,
        NOW() as created_at,
        NOW() as updated_at
      FROM lats_product_variants lv
      LEFT JOIN inventory_items i ON (lv.variant_attributes->>'imei') = i.serial_number
      WHERE i.id IS NULL 
        AND lv.variant_attributes->>'imei' IS NOT NULL 
        AND lv.variant_attributes->>'imei' != ''
        AND char_length(lv.variant_attributes->>'imei') BETWEEN 15 AND 17
        AND lv.variant_attributes->>'imei' ~ '^[0-9]+$'
        AND lv.is_active = TRUE
        AND (lv.variant_type = 'imei_child' OR lv.variant_attributes ? 'imei')
      RETURNING id
    `;
    
    log(`✅ Synced ${result.length} valid IMEIs to inventory_items`, 'green');
    
    return { synced: result.length };
  } catch (error) {
    log(`❌ Error syncing IMEIs: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Step 6: Generate final report
 */
async function generateFinalReport() {
  logSection('📊 FINAL REPORT - AFTER CLEANUP & SYNC');
  
  try {
    // Inventory items status
    const inventoryStatus = await sql`
      SELECT 
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM inventory_items
      GROUP BY status
      ORDER BY count DESC
    `;
    
    log('\n📦 Inventory Items - Final Status:', 'cyan');
    console.table(inventoryStatus);
    
    // Product variants IMEI status (based on variant_attributes)
    const variantsStatus = await sql`
      SELECT 
        variant_type,
        is_active,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM lats_product_variants
      WHERE variant_type = 'imei_child' OR variant_attributes ? 'imei'
      GROUP BY variant_type, is_active
      ORDER BY count DESC
    `;
    
    log('\n📱 Product Variants - IMEI Status:', 'cyan');
    console.table(variantsStatus);
    
    // Check for duplicates
    const duplicateIMEIs = await sql`
      SELECT 
        serial_number,
        COUNT(*) as duplicate_count
      FROM inventory_items
      WHERE serial_number IS NOT NULL 
        AND serial_number != ''
        AND status NOT IN ('damaged', 'returned')
      GROUP BY serial_number
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
      LIMIT 10
    `;
    
    if (duplicateIMEIs.length > 0) {
      log('\n⚠️  Duplicate IMEIs found in inventory:', 'yellow');
      console.table(duplicateIMEIs);
    } else {
      log('\n✅ No duplicate IMEIs found in inventory', 'green');
    }
    
    // Summary statistics
    const summary = await sql`
      SELECT 
        (SELECT COUNT(*) FROM inventory_items) as total_inventory_items,
        (SELECT COUNT(*) FROM inventory_items WHERE status = 'damaged') as damaged_inventory,
        (SELECT COUNT(*) FROM inventory_items WHERE status = 'pending_quality_check') as pending_qc_inventory,
        (SELECT COUNT(*) FROM inventory_items WHERE status = 'available') as available_inventory,
        (SELECT COUNT(*) FROM lats_product_variants WHERE variant_type = 'imei_child' OR variant_attributes ? 'imei') as total_imei_variants,
        (SELECT COUNT(*) FROM lats_product_variants WHERE (variant_type = 'imei_child' OR variant_attributes ? 'imei') AND is_active = FALSE) as inactive_variants,
        (SELECT COUNT(*) FROM lats_product_variants WHERE (variant_type = 'imei_child' OR variant_attributes ? 'imei') AND (variant_attributes->>'imei' IS NULL OR variant_attributes->>'imei' = '')) as null_variant_imeis
    `;
    
    log('\n📈 Summary Statistics:', 'magenta');
    console.table(summary);
    
    return {
      inventoryStatus,
      variantsStatus,
      duplicateIMEIs,
      summary: summary[0]
    };
  } catch (error) {
    log(`❌ Error generating report: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  log('\n🚀 Starting IMEI Cleanup and Synchronization', 'bright');
  log(`⏰ Started at: ${new Date().toLocaleString()}`, 'cyan');
  
  try {
    // Step 0: Get initial status
    const initialStatus = await getInitialStatus();
    
    // Step 1: Cleanup inventory_items
    const inventoryCleanup = await cleanupInventoryItems();
    
    // Step 2: Cleanup product variants
    const variantsCleanup = await cleanupProductVariants();
    
    // Step 3: Flag missing IMEIs
    const flaggedMissing = await flagMissingIMEIs();
    
    // Step 4: Sync valid IMEIs
    const syncResult = await syncIMEIsToInventory();
    
    // Step 5: Generate final report
    const finalReport = await generateFinalReport();
    
    // Summary of changes
    logSection('✅ CLEANUP & SYNC COMPLETE');
    
    log('\n📊 Changes Summary:', 'bright');
    console.log(`  • Invalid IMEIs marked in inventory_items: ${inventoryCleanup.updated}`);
    console.log(`  • Invalid IMEIs marked in lats_product_variants: ${variantsCleanup.updated}`);
    console.log(`  • Items flagged as missing_imei: ${flaggedMissing.updated}`);
    console.log(`  • Valid IMEIs synced to inventory: ${syncResult.synced}`);
    
    log(`\n✅ All operations completed successfully!`, 'green');
    log(`⏰ Finished at: ${new Date().toLocaleString()}`, 'cyan');
    
  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();

