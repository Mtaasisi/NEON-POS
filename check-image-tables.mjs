#!/usr/bin/env node
/**
 * Check for image-related tables and data
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
if (existsSync(join(process.cwd(), '.env.production'))) {
  dotenv.config({ path: join(process.cwd(), '.env.production') });
}

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found!');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

console.log('🔍 Checking for image-related tables and data...\n');

async function checkImageTables() {
  try {
    // Check for tables with 'image' in the name
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%image%'
      ORDER BY table_name
    `;

    console.log('🗂️ Image-related tables:', tables.map(t => t.table_name));

    // Check for tables with 'media' in the name
    const mediaTables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%media%'
      ORDER BY table_name
    `;

    console.log('📺 Media-related tables:', mediaTables.map(t => t.table_name));

    // Check if products have any JSON/array columns that might contain images
    const productColumns = await sql`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'lats_products'
      ORDER BY column_name
    `;

    console.log('\n📋 Product table columns:');
    productColumns.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.udt_name})`);
    });

    // Check for any tables with images column
    const tablesWithImages = await sql`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND column_name = 'images'
      ORDER BY table_name
    `;

    console.log('\n🖼️ Tables with "images" column:', tablesWithImages.map(t => `${t.table_name}.${t.column_name}`));

    // Sample some product data to see what image data looks like
    const sampleProducts = await sql`
      SELECT id, name, image_url
      FROM lats_products
      LIMIT 5
    `;

    console.log('\n📦 Sample products:');
    sampleProducts.forEach(product => {
      console.log(`   ${product.id}: "${product.name}" - image_url: ${product.image_url || 'null'}`);
    });

  } catch (error) {
    console.error('❌ Error checking image tables:', error);
  }
}

checkImageTables();
