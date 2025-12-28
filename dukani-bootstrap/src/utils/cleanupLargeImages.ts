/**
 * Cleanup Large Base64 Images Utility
 * 
 * This script helps identify and fix products with extremely large base64 images
 * that cause HTTP 431 errors and performance issues.
 * 
 * Usage:
 * 1. Import and run in browser console or Node.js
 * 2. Review affected products
 * 3. Choose cleanup strategy (placeholder, compress, or migrate)
 */

import { supabase } from '../lib/supabaseClient';

interface ProductImageStats {
  id: string;
  name: string;
  imageSize: number;
  imageSizeKB: number;
  hasLargeImage: boolean;
  hasLargeThumbnail: boolean;
  imagePreview: string;
}

export class LargeImageCleanup {
  private static readonly MAX_SAFE_BASE64_SIZE = 10000; // 10KB

  /**
   * Scan database for products with large base64 images
   */
  static async scanProducts(): Promise<ProductImageStats[]> {
    console.log('🔍 Scanning products for large images...');

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, image_url, thumbnail_url');

    if (error) {
      console.error('❌ Error scanning products:', error);
      throw error;
    }

    const stats: ProductImageStats[] = [];

    products?.forEach((product: any) => {
      const imageUrl = product.image_url || '';
      const thumbnailUrl = product.thumbnail_url || '';

      const imageSize = imageUrl.length;
      const thumbnailSize = thumbnailUrl.length;

      const hasLargeImage = imageUrl.startsWith('data:image/') && imageSize > this.MAX_SAFE_BASE64_SIZE;
      const hasLargeThumbnail = thumbnailUrl.startsWith('data:image/') && thumbnailSize > this.MAX_SAFE_BASE64_SIZE;

      if (hasLargeImage || hasLargeThumbnail) {
        stats.push({
          id: product.id,
          name: product.name,
          imageSize: Math.max(imageSize, thumbnailSize),
          imageSizeKB: Math.round(Math.max(imageSize, thumbnailSize) / 1024),
          hasLargeImage,
          hasLargeThumbnail,
          imagePreview: imageUrl.substring(0, 50) + '...'
        });
      }
    });

    // Sort by size (largest first)
    stats.sort((a, b) => b.imageSize - a.imageSize);

    console.log(`📊 Found ${stats.length} products with large images`);
    
    if (stats.length > 0) {
      console.log('Top 10 largest images:');
      stats.slice(0, 10).forEach((stat, i) => {
        console.log(`  ${i + 1}. ${stat.name} - ${stat.imageSizeKB}KB (ID: ${stat.id})`);
      });
    }

    return stats;
  }

  /**
   * Generate summary statistics
   */
  static generateSummary(stats: ProductImageStats[]): void {
    if (stats.length === 0) {
      console.log('✅ No products with large images found!');
      return;
    }

    const totalSize = stats.reduce((sum, s) => sum + s.imageSize, 0);
    const avgSize = Math.round(totalSize / stats.length / 1024);
    const maxSize = Math.round(Math.max(...stats.map(s => s.imageSize)) / 1024);
    const minSize = Math.round(Math.min(...stats.map(s => s.imageSize)) / 1024);

    console.log('\n📊 Summary Statistics:');
    console.log(`  Total products affected: ${stats.length}`);
    console.log(`  Average image size: ${avgSize}KB`);
    console.log(`  Largest image: ${maxSize}KB`);
    console.log(`  Smallest large image: ${minSize}KB`);
    console.log(`  Total wasted space: ~${Math.round(totalSize / 1024 / 1024)}MB`);
  }

  /**
   * Strategy 1: Replace large images with placeholders
   */
  static async replaceWithPlaceholders(productIds: string[]): Promise<void> {
    console.log(`🔄 Replacing ${productIds.length} products with placeholders...`);

    const placeholderUrl = this.generatePlaceholderSvg('Product Image');

    let successCount = 0;
    let errorCount = 0;

    for (const id of productIds) {
      try {
        const { error } = await supabase
          .from('products')
          .update({
            image_url: placeholderUrl,
            thumbnail_url: placeholderUrl
          })
          .eq('id', id);

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to update product ${id}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Updated ${successCount} products`);
    if (errorCount > 0) {
      console.log(`❌ Failed to update ${errorCount} products`);
    }
  }

  /**
   * Strategy 2: Compress base64 images
   */
  static async compressImages(productIds: string[]): Promise<void> {
    console.log(`🗜️ Compressing ${productIds.length} images...`);

    let successCount = 0;
    let errorCount = 0;

    for (const id of productIds) {
      try {
        // Fetch product
        const { data: product, error: fetchError } = await supabase
          .from('products')
          .select('image_url, thumbnail_url')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        // Compress image_url if needed
        let newImageUrl = product.image_url;
        if (product.image_url?.startsWith('data:image/')) {
          newImageUrl = await this.compressBase64Image(product.image_url);
        }

        // Compress thumbnail_url if needed
        let newThumbnailUrl = product.thumbnail_url;
        if (product.thumbnail_url?.startsWith('data:image/')) {
          newThumbnailUrl = await this.compressBase64Image(product.thumbnail_url, 200);
        }

        // Update product
        const { error: updateError } = await supabase
          .from('products')
          .update({
            image_url: newImageUrl,
            thumbnail_url: newThumbnailUrl
          })
          .eq('id', id);

        if (updateError) throw updateError;
        successCount++;
        console.log(`  ✅ Compressed product ${id}`);
      } catch (error) {
        console.error(`  ❌ Failed to compress product ${id}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Compressed ${successCount} products`);
    if (errorCount > 0) {
      console.log(`❌ Failed to compress ${errorCount} products`);
    }
  }

  /**
   * Helper: Compress a base64 image
   */
  private static async compressBase64Image(base64: string, maxSize: number = 400): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        
        img.onload = () => {
          // Create canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Calculate new dimensions
          let width = img.width;
          let height = img.height;
          const aspectRatio = width / height;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              width = maxSize;
              height = Math.round(maxSize / aspectRatio);
            } else {
              height = maxSize;
              width = Math.round(maxSize * aspectRatio);
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          // Try different quality levels until size is acceptable
          let quality = 0.7;
          let compressed = canvas.toDataURL('image/jpeg', quality);
          
          while (compressed.length > this.MAX_SAFE_BASE64_SIZE && quality > 0.3) {
            quality -= 0.1;
            compressed = canvas.toDataURL('image/jpeg', quality);
          }

          // If still too large, use placeholder
          if (compressed.length > this.MAX_SAFE_BASE64_SIZE) {
            resolve(this.generatePlaceholderSvg('Product'));
          } else {
            resolve(compressed);
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        img.src = base64;
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Helper: Generate SVG placeholder
   */
  private static generatePlaceholderSvg(text: string = 'Product'): string {
    const svg = `
      <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="300" fill="#F3F4F6"/>
        <text x="150" y="150" font-family="Arial" font-size="16" 
              fill="#6B7280" text-anchor="middle" dy=".3em">
          ${text}
        </text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Export affected products to CSV for manual review
   */
  static async exportToCsv(stats: ProductImageStats[]): Promise<string> {
    const headers = ['ID', 'Name', 'Size (KB)', 'Large Image', 'Large Thumbnail'];
    const rows = stats.map(s => [
      s.id,
      s.name,
      s.imageSizeKB,
      s.hasLargeImage ? 'Yes' : 'No',
      s.hasLargeThumbnail ? 'Yes' : 'No'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Main cleanup workflow
   */
  static async run(options: {
    dryRun?: boolean;
    strategy?: 'placeholder' | 'compress' | 'manual';
  } = {}): Promise<void> {
    const { dryRun = true, strategy = 'placeholder' } = options;

    console.log('🚀 Starting large image cleanup...');
    console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`   Strategy: ${strategy}`);

    // Step 1: Scan
    const stats = await this.scanProducts();
    this.generateSummary(stats);

    if (stats.length === 0) {
      console.log('✅ No cleanup needed!');
      return;
    }

    // Step 2: Export for review
    const csv = await this.exportToCsv(stats);
    console.log('\n📄 CSV Export (copy this):');
    console.log(csv);

    if (dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes made');
      console.log('   To apply changes, run with dryRun: false');
      return;
    }

    // Step 3: Apply fixes
    const productIds = stats.map(s => s.id);

    if (strategy === 'placeholder') {
      await this.replaceWithPlaceholders(productIds);
    } else if (strategy === 'compress') {
      await this.compressImages(productIds);
    } else {
      console.log('ℹ️  Manual strategy selected - no automatic changes');
      console.log('   Update products manually using the CSV export above');
    }

    console.log('\n✅ Cleanup complete!');
  }
}

// Browser console usage example:
// import { LargeImageCleanup } from './src/utils/cleanupLargeImages';
// await LargeImageCleanup.run({ dryRun: true, strategy: 'placeholder' });

// Export for use
export default LargeImageCleanup;

