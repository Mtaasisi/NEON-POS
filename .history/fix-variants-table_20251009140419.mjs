#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function fixVariantsTable() {
  try {
    console.log('\n🔧 Fixing lats_product_variants table');
    console.log('======================================\n');
    
    // Check current columns
    console.log('1️⃣ Checking current columns...');
    const currentColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_product_variants'
      ORDER BY ordinal_position
    `;
    
    const columnNames = currentColumns.map(c => c.column_name);
    console.log('   Current columns:', columnNames.join(', '));
    console.log('');
    
    // Define required columns
    const requiredColumns = [
      { name: 'name', type: 'TEXT', default: "'Default'", comment: 'Variant name' },
      { name: 'cost_price', type: 'NUMERIC(10, 2)', default: '0', comment: 'Cost price' },
      { name: 'selling_price', type: 'NUMERIC(10, 2)', default: '0', comment: 'Selling price' },
      { name: 'quantity', type: 'INTEGER', default: '0', comment: 'Stock quantity' },
      { name: 'min_quantity', type: 'INTEGER', default: '0', comment: 'Minimum stock level' },
      { name: 'attributes', type: 'JSONB', default: "'{}'::jsonb", comment: 'Variant attributes' },
      { name: 'barcode', type: 'TEXT', default: 'NULL', comment: 'Barcode' },
      { name: 'weight', type: 'NUMERIC(10, 2)', default: 'NULL', comment: 'Weight' },
      { name: 'dimensions', type: 'JSONB', default: 'NULL', comment: 'Dimensions (width, height, length)' }
    ];
    
    // Add missing columns
    let addedCount = 0;
    for (const col of requiredColumns) {
      if (!columnNames.includes(col.name)) {
        console.log(`2️⃣ Adding ${col.name} column...`);
        
        await sql.unsafe(`
          ALTER TABLE lats_product_variants 
          ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}
        `);
        
        await sql.unsafe(`
          COMMENT ON COLUMN lats_product_variants.${col.name} IS '${col.comment}'
        `);
        
        console.log(`   ✅ Added ${col.name}\n`);
        addedCount++;
      } else {
        console.log(`✓ ${col.name} already exists\n`);
      }
    }
    
    // Verify
    console.log('3️⃣ Verifying all columns...\n');
    const finalColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_product_variants'
      ORDER BY ordinal_position
    `;
    
    console.log('All columns in lats_product_variants:');
    finalColumns.forEach(c => {
      const isRequired = requiredColumns.some(r => r.name === c.column_name);
      console.log(`  ${isRequired ? '✅' : '  '} ${c.column_name} (${c.data_type})`);
    });
    
    console.log('\n======================================');
    console.log(`✅ Variants table fixed!`);
    console.log('======================================\n');
    console.log(`Added ${addedCount} missing column(s).`);
    console.log('Default variants can now be created successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

fixVariantsTable();

