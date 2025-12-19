#!/usr/bin/env node
/**
 * Check product_images table for missing images
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

console.log('🔍 Checking product_images table...\n');

async function checkProductImages() {
  try {
    // Get all product images
    const images = await sql`
      SELECT
        id,
        product_id,
        image_url,
        thumbnail_url,
        file_name,
        created_at
      FROM product_images
      ORDER BY created_at DESC
      LIMIT 20
    `;

    console.log(`📊 Found ${images.length} product images in database\n`);

    let missingCount = 0;
    let existingCount = 0;

    for (const image of images) {
      const urls = [];

      if (image.image_url) {
        urls.push({ type: 'image', url: image.image_url });
      }

      if (image.thumbnail_url) {
        urls.push({ type: 'thumbnail', url: image.thumbnail_url });
      }

      for (const urlObj of urls) {
        // Check if it's a local path starting with /images/products/
        if (urlObj.url && urlObj.url.startsWith('/images/products/')) {
          const fileName = urlObj.url.replace('/images/products/', '');
          const filePath = join(process.cwd(), 'public', 'images', 'products', fileName);

          if (!existsSync(filePath)) {
            console.log(`❌ MISSING: Product Image ${image.id}`);
            console.log(`   ${urlObj.type}: ${fileName}`);
            console.log(`   Full path: ${filePath}`);
            console.log(`   Product ID: ${image.product_id}`);
            console.log(`   Created: ${image.created_at}\n`);
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
    console.log(`   📦 Total images in database: ${images.length}`);

    // Also check variant_images table
    const variantImages = await sql`
      SELECT COUNT(*) as count
      FROM variant_images
    `;

    console.log(`   🎭 Variant images: ${variantImages[0].count}`);

  } catch (error) {
    console.error('❌ Error checking product images:', error);
  }
}

checkProductImages();




