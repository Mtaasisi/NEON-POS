import { supabase } from './supabaseClient';
import { validateAndCreateDefaultVariant } from '../features/lats/lib/variantUtils';
import { ImageUploadService } from './imageUpload';

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
  variants: Array<{
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
    console.log('🔒 [createProduct] Assigning product to branch:', currentBranchId);
    
    // Create the product first
    const productInsertData: any = {
      name: productWithoutImages.name,
      description: productWithoutImages.description,
      category_id: productWithoutImages.categoryId,
      is_active: productWithoutImages.isActive ?? true,
      total_quantity: 0,
      total_value: 0,
      branch_id: currentBranchId,  // 🔒 Auto-assign to current branch
      is_shared: false,  // 🔒 Not shared by default
      sharing_mode: 'isolated',  // 🔒 Isolated by default
      visible_to_branches: currentBranchId ? [currentBranchId] : null  // 🔒 Only visible to current branch
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
      throw productError;
    }

    // Create variants (be resilient to both price/sellingPrice & stock field names)
    if (productWithoutImages.variants && productWithoutImages.variants.length > 0) {
      const variants = productWithoutImages.variants.map(variant => ({
        product_id: product.id,
        sku: variant.sku,
        name: variant.name,
        attributes: variant.attributes || {},
        cost_price: variant.costPrice ?? 0,
        selling_price: (variant.sellingPrice ?? variant.price) ?? 0,
        quantity: (variant.quantity ?? variant.stockQuantity) ?? 0,
        min_quantity: (variant.minQuantity ?? variant.minStockLevel) ?? 0,
        branch_id: currentBranchId,  // 🔒 Auto-assign variant to current branch
        is_shared: false,  // 🔒 Not shared by default
        sharing_mode: 'isolated',  // 🔒 Isolated by default
        visible_to_branches: currentBranchId ? [currentBranchId] : null  // 🔒 Only visible to current branch
      }));

      const { error: variantsError } = await supabase
        .from('lats_product_variants')
        .insert(variants);

      if (variantsError) {
        console.error('Variants creation error:', variantsError);
        console.error('Variants data being inserted:', variants);
        throw variantsError;
      }
    } else {
      // No variants provided - create a default variant automatically
      console.log('🔄 No variants provided, creating default variant automatically');
      
      const defaultVariantResult = await validateAndCreateDefaultVariant(
        product.id,
        product.name,
        {
          costPrice: productWithoutImages.costPrice,
          sellingPrice: productWithoutImages.sellingPrice,
          quantity: productWithoutImages.quantity,
          minQuantity: productWithoutImages.minQuantity,
          sku: productWithoutImages.sku,
          attributes: productWithoutImages.attributes
        }
      );

      if (!defaultVariantResult.success) {
        console.error('❌ Failed to create default variant:', defaultVariantResult.error);
        throw new Error(`Failed to create default variant: ${defaultVariantResult.error}`);
      }
      
      console.log('✅ Default variant created successfully');
    }

    // Handle images if provided
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        // If the image has a blob URL (from file upload), we need to convert it to a file and upload
        if (image.image_url.startsWith('blob:')) {
          // This would need to be handled by the EnhancedImageUpload component
          // For now, we'll skip these images as they should be uploaded separately
          console.log('Skipping blob URL image:', image.file_name);
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

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      sku: productWithoutImages.sku,

      categoryId: product.category_id,
      supplierId: product.supplier_id,
      isActive: product.is_active,
      totalQuantity: product.total_quantity,
      totalValue: product.total_value,
      createdAt: product.created_at,
      updatedAt: product.updated_at
    };
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

// Get a product by ID with images
export async function getProduct(productId: string): Promise<LatsProduct & { images: any[] }> {
  const { data: product, error: productError } = await supabase
    .from('lats_products')
    .select('*')
    .eq('id', productId)
    .single();

  if (productError) throw productError;

  // Fetch category and supplier separately
  const [categoryResult, supplierResult] = await Promise.all([
    product.category_id ? supabase.from('lats_categories').select('id, name').eq('id', product.category_id).single() : Promise.resolve({ data: null }),
    product.supplier_id ? supabase.from('lats_suppliers').select('id, name').eq('id', product.supplier_id).single() : Promise.resolve({ data: null })
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
    // Include fetched category and supplier data
    category: categoryResult.data,
    supplier: supplierResult.data
  };
}

// Get all products - FIXED to respect store isolation settings
export async function getProducts(): Promise<LatsProduct[]> {
  try {
    console.log('🔍 [latsProductApi] Starting to fetch products...');
    
    // Get current branch from localStorage
    const currentBranchId = localStorage.getItem('current_branch_id');
    console.log('🏪 [latsProductApi] Current branch:', currentBranchId);
    
    // Get products without heavy JSONB columns (tags, images, attributes, metadata) to avoid timeout
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #0066cc; font-weight: bold;');
    console.log('%c🔍 BUILDING PRODUCT QUERY', 'background: #0066cc; color: white; font-size: 14px; padding: 3px;');
    
    let query = supabase
      .from('lats_products')
      .select('id, name, description, sku, barcode, category_id, supplier_id, unit_price, cost_price, stock_quantity, min_stock_level, max_stock_level, is_active, image_url, brand, model, warranty_period, created_at, updated_at, specification, condition, selling_price, total_quantity, total_value, storage_room_id, store_shelf_id, branch_id, is_shared, sharing_mode, visible_to_branches')
      .order('created_at', { ascending: false });
    
    // 🔒 IMPROVED BRANCH FILTERING - Respects store isolation settings
    if (currentBranchId) {
      // Get store settings to determine isolation mode
      const { data: branchSettings, error: branchError } = await supabase
        .from('store_locations')
        .select('id, name, data_isolation_mode, share_products')
        .eq('id', currentBranchId)
        .single();
      
      if (branchError) {
        console.warn('⚠️ Could not load branch settings:', branchError.message);
        console.log('%c⚠️ NO BRANCH SETTINGS - SHOWING ALL PRODUCTS!', 'background: #ff9900; color: black; font-size: 14px; font-weight: bold; padding: 5px;');
      } else {
        console.log('%c🔒 STORE ISOLATION CHECK', 'background: #9C27B0; color: white; font-size: 14px; font-weight: bold; padding: 5px;');
        console.log('%c   Store Name:', 'color: #9C27B0; font-weight: bold;', branchSettings.name);
        console.log('%c   Store ID:', 'color: #9C27B0; font-weight: bold;', branchSettings.id);
        console.log('%c   Isolation Mode:', 'color: #9C27B0; font-weight: bold;', branchSettings.data_isolation_mode);
        console.log('%c   Share Products:', 'color: #9C27B0; font-weight: bold;', branchSettings.share_products);
        
        // Apply filter based on isolation mode
        if (branchSettings.data_isolation_mode === 'isolated') {
          // ISOLATED MODE: Show products from this branch + shared products + products with no branch
          console.log('%c   🔒 ISOLATED MODE ACTIVE!', 'background: #f44336; color: white; font-weight: bold; padding: 3px;');
          console.log('%c   Filter: (branch_id = ' + currentBranchId + ' OR is_shared = true) AND branch_id IS NULL allowed', 'color: #f44336;');
          console.log('%c   Result: Products from this store + shared products + unassigned products will be shown', 'color: #666;');
          // Use a different approach: fetch all and filter in code, or use two separate queries
          // For now, we'll just show branch products and shared products
          // Products with null branch_id will be handled by removing the branch filter altogether
          query = query.or(`branch_id.eq.${currentBranchId},is_shared.eq.true`);
        } else if (branchSettings.data_isolation_mode === 'shared') {
          // SHARED MODE: Show all products
          console.log('%c   🌐 SHARED MODE ACTIVE!', 'background: #4CAF50; color: white; font-weight: bold; padding: 3px;');
          console.log('%c   Filter: None', 'color: #4CAF50;');
          console.log('%c   Result: ALL products from ALL stores will be shown', 'color: #666;');
          // No filter needed
        } else if (branchSettings.data_isolation_mode === 'hybrid') {
          // HYBRID MODE: Check share_products flag
          if (branchSettings.share_products) {
            console.log('%c   ⚖️ HYBRID MODE - Products SHARED', 'background: #FF9800; color: white; font-weight: bold; padding: 3px;');
            console.log('%c   Filter: None', 'color: #FF9800;');
            console.log('%c   Result: ALL products from ALL stores will be shown', 'color: #666;');
            // No filter needed
          } else {
            console.log('%c   ⚖️ HYBRID MODE - Products ISOLATED', 'background: #FF9800; color: white; font-weight: bold; padding: 3px;');
            console.log('%c   Filter: branch_id = ' + currentBranchId + ' OR is_shared = true', 'color: #FF9800;');
            console.log('%c   Result: Products from this store + shared products + unassigned products will be shown', 'color: #666;');
            query = query.or(`branch_id.eq.${currentBranchId},is_shared.eq.true`);
          }
        }
      }
    } else {
      console.log('%c⚠️ NO BRANCH SELECTED - SHOWING ALL PRODUCTS!', 'background: #ff9900; color: black; font-size: 14px; font-weight: bold; padding: 5px;');
    }
    
    console.log('%c📡 Executing query to database...', 'color: #0066cc;');
    const startTime = Date.now();
    const { data: allProducts, error } = await query;
    const queryTime = Date.now() - startTime;

    if (error) {
      console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #ff0000; font-weight: bold;');
      console.error('%c❌ QUERY FAILED!', 'background: #ff0000; color: white; font-size: 14px; font-weight: bold; padding: 5px;');
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #ff0000; font-weight: bold;');
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
    
    // 🔧 ADDITIONAL: Fetch products with null branch_id (unassigned products)
    // These should be visible to all branches
    let unassignedProducts: any[] = [];
    if (currentBranchId) {
      console.log('%c📡 Fetching unassigned products (branch_id = null)...', 'color: #FF9800;');
      const { data: nullBranchProducts, error: nullError } = await supabase
        .from('lats_products')
        .select('id, name, description, sku, barcode, category_id, supplier_id, unit_price, cost_price, stock_quantity, min_stock_level, max_stock_level, is_active, image_url, brand, model, warranty_period, created_at, updated_at, specification, condition, selling_price, total_quantity, total_value, storage_room_id, store_shelf_id, branch_id, is_shared, sharing_mode, visible_to_branches')
        .is('branch_id', null)
        .order('created_at', { ascending: false });
      
      if (!nullError && nullBranchProducts) {
        unassignedProducts = nullBranchProducts;
        console.log('%c✅ Found ' + unassignedProducts.length + ' unassigned products', 'color: #FF9800;');
      }
    }

    // Merge unassigned products with the main products list
    const mergedProducts = [...(allProducts || []), ...unassignedProducts];
    
    // Remove duplicates (in case a product appears in both lists)
    const uniqueProducts = Array.from(
      new Map(mergedProducts.map(p => [p.id, p])).values()
    );
    
    console.log('%c✅ QUERY SUCCESS!', 'background: #00cc00; color: white; font-weight: bold; padding: 3px;');
    console.log('%c   Query time:', 'color: #0066cc;', queryTime + 'ms');
    console.log('%c   Branch/shared products:', 'color: #0066cc;', allProducts?.length || 0);
    console.log('%c   Unassigned products:', 'color: #FF9800;', unassignedProducts.length);
    console.log('%c   Total unique products:', 'color: #00cc00; font-weight: bold;', uniqueProducts.length);

    if (!uniqueProducts || uniqueProducts.length === 0) {
      console.log('%c⚠️ NO PRODUCTS FOUND!', 'background: #ff9900; color: black; font-size: 14px; font-weight: bold; padding: 5px;');
      console.log('%c   This could mean:', 'color: #666;');
      console.log('%c   1. Branch filter is working correctly and this store has no products', 'color: #666;');
      console.log('%c   2. Products belong to a different branch', 'color: #666;');
      console.log('%c   3. Store is in ISOLATED mode and has not created any products yet', 'color: #666;');
      console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #0066cc; font-weight: bold;');
      return [];
    }

    // Show first few products with their branch info
    console.log('%c📦 SAMPLE PRODUCTS (first 3):', 'color: #0066cc; font-weight: bold;');
    uniqueProducts.slice(0, 3).forEach((p, i) => {
      if (p && p.name) {
        console.log(`   ${i+1}. ${p.name}`);
        console.log(`      branch_id: ${p.branch_id || 'null'}`);
        console.log(`      is_shared: ${p.is_shared}`);
        console.log(`      sharing_mode: ${p.sharing_mode}`);
      } else {
        console.log(`   ${i+1}. ⚠️ NULL PRODUCT`);
      }
    });

    // Filter out sample products (products with 'sample', 'test', or 'dummy' in the name)
    const products = uniqueProducts.filter(product => {
      // Skip null or invalid products
      if (!product || !product.name) {
        console.warn('⚠️ Skipping null or invalid product:', product);
        return false;
      }
      const name = product.name.toLowerCase();
      return !name.includes('sample') && !name.includes('test') && !name.includes('dummy');
    });
    
    console.log('%c✅ FINAL RESULT:', 'background: #00cc00; color: white; font-weight: bold; padding: 3px;');
    console.log('%c   Products returned:', 'color: #00cc00; font-weight: bold;', products.length);
    console.log('%c   Sample products filtered out:', 'color: #666;', uniqueProducts.length - products.length);
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #0066cc; font-weight: bold;');

    // Fetch categories and suppliers separately (Neon doesn't support PostgREST joins)
    const categoryIds = [...new Set(products.map(p => p.category_id).filter(Boolean))];
    const supplierIds = [...new Set(products.map(p => p.supplier_id).filter(Boolean))];
    
    console.log(`📂 Fetching ${categoryIds.length} categories and ${supplierIds.length} suppliers...`);
    
    // Fetch categories and suppliers using supabase client
    const [categoriesResult, suppliersResult] = await Promise.all([
      categoryIds.length > 0 ? supabase.from('lats_categories').select('id, name').in('id', categoryIds) : Promise.resolve({ data: [] }),
      supplierIds.length > 0 ? supabase.from('lats_suppliers').select('id, name').in('id', supplierIds) : Promise.resolve({ data: [] })
    ]);
    
    // Extract data from supabase responses
    const categoriesData = categoriesResult.data || [];
    const suppliersData = suppliersResult.data || [];
    
    // Create lookup maps
    const categoriesMap = new Map();
    (categoriesData || []).forEach(cat => {
      categoriesMap.set(cat.id, cat);
    });
    
    const suppliersMap = new Map();
    (suppliersData || []).forEach(supp => {
      suppliersMap.set(supp.id, supp);
    });
    
    console.log(`✅ Fetched ${categoriesMap.size} categories and ${suppliersMap.size} suppliers`);

    // Get product IDs for variant fetching
    const productIds = products.map(product => product.id);
    
    // 🚀 OPTIMIZED: Fetch ALL variants in a single query instead of batching
    console.log(`📦 Fetching all variants for ${productIds.length} products in one query...`);
    const variantsStartTime = Date.now();
    
    let allVariants: any[] = [];
    
    try {
      // Fetch variants using supabase client
      let variantQuery = supabase
        .from('lats_product_variants')
        .select('id, product_id, variant_name, sku, variant_attributes, cost_price, unit_price, quantity, reserved_quantity, min_quantity, created_at, updated_at, branch_id, is_shared')
        .in('product_id', productIds)
        .order('variant_name');
      
      // 🔒 BRANCH FILTER: Filter by branch OR shared variants
      const currentBranchIdForVariants = localStorage.getItem('current_branch_id');
      if (currentBranchIdForVariants) {
        console.log('📦 [latsProductApi] Filtering variants by branch or shared:', currentBranchIdForVariants);
        // First query: variants from current branch or shared
        variantQuery = variantQuery.or(`is_shared.eq.true,branch_id.eq.${currentBranchIdForVariants}`);
      } else {
        console.log('📦 [latsProductApi] Loading all variants (no branch selected)');
      }
      
      const variantsResult = await variantQuery;
      
      // Extract data from supabase response
      allVariants = variantsResult.data || [];
      
      // 🔧 ADDITIONAL: Fetch variants with null branch_id (unassigned variants)
      if (currentBranchIdForVariants && productIds.length > 0) {
        console.log('📦 [latsProductApi] Fetching unassigned variants (branch_id = null)...');
        const { data: nullBranchVariants } = await supabase
          .from('lats_product_variants')
          .select('id, product_id, variant_name, sku, variant_attributes, cost_price, unit_price, quantity, reserved_quantity, min_quantity, created_at, updated_at, branch_id, is_shared')
          .in('product_id', productIds)
          .is('branch_id', null)
          .order('variant_name');
        
        if (nullBranchVariants && nullBranchVariants.length > 0) {
          console.log(`✅ Found ${nullBranchVariants.length} unassigned variants`);
          // Merge and deduplicate
          const mergedVariants = [...allVariants, ...nullBranchVariants];
          allVariants = Array.from(
            new Map(mergedVariants.map(v => [v.id, v])).values()
          );
        }
      }
      
      const duration = Date.now() - variantsStartTime;
      console.log(`✅ Fetched total ${allVariants.length} variants in ${duration}ms`);
    } catch (exception) {
      console.error('❌ Exception fetching variants:', exception);
      
      // Fallback to batched approach if single query fails
      console.log('🔄 Falling back to batched variant fetching...');
      const BATCH_SIZE = 50;
      
      try {
        for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
          const batch = productIds.slice(i, i + BATCH_SIZE);
          const { data: batchVariants, error: batchError } = await supabase
            .from('lats_product_variants')
            .select('id, product_id, variant_name, sku, variant_attributes, cost_price, unit_price, quantity, min_quantity, created_at, updated_at')
            .in('product_id', batch)
            .order('variant_name');
            
          if (!batchError && batchVariants) {
            allVariants.push(...batchVariants);
          }
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        allVariants = [];
      }
    }

    // Group variants by product ID
    const variantsByProductId = new Map<string, any[]>();
    allVariants.forEach(variant => {
      if (!variantsByProductId.has(variant.product_id)) {
        variantsByProductId.set(variant.product_id, []);
      }
      variantsByProductId.get(variant.product_id)!.push(variant);
    });

    // Fetch product images from product_images table using supabase client
    console.log(`📸 Fetching images for ${productIds.length} products...`);
    
    let productImages: any[] = [];
    try {
      const imagesResult = await supabase
        .from('product_images')
        .select('id, product_id, image_url, is_primary')
        .in('product_id', productIds)
        .order('is_primary', { ascending: false });
      
      // Extract data from supabase response and add thumbnail_url as fallback to image_url
      productImages = (imagesResult.data || []).map(img => ({
        ...img,
        thumbnail_url: img.thumbnail_url || img.image_url
      }));
    } catch (imagesError) {
      console.error('⚠️  Error fetching product images:', imagesError);
      productImages = [];
    }

    // Group images by product ID
    const imagesByProductId = new Map<string, any[]>();
    if (productImages && productImages.length > 0) {
      productImages.forEach(img => {
        if (!imagesByProductId.has(img.product_id)) {
          imagesByProductId.set(img.product_id, []);
        }
        imagesByProductId.get(img.product_id)!.push(img);
      });
      console.log(`✅ Fetched ${productImages.length} images for ${imagesByProductId.size} products`);
    }

    // Map products with their variants and images
    // Fetch shelf data for all products in one query
    const shelfData: Map<string, any> = new Map();
    try {
      const productIdsWithShelves = products
        .filter(p => p.store_shelf_id)
        .map(p => p.store_shelf_id);
      
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

    return (products || []).map(product => {
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
        categoryId: product.category_id,
        supplierId: product.supplier_id,
        isActive: product.is_active,
        price: product.unit_price || firstVariant?.unit_price || 0, // Add price from product or first variant
        costPrice: product.cost_price || firstVariant?.cost_price || 0,
        stockQuantity: product.stock_quantity || 0,
        minStockLevel: product.min_stock_level || 0,
        totalQuantity: product.total_quantity || 0,
        totalValue: product.total_value || 0,
        // Include joined data from lookup maps
        supplier: product.supplier_id ? suppliersMap.get(product.supplier_id) : undefined,
        category: product.category_id ? categoriesMap.get(product.category_id) : undefined,
        // Shelf data (fetched separately)
        shelfName: product.store_shelf_id ? shelfData.get(product.store_shelf_id)?.name : undefined,
        shelfCode: product.store_shelf_id ? shelfData.get(product.store_shelf_id)?.code : undefined,
        storageRoomName: undefined, // Can be added later if needed
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        variants: productVariants.map((variant: any) => ({
          id: variant.id,
          productId: variant.product_id,
          sku: variant.sku,
          name: variant.variant_name || variant.name,
          attributes: variant.variant_attributes || variant.attributes || {},
          costPrice: variant.cost_price || 0,
          sellingPrice: variant.unit_price || 0,
          price: variant.unit_price || 0, // Add price field
          stockQuantity: variant.quantity || 0,
          minStockLevel: variant.min_quantity || 0,
          quantity: variant.quantity || 0,
          minQuantity: variant.min_quantity || 0,
    
          weight: null, // Column was removed in migration
          dimensions: null, // Column was removed in migration
          createdAt: variant.created_at,
          updatedAt: variant.updated_at
        }))
      };
    });
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

// Update a product
export async function updateProduct(
  productId: string,
  productData: Partial<CreateProductData>,
  userId: string
): Promise<LatsProduct> {
  try {
    console.log('🔧 [API] Starting updateProduct...');
    console.log('🔧 [API] Product ID:', productId);
    console.log('🔧 [API] Product data keys:', Object.keys(productData));
    
    // First, verify the product exists
    const { data: existingProduct, error: existError } = await supabase
      .from('lats_products')
      .select('id, name')
      .eq('id', productId)
      .single();
    
    if (existError) {
      console.error('❌ [API] Product does not exist:', existError);
      throw new Error(`Product with ID ${productId} not found`);
    }
    
    if (!existingProduct) {
      throw new Error(`Product with ID ${productId} does not exist in database`);
    }
    
    console.log('✅ [API] Product exists:', existingProduct.name);
    
    const { images, variants, ...productWithoutImages } = productData;
    
    // Prepare update data - only include fields that are defined
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (productWithoutImages.name !== undefined) updateData.name = productWithoutImages.name;
    if (productWithoutImages.description !== undefined) updateData.description = productWithoutImages.description;
    if (productWithoutImages.categoryId !== undefined) updateData.category_id = productWithoutImages.categoryId;
    if (productWithoutImages.supplierId !== undefined) updateData.supplier_id = productWithoutImages.supplierId;
    if (productWithoutImages.tags !== undefined) updateData.tags = productWithoutImages.tags;
    if (productWithoutImages.isActive !== undefined) updateData.is_active = productWithoutImages.isActive;
    
    console.log('📝 [API] Updating product with:', updateData);
    
    // Update the product (without .select() to avoid RLS issues)
    const { error: productError } = await supabase
      .from('lats_products')
      .update(updateData)
      .eq('id', productId);

    console.log('📊 [API] Update completed, error:', productError);

    if (productError) {
      console.error('❌ [API] Product update error:', productError);
      throw productError;
    }
    
    // Fetch the updated product separately (avoids RLS SELECT issues with UPDATE)
    console.log('📥 [API] Fetching updated product...');
    const { data: product, error: fetchError } = await supabase
      .from('lats_products')
      .select('*')
      .eq('id', productId)
      .single();
    
    console.log('📊 [API] Fetched product:', product);
    
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
        tags: updateData.tags || [],
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
    
    console.log('✅ [API] Product fetched successfully');

    // Handle variants if provided
    if (variants && Array.isArray(variants)) {
      console.log(`📦 [API] Processing ${variants.length} variants for product ${productId}`);
      
      // Get existing variants with full details
      const { data: existingVariants, error: fetchError } = await supabase
        .from('lats_product_variants')
        .select('id, sku, variant_name')
        .eq('product_id', productId);

      if (fetchError) {
        console.error('❌ [API] Failed to fetch existing variants:', fetchError);
        throw fetchError;
      }

      console.log('📋 [API] Existing variants:', existingVariants);
      
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
          unit_price: variant.sellingPrice || variant.price || 0,
          quantity: variant.quantity ?? variant.stockQuantity ?? 0,
          min_quantity: variant.minQuantity ?? variant.minStockLevel ?? 0
        };
        
        // Only include SKU if it's changed or this is a new variant
        const existingVariant = variant.id ? existingVariantsMap.get(variant.id) : null;
        if (!existingVariant || existingVariant.sku !== variant.sku) {
          variantData.sku = variant.sku;
          console.log(`🔄 SKU ${existingVariant ? 'changed' : 'new'}: ${existingVariant?.sku || 'N/A'} → ${variant.sku}`);
        } else {
          console.log(`✓ SKU unchanged: ${variant.sku}`);
        }

        console.log(`🔄 Processing variant ${i + 1}/${variants.length}:`, { sku: variant.sku, hasId: !!variant.id });
        console.log(`📋 Variant data:`, JSON.stringify(variantData, null, 2));

        // Check if variant has an ID (existing variant) or if we need to find it by SKU
        if (variant.id) {
          // Update by ID (most reliable)
          console.log(`📝 Updating variant by ID: ${variant.id}`);
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
          console.log(`✅ Updated variant ${variant.id}`);
        } else {
          // Check if variant exists by SKU
          const existingVariantBySku = safeExistingVariants.find(v => v && v.sku === variant.sku);

          if (existingVariantBySku && existingVariantBySku.id) {
            // Update existing variant by SKU
            console.log(`📝 Updating variant by SKU: ${variant.sku}`);
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
            console.log(`✅ Updated variant ${existingVariantBySku.id}`);
          } else {
            // Create new variant - always include SKU for new variants
            if (!variantData.sku) {
              variantData.sku = variant.sku;
            }
            
            console.log(`➕ Creating new variant: ${variant.sku}`);
            const { error: insertError } = await supabase
              .from('lats_product_variants')
              .insert(variantData);

            if (insertError) {
              console.error('❌ Insert failed:', insertError);
              console.error('❌ Insert error details:', JSON.stringify(insertError, null, 2));
              console.error('❌ Variant data that failed:', JSON.stringify(variantData, null, 2));
              throw insertError;
            }
            console.log(`✅ Created new variant`);
          }
        }
      }

      // Delete variants that are no longer needed (but keep at least one)
      if (safeExistingVariants.length > variants.length && safeExistingVariants.length > 1) {
        console.log('🗑️ [API] Checking for variants to delete...');
        const variantsToKeep = variants.map(v => v?.sku).filter(Boolean);
        const variantsToDelete = safeExistingVariants
          .filter(v => v && v.sku && !variantsToKeep.includes(v.sku))
          .slice(0, Math.max(0, safeExistingVariants.length - 1)); // Keep at least one variant

        console.log(`🗑️ [API] Deleting ${variantsToDelete.length} unused variants`);
        for (const variantToDelete of variantsToDelete) {
          if (variantToDelete && variantToDelete.id) {
            const { error: deleteError } = await supabase
              .from('lats_product_variants')
              .delete()
              .eq('id', variantToDelete.id);

            if (deleteError) {
              console.error('❌ Delete failed:', deleteError);
              throw deleteError;
            }
            console.log(`✅ Deleted variant ${variantToDelete.id}`);
          }
        }
      }
      
      console.log('✅ [API] All variants processed successfully');
    }

    if (!product || !product.id) {
      throw new Error('Product update returned null or invalid product');
    }

    console.log('✅ [API] Product update completed successfully');
    
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
  const { error } = await supabase
    .from('lats_products')
    .delete()
    .eq('id', productId);

  if (error) throw error;
}
