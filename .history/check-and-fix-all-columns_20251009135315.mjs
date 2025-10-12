#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

console.log('\n🔍 Checking and Fixing All Missing Columns');
console.log('==========================================\n');

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function fixAllColumns() {
  try {
    console.log('📡 Connecting to Neon database...\n');

    // Check current columns
    console.log('🔍 Checking existing columns in lats_products...\n');
    const existingColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_products'
      ORDER BY ordinal_position
    `;

    const columnNames = existingColumns.map(c => c.column_name);
    console.log('Current columns:', columnNames.join(', '));
    console.log('\n');

    // List of all required columns with their definitions
    const requiredColumns = [
      { name: 'tags', type: 'TEXT[]', default: "'{}'", comment: 'Product tags for filtering and search' },
      { name: 'attributes', type: 'JSONB', default: "'{}'::jsonb", comment: 'Product attributes (color, size, etc.)' },
      { name: 'metadata', type: 'JSONB', default: "'{}'::jsonb", comment: 'Additional metadata' },
      { name: 'selling_price', type: 'NUMERIC(10, 2)', default: '0', comment: 'Selling price' },
      { name: 'cost_price', type: 'NUMERIC(10, 2)', default: '0', comment: 'Cost price' },
      { name: 'stock_quantity', type: 'INTEGER', default: '0', comment: 'Stock quantity' },
      { name: 'min_stock_level', type: 'INTEGER', default: '0', comment: 'Minimum stock level' },
      { name: 'total_quantity', type: 'INTEGER', default: '0', comment: 'Total quantity including variants' },
      { name: 'total_value', type: 'NUMERIC(12, 2)', default: '0', comment: 'Total value of inventory' },
      { name: 'storage_room_id', type: 'UUID', default: 'NULL', comment: 'Storage room ID' },
      { name: 'store_shelf_id', type: 'UUID', default: 'NULL', comment: 'Store shelf ID' }
    ];

    // Add missing columns
    for (const col of requiredColumns) {
      if (!columnNames.includes(col.name)) {
        console.log(`➕ Adding missing column: ${col.name} (${col.type})...`);
        
        await sql.unsafe(`
          ALTER TABLE lats_products 
          ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}
        `);
        
        await sql.unsafe(`
          COMMENT ON COLUMN lats_products.${col.name} IS '${col.comment}'
        `);
        
        console.log(`   ✅ Added ${col.name}\n`);
      } else {
        console.log(`✓ ${col.name} already exists\n`);
      }
    }

    // Verify all columns now exist
    console.log('\n🔍 Verifying all columns...\n');
    const finalColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lats_products'
      AND column_name IN (${sql(requiredColumns.map(c => c.name))})
    `;

    const foundColumns = finalColumns.map(c => c.column_name);
    const allFound = requiredColumns.every(c => foundColumns.includes(c.name));

    if (allFound) {
      console.log('=====================================');
      console.log('✅ ALL COLUMNS VERIFIED!');
      console.log('=====================================\n');
      console.log('All required columns exist:');
      requiredColumns.forEach(c => console.log(`  ✓ ${c.name}`));
      console.log('\nYour product creation should now work!\n');
    } else {
      const missing = requiredColumns.filter(c => !foundColumns.includes(c.name));
      console.log('⚠️ Some columns still missing:');
      missing.forEach(c => console.log(`  ✗ ${c.name}`));
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

fixAllColumns();

