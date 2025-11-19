#!/usr/bin/env node

/**
 * Check Table Structure
 * Angalia muundo wa jedwali la inventory_items na lats_product_variants
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

console.log('═══════════════════════════════════════════════════════════════');
console.log('🔍 MUUNDO WA JEDWALI');
console.log('═══════════════════════════════════════════════════════════════\n');

async function checkTableStructure(tableName) {
  console.log(`📋 Jedwali: ${tableName}`);
  console.log('─────────────────────────────────────────────────────────────\n');
  
  try {
    // Get column information
    const columns = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = ${tableName}
      ORDER BY ordinal_position
    `;

    if (columns.length === 0) {
      console.log(`⚠️  Jedwali "${tableName}" halijapatikana!\n`);
      return null;
    }

    console.log(`✅ Columns (${columns.length}):\n`);
    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col.column_name}`);
      console.log(`   - Type: ${col.data_type}`);
      console.log(`   - Nullable: ${col.is_nullable}`);
      if (col.column_default) {
        console.log(`   - Default: ${col.column_default}`);
      }
      console.log('');
    });

    // Get sample data
    const sampleData = await sql`
      SELECT * FROM ${sql(tableName)}
      LIMIT 5
    `;

    console.log(`📊 Sample Data (${sampleData.length} records):\n`);
    if (sampleData.length > 0) {
      sampleData.forEach((row, index) => {
        console.log(`Record #${index + 1}:`);
        console.log(JSON.stringify(row, null, 2));
        console.log('');
      });
    } else {
      console.log('⚠️  Hakuna data katika jedwali hili\n');
    }

    return columns;
  } catch (error) {
    console.error(`❌ Kosa: ${error.message}\n`);
    return null;
  }
}

async function main() {
  try {
    await checkTableStructure('inventory_items');
    console.log('═══════════════════════════════════════════════════════════════\n');
    await checkTableStructure('lats_product_variants');
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Uchunguzi wa muundo umekamilika!');
    console.log('═══════════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Kosa:', error);
    process.exit(1);
  }
}

main();

