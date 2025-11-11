/**
 * Image utilities for LATS module
 */

import { supabase } from '../../../lib/supabaseClient';
import { ImageUrlSanitizer } from '../../../lib/imageUrlSanitizer';

/**
 * Generate a simple SVG placeholder image as a data URL
 */
function generateSimplePlaceholder(text: string = 'Image', width: number = 300, height: number = 300): string {
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#F3F4F6"/>
      <text x="${width / 2}" y="${height / 2}" font-family="Arial, sans-serif" font-size="16" fill="#6B6B6B" text-anchor="middle" dy=".3em">${text}</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Get a reliable fallback image URL
 */
function getFallbackImageUrl(type: 'product' | 'thumbnail' | 'avatar' = 'product', text?: string): string {
  switch (type) {
    case 'thumbnail':
      return generateSimplePlaceholder('Thumbnail', 100, 100);
    case 'avatar':
      return generateSimplePlaceholder(text || 'U', 40, 40);
    case 'product':
    default:
      return generateSimplePlaceholder(text || 'Product Image', 300, 300);
  }
}

/**
 * Check if a URL is a data URL
 */
function isDataUrl(url: string): boolean {
  return url && typeof url === 'string' && url.startsWith('data:');
}

/**
 * Check if a URL is too long
 */
function isUrlTooLong(url: string, maxLength: number = 1500): boolean {
  return url && typeof url === 'string' && url.length > maxLength;
}

/**
 * Process image URLs to prevent header size issues
 * Uses ImageUrlSanitizer to prevent HTTP 431 errors
 */
export function processImageUrl(url: string, alt?: string): string {
  const sanitizedResult = ImageUrlSanitizer.sanitizeImageUrl(url, alt);
  
  if (sanitizedResult.isSanitized) {
    console.warn('🚨 processImageUrl: URL sanitized to prevent 431 error:', {
      method: sanitizedResult.method,
      originalLength: sanitizedResult.originalLength,
      sanitizedLength: sanitizedResult.sanitizedLength
    });
  }
  
  return sanitizedResult.url;
}

/**
 * Process product images to ensure they don't cause header size issues
 */
export function processProductImages(images: any[]): any[] {
  if (!Array.isArray(images)) {
    return [];
  }

  return images.map(image => {
    if (image && typeof image === 'object') {
      // Process image_url if it exists
      if (image.image_url) {
        image.image_url = processImageUrl(image.image_url, image.file_name);
      }
      
      // Process thumbnail_url if it exists
      if (image.thumbnail_url) {
        image.thumbnail_url = processImageUrl(image.thumbnail_url, image.file_name);
      }

      // Process url if it exists (for UploadedImage format)
      if (image.url) {
        image.url = processImageUrl(image.url, image.fileName);
      }

      // Process thumbnailUrl if it exists (for UploadedImage format)
      if (image.thumbnailUrl) {
        image.thumbnailUrl = processImageUrl(image.thumbnailUrl, image.fileName);
      }
    }
    return image;
  });
}

/**
 * Clean up image data to prevent memory issues
 * Updated with stricter limits to prevent HTTP 431 errors
 */
export function cleanupImageData(imageData: any): any {
  if (!imageData || typeof imageData !== 'object') {
    return imageData;
  }

  const MAX_SAFE_SIZE = 8000; // 8KB max - consistent with ImageUrlSanitizer and emergencyUrlCleanup

  // Remove extremely large data URLs (8KB threshold)
  if (imageData.image_url && isDataUrl(imageData.image_url) && imageData.image_url.length > MAX_SAFE_SIZE) {
    console.warn(`🧹 Cleaning up large image_url (${Math.round(imageData.image_url.length / 1024)}KB)`);
    imageData.image_url = getFallbackImageUrl('product', imageData.file_name);
  }

  if (imageData.thumbnail_url && isDataUrl(imageData.thumbnail_url) && imageData.thumbnail_url.length > MAX_SAFE_SIZE) {
    console.warn(`🧹 Cleaning up large thumbnail_url (${Math.round(imageData.thumbnail_url.length / 1024)}KB)`);
    imageData.thumbnail_url = getFallbackImageUrl('product', imageData.file_name);
  }

  // Handle UploadedImage format
  if (imageData.url && isDataUrl(imageData.url) && imageData.url.length > MAX_SAFE_SIZE) {
    console.warn(`🧹 Cleaning up large url (${Math.round(imageData.url.length / 1024)}KB)`);
    imageData.url = getFallbackImageUrl('product', imageData.fileName);
  }

  if (imageData.thumbnailUrl && isDataUrl(imageData.thumbnailUrl) && imageData.thumbnailUrl.length > MAX_SAFE_SIZE) {
    console.warn(`🧹 Cleaning up large thumbnailUrl (${Math.round(imageData.thumbnailUrl.length / 1024)}KB)`);
    imageData.thumbnailUrl = getFallbackImageUrl('product', imageData.fileName);
  }

  return imageData;
}

/**
 * Validate image URL before using it
 */
export function validateImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Check if URL is too long
  if (isUrlTooLong(url, 1500)) {
    return false;
  }

  // Check if it's a data URL that's too large
  if (isDataUrl(url) && url.length > 8000) {
    return false;
  }

  return true;
}

/**
 * Emergency cleanup for extremely long URLs that might cause HTTP 431 errors
 * Updated to aggressively replace large base64 images
 */
export function emergencyUrlCleanup(url: string): string {
  if (!url || typeof url !== 'string') {
    return getFallbackImageUrl('product');
  }

  // Replace Base64 images larger than 8KB to prevent HTTP 431 errors
  // Lowered from 10KB to 8KB to match ImageUrlSanitizer threshold
  // Base64 images in the database should be compressed or replaced with URLs
  if (isDataUrl(url)) {
    const MAX_SAFE_BASE64_SIZE = 8000; // 8KB max for base64 images (matches ImageUrlSanitizer)
    
    if (url.length > MAX_SAFE_BASE64_SIZE) {
      console.warn(`🚨 Replacing large base64 image (${Math.round(url.length / 1024)}KB) with placeholder to prevent HTTP 431 errors`);
      return getFallbackImageUrl('product');
    }
  }

  // If URL is extremely long (non-Base64), return fallback
  if (!isDataUrl(url) && url.length > 2000) {
    console.error('🚨 Emergency URL cleanup: URL extremely long, using fallback');
    return getFallbackImageUrl('product');
  }

  return url;
}

/**
 * Replace all placeholder images with local SVG placeholders
 * This fixes network errors from external placeholder services
 */
export function replacePlaceholderImages(images: string[]): string[] {
  if (!Array.isArray(images)) return [];
  
  return images.map(imageUrl => {
    // Check if it's a placeholder service URL
    if (isUnreliableUrl(imageUrl)) {
      console.log('🔄 Replacing placeholder image:', imageUrl);
      return generateProductPlaceholder();
    }
    return imageUrl;
  });
}

/**
 * Check if a URL is from an unreliable service
 */
function isUnreliableUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return true;
  
  const unreliableDomains = [
    'via.placeholder.com',
    'placehold.it',
    'placehold.co',
    'dummyimage.com',
    'picsum.photos',
    'lorempixel.com',
    'loremflickr.com'
  ];
  
  return unreliableDomains.some(domain => url.toLowerCase().includes(domain));
}

/**
 * Generate a product placeholder image
 */
function generateProductPlaceholder(): string {
  const svg = `
    <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="#F8FAFC"/>
      <text x="200" y="200" font-family="Arial, sans-serif" font-size="16" fill="#64748B" text-anchor="middle" dy=".3em">Product Image</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
