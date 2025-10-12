#!/usr/bin/env node
/**
 * AUTO-FIX PRODUCT IMAGES SCRIPT
 * This script automatically fixes your product images:
 * 1. Creates product_images table if it doesn't exist
 * 2. Migrates images from lats_products.images to product_images table
 * 3. Verifies the migration
 * 4. Shows detailed statistics
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

console.log('🖼️  Starting Product Images Auto-Fix...\n');
console.log('═══════════════════════════════════════════════════════════\n');

try {
  // Step 1: Check current state
  console.log('📊 Step 1: Checking current state...');
  
  let productImagesExists = false;
  try {
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'product_images'
      ) as exists
    `;
    productImagesExists = tableCheck[0].exists;
    console.log(`   ${productImagesExists ? '✅' : '⚠️ '} product_images table ${productImagesExists ? 'exists' : 'does not exist'}`);
  } catch (error) {
    console.log('   ⚠️  Could not check product_images table');
  }
  
  // Check products with images in old storage
  const productsWithOldImages = await sql`
    SELECT COUNT(*) as count
    FROM lats_products
    WHERE images IS NOT NULL AND jsonb_array_length(images) > 0
  `;
  console.log(`   📦 ${productsWithOldImages[0].count} products have images in old storage (lats_products.images)`);
  
  if (productImagesExists) {
    const currentImages = await sql`SELECT COUNT(*) as count FROM product_images`;
    console.log(`   🖼️  ${currentImages[0].count} images already in product_images table`);
  }
  
  console.log('   ✅ Current state checked\n');

  // Step 2: Create product_images table
  console.log('🛠️  Step 2: Creating product_images table...');
  
  await sql`
    CREATE TABLE IF NOT EXISTS product_images (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL,
      image_url TEXT NOT NULL,
      thumbnail_url TEXT,
      file_name TEXT,
      file_size INTEGER DEFAULT 0,
      is_primary BOOLEAN DEFAULT false,
      uploaded_by UUID,
      mime_type TEXT,
      width INTEGER,
      height INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  console.log('   ✅ product_images table created/verified');
  
  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(is_primary)`;
  console.log('   ✅ Indexes created');
  
  // Disable RLS
  await sql`ALTER TABLE product_images DISABLE ROW LEVEL SECURITY`;
  console.log('   ✅ Row Level Security disabled');
  
  // Drop any existing policies
  const policies = await sql`
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'product_images'
  `;
  
  for (const policy of policies) {
    await sql`DROP POLICY IF EXISTS ${sql(policy.policyname)} ON product_images`;
  }
  
  if (policies.length > 0) {
    console.log(`   ✅ Removed ${policies.length} old policies`);
  }
  
  console.log('   ✅ Table setup complete\n');

  // Step 3: Migrate images
  console.log('📦 Step 3: Migrating images from old to new storage...');
  
  const migrationResult = await sql`
    INSERT INTO product_images (product_id, image_url, thumbnail_url, file_name, is_primary, file_size, created_at)
    SELECT 
      p.id as product_id,
      img_url as image_url,
      img_url as thumbnail_url,
      'migrated-image-' || ROW_NUMBER() OVER (PARTITION BY p.id) as file_name,
      ROW_NUMBER() OVER (PARTITION BY p.id) = 1 as is_primary,
      0 as file_size,
      p.created_at
    FROM lats_products p,
    LATERAL unnest(
      CASE 
        WHEN p.images IS NOT NULL AND jsonb_array_length(p.images) > 0 
        THEN ARRAY(SELECT jsonb_array_elements_text(p.images))
        ELSE ARRAY[]::TEXT[]
      END
    ) AS img_url
    WHERE p.images IS NOT NULL 
      AND jsonb_array_length(p.images) > 0
      AND NOT EXISTS (
        SELECT 1 FROM product_images pi 
        WHERE pi.product_id = p.id 
        AND pi.image_url = img_url
      )
    RETURNING *
  `;
  
  console.log(`   ✅ Migrated ${migrationResult.length} new images`);
  console.log('   ✅ Migration complete\n');

  // Step 4: Verify migration
  console.log('🔍 Step 4: Verifying migration...');
  
  const totalImages = await sql`SELECT COUNT(*) as count FROM product_images`;
  const totalProductsWithImages = await sql`
    SELECT COUNT(DISTINCT product_id) as count FROM product_images
  `;
  const primaryImages = await sql`
    SELECT COUNT(*) as count FROM product_images WHERE is_primary = true
  `;
  
  console.log(`   ✅ Total images: ${totalImages[0].count}`);
  console.log(`   ✅ Products with images: ${totalProductsWithImages[0].count}`);
  console.log(`   ✅ Primary images: ${primaryImages[0].count}`);
  
  // Check for products still needing migration
  const needingMigration = await sql`
    SELECT COUNT(*) as count
    FROM lats_products p
    WHERE (p.images IS NOT NULL AND jsonb_array_length(p.images) > 0)
      AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id)
  `;
  
  if (needingMigration[0].count > 0) {
    console.log(`   ⚠️  ${needingMigration[0].count} products still need migration`);
  } else {
    console.log('   ✅ All products migrated successfully');
  }
  
  // Check for broken URLs
  const brokenUrls = await sql`
    SELECT COUNT(*) as count
    FROM product_images
    WHERE image_url IS NULL 
       OR image_url = '' 
       OR NOT (image_url ~ '^https?://' OR image_url ~ '^data:image' OR image_url ~ '^blob:')
  `;
  
  if (brokenUrls[0].count > 0) {
    console.log(`   ⚠️  ${brokenUrls[0].count} images have invalid URLs`);
  } else {
    console.log('   ✅ All image URLs are valid');
  }
  
  console.log('   ✅ Verification complete\n');

  // Step 5: Sample images
  console.log('📸 Step 5: Sample migrated images...');
  
  const sampleImages = await sql`
    SELECT 
      pi.id,
      p.name as product_name,
      pi.image_url,
      pi.is_primary,
      CASE 
        WHEN pi.image_url ~ '^https?://' THEN 'URL'
        WHEN pi.image_url ~ '^data:image' THEN 'Base64'
        WHEN pi.image_url ~ '^blob:' THEN 'Blob'
        ELSE 'Other'
      END as url_type,
      LENGTH(pi.image_url) as url_length
    FROM product_images pi
    JOIN lats_products p ON p.id = pi.product_id
    ORDER BY pi.created_at DESC
    LIMIT 5
  `;
  
  if (sampleImages.length > 0) {
    console.log('\n   Recent Images:');
    console.log('   ─────────────────────────────────────────────────────────');
    sampleImages.forEach((img, index) => {
      console.log(`   ${index + 1}. ${img.product_name}`);
      console.log(`      ${img.is_primary ? '⭐' : '  '} Type: ${img.url_type} | Length: ${img.url_length} chars`);
      console.log(`      URL: ${img.image_url.substring(0, 80)}${img.image_url.length > 80 ? '...' : ''}`);
      console.log('');
    });
  } else {
    console.log('   ℹ️  No images found');
  }

  // Final summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🎉 PRODUCT IMAGES AUTO-FIX COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('📊 SUMMARY:');
  console.log(`   ✅ Total images in database: ${totalImages[0].count}`);
  console.log(`   ✅ Products with images: ${totalProductsWithImages[0].count}`);
  console.log(`   ✅ Newly migrated: ${migrationResult.length}`);
  
  if (needingMigration[0].count === 0 && brokenUrls[0].count === 0) {
    console.log('\n✨ STATUS: ALL SYSTEMS GO!');
    console.log('   → Product images are properly configured');
    console.log('   → ProductCard component will display images correctly');
    console.log('   → No action needed\n');
  } else {
    if (needingMigration[0].count > 0) {
      console.log(`\n⚠️  WARNING: ${needingMigration[0].count} products still need migration`);
      console.log('   → Run this script again to retry migration');
    }
    if (brokenUrls[0].count > 0) {
      console.log(`\n⚠️  WARNING: ${brokenUrls[0].count} images have invalid URLs`);
      console.log('   → Check and fix these URLs manually');
      console.log('   → Or re-upload the images');
    }
  }
  
  console.log('\n💡 NEXT STEPS:');
  console.log('   1. Refresh your Products/Inventory page');
  console.log('   2. Check if ProductCard components show images');
  console.log('   3. If still not working, check browser console for errors');
  console.log('\n═══════════════════════════════════════════════════════════\n');

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error('\nStack trace:', error.stack);
  process.exit(1);
}

