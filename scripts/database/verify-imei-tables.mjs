#!/usr/bin/env node

/**
 * Pre-flight verification for IMEI cleanup script
 * Checks database connection and table structures
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function verifyConnection() {
  console.log('🔌 Testing database connection...');
  
  try {
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    console.log('✅ Database connection successful');
    console.log(`   Time: ${result[0].current_time}`);
    console.log(`   Version: ${result[0].pg_version.split(',')[0]}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function verifyTables() {
  console.log('\n📋 Checking required tables...');
  
  try {
    // Check inventory_items table
    const inventoryExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'inventory_items'
      ) as exists
    `;
    
    if (!inventoryExists[0].exists) {
      console.error('❌ Table "inventory_items" does not exist');
      return false;
    }
    console.log('✅ Table "inventory_items" exists');
    
    // Check lats_product_variants table
    const variantsExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'lats_product_variants'
      ) as exists
    `;
    
    if (!variantsExists[0].exists) {
      console.error('❌ Table "lats_product_variants" does not exist');
      return false;
    }
    console.log('✅ Table "lats_product_variants" exists');
    
    return true;
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    return false;
  }
}

async function verifyColumns() {
  console.log('\n🔍 Checking required columns...');
  
  try {
    // Check inventory_items columns
    const inventoryColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'inventory_items'
        AND column_name IN ('id', 'serial_number', 'status', 'product_id', 'parent_variant_id')
      ORDER BY column_name
    `;
    
    console.log('\n   inventory_items columns:');
    inventoryColumns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    const requiredInvCols = ['id', 'serial_number', 'status', 'product_id'];
    const missingInvCols = requiredInvCols.filter(
      col => !inventoryColumns.find(c => c.column_name === col)
    );
    
    if (missingInvCols.length > 0) {
      console.error(`❌ Missing columns in inventory_items: ${missingInvCols.join(', ')}`);
      return false;
    }
    
    // Check lats_product_variants columns
    const variantColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_product_variants'
        AND column_name IN ('id', 'product_id', 'variant_attributes', 'variant_type', 'is_active')
      ORDER BY column_name
    `;
    
    console.log('\n   lats_product_variants columns:');
    variantColumns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    const requiredVarCols = ['id', 'product_id', 'variant_attributes'];
    const missingVarCols = requiredVarCols.filter(
      col => !variantColumns.find(c => c.column_name === col)
    );
    
    if (missingVarCols.length > 0) {
      console.error(`❌ Missing columns in lats_product_variants: ${missingVarCols.join(', ')}`);
      return false;
    }
    
    // Check if variant_attributes is JSONB
    const variantAttrsCol = variantColumns.find(c => c.column_name === 'variant_attributes');
    if (variantAttrsCol && variantAttrsCol.data_type !== 'jsonb') {
      console.error(`❌ Column "variant_attributes" should be JSONB, got: ${variantAttrsCol.data_type}`);
      return false;
    }
    
    console.log('\nℹ️  IMEIs are stored in variant_attributes JSONB column as {"imei": "..."}');
    
    console.log('\n✅ All required columns present');
    return true;
  } catch (error) {
    console.error('❌ Error checking columns:', error.message);
    return false;
  }
}

async function getTableCounts() {
  console.log('\n📊 Current table counts...');
  
  try {
    const inventoryCount = await sql`SELECT COUNT(*) as count FROM inventory_items`;
    console.log(`   inventory_items: ${inventoryCount[0].count} rows`);
    
    const variantsCount = await sql`SELECT COUNT(*) as count FROM lats_product_variants`;
    console.log(`   lats_product_variants: ${variantsCount[0].count} rows`);
    
    if (inventoryCount[0].count == 0 && variantsCount[0].count == 0) {
      console.log('\n⚠️  Both tables are empty. Nothing to clean up.');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error getting table counts:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 IMEI Cleanup Pre-flight Verification');
  console.log('=========================================\n');
  
  let allChecks = true;
  
  // Run all checks
  allChecks = await verifyConnection() && allChecks;
  allChecks = await verifyTables() && allChecks;
  allChecks = await verifyColumns() && allChecks;
  allChecks = await getTableCounts() && allChecks;
  
  console.log('\n' + '='.repeat(50));
  
  if (allChecks) {
    console.log('✅ All pre-flight checks passed!');
    console.log('\n📝 You can now run: node cleanup-and-sync-imeis.mjs');
  } else {
    console.log('❌ Some checks failed. Please fix the issues above.');
    process.exit(1);
  }
}

main();

