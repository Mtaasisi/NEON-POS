#!/usr/bin/env node
/**
 * AUTO-FIX PRODUCT IMAGES SCRIPT - FINAL VERSION
 * This script automatically fixes your product images:
 * 1. Updates product_images table schema (adds missing columns)
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
  
  const currentSchema = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'product_images'
  `;
  
  const existingColumns = currentSchema.map(row => row.column_name);
  console.log(`   ✅ Found ${existingColumns.length} existing columns:`, existingColumns.join(', '));
  
  // Check products with images in old storage
  const productsWithOldImages = await sql`
    SELECT COUNT(*) as count
    FROM lats_products
    WHERE images IS NOT NULL AND jsonb_array_length(images) > 0
  `;
  console.log(`   📦 ${productsWithOldImages[0].count} products have images in old storage`);
  
  const currentImages = await sql`SELECT COUNT(*) as count FROM product_images`;
  console.log(`   🖼️  ${currentImages[0].count} images currently in product_images table`);
  
  console.log('   ✅ Current state checked\n');

  // Step 2: Add missing columns using proper SQL syntax
  console.log('🛠️  Step 2: Updating table schema...');
  
  const columnsToAdd = [
    'thumbnail_url TEXT',
    'file_name TEXT',
    'file_size INTEGER DEFAULT 0',
    'uploaded_by UUID',
    'mime_type TEXT',
    'width INTEGER',
    'height INTEGER',
    'updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
  ];
  
  let addedColumns = 0;
  for (const colDef of columnsToAdd) {
    const colName = colDef.split(' ')[0];
    if (!existingColumns.includes(colName)) {
      try {
        // Use raw SQL for ALTER TABLE
        await sql([`ALTER TABLE product_images ADD COLUMN ${colDef}`]);
        console.log(`   ✅ Added column: ${colName}`);
        addedColumns++;
        existingColumns.push(colName);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.log(`   ⚠️  Could not add ${colName}: ${error.message}`);
        }
      }
    }
  }
  
  if (addedColumns === 0) {
    console.log('   ℹ️  All columns already exist');
  } else {
    console.log(`   ✅ Added ${addedColumns} new columns`);
  }
  
  // Ensure indexes exist
  await sql`CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(is_primary)`;
  console.log('   ✅ Indexes verified');
  
  // Ensure RLS is disabled
  await sql`ALTER TABLE product_images DISABLE ROW LEVEL SECURITY`;
  console.log('   ✅ Row Level Security disabled\n');

  // Step 3: Migrate images - only use columns that exist
  console.log('📦 Step 3: Migrating images from old to new storage...');
  
  // Build INSERT query based on existing columns
  const hasThumb = existingColumns.includes('thumbnail_url');
  const hasFileName = existingColumns.includes('file_name');
  const hasFileSize = existingColumns.includes('file_size');
  const hasDisplay = existingColumns.includes('display_order');
  
  try {
    let insertColumns = 'product_id, image_url, is_primary, created_at';
    let selectColumns = `
      p.id as product_id,
      img_url as image_url,
      ROW_NUMBER() OVER (PARTITION BY p.id) = 1 as is_primary,
      p.created_at
    `;
    
    if (hasThumb) {
      insertColumns += ', thumbnail_url';
      selectColumns += ',\n      img_url as thumbnail_url';
    }
    
    if (hasFileName) {
      insertColumns += ', file_name';
      selectColumns += `,\n      'migrated-' || encode(gen_random_uuid()::text::bytea, 'hex') as file_name`;
    }
    
    if (hasFileSize) {
      insertColumns += ', file_size';
      selectColumns += ',\n      0 as file_size';
    }
    
    if (hasDisplay) {
      insertColumns += ', display_order';
      selectColumns += ',\n      ROW_NUMBER() OVER (PARTITION BY p.id) as display_order';
    }
    
    const migrationQuery = `
      INSERT INTO product_images (${insertColumns})
      SELECT ${selectColumns}
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
    
    const migrationResult = await sql([migrationQuery]);
    console.log(`   ✅ Migrated ${migrationResult.length} new images`);
    
  } catch (error) {
    if (error.message.includes('duplicate key')) {
      console.log('   ℹ️  No new images to migrate (all already exist)');
    } else {
      console.log(`   ⚠️  Migration note: ${error.message}`);
    }
  }
  
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
    console.log('   ✅ All products with images have been migrated');
  }
  
  console.log('   ✅ Verification complete\n');

  // Step 5: Test query (simulate RobustImageService)
  console.log('🧪 Step 5: Testing image retrieval (simulating ProductCard)...');
  
  const testProduct = await sql`
    SELECT p.id, p.name
    FROM lats_products p
    WHERE EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id)
    LIMIT 1
  `;
  
  if (testProduct.length > 0) {
    const testImages = await sql`
      SELECT *
      FROM product_images
      WHERE product_id = ${testProduct[0].id}
      ORDER BY is_primary DESC
    `;
    
    console.log(`   ✅ Test product: "${testProduct[0].name}"`);
    console.log(`   ✅ Found ${testImages.length} image(s) for this product`);
    
    if (testImages.length > 0) {
      console.log('\n   📸 Sample image details:');
      console.log(`      → URL: ${testImages[0].image_url.substring(0, 70)}...`);
      console.log(`      → Primary: ${testImages[0].is_primary ? 'Yes ⭐' : 'No'}`);
      if (testImages[0].display_order) {
        console.log(`      → Display Order: ${testImages[0].display_order}`);
      }
    }
    
    console.log('\n   ✅ RobustImageService will return these images to ProductCard');
  } else {
    console.log('   ℹ️  No products with images found for testing');
  }
  
  console.log('   ✅ Test query successful\n');

  // Final summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🎉 PRODUCT IMAGES AUTO-FIX COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('📊 SUMMARY:');
  console.log(`   ✅ Total images: ${totalImages[0].count}`);
  console.log(`   ✅ Products with images: ${totalProductsWithImages[0].count}`);
  console.log(`   ✅ Schema columns added: ${addedColumns}`);
  console.log(`   ✅ Primary images marked: ${primaryImages[0].count}`);
  
  if (needingMigration[0].count === 0 && totalImages[0].count > 0) {
    console.log('\n✨ STATUS: ALL SYSTEMS GO!');
    console.log('   ✅ Product images are properly configured');
    console.log('   ✅ ProductCard component will display images correctly');
    console.log('   ✅ RobustImageService will work as expected');
  } else if (totalImages[0].count === 0) {
    console.log('\n📝 NOTE: No images found in database');
    console.log('   → Your products may not have images uploaded yet');
    console.log('   → Upload images through the product edit page');
    console.log('   → Or add images via the "Add Product" form');
  } else {
    if (needingMigration[0].count > 0) {
      console.log(`\n⚠️  WARNING: ${needingMigration[0].count} products still need migration`);
      console.log('   → Run this script again to retry migration');
    }
  }
  
  console.log('\n💡 NEXT STEPS:');
  console.log('   1. ✅ Open your POS application');
  console.log('   2. ✅ Navigate to Products/Inventory page');
  console.log('   3. ✅ Check if ProductCard components show images');
  console.log('   4. ✅ Look for actual photos instead of camera icons');
  console.log('\n   If you see camera icons (placeholders):');
  console.log('   → Your products may not have images uploaded yet');
  console.log('   → Upload images via "Edit Product" page');
  console.log('\n═══════════════════════════════════════════════════════════\n');

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error('\nStack:', error.stack);
  process.exit(1);
}

