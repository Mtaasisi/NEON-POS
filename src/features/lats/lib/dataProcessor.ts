/**
 * Data processor for LATS module
 * Handles data cleanup and validation to prevent issues like HTTP 431 errors
 */

import { processProductImages, cleanupImageData, emergencyUrlCleanup } from './imageUtils';
import { Product, Category, Supplier } from '../types/inventory';

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
 * Replace all placeholder images with local SVG placeholders
 */
function replacePlaceholderImages(images: string[]): string[] {
  if (!Array.isArray(images)) return [];
  
  return images.map(imageUrl => {
    // Check if it's a placeholder service URL
    if (isUnreliableUrl(imageUrl)) {

      return generateSimplePlaceholder('Product Image', 400, 400);
    }
    return imageUrl;
  });
}

/**
 * ⚡ SUPER FAST: Batch process product field transformations
 * Process and clean up product data to prevent issues
 */
export function processProductData(products: Product[]): Product[] {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  const startTime = performance.now();

  // ⚡ BATCH PROCESSING: Transform all products in a single pass
  const processedProducts = products.map((product) => {
    if (!product || typeof product !== 'object') {
      return product; // Skip invalid products
    }

    const processedProduct = { ...product };

    // ⚡ BATCH FIELD TRANSFORMATIONS: Use destructuring and assignment for speed
    const {
      category_id,
      supplier_id,
      brand_id,
      branch_id,
      is_shared,
      is_active,
      storage_room_id,
      shelf_id,
      shelf_name,
      shelf_code,
      selling_price,
      cost_price,
      stock_quantity,
      min_stock_level,
      created_at,
      updated_at,
      ...rest
    } = processedProduct;

    // ⚡ SINGLE OBJECT CREATION: Transform all fields at once
    const transformedProduct = {
      ...rest,
      // Transform database field names to interface field names
      ...(category_id !== undefined && { categoryId: category_id }),
      ...(supplier_id !== undefined && { supplierId: supplier_id }),
      ...(brand_id !== undefined && { brandId: brand_id }),
      ...(branch_id !== undefined && { branchId: branch_id }),
      ...(is_active !== undefined && { isActive: is_active }),
      // Storage location fields
      ...(storage_room_id !== undefined && { storageRoomId: storage_room_id }),
      ...(shelf_id !== undefined && { shelfId: shelf_id }),
      ...(shelf_name !== undefined && { shelfName: shelf_name }),
      ...(shelf_code !== undefined && { shelfCode: shelf_code }),
      // Price fields - prioritize selling_price
      ...(selling_price !== undefined && { price: selling_price }),
      ...(cost_price !== undefined && { costPrice: cost_price }),
      ...(stock_quantity !== undefined && { stockQuantity: stock_quantity }),
      ...(min_stock_level !== undefined && { minStockLevel: min_stock_level }),
      // Timestamp fields
      ...(created_at !== undefined && { createdAt: created_at }),
      ...(updated_at !== undefined && { updatedAt: updated_at }),
    };

    // ⚡ FAST IMAGE PROCESSING: Process images only when needed
    if (transformedProduct.images && Array.isArray(transformedProduct.images)) {
      transformedProduct.images = replacePlaceholderImages(processProductImages(transformedProduct.images));
    }

    // Process direct image_url field if present (check original product before transformation)
    if (processedProduct.image_url) {
      transformedProduct.image_url = emergencyUrlCleanup(processedProduct.image_url);
    }

    // Process variants if they exist (optimized)
    if (transformedProduct.variants && Array.isArray(transformedProduct.variants)) {
      transformedProduct.variants = transformedProduct.variants.map((variant: any) => {
        if (!variant || typeof variant !== 'object') return variant;

        const {
          product_id,
          variant_name,
          selling_price: variantSellingPrice,
          cost_price: variantCostPrice,
          ...variantRest
        } = variant;

        return {
          ...variantRest,
          // Transform variant field names
          ...(product_id !== undefined && { productId: product_id }),
          ...(variant_name !== undefined && { name: variant_name }),
          // Price transformations
          ...(variantSellingPrice !== undefined && {
            price: variantSellingPrice,
            sellingPrice: variantSellingPrice
          }),
          ...(variantCostPrice !== undefined && { costPrice: variantCostPrice }),
        };
      });
    }

    return transformedProduct;
  });

  const processingTime = performance.now() - startTime;
  if (processingTime > 50) { // Log only if processing takes more than 50ms
    console.log(`⚡ Processed ${products.length} products in ${processingTime.toFixed(2)}ms`);
  }

  return processedProducts;
}

/**
 * Process and clean up category data
 */
export function processCategoryData(categories: Category[]): Category[] {
  if (!Array.isArray(categories)) {
    return [];
  }


  return categories.map((category, index) => {
    const processedCategory = { ...category };

    // Transform database field names to interface field names
    if (processedCategory.parent_id !== undefined) {
      processedCategory.parentId = processedCategory.parent_id;
      delete processedCategory.parent_id;
    }

    if (processedCategory.is_active !== undefined) {
      processedCategory.isActive = processedCategory.is_active;
      delete processedCategory.is_active;
    }

    if (processedCategory.sort_order !== undefined) {
      processedCategory.sortOrder = processedCategory.sort_order;
      delete processedCategory.sort_order;
    }

    if (processedCategory.created_at !== undefined) {
      processedCategory.createdAt = processedCategory.created_at;
      delete processedCategory.created_at;
    }

    if (processedCategory.updated_at !== undefined) {
      processedCategory.updatedAt = processedCategory.updated_at;
      delete processedCategory.updated_at;
    }

    // Clean up image data if present
    if (processedCategory.image_url) {
      processedCategory.image_url = emergencyUrlCleanup(processedCategory.image_url);
    }

    return processedCategory;
  });
}

/**
 * Process and clean up brand data
 */
export function processBrandData(brands: Brand[]): Brand[] {
  if (!Array.isArray(brands)) {
    return [];
  }

  return brands.map(brand => {
    const processedBrand = { ...brand };

    // Clean up logo data if present
    if (processedBrand.logo_url) {
      processedBrand.logo_url = emergencyUrlCleanup(processedBrand.logo_url);
    }

    return processedBrand;
  });
}

/**
 * Process and clean up supplier data
 */
export function processSupplierData(suppliers: Supplier[]): Supplier[] {
  if (!Array.isArray(suppliers)) {
    return [];
  }

  return suppliers.map(supplier => {
    const processedSupplier = { ...supplier };

    // Clean up any image data if present
    if (processedSupplier.logo_url) {
      processedSupplier.logo_url = emergencyUrlCleanup(processedSupplier.logo_url);
    }

    return processedSupplier;
  });
}

/**
 * Process individual data types separately for when only partial data is available
 */
export function processCategoriesOnly(categories: Category[]): Category[] {
  return processCategoryData(categories || []);
}

export function processProductsOnly(products: Product[]): Product[] {
  return processProductData(products || []);
}

export function processSuppliersOnly(suppliers: Supplier[]): Supplier[] {
  return processSupplierData(suppliers || []);
}

export function processBrandsOnly(brands: Brand[]): Brand[] {
  return processBrandData(brands || []);
}

/**
 * Comprehensive data cleanup for all LATS data
 */
export function processLatsData(data: {
  products?: Product[];
  categories?: Category[];
  brands?: Brand[];
  suppliers?: Supplier[];
  [key: string]: any;
}): {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  suppliers: Supplier[];
} {


  const result = {
    products: processProductData(data.products || []),
    categories: processCategoryData(data.categories || []),
    brands: processBrandData(data.brands || []),
    suppliers: processSupplierData(data.suppliers || [])
  };


  return result;
}

/**
 * Validate data integrity and log any issues
 */
export function validateDataIntegrity(data: any, dataType: string): boolean {
  if (!data) {
    console.warn(`⚠️ ${dataType}: No data provided`);
    return false;
  }

  if (!Array.isArray(data)) {
    console.warn(`⚠️ ${dataType}: Data is not an array`);
    return false;
  }

  // Check for extremely long URLs that might cause issues
  let hasLongUrls = false;
  data.forEach((item, index) => {
    if (item && typeof item === 'object') {
      Object.entries(item).forEach(([key, value]) => {
        if (typeof value === 'string' && value.length > 2000) {
          console.warn(`⚠️ ${dataType}[${index}].${key}: Extremely long URL detected (${value.length} chars)`);
          hasLongUrls = true;
        }
      });
    }
  });

  if (hasLongUrls) {
    console.warn(`⚠️ ${dataType}: Contains extremely long URLs that may cause HTTP 431 errors`);
  }

  return true;
}

/**
 * Emergency data cleanup for critical issues
 */
export function emergencyDataCleanup(data: any): any {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(item => emergencyDataCleanup(item));
  }

  if (typeof data === 'object') {
    const cleaned = { ...data };
    Object.entries(cleaned).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > 2000) {
        console.error(`Emergency cleanup: Removing extremely long ${key} (${value.length} chars)`);
        cleaned[key] = '';
      } else if (typeof value === 'object') {
        cleaned[key] = emergencyDataCleanup(value);
      }
    });
    return cleaned;
  }

  return data;
}
