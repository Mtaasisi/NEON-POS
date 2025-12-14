#!/usr/bin/env node
/**
 * Check for missing product images
 * This script identifies products with image references that don't exist locally
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

console.log('🔍 Checking for products with missing images...\n');

async function checkMissingImages() {
  try {
    // First, check what columns exist in the products table
    console.log('🔍 Checking table structure...');
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'lats_products'
      AND column_name LIKE '%image%'
      ORDER BY column_name
    `;

    console.log('📋 Available image columns:', columns.map(c => c.column_name));

    // Get all products with image references
    const products = await sql`
      SELECT
        id,
        name,
        image_url
      FROM lats_products
      WHERE image_url IS NOT NULL
      ORDER BY id
    `;

    console.log(`📊 Found ${products.length} products with image references\n`);

    let missingCount = 0;
    let existingCount = 0;

    for (const product of products) {
      const images = [];

      if (product.image_url) {
        images.push({ type: 'image', url: product.image_url });
      }

      if (product.thumbnail_url && product.thumbnail_url !== product.image_url) {
        images.push({ type: 'thumbnail', url: product.thumbnail_url });
      }

      for (const image of images) {
        // Check if it's a local path starting with /images/products/
        if (image.url.startsWith('/images/products/')) {
          const fileName = image.url.replace('/images/products/', '');
          const filePath = join(process.cwd(), 'public', 'images', 'products', fileName);

          if (!existsSync(filePath)) {
            console.log(`❌ MISSING: Product "${product.name}" (${product.id})`);
            console.log(`   ${image.type}: ${fileName}`);
            console.log(`   Full path: ${filePath}\n`);
            missingCount++;
          } else {
            existingCount++;
          }
        }
      }
    }

    console.log(`📈 Summary:`);
    console.log(`   ✅ Existing images: ${existingCount}`);
    console.log(`   ❌ Missing images: ${missingCount}`);
    console.log(`   📦 Total products with images: ${products.length}`);

  } catch (error) {
    console.error('❌ Error checking images:', error);
  }
}

checkMissingImages();