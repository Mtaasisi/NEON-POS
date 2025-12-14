/**
 * Migration Script: Convert Base64 Images to Supabase Storage URLs
 * 
 * This script:
 * 1. Finds all products with large base64 images
 * 2. Uploads them to Supabase Storage
 * 3. Updates the database with the new URLs
 * 
 * Usage:
 *   npx ts-node scripts/migrateImagesToStorage.ts --dry-run
 *   npx ts-node scripts/migrateImagesToStorage.ts --execute
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STORAGE_BUCKET = 'product-images';
const MAX_BASE64_SIZE = 10000; // 10KB threshold
const DRY_RUN = process.argv.includes('--dry-run');

interface ProductWithLargeImage {
  id: string;
  name: string;
  image_url: string;
  image_size: number;
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Convert base64 data URL to blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(parts[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  
  return new Blob([u8arr], { type: mime });
}

/**
 * Get file extension from mime type
 */
function getExtensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg'
  };
  return map[mime] || 'png';
}

/**
 * Find all products with large base64 images
 */
async function findProductsWithLargeImages(): Promise<ProductWithLargeImage[]> {
  console.log('🔍 Scanning for products with large base64 images...\n');
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, image_url')
    .like('image_url', 'data:image/%')
    .order('id');
  
  if (error) {
    console.error('❌ Error fetching products:', error);
    throw error;
  }
  
  const problematic = products
    ?.filter(p => p.image_url && p.image_url.length > MAX_BASE64_SIZE)
    .map(p => ({
      id: p.id,
      name: p.name,
      image_url: p.image_url,
      image_size: p.image_url.length
    })) || [];
  
  console.log(`Found ${problematic.length} products with large images:\n`);
  
  problematic.forEach((p, idx) => {
    const sizeMB = (p.image_size / 1024).toFixed(2);
    console.log(`${idx + 1}. ${p.name} (ID: ${p.id}) - ${sizeMB}KB`);
  });
  
  console.log('\n');
  
  return problematic;
}

/**
 * Upload base64 image to Supabase Storage
 */
async function uploadImageToStorage(
  productId: string,
  productName: string,
  dataUrl: string
): Promise<string | null> {
  try {
    // Convert data URL to blob
    const blob = dataUrlToBlob(dataUrl);
    const mime = dataUrl.split(',')[0].match(/:(.*?);/)?.[1] || 'image/png';
    const ext = getExtensionFromMime(mime);
    
    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = productName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 50);
    const filename = `${sanitizedName}-${productId}-${timestamp}.${ext}`;
    const filePath = `products/${filename}`;
    
    console.log(`   📤 Uploading: ${filename}...`);
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(STORAGE_BUCKET)
      .upload(filePath, blob, {
        contentType: mime,
        upsert: false
      });
    
    if (uploadError) {
      console.error(`   ❌ Upload failed: ${uploadError.message}`);
      return null;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);
    
    console.log(`   ✅ Uploaded successfully`);
    return publicUrl;
  } catch (error) {
    console.error(`   ❌ Error uploading image:`, error);
    return null;
  }
}

/**
 * Update product with new image URL
 */
async function updateProductImageUrl(productId: string, newUrl: string): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .update({ image_url: newUrl })
    .eq('id', productId);
  
  if (error) {
    console.error(`   ❌ Failed to update product: ${error.message}`);
    return false;
  }
  
  return true;
}

/**
 * Migrate a single product's image
 */
async function migrateProductImage(product: ProductWithLargeImage): Promise<boolean> {
  console.log(`\n🔄 Processing: ${product.name}`);
  
  if (DRY_RUN) {
    console.log('   ⏭️  DRY RUN - Skipping actual upload');
    return true;
  }
  
  // Upload to storage
  const newUrl = await uploadImageToStorage(
    product.id,
    product.name,
    product.image_url
  );
  
  if (!newUrl) {
    return false;
  }
  
  // Update database
  const success = await updateProductImageUrl(product.id, newUrl);
  
  if (success) {
    console.log(`   ✅ Migration complete: ${product.name}`);
  }
  
  return success;
}

/**
 * Ensure storage bucket exists
 */
async function ensureStorageBucketExists(): Promise<boolean> {
  console.log('🪣 Checking storage bucket...\n');
  
  const { data: buckets, error: listError } = await supabase
    .storage
    .listBuckets();
  
  if (listError) {
    console.error('❌ Error listing buckets:', listError);
    return false;
  }
  
  const bucketExists = buckets?.some(b => b.name === STORAGE_BUCKET);
  
  if (!bucketExists) {
    console.log(`📦 Creating bucket: ${STORAGE_BUCKET}...`);
    
    const { error: createError } = await supabase
      .storage
      .createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
    
    if (createError) {
      console.error('❌ Error creating bucket:', createError);
      return false;
    }
    
    console.log('✅ Bucket created successfully\n');
  } else {
    console.log('✅ Bucket exists\n');
  }
  
  return true;
}

/**
 * Main migration function
 */
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Base64 to Storage Migration Script');
  console.log('═══════════════════════════════════════════════════\n');
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  } else {
    console.log('⚠️  LIVE MODE - Changes will be applied to database\n');
  }
  
  // Validate environment
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing environment variables:');
    console.error('   - VITE_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  // Ensure bucket exists
  if (!DRY_RUN) {
    const bucketReady = await ensureStorageBucketExists();
    if (!bucketReady) {
      console.error('❌ Failed to prepare storage bucket');
      process.exit(1);
    }
  }
  
  // Find problematic products
  const products = await findProductsWithLargeImages();
  
  if (products.length === 0) {
    console.log('✅ No products with large images found!');
    process.exit(0);
  }
  
  console.log(`\nTotal size: ${(products.reduce((sum, p) => sum + p.image_size, 0) / 1024 / 1024).toFixed(2)}MB\n`);
  
  if (DRY_RUN) {
    console.log('═══════════════════════════════════════════════════');
    console.log('  DRY RUN COMPLETE');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(`Found ${products.length} products to migrate.`);
    console.log('\nTo execute migration, run:');
    console.log('  npx ts-node scripts/migrateImagesToStorage.ts --execute\n');
    process.exit(0);
  }
  
  // Migrate each product
  console.log('═══════════════════════════════════════════════════');
  console.log('  Starting Migration');
  console.log('═══════════════════════════════════════════════════');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const product of products) {
    const success = await migrateProductImage(product);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Add small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Migration Complete');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Total: ${products.length}\n`);
  
  if (failCount > 0) {
    console.log('⚠️  Some migrations failed. Check the logs above for details.\n');
    process.exit(1);
  }
  
  console.log('🎉 All images migrated successfully!\n');
  process.exit(0);
}

// Run the migration
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

