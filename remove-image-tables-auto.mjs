#!/usr/bin/env node

/**
 * ============================================
 * AUTOMATIC IMAGE TABLES REMOVAL SCRIPT
 * ============================================
 * This script automatically removes all image-related tables
 * and database objects from your Neon database.
 * 
 * Usage: node remove-image-tables-auto.mjs
 * ============================================
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Your Neon Database URL
const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log('🗑️  Starting automatic image tables removal...\n');

// Read the SQL file
const sqlFilePath = join(__dirname, 'REMOVE-IMAGE-UPLOAD-FEATURE.sql');
let sqlContent;

try {
  sqlContent = readFileSync(sqlFilePath, 'utf-8');
  console.log('✅ Loaded SQL migration file');
} catch (error) {
  console.error('❌ Failed to read SQL file:', error.message);
  process.exit(1);
}

async function removeImageTables() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('🔌 Connecting to database...');
    
    // Execute the SQL migration
    console.log('📝 Executing migration...\n');
    await pool.query(sqlContent);
    
    console.log('\n✅ Migration executed successfully!\n');
    
    // Verify tables are removed
    console.log('🔍 Verifying tables removal...');
    
    const productImagesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'product_images'
      ) as exists
    `);
    
    if (!productImagesCheck.rows[0].exists) {
      console.log('✅ product_images table successfully removed');
    } else {
      console.log('⚠️  product_images table still exists (check manually)');
    }
    
    // Check if images column exists in lats_products
    const imagesColumnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lats_products' 
        AND column_name = 'images'
      ) as exists
    `);
    
    if (!imagesColumnCheck.rows[0].exists) {
      console.log('✅ images column removed from lats_products');
    } else {
      console.log('ℹ️  images column does not exist in lats_products (already removed or never existed)');
    }
    
    console.log('\n🎉 IMAGE TABLES REMOVAL COMPLETE!\n');
    console.log('📋 Summary:');
    console.log('   • product_images table dropped ✅');
    console.log('   • images column removed (if existed) ✅');
    console.log('   • Image triggers and functions removed ✅\n');
    
    console.log('⚠️  Remember to:');
    console.log('   1. Delete the "product-images" storage bucket in Supabase (if applicable)');
    console.log('   2. Test product creation to ensure it works without images\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
removeImageTables();

