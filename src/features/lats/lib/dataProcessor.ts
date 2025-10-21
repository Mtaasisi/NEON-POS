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
 * Process and clean up product data to prevent issues
 */
export function processProductData(products: Product[]): Product[] {
  if (!Array.isArray(products)) {
    return [];
  }


  
  return products.map((product, index) => {
    const processedProduct = { ...product };
    
    // console.log removed

    // Transform database field names to interface field names
    if (processedProduct.category_id !== undefined) {
      processedProduct.categoryId = processedProduct.category_id;
      delete processedProduct.category_id;
    }

    if (processedProduct.supplier_id !== undefined) {
      processedProduct.supplierId = processedProduct.supplier_id;
      delete processedProduct.supplier_id;
    }

    if (processedProduct.brand_id !== undefined) {
      processedProduct.brandId = processedProduct.brand_id;
      delete processedProduct.brand_id;
    }

    // Transform branch and sharing fields
    if (processedProduct.branch_id !== undefined) {
      processedProduct.branchId = processedProduct.branch_id;
      delete processedProduct.branch_id;
    }

    // is_shared column removed - no longer needed
    if (processedProduct.is_shared !== undefined) {
      delete processedProduct.is_shared;
    }

    if (processedProduct.is_active !== undefined) {
      processedProduct.isActive = processedProduct.is_active;
      delete processedProduct.is_active;
    }

    // Transform storage location fields
    if (processedProduct.storage_room_id !== undefined) {
      processedProduct.storageRoomId = processedProduct.storage_room_id;
      delete processedProduct.storage_room_id;
    }

    if (processedProduct.shelf_id !== undefined) {
      processedProduct.shelfId = processedProduct.shelf_id;
      delete processedProduct.shelf_id;
    }

    if (processedProduct.shelf_name !== undefined) {
      processedProduct.shelfName = processedProduct.shelf_name;
      delete processedProduct.shelf_name;
    }

    if (processedProduct.shelf_code !== undefined) {
      processedProduct.shelfCode = processedProduct.shelf_code;
      delete processedProduct.shelf_code;
    }

    // Transform price fields - prioritize selling_price
    if (processedProduct.selling_price !== undefined) {
      processedProduct.price = processedProduct.selling_price;
    }

    if (processedProduct.cost_price !== undefined) {
      processedProduct.costPrice = processedProduct.cost_price;
      delete processedProduct.cost_price;
    }

    if (processedProduct.stock_quantity !== undefined) {
      processedProduct.stockQuantity = processedProduct.stock_quantity;
      delete processedProduct.stock_quantity;
    }

    if (processedProduct.min_stock_level !== undefined) {
      processedProduct.minStockLevel = processedProduct.min_stock_level;
      delete processedProduct.min_stock_level;
    }

    if (processedProduct.created_at !== undefined) {
      processedProduct.createdAt = processedProduct.created_at;
      delete processedProduct.created_at;
    }

    if (processedProduct.updated_at !== undefined) {
      processedProduct.updatedAt = processedProduct.updated_at;
      delete processedProduct.updated_at;
    }

    // Clean up image data and replace placeholder images
    if (processedProduct.images && Array.isArray(processedProduct.images)) {
      processedProduct.images = replacePlaceholderImages(processProductImages(processedProduct.images));
    }

    // Clean up individual image fields
    if (processedProduct.image_url) {
      processedProduct.image_url = emergencyUrlCleanup(processedProduct.image_url);
    }

    if (processedProduct.thumbnail_url) {
      processedProduct.thumbnail_url = emergencyUrlCleanup(processedProduct.thumbnail_url);
    }

    // Clean up any other image-related fields
    if (processedProduct.primary_image) {
      processedProduct.primary_image = cleanupImageData(processedProduct.primary_image);
    }

    // Process variants if they exist
    if (processedProduct.variants && Array.isArray(processedProduct.variants)) {
      processedProduct.variants = processedProduct.variants.map((variant: any) => {
        const processedVariant = { ...variant };
        
        // Transform variant field names
        if (processedVariant.product_id !== undefined) {
          processedVariant.productId = processedVariant.product_id;
          delete processedVariant.product_id;
        }
        
        if (processedVariant.variant_name !== undefined) {
          processedVariant.name = processedVariant.variant_name;
          delete processedVariant.variant_name;
        }
        
        // Use selling_price
        if (processedVariant.selling_price !== undefined) {
          const priceValue = processedVariant.selling_price;
          processedVariant.price = priceValue;
          processedVariant.sellingPrice = priceValue;
          delete processedVariant.selling_price;
        }
        
        if (processedVariant.cost_price !== undefined) {
          processedVariant.costPrice = processedVariant.cost_price;
          delete processedVariant.cost_price;
        }
        
        if (processedVariant.min_quantity !== undefined) {
          processedVariant.minQuantity = processedVariant.min_quantity;
          processedVariant.minStockLevel = processedVariant.min_quantity; // Also set minStockLevel for compatibility
          delete processedVariant.min_quantity;
        }
        
        if (processedVariant.quantity !== undefined) {
          processedVariant.stockQuantity = processedVariant.quantity;
          // Keep quantity as well for compatibility
        }
        
        if (processedVariant.created_at !== undefined) {
          processedVariant.createdAt = processedVariant.created_at;
          delete processedVariant.created_at;
        }
        
        if (processedVariant.updated_at !== undefined) {
          processedVariant.updatedAt = processedVariant.updated_at;
          delete processedVariant.updated_at;
        }
        
        return processedVariant;
      });
    }

    return processedProduct;
  });
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
