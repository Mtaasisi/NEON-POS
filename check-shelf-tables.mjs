#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';

console.log('\n🔍 CHECKING SHELF/STORAGE TABLES...\n');

let DATABASE_URL;
try {
  if (existsSync('database-config.json')) {
    const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
    DATABASE_URL = config.connectionString || config.url;
  } else {
    DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
  }
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function checkShelfTables() {
  try {
    // Check for storage-related tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (
          table_name LIKE '%shelf%' 
          OR table_name LIKE '%storage%' 
          OR table_name LIKE '%room%'
          OR table_name LIKE '%location%'
        )
      ORDER BY table_name
    `;

    console.log('📊 Storage/Shelf Tables Found:\n');
    if (tables.length > 0) {
      tables.forEach(t => console.log(`   ✅ ${t.table_name}`));
    } else {
      console.log('   ❌ No storage tables found');
    }
    console.log('');

    // Check for shelf data
    const shelfCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'lats_store_shelves'
      ) as shelf_table_exists
    `;

    if (shelfCheck[0].shelf_table_exists) {
      const shelfCount = await sql`SELECT COUNT(*) as count FROM lats_store_shelves`;
      const activeCount = await sql`SELECT COUNT(*) as count FROM lats_store_shelves WHERE is_active = true`;
      
      console.log('📦 Shelf Statistics:');
      console.log(`   Total shelves: ${shelfCount[0].count}`);
      console.log(`   Active shelves: ${activeCount[0].count}\n`);

      if (activeCount[0].count > 0) {
        const sampleShelves = await sql`
          SELECT id, name, code, shelf_type, is_active 
          FROM lats_store_shelves 
          WHERE is_active = true 
          LIMIT 5
        `;
        
        console.log('📋 Sample Shelves:');
        console.table(sampleShelves);
      }
    }

    // Check product-shelf relationships
    const productShelfCheck = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'lats_products'
        AND (
          column_name LIKE '%shelf%' 
          OR column_name LIKE '%storage%' 
          OR column_name LIKE '%room%'
        )
      ORDER BY column_name
    `;

    if (productShelfCheck.length > 0) {
      console.log('\n🔗 Product Storage Columns:');
      console.table(productShelfCheck);

      // Check how many products have shelf assignments
      const productsWithShelf = await sql`
        SELECT 
          COUNT(*) FILTER (WHERE store_shelf_id IS NOT NULL) as with_shelf,
          COUNT(*) FILTER (WHERE storage_room_id IS NOT NULL) as with_room,
          COUNT(*) as total
        FROM lats_products
        WHERE is_active = true
      `;

      console.log('\n📊 Product Storage Assignments:');
      console.log(`   Products with shelf: ${productsWithShelf[0].with_shelf}/${productsWithShelf[0].total}`);
      console.log(`   Products with room: ${productsWithShelf[0].with_room}/${productsWithShelf[0].total}`);
    } else {
      console.log('\n⚠️  No storage columns found in lats_products table');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

checkShelfTables();

