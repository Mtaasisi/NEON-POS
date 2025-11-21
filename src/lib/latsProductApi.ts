import { supabase } from './supabaseClient';
// ⚠️ DISABLED: Automatic default variant creation
// import { validateAndCreateDefaultVariant } from '../features/lats/lib/variantUtils';
import { ImageUploadService } from './imageUpload';
import { deduplicateRequest } from './requestDeduplication';
import { getCachedQuery, invalidateCachePattern } from './queryCache';

// Use the main supabase client instead of creating a separate one
// This ensures consistent configuration and avoids conflicts

export interface LatsProduct {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  sku: string;

  categoryId: string;
  supplierId?: string;
  images?: string[];
  totalQuantity: number;
  totalValue: number;
  createdAt: string;
  updatedAt: string;
  variants: LatsProductVariant[];
}

export interface LatsProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  attributes: Record<string, any>;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  minQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductData {
  name: string;
  description?: string;
  shortDescription?: string;
  sku: string;

  categoryId: string;
  supplierId?: string;
  
  // Price and stock fields for non-variant products
  costPrice?: number;
  sellingPrice?: number;
  price?: number; // Alternative to sellingPrice
  quantity?: number;
  stockQuantity?: number; // Alternative to quantity
  minQuantity?: number;
  minStockLevel?: number; // Alternative to minQuantity
  
  // Optional fields
  barcode?: string;
  storageRoomId?: string;
  shelfId?: string;
  attributes?: Record<string, any>;
  isActive?: boolean;
  
  variants?: Array<{
    sku: string;
    name: string;
  
    sellingPrice: number;
    costPrice: number;
    quantity: number;
    minQuantity: number;
    attributes?: Record<string, any>;
  }>;
  images?: Array<{
    image_url: string;
    thumbnail_url?: string;
    file_name: string;
    file_size: number;
    is_primary: boolean;
  }>;
  metadata?: Record<string, any>;
}

// Create a new product with images
export async function createProduct(
  productData: CreateProductData,
  userId: string
): Promise<LatsProduct> {
  try {
    // Extract images from the data
    const { images, ...productWithoutImages } = productData;
    
    // 🔒 Get current branch for isolation
    const currentBranchId = localStorage.getItem('current_branch_id');
    
    // Create the product first
    const productInsertData: any = {
      name: productWithoutImages.name,
      description: productWithoutImages.description,
      sku: productWithoutImages.sku,
      category_id: productWithoutImages.categoryId,
      is_active: productWithoutImages.isActive ?? true,
      total_quantity: 0,
      total_value: 0,
      branch_id: currentBranchId  // 🔒 Auto-assign to current branch
    };
    
    // Add price and stock fields if provided (for non-variant products)
    if (productWithoutImages.costPrice !== undefined) {
      productInsertData.cost_price = productWithoutImages.costPrice;
    }
    if (productWithoutImages.sellingPrice !== undefined || productWithoutImages.price !== undefined) {
      productInsertData.selling_price = productWithoutImages.sellingPrice ?? productWithoutImages.price;
    }
    if (productWithoutImages.quantity !== undefined || productWithoutImages.stockQuantity !== undefined) {
      productInsertData.stock_quantity = productWithoutImages.quantity ?? productWithoutImages.stockQuantity;
    }
    if (productWithoutImages.minQuantity !== undefined || productWithoutImages.minStockLevel !== undefined) {
      productInsertData.min_stock_level = productWithoutImages.minQuantity ?? productWithoutImages.minStockLevel;
    }
    
    // Add optional fields if provided
    if (productWithoutImages.storageRoomId) {
      productInsertData.storage_room_id = productWithoutImages.storageRoomId;
    }
    if (productWithoutImages.shelfId) {
      productInsertData.shelf_id = productWithoutImages.shelfId;
    }
    if (productWithoutImages.barcode) {
      productInsertData.barcode = productWithoutImages.barcode;
    }
    if (productWithoutImages.shortDescription) {
      // Store short description in metadata since there's no short_description column
      if (!productInsertData.metadata) {
        productInsertData.metadata = {};
      }
      productInsertData.metadata.shortDescription = productWithoutImages.shortDescription;
    }
    if ((productWithoutImages as any).maxStockLevel !== undefined) {
      productInsertData.max_stock_level = (productWithoutImages as any).maxStockLevel;
    }
    if ((productWithoutImages as any).internalNotes) {
      // Store internal notes in attributes or metadata
      if (!productInsertData.attributes) {
        productInsertData.attributes = {};
      }
      productInsertData.attributes.internalNotes = (productWithoutImages as any).internalNotes;
    }
    if (productWithoutImages.attributes) {
      productInsertData.attributes = {
        ...productInsertData.attributes,
        ...productWithoutImages.attributes
      };
    }
    
    // ✅ CRITICAL FIX: Ensure metadata includes skip_default_variant flag
    const hasVariants = productWithoutImages.variants && productWithoutImages.variants.length > 0;
    productInsertData.metadata = {
      ...(productWithoutImages.metadata || {}),
      skip_default_variant: hasVariants, // ✅ Skip auto-creation if custom variants provided
      useVariants: hasVariants,
      variantCount: hasVariants ? productWithoutImages.variants!.length : 0
    };
    
    // Only add supplier_id if it has valid values
    if (productWithoutImages.supplierId) {
      productInsertData.supplier_id = productWithoutImages.supplierId;
    }
    
    const { data: product, error: productError } = await supabase
      .from('lats_products')
      .insert(productInsertData)
      .select()
      .single();

    if (productError) {
      console.error('Product creation error:', productError);
      console.error('Product data being inserted:', productInsertData);
      
      // Format error message for better user experience
      if (productError.code === '23505') {
        // Duplicate key error (likely SKU conflict)
        const errorMessage = productError.message || 'Duplicate key violation';
        if (errorMessage.includes('sku') || errorMessage.includes('SKU')) {
          const formattedError = new Error(`Product with SKU "${productInsertData.sku}" already exists. Please use a unique SKU or update the existing product.`);
          (formattedError as any).code = productError.code;
          throw formattedError;
        }
      }
      
      throw productError;
    }

    // Create variants (be resilient to both price/sellingPrice & stock field names)
    if (productWithoutImages.variants && productWithoutImages.variants.length > 0) {
      // Ensure currentBranchId is a valid UUID or null
      const branchIdUuid = currentBranchId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentBranchId)
        ? currentBranchId
        : null;
      
      const variants = productWithoutImages.variants.map(variant => {
        const variantData: any = {
          product_id: product.id,
          sku: variant.sku,
          name: variant.name,  // 🔧 FIX: Save to 'name' (user-defined column)
          attributes: variant.attributes || {},  // 🔧 FIX: Save to 'attributes' (user-defined column)
          cost_price: variant.costPrice ?? 0,
          selling_price: (variant.sellingPrice ?? variant.price) ?? 0,
          quantity: (variant.quantity ?? variant.stockQuantity) ?? 0,
          min_quantity: (variant.minQuantity ?? variant.minStockLevel) ?? 0,
          branch_id: branchIdUuid,  // 🔒 Auto-assign variant to current branch
          is_shared: false,  // 🔒 Not shared by default
          sharing_mode: 'isolated'  // 🔒 Isolated by default
        };
        
        // ✅ CRITICAL FIX: Explicitly set visible_to_branches to null for isolated items
        // This prevents type mismatch errors (uuid[] vs text[])
        // For isolated items, branch_id handles isolation, so visible_to_branches should be null
        variantData.visible_to_branches = null;
        
        // Add variant-specific fields if present
        if (variant.variantType) {
          variantData.variant_type = variant.variantType;
        }
        if (variant.isParent !== undefined) {
          variantData.is_parent = variant.isParent;
        }
        if (variant.parentVariantId) {
          variantData.parent_variant_id = variant.parentVariantId;
        }
        if (variant.variantAttributes) {
          variantData.variant_attributes = variant.variantAttributes;
        }
        if (variant.isActive !== undefined) {
          variantData.is_active = variant.isActive;
        }
        
        return variantData;
      });

      const { error: variantsError } = await supabase
        .from('lats_product_variants')
        .insert(variants);

      if (variantsError) {
        console.error('Variants creation error:', variantsError);
        console.error('Variants data being inserted:', variants);
        throw variantsError;
      }
      
      console.log('✅ Created', variants.length, 'variants for product');
      
      // Small delay to ensure variants are committed to database before fetching
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      // ✨ If no variants provided, the database trigger will auto-create a "Default" variant
      // Wait a moment to allow the trigger to execute
      console.log('⏳ No variants provided - database trigger will auto-create default variant...');
      await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms for trigger
      
      // Verify the variant was created
      const { data: createdVariants, error: variantCheckError } = await supabase
        .from('lats_product_variants')
        .select('id, name, sku')
        .eq('product_id', product.id);
      
      if (!variantCheckError && createdVariants && createdVariants.length > 0) {
        console.log('✅ Default variant auto-created by trigger:', createdVariants[0]);
      } else {
        console.warn('⚠️ No default variant created - this may cause issues');
      }
    }

    // Handle images if provided
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        // If the image has a blob URL (from file upload), we need to convert it to a file and upload
        if (image.image_url.startsWith('blob:')) {
          // This would need to be handled by the EnhancedImageUpload component
          // For now, we'll skip these images as they should be uploaded separately
          continue;
        }
        
        // Insert image record
        const { error: imageError } = await supabase
          .from('product_images')
          .insert({
            product_id: product.id,
            image_url: image.image_url,
            thumbnail_url: image.thumbnail_url,
            file_name: image.file_name,
            file_size: image.file_size,
            is_primary: image.is_primary,
            uploaded_by: userId
          });

        if (imageError) {
          console.error('Error inserting image:', imageError);
        }
      }
    }

    // Fetch the complete product with variants to return
    const completeProduct = await _getProductImpl(product.id);
    
    return completeProduct;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

// Internal implementation for single product fetch
async function _getProductImpl(productId: string): Promise<LatsProduct & { images: any[] }> {
  // Validate productId
  if (!productId || productId === 'undefined' || productId === 'null') {
    throw new Error(`Invalid product ID: ${productId}`);
  }

  const { data: product, error: productError } = await supabase
    .from('lats_products')
    .select('*')
    .eq('id', productId)
    .single();

  if (productError) throw productError;
  if (!product) throw new Error('Product not found');

  // Fetch all related data in parallel
  const [categoryResult, supplierResult, variantsResult, storageRoomResult, shelfResult] = await Promise.all([
    // Category
    product.category_id 
      ? supabase.from('lats_categories').select('id, name').eq('id', product.category_id).single() 
      : Promise.resolve({ data: null }),
    
    // Supplier (with full details)
    product.supplier_id 
      ? supabase.from('lats_suppliers').select('id, name, contact_person, email, phone, address').eq('id', product.supplier_id).single() 
      : Promise.resolve({ data: null }),
    
    // Variants - ✅ Exclude IMEI children, show only parents
    supabase
      .from('lats_product_variants')
      .select('*')
      .eq('product_id', productId)
      .is('parent_variant_id', null)  // ✅ FIX: Exclude IMEI children
      .order('created_at', { ascending: true }),
    
    // Storage Room
    product.storage_room_id 
      ? supabase.from('storage_rooms').select('id, name').eq('id', product.storage_room_id).single() 
      : Promise.resolve({ data: null }),
    
    // Shelf
    product.shelf_id 
      ? supabase.from('shelves').select('id, name, code').eq('id', product.shelf_id).single() 
      : Promise.resolve({ data: null })
  ]);

  // Get product images - handle gracefully if table doesn't exist
  let images: any[] = [];
  try {
    images = await ImageUploadService.getProductImages(productId);
  } catch (imageError: any) {
    // Silently handle missing product_images table
    if (imageError?.code !== '42P01') {
      console.warn('Failed to fetch product images:', imageError);
    }
    images = [];
  }

  // Map variants to the expected format with correct stock calculation
  // ✅ FIX: Recalculate parent variant stock from children, but fallback to parent's own quantity if no children
  // 
  // IMPORTANT: Parent variants can have stock in two ways:
  // 1. IMEI parent variants: Stock is calculated from IMEI child variants (each IMEI = 1 unit)
  // 2. Regular parent variants: Stock is stored directly in the parent variant's quantity field
  // 
  // This logic handles both cases:
  // - If IMEI children exist with stock > 0 → use sum of children stock
  // - If no children OR children stock = 0 → use parent's own quantity field
  // - This ensures parent variants without IMEI children still show their correct stock
  const variants = await Promise.all((variantsResult.data || []).map(async (variant: any) => {
    let actualStock = variant.quantity || 0;
    
    // If this is a parent variant, try to recalculate stock from active IMEI children
    if (variant.is_parent || variant.variant_type === 'parent') {
      try {
        const { data: children, error: childError } = await supabase
          .from('lats_product_variants')
          .select('quantity, is_active')
          .eq('parent_variant_id', variant.id)
          .eq('variant_type', 'imei_child')
          .eq('is_active', true);
        
        if (!childError && children && children.length > 0) {
          // Sum up quantities of all active children
          const childrenStock = children.reduce((sum: number, child: any) => sum + (child.quantity || 0), 0);
          // Only use children stock if it's greater than 0, otherwise use parent's own quantity
          // This ensures parent variants without IMEI children (or with 0 IMEI stock) still show their own stock
          actualStock = childrenStock > 0 ? childrenStock : actualStock;
        }
        // If no children found, keep using parent's own quantity (actualStock already set above)
      } catch (e) {
        console.warn(`Could not calculate stock from children for variant ${variant.id}:`, e);
        // On error, keep using parent's own quantity
      }
    }
    
    return {
      id: variant.id,
      productId: variant.product_id,
      name: variant.variant_name || variant.name || 'Unnamed Variant',  // ✅ FIX: Prioritize variant_name (DB column)
      sku: variant.sku,
      attributes: variant.attributes || {},
      variantAttributes: variant.variant_attributes || {},
      variant_attributes: variant.variant_attributes || {},  // ✅ Include snake_case for UI compatibility
      price: variant.selling_price,
      costPrice: variant.cost_price,
      cost_price: variant.cost_price,        // ✅ Include snake_case for UI compatibility
      sellingPrice: variant.selling_price,
      selling_price: variant.selling_price,  // ✅ Include snake_case for UI compatibility
      stockQuantity: actualStock,  // ✅ Use calculated stock
      quantity: actualStock,       // ✅ Use calculated stock
      minQuantity: variant.min_quantity,
      minStockLevel: variant.min_quantity,
      isPrimary: variant.is_primary || false,
      isActive: variant.is_active,
      is_parent: variant.is_parent || false,       // ✅ Include parent flag
      variant_type: variant.variant_type || 'standard',  // ✅ Include variant type
      createdAt: variant.created_at,
      updatedAt: variant.updated_at
    };
  }));

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    sku: product.sku,
    categoryId: product.category_id,
    supplierId: product.supplier_id,
    isActive: product.is_active,
    totalQuantity: product.total_quantity,
    totalValue: product.total_value,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
    images,
    variants,
    // Include fetched category data
    category: categoryResult.data ? {
      id: categoryResult.data.id,
      name: categoryResult.data.name
    } : null,
    // Include full supplier data
    supplier: supplierResult.data ? {
      id: supplierResult.data.id,
      name: supplierResult.data.name,
      contactPerson: supplierResult.data.contact_person,
      email: supplierResult.data.email,
      phone: supplierResult.data.phone,
      address: supplierResult.data.address
    } : null,
    // Include storage location data
    storageRoomId: product.storage_room_id,
    storageRoomName: storageRoomResult.data?.name,
    shelfId: product.shelf_id,
    shelfName: shelfResult.data?.name,
    shelfCode: shelfResult.data?.code,
    // Include all other product fields that might exist
    barcode: product.barcode,
    specification: product.specification,
    condition: product.condition,
    brand: product.brand,
    model: product.model,
    weight: product.weight,
    length: product.length,
    width: product.width,
    height: product.height,
    shippingClass: product.shipping_class,
    requiresSpecialHandling: product.requires_special_handling,
    shippingStatus: product.shipping_status,
    trackingNumber: product.tracking_number,
    expectedDelivery: product.expected_delivery,
    shippingAgent: product.shipping_agent,
    usdPrice: product.usd_price,
    eurPrice: product.eur_price,
    exchangeRate: product.exchange_rate,
    baseCurrency: product.base_currency,
    isDigital: product.is_digital,
    requiresShipping: product.requires_shipping,
    isFeatured: product.is_featured,
    tags: product.tags,
    metadata: product.metadata
  } as any;
}

// Get a product by ID with images - PUBLIC API with caching and deduplication
export async function getProduct(productId: string, options?: { forceRefresh?: boolean }): Promise<LatsProduct & { images: any[] }> {
  const cacheKey = `products:${productId}`;
  
  // Use request deduplication to prevent duplicate simultaneous calls
  return deduplicateRequest(
    cacheKey,
    async () => {
      // Use query cache with 3-minute TTL and stale-while-revalidate
      return getCachedQuery(
        cacheKey,
        () => _getProductImpl(productId),
        {
          ttl: 3 * 60 * 1000, // 3 minutes
          staleWhileRevalidate: true, // Return stale data while fetching fresh
        }
      );
    },
    {
      forceRefresh: options?.forceRefresh,
      timeout: 60000, // 60 seconds - increased from default 30s to handle Neon cold starts
    }
  );
}

// Internal implementation with all optimizations
async function _getProductsImpl(): Promise<LatsProduct[]> {
  try {
    console.log('🔍 [getProducts] Starting optimized product fetch...');
    const startTime = Date.now();
    
    // Get current branch from localStorage
    const currentBranchId = localStorage.getItem('current_branch_id');
    
    // 🚀 OPTIMIZATION: Fetch branch settings ONCE if needed
    let branchSettings: any = null;
    if (currentBranchId) {
      const { data: settings, error: branchError } = await supabase
        .from('store_locations')
        .select('id, name, data_isolation_mode, share_products')
        .eq('id', currentBranchId)
        .single();
      
      branchSettings = settings;
      
      if (branchError) {
        console.warn('⚠️ Could not load branch settings:', branchError.message);
      }
    }
    
    // 🚀 OPTIMIZED: Build a SINGLE query with OR condition to include null branch products
    // This replaces the TWO separate queries with ONE combined query
    let query = supabase
      .from('lats_products')
      .select('id, name, description, sku, barcode, category_id, supplier_id, cost_price, stock_quantity, min_stock_level, max_stock_level, is_active, image_url, brand, model, warranty_period, created_at, updated_at, specification, condition, selling_price, total_quantity, total_value, storage_room_id, shelf_id, branch_id, is_shared, sharing_mode, visible_to_branches')
      .eq('is_active', true) // Only fetch active products
      .order('created_at', { ascending: false });
    
    // 🔒 BRANCH FILTERING - Build OR condition to include all relevant products in ONE query
    if (currentBranchId && branchSettings) {
      if (branchSettings.data_isolation_mode === 'isolated') {
        // ISOLATED MODE: Show products from this branch + shared products
        query = query.or(`branch_id.eq.${currentBranchId},is_shared.eq.true`);
      } else if (branchSettings.data_isolation_mode === 'shared') {
        // SHARED MODE: Show all products (no filter)
      } else if (branchSettings.data_isolation_mode === 'hybrid') {
        // HYBRID MODE: Show this branch's products + shared products + unassigned products
        query = query.or(`branch_id.eq.${currentBranchId},is_shared.eq.true,branch_id.is.null`);
      } else {
        // DEFAULT: Show this branch's products + unassigned products
        query = query.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
      }
    } else if (currentBranchId && !branchSettings) {
      // No branch settings found, use default filter
      query = query.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
    }
    
    // Execute the SINGLE optimized query
    console.log(`🔍 [getProducts] Executing query with branch filter...`);
    console.log(`   Branch ID: ${currentBranchId || 'none'}`);
    console.log(`   Branch Mode: ${branchSettings?.data_isolation_mode || 'none'}`);
    console.log(`   Filter: is_active = true${currentBranchId ? ` AND (branch_id = ${currentBranchId} OR is_shared = true OR branch_id IS NULL)` : ''}`);
    const { data: allProducts, error } = await query;
    const queryTime = Date.now() - startTime;
    
    console.log(`⚡ [getProducts] Query completed in ${queryTime}ms`);
    console.log(`📊 [getProducts] Returned ${allProducts?.length || 0} products`);
    
    if (error) {
      console.error('❌ [getProducts] Query error:', error);
      console.error('   Error message:', error.message);
      console.error('   Error details:', error.details);
      console.error('   Error hint:', error.hint);
    }
    
    if (allProducts && allProducts.length > 0) {
      console.log(`✅ [getProducts] First product: ${allProducts[0].name} (branch_id=${allProducts[0].branch_id || 'NULL'}, is_shared=${allProducts[0].is_shared})`);
      // Log branch distribution
      const branchStats = allProducts.reduce((acc: any, p: any) => {
        const key = p.branch_id || 'NULL';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      console.log(`📊 [getProducts] Products by branch:`, branchStats);
    } else {
      console.warn('⚠️ [getProducts] No products returned! This might indicate a filtering issue.');
      console.warn('   Possible causes:');
      console.warn('   1. All products are inactive (is_active = false)');
      console.warn('   2. Branch filtering is excluding all products');
      console.warn('   3. No products exist in database');
      console.warn('   💡 Tip: Check database directly to verify products exist');
    }

    if (error) {
      console.error('%c❌ QUERY FAILED!', 'background: #ff0000; color: white; font-size: 14px; font-weight: bold; padding: 5px;');
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
    
    // 🚀 OPTIMIZATION: No need for a second query or merging - we got everything in ONE query
    const mergedProducts = allProducts || [];
    
    // Remove duplicates (in case a product appears in both lists)
    const uniqueProducts = Array.from(
      new Map(mergedProducts.map(p => [p.id, p])).values()
    );

    if (!uniqueProducts || uniqueProducts.length === 0) {
      return [];
    }

    // Show first few products with their branch info:';
    uniqueProducts.slice(0, 3).forEach((p, i) => {
      if (p && p.name) {
      } else {
      }
    });

    // Note: Showing ALL products including test/sample products as per user preference
    const products = uniqueProducts.filter(product => {
      // Skip null or invalid products
      if (!product || !product.name) {
        console.warn('⚠️ Skipping null or invalid product:', product);
        return false;
      }
      return true; // Show all valid products
    });

    // Fetch categories and suppliers separately (Neon doesn't support PostgREST joins)
    const categoryIds = [...new Set(products.map(p => p.category_id).filter(Boolean))];
    const supplierIds = [...new Set(products.map(p => p.supplier_id).filter(Boolean))];
    const productIds = products.map(p => p.id).filter(Boolean);
    
    console.log(`📊 [getProducts] Found ${categoryIds.length} unique categories and ${supplierIds.length} unique suppliers in products`);
    
    // 🚀 SUPER OPTIMIZED: Fetch categories, suppliers, variants, and images in PARALLEL
    // This reduces 4 sequential queries to 1 parallel batch (4x faster!)
    const fetchStartTime = Date.now();
    
    // Build all queries first
    const categoriesQuery = categoryIds.length > 0 
      ? supabase.from('lats_categories').select('id, name').in('id', categoryIds)
      : Promise.resolve({ data: [] });
      
    const suppliersQuery = supabase.from('lats_suppliers').select('id, name').eq('is_active', true).order('name');
    
    // Build variants query
    // ✅ FIX: Show ALL variants (including 0 stock) for inventory management
    // Note: POS page can filter out 0 stock variants on the frontend if needed
    const currentBranchIdForVariants = localStorage.getItem('current_branch_id');
    let variantQuery = supabase
      .from('lats_product_variants')
      .select('id, product_id, name, variant_name, sku, attributes, variant_attributes, cost_price, selling_price, quantity, reserved_quantity, min_quantity, created_at, updated_at, branch_id, is_shared, is_parent, variant_type, parent_variant_id')
      .in('product_id', productIds)
      .is('parent_variant_id', null)
      // ✅ REMOVED: .gt('quantity', 0) - Show all variants including 0 stock for inventory management
      .eq('is_active', true) // ✅ Only show active variants
      .order('name');
    
    // Apply branch filtering to variants
    if (currentBranchIdForVariants && branchSettings) {
      if (branchSettings.data_isolation_mode === 'isolated') {
        variantQuery = variantQuery.or(`is_shared.eq.true,branch_id.eq.${currentBranchIdForVariants}`);
      } else if (branchSettings.data_isolation_mode === 'hybrid') {
        variantQuery = variantQuery.or(`is_shared.eq.true,branch_id.eq.${currentBranchIdForVariants},branch_id.is.null`);
      }
    } else if (currentBranchIdForVariants) {
      variantQuery = variantQuery.or(`branch_id.eq.${currentBranchIdForVariants},branch_id.is.null`);
    }
    
    // Build images query
    const imagesQuery = productIds.length > 0
      ? supabase.from('product_images').select('id, product_id, image_url, thumbnail_url, is_primary').in('product_id', productIds).order('is_primary', { ascending: false })
      : Promise.resolve({ data: [] });
    
    // 🚀 Execute ALL queries in PARALLEL (huge performance boost!)
    const [categoriesResult, suppliersResult, variantsResult, imagesResult] = await Promise.all([
      categoriesQuery,
      suppliersQuery,
      variantQuery,
      imagesQuery
    ]);
    
    const fetchDuration = Date.now() - fetchStartTime;
    console.log(`⚡ [getProducts] All data fetched in parallel: ${fetchDuration}ms`);
    
    // Log any errors in fetching
    if (categoriesResult.error) {
      console.error('❌ Error fetching categories:', categoriesResult.error);
    }
    if (suppliersResult && 'error' in suppliersResult && suppliersResult.error) {
      console.error('❌ Error fetching suppliers:', suppliersResult.error);
    }
    if (variantsResult.error) {
      console.error('❌ Error fetching variants:', variantsResult.error);
    }
    if (imagesResult.error) {
      console.error('❌ Error fetching images:', imagesResult.error);
    }
    
    // Extract data from supabase responses
    const categoriesData = categoriesResult.data || [];
    const suppliersData = suppliersResult.data || [];
    let allVariants = variantsResult.data || [];
    let productImages = (imagesResult.data || []).map(img => ({
      ...img,
      thumbnail_url: img.thumbnail_url || img.image_url
    }));
    
    console.log(`✅ [getProducts] Fetched ${categoriesData.length} categories, ${suppliersData.length} suppliers, ${allVariants.length} variants, ${productImages.length} images`);
    
    // Create lookup maps
    const categoriesMap = new Map();
    (categoriesData || []).forEach(cat => {
      categoriesMap.set(cat.id, cat);
    });
    
    const suppliersMap = new Map();
    (suppliersData || []).forEach(supp => {
      suppliersMap.set(supp.id, supp);
    });
    
    // Group variants by product ID
    const variantsByProductId = new Map<string, any[]>();
    allVariants.forEach(variant => {
      if (!variantsByProductId.has(variant.product_id)) {
        variantsByProductId.set(variant.product_id, []);
      }
      variantsByProductId.get(variant.product_id)!.push(variant);
    });

    // Group images by product ID (already fetched in parallel above)
    const imagesByProductId = new Map<string, any[]>();
    if (productImages && productImages.length > 0) {
      productImages.forEach(img => {
        if (!imagesByProductId.has(img.product_id)) {
          imagesByProductId.set(img.product_id, []);
        }
        imagesByProductId.get(img.product_id)!.push(img);
      });
    }

    // Map products with their variants and images
    // Fetch shelf data for all products in one query
    const shelfData: Map<string, any> = new Map();
    try {
      const productIdsWithShelves = products
        .filter(p => p.shelf_id)
        .map(p => p.shelf_id);
      
      if (productIdsWithShelves.length > 0) {
        const { data: shelves } = await supabase
          .from('lats_store_shelves')
          .select('id, name, code')
          .in('id', productIdsWithShelves);
        
        if (shelves) {
          shelves.forEach(shelf => {
            shelfData.set(shelf.id, shelf);
          });
        }
      }
    } catch (shelfError) {
      console.warn('Could not fetch shelf data:', shelfError);
    }

    // ✅ FIX: Recalculate parent variant stock from children before mapping products
    // This ensures consistency between list view and detail view
    const parentVariantIds = allVariants
      .filter((v: any) => v.is_parent || v.variant_type === 'parent')
      .map((v: any) => v.id);
    
    const childrenStockMap = new Map<string, number>();
    if (parentVariantIds.length > 0) {
      try {
        const { data: allChildren, error: childrenError } = await supabase
          .from('lats_product_variants')
          .select('parent_variant_id, quantity, is_active')
          .in('parent_variant_id', parentVariantIds)
          .eq('variant_type', 'imei_child')
          .eq('is_active', true);
        
        if (!childrenError && allChildren) {
          // Sum up children quantities by parent
          allChildren.forEach((child: any) => {
            const parentId = child.parent_variant_id;
            const currentSum = childrenStockMap.get(parentId) || 0;
            childrenStockMap.set(parentId, currentSum + (child.quantity || 0));
          });
        }
      } catch (e) {
        console.warn('Could not fetch children stock for parent variants:', e);
      }
    }

    const mappedProducts = (products || []).map(product => {
      // Get images for this product - combine image_url field and product_images table
      const images: string[] = [];
      
      // Add image_url if it exists (from main products table)
      if (product.image_url) {
        images.push(product.image_url);
      }
      
      // Add images from product_images table
      const productImagesArray = imagesByProductId.get(product.id) || [];
      productImagesArray.forEach(img => {
        if (img.image_url && !images.includes(img.image_url)) {
          images.push(img.image_url);
        }
      });

      const productVariants = variantsByProductId.get(product.id) || [];
      const firstVariant = productVariants[0];
      
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        barcode: product.barcode,
        specification: product.specification,
        images: images, // Add images array
        image_url: images[0] || product.image_url || null, // Primary image for mobile display
        categoryId: product.category_id,
        supplierId: product.supplier_id,
        isActive: product.is_active,
        price: product.selling_price || firstVariant?.selling_price || 0,
        costPrice: product.cost_price || firstVariant?.cost_price || 0,
        stockQuantity: product.stock_quantity || 0,
        minStockLevel: product.min_stock_level || 0,
        totalQuantity: product.total_quantity || 0,
        totalValue: product.total_value || 0,
        // Include joined data from lookup maps
        supplier: product.supplier_id ? suppliersMap.get(product.supplier_id) : undefined,
        category: product.category_id ? categoriesMap.get(product.category_id) : undefined,
        // Shelf data (fetched separately)
        shelfId: product.shelf_id,
        storageRoomId: product.storage_room_id,
        shelfName: product.shelf_id ? shelfData.get(product.shelf_id)?.name : undefined,
        shelfCode: product.shelf_id ? shelfData.get(product.shelf_id)?.code : undefined,
        storageRoomName: undefined, // Can be added later if needed
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        variants: productVariants.map((variant: any) => {
          // ✅ FIX: For parent variants, use recalculated stock from children, but fallback to parent's own quantity
          // 
          // IMPORTANT: Parent variants can have stock in two ways:
          // 1. IMEI parent variants: Stock from IMEI child variants (each IMEI = 1 unit)
          // 2. Regular parent variants: Stock stored directly in parent's quantity field
          // 
          // This ensures parent variants without IMEI children still show their correct stock
          let actualStock = variant.quantity || 0;
          
          if (variant.is_parent || variant.variant_type === 'parent') {
            const childrenStock = childrenStockMap.get(variant.id);
            // Only use children stock if it exists and is greater than 0, otherwise use parent's own quantity
            // This prevents parent variants from showing 0 stock when they have stock in their own quantity field
            if (childrenStock !== undefined && childrenStock > 0) {
              actualStock = childrenStock;
            }
            // If no children or children stock is 0, keep using parent's own quantity (already set above)
          }
          
          return {
            id: variant.id,
            productId: variant.product_id,
            sku: variant.sku,
            name: variant.variant_name || variant.name || 'Unnamed',  // ✅ FIX: Prioritize variant_name (DB column) first, then legacy name
            attributes: variant.variant_attributes || variant.attributes || {},  // ✅ FIX: Prioritize variant_attributes (DB column) first
            costPrice: variant.cost_price || 0,
            sellingPrice: variant.selling_price || 0,
            price: variant.selling_price || 0,
            stockQuantity: actualStock,  // ✅ Use recalculated stock for parent variants
            minStockLevel: variant.min_quantity || 0,
            quantity: actualStock,  // ✅ Use recalculated stock for parent variants
            minQuantity: variant.min_quantity || 0,
    
            weight: null, // Column was removed in migration
            dimensions: null, // Column was removed in migration
            createdAt: variant.created_at,
            updatedAt: variant.updated_at
          };
        })
      };
    });
    
    // Log supplier population statistics
    const productsWithSupplier = mappedProducts.filter(p => p.supplier).length;
    const productsWithoutSupplier = mappedProducts.filter(p => !p.supplier && p.supplierId).length;
    const productsWithNoSupplierId = mappedProducts.filter(p => !p.supplierId).length;
    
    console.log(`📊 [getProducts] Supplier population stats:
      - Total products: ${mappedProducts.length}
      - Products with supplier object: ${productsWithSupplier}
      - Products with supplier_id but no supplier object: ${productsWithoutSupplier}
      - Products with no supplier_id: ${productsWithNoSupplierId}`);
    
    return mappedProducts;
  } catch (error) {
    console.error('💥 [latsProductApi] Exception in getProducts:', error);
    console.error('💥 [latsProductApi] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`getProducts failed: ${error.message}`);
    } else {
      throw new Error('getProducts failed: Unknown error');
    }
  }
}

// Get all products - PUBLIC API with caching and deduplication
export async function getProducts(options?: { forceRefresh?: boolean }): Promise<LatsProduct[]> {
  const currentBranchId = localStorage.getItem('current_branch_id');
  const cacheKey = `products:${currentBranchId || 'default'}`;
  
  // If force refresh, clear caches first
  if (options?.forceRefresh) {
    console.log('🔄 [getProducts] Force refresh requested - clearing caches...');
    invalidateCachePattern('products:*');
    const { smartCache } = await import('./enhancedCacheManager');
    smartCache.invalidateCache('products');
  }
  
  // Use request deduplication to prevent duplicate simultaneous calls
  // Timeout increased to 60s to handle Neon cold starts (useInventoryStore has 75s outer timeout)
  return deduplicateRequest(
    cacheKey,
    async () => {
      // Use query cache with 3-minute TTL and stale-while-revalidate
      return getCachedQuery(
        cacheKey,
        () => _getProductsImpl(),
        {
          ttl: 3 * 60 * 1000, // 3 minutes
          staleWhileRevalidate: true, // Return stale data while fetching fresh
        }
      );
    },
    {
      forceRefresh: options?.forceRefresh,
      timeout: 60000, // 60 seconds - increased from default 30s to handle Neon cold starts
    }
  );
}

// Update a product
export async function updateProduct(
  productId: string,
  productData: Partial<CreateProductData>,
  userId: string
): Promise<LatsProduct> {
  try {
    // Invalidate product cache on update
    invalidateCachePattern('^products:');
    
    // First, verify the product exists and get branch_id
    const { data: existingProduct, error: existError } = await supabase
      .from('lats_products')
      .select('id, name, branch_id')
      .eq('id', productId)
      .single();
    
    if (existError) {
      console.error('❌ [API] Product does not exist:', existError);
      throw new Error(`Product with ID ${productId} not found`);
    }
    
    if (!existingProduct) {
      throw new Error(`Product with ID ${productId} does not exist in database`);
    }
    
    const { images, variants, ...productWithoutImages } = productData;
    
    // Prepare update data - only include fields that are defined
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (productWithoutImages.name !== undefined) updateData.name = productWithoutImages.name;
    if (productWithoutImages.description !== undefined) updateData.description = productWithoutImages.description;
    if (productWithoutImages.sku !== undefined) updateData.sku = productWithoutImages.sku;
    if (productWithoutImages.categoryId !== undefined) updateData.category_id = productWithoutImages.categoryId;
    if (productWithoutImages.supplierId !== undefined) updateData.supplier_id = productWithoutImages.supplierId;
    // ✅ FIX: Only include tags if it's defined and not empty, otherwise set to null to avoid PostgreSQL empty array error
    if (productWithoutImages.tags !== undefined) {
      updateData.tags = Array.isArray(productWithoutImages.tags) && productWithoutImages.tags.length > 0 
        ? productWithoutImages.tags 
        : null;
    }
    if (productWithoutImages.isActive !== undefined) updateData.is_active = productWithoutImages.isActive;
    
    // Handle pricing and stock fields
    if (productWithoutImages.costPrice !== undefined) updateData.cost_price = productWithoutImages.costPrice;
    if (productWithoutImages.sellingPrice !== undefined) updateData.selling_price = productWithoutImages.sellingPrice;
    if (productWithoutImages.price !== undefined) updateData.selling_price = productWithoutImages.price; // Alias for sellingPrice
    if (productWithoutImages.stockQuantity !== undefined) updateData.stock_quantity = productWithoutImages.stockQuantity;
    if (productWithoutImages.minStockLevel !== undefined) updateData.min_stock_level = productWithoutImages.minStockLevel;
    if (productWithoutImages.condition !== undefined) updateData.condition = productWithoutImages.condition;
    if (productWithoutImages.specification !== undefined) updateData.specification = productWithoutImages.specification;
    
    // Update the product (without .select() to avoid RLS issues)
    const { error: productError } = await supabase
      .from('lats_products')
      .update(updateData)
      .eq('id', productId);

    if (productError) {
      console.error('❌ [API] Product update error:', productError);
      throw productError;
    }
    
    // Fetch the updated product separately (avoids RLS SELECT issues with UPDATE)
    const { data: product, error: fetchError } = await supabase
      .from('lats_products')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (fetchError || !product) {
      console.error('❌ [API] Failed to fetch updated product:', fetchError);
      // Even if fetch fails, update succeeded, so create a minimal response
      return {
        id: productId,
        name: updateData.name || existingProduct.name,
        description: updateData.description || '',
        sku: updateData.sku || '',
        categoryId: updateData.category_id || '',
        supplierId: updateData.supplier_id,
        tags: updateData.tags && Array.isArray(updateData.tags) && updateData.tags.length > 0 ? updateData.tags : [],
        isActive: updateData.is_active ?? true,
        isFeatured: false,
        isDigital: false,
        requiresShipping: true,
        taxRate: 0,
        totalQuantity: 0,
        totalValue: 0,
        createdAt: new Date().toISOString(),
        updatedAt: updateData.updated_at
      };
    }

    // Handle variants if provided
    if (variants && Array.isArray(variants)) {
      
      // 🔒 Get branch_id for new variants - try from updated product, then existing product, then localStorage
      let branchIdForVariants: string | null = null;
      if (product && product.branch_id) {
        branchIdForVariants = product.branch_id;
      } else if (existingProduct && existingProduct.branch_id) {
        branchIdForVariants = existingProduct.branch_id;
      } else {
        branchIdForVariants = localStorage.getItem('current_branch_id');
      }
      
      // Get existing variants with full details
      const { data: existingVariants, error: fetchError } = await supabase
        .from('lats_product_variants')
        .select('id, sku, variant_name')
        .eq('product_id', productId);

      if (fetchError) {
        console.error('❌ [API] Failed to fetch existing variants:', fetchError);
        throw fetchError;
      }
      
      // Ensure existingVariants is an array (could be null)
      const safeExistingVariants = Array.isArray(existingVariants) ? existingVariants : [];
      
      // Create a map of existing variants by ID for quick lookup
      const existingVariantsMap = new Map(
        safeExistingVariants.map(v => [v.id, v])
      );

      // Process each variant
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        
        // Validate variant data
        if (!variant || !variant.sku) {
          console.warn('⚠️ Skipping invalid variant:', variant);
          continue;
        }
        
        // Base variant data (always update these fields)
        const variantData: any = {
          product_id: productId,
          variant_name: variant.name || 'Default',
          variant_attributes: variant.attributes || {},
          cost_price: variant.costPrice || 0,
          selling_price: variant.sellingPrice || variant.price || 0,
          quantity: variant.quantity ?? variant.stockQuantity ?? 0,
          min_quantity: variant.minQuantity ?? variant.minStockLevel ?? 0
        };
        
        // Only include SKU if it's changed or this is a new variant
        const existingVariant = variant.id ? existingVariantsMap.get(variant.id) : null;
        if (!existingVariant || existingVariant.sku !== variant.sku) {
          variantData.sku = variant.sku;
        }

        // Check if variant has an ID (existing variant) or if we need to find it by SKU
        if (variant.id) {
          // Update by ID (most reliable)
          const { error: updateError } = await supabase
            .from('lats_product_variants')
            .update(variantData)
            .eq('id', variant.id);

          if (updateError) {
            console.error('❌ Update by ID failed:', updateError);
            console.error('❌ Update error details:', JSON.stringify(updateError, null, 2));
            console.error('❌ Variant data that failed:', JSON.stringify(variantData, null, 2));
            console.error('❌ Existing variant:', existingVariant);
            throw updateError;
          }
        } else {
          // Check if variant exists by SKU
          const existingVariantBySku = safeExistingVariants.find(v => v && v.sku === variant.sku);

          if (existingVariantBySku && existingVariantBySku.id) {
            // Update existing variant by SKU
            const { error: updateError } = await supabase
              .from('lats_product_variants')
              .update(variantData)
              .eq('id', existingVariantBySku.id);

            if (updateError) {
              console.error('❌ Update by SKU failed:', updateError);
              console.error('❌ Update error details:', JSON.stringify(updateError, null, 2));
              console.error('❌ Variant data that failed:', JSON.stringify(variantData, null, 2));
              throw updateError;
            }
          } else {
            // Create new variant - always include SKU and branch_id for new variants
            if (!variantData.sku) {
              variantData.sku = variant.sku;
            }
            // 🔒 CRITICAL FIX: Include branch_id when creating new variants
            variantData.branch_id = branchIdForVariants;
            if (!branchIdForVariants) {
              console.warn('⚠️ [API] Creating variant without branch_id - this may cause issues');
            }
            const { error: insertError } = await supabase
              .from('lats_product_variants')
              .insert(variantData);

            if (insertError) {
              console.error('❌ Insert failed:', insertError);
              console.error('❌ Insert error details:', JSON.stringify(insertError, null, 2));
              console.error('❌ Variant data that failed:', JSON.stringify(variantData, null, 2));
              throw insertError;
            }
          }
        }
      }

      // Delete variants that are no longer needed (but keep at least one)
      if (safeExistingVariants.length > variants.length && safeExistingVariants.length > 1) {
        const variantsToKeep = variants.map(v => v?.sku).filter(Boolean);
        const variantsToDelete = safeExistingVariants
          .filter(v => v && v.sku && !variantsToKeep.includes(v.sku))
          .slice(0, Math.max(0, safeExistingVariants.length - 1)); // Keep at least one variant
        
        for (const variantToDelete of variantsToDelete) {
          if (variantToDelete && variantToDelete.id) {
            // Check if variant has stock movements before attempting deletion
            const { data: stockMovements, error: checkError } = await supabase
              .from('lats_stock_movements')
              .select('id')
              .eq('variant_id', variantToDelete.id)
              .limit(1);

            if (checkError) {
              console.error('❌ Failed to check stock movements:', checkError);
              // Continue to next variant instead of throwing
              continue;
            }

            // Skip deletion if variant has stock movements (preserve historical data)
            if (stockMovements && stockMovements.length > 0) {
              // Only log in development mode to reduce console noise
              if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
                console.log(`ℹ️ Preserving variant ${variantToDelete.sku || variantToDelete.variant_name} (has ${stockMovements.length} stock movement(s) - historical data)`);
              }
              continue;
            }

            // Safe to delete - no stock movements exist
            const { error: deleteError } = await supabase
              .from('lats_product_variants')
              .delete()
              .eq('id', variantToDelete.id);

            if (deleteError) {
              // Check if it's a foreign key constraint error
              if (deleteError.code === '23503') {
                console.warn(`⚠️ Cannot delete variant ${variantToDelete.id} (${variantToDelete.sku || variantToDelete.variant_name}): referenced by other records`);
                continue; // Skip this variant and continue with others
              }
              console.error('❌ Delete failed:', deleteError);
              throw deleteError;
            }
          }
        }
      }
    }

    if (!product || !product.id) {
      throw new Error('Product update returned null or invalid product');
    }
    
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
  
      categoryId: product.category_id,
      supplierId: product.supplier_id,
      tags: product.tags,
      isActive: product.is_active,
      isFeatured: product.is_featured,
      isDigital: product.is_digital,
      requiresShipping: product.requires_shipping,
      taxRate: product.tax_rate,
      totalQuantity: product.total_quantity,
      totalValue: product.total_value,
      createdAt: product.created_at,
      updatedAt: product.updated_at
    };
  } catch (error: any) {
    console.error('❌ [API] Error updating product:', error);
    console.error('❌ [API] Product ID:', productId);
    console.error('❌ [API] Product data:', productData);
    console.error('❌ [API] Error stack:', error?.stack);
    throw error;
  }
}

// Delete a product
export async function deleteProduct(productId: string): Promise<void> {
  // Step 1: Get all variants for this product
  const { data: variants, error: variantsError } = await supabase
    .from('lats_product_variants')
    .select('id')
    .eq('product_id', productId);

  if (variantsError) {
    console.error('Error fetching variants:', variantsError);
    throw variantsError;
  }

  const variantIds = variants?.map(v => v.id) || [];

  // Step 2: Delete purchase order items that reference this product
  // This handles the foreign key constraint: lats_purchase_order_items_product_id_fkey
  if (variantIds.length > 0) {
    // Delete PO items that reference variants of this product
    const { error: poItemsError } = await supabase
      .from('lats_purchase_order_items')
      .delete()
      .in('variant_id', variantIds);

    if (poItemsError) {
      console.error('Error deleting purchase order items (by variant):', poItemsError);
      // Continue anyway, try to delete by product_id
    }
  }

  // Delete PO items that directly reference the product
  const { error: poItemsByProductError } = await supabase
    .from('lats_purchase_order_items')
    .delete()
    .eq('product_id', productId);

  if (poItemsByProductError) {
    console.error('Error deleting purchase order items (by product):', poItemsByProductError);
    throw poItemsByProductError;
  }

  // Step 3: Delete stock movements for variants
  if (variantIds.length > 0) {
    const { error: stockMovementsError } = await supabase
      .from('lats_stock_movements')
      .delete()
      .in('variant_id', variantIds);

    if (stockMovementsError) {
      console.error('Error deleting stock movements:', stockMovementsError);
      // Continue anyway
    }
  }

  // Delete stock movements that reference the product directly
  const { error: stockMovementsByProductError } = await supabase
    .from('lats_stock_movements')
    .delete()
    .eq('product_id', productId);

  if (stockMovementsByProductError) {
    console.error('Error deleting stock movements (by product):', stockMovementsByProductError);
    // Continue anyway
  }

  // Step 4: Delete variants (must be done before deleting product)
  if (variantIds.length > 0) {
    const { error: variantsDeleteError } = await supabase
      .from('lats_product_variants')
      .delete()
      .in('id', variantIds);

    if (variantsDeleteError) {
      console.error('Error deleting variants:', variantsDeleteError);
      throw variantsDeleteError;
    }
  }

  // Step 5: Delete sale items that reference this product
  const { error: saleItemsError } = await supabase
    .from('lats_sale_items')
    .delete()
    .eq('product_id', productId);

  if (saleItemsError) {
    console.error('Error deleting sale items:', saleItemsError);
    // Continue anyway - sale items might have ON DELETE CASCADE or we want to preserve history
  }

  // Step 6: Delete auto reorder log entries
  const { error: autoReorderLogError } = await supabase
    .from('auto_reorder_log')
    .delete()
    .eq('product_id', productId);

  if (autoReorderLogError) {
    console.error('Error deleting auto reorder log:', autoReorderLogError);
    // Continue anyway
  }

  // Step 7: Now delete the product itself
  const { error } = await supabase
    .from('lats_products')
    .delete()
    .eq('id', productId);

  if (error) throw error;
}
