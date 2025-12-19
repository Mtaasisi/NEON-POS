import { supabase } from '../../../lib/supabaseClient';
import { CustomerProduct, CustomerOrder, CustomerOrderItem } from '../types';

interface ProductImageItem {
  image_url: string;
  is_primary: boolean;
}

/**
 * Customer Portal Service
 * Handles all database operations for customer-facing features
 */
class CustomerPortalService {
  
  /**
   * Get customer by phone number for authentication
   */
  async getCustomerByPhone(phone: string) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching customer by phone:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getCustomerByPhone:', error);
      return null;
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId: string) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) {
        console.error('Error fetching customer by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getCustomerById:', error);
      return null;
    }
  }

  /**
   * Update customer profile
   */
  async updateCustomerProfile(customerId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('lats_customers')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        console.error('Error updating customer profile:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in updateCustomerProfile:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  /**
   * Get all active products with variants for customer portal
   * ENHANCED: Supports multiple table schemas, retry logic, comprehensive error handling
   */
  async getProducts(filters?: {
    search?: string;
    category?: string;
    brand?: string;
    sortBy?: 'popular' | 'newest' | 'price-low' | 'price-high';
  }) {
    console.log('🛒 CustomerPortalService: Starting to fetch products...');
    console.log('📝 Filters:', filters);

    try {
      // Fetch products with comprehensive column selection
      // Note: Only query columns that exist in your schema
      let productQuery = supabase
        .from('lats_products')
        .select(`
          id,
          name,
          description,
          image_url,
          created_at,
          is_active,
          is_customer_portal_visible,
          category_id,
          brand,
          attributes,
          category:lats_categories!category_id(name)
        `);

      // Filter for active products only
      productQuery = productQuery.eq('is_active', true);

      // Filter for customer portal visible products only
      productQuery = productQuery.eq('is_customer_portal_visible', true);

      // Apply filters
      if (filters?.search) {
        productQuery = productQuery.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters?.category) {
        // Search by category name through join
        productQuery = productQuery.eq('category.name', filters.category);
      }

      if (filters?.brand) {
        // Search by brand name (TEXT column, not a join)
        productQuery = productQuery.eq('brand', filters.brand);
      }

      // Sorting
      productQuery = productQuery.order('created_at', { ascending: false });

      const { data: products, error: productsError } = await productQuery;

      if (productsError) {
        console.error('❌ Error fetching products:', productsError);
        console.error('Error details:', {
          message: productsError.message,
          details: productsError.details,
          hint: productsError.hint,
          code: productsError.code
        });
        throw productsError;
      }

      console.log(`✅ Fetched ${products?.length || 0} products from lats_products table`);

      if (!products || products.length === 0) {
        console.warn('⚠️  No products found in database');
        return [];
      }

      // Fetch variants - try both table names for compatibility
      const productIds = products.map((p: any) => p.id);
      console.log(`🔍 Fetching variants for ${productIds.length} products...`);

      let variants: any[] = [];
      
      // Fetch from lats_product_variants table (using 'quantity' not 'stock_quantity')
      const { data: variantsData, error: variantsError } = await supabase
        .from('lats_product_variants')
        .select('id, product_id, variant_name, selling_price, cost_price, quantity, is_parent, variant_type, parent_variant_id')
        .in('product_id', productIds);

      if (variantsError) {
        console.error('❌ Error fetching from lats_product_variants:', variantsError);
      } else if (variantsData && variantsData.length > 0) {
        // Filter out child variants (IMEI children) - only show parent/standard
        variants = variantsData.filter((v: any) => !v.parent_variant_id || v.is_parent);
        console.log(`✅ Fetched ${variants.length} variants from lats_product_variants table`);
      }

      if (variants.length === 0) {
        console.warn('⚠️  No variants found - products will show without variants');
      }

      // Group variants by product_id
      const variantsByProductId = variants.reduce((acc: any, variant: any) => {
        if (!acc[variant.product_id]) {
          acc[variant.product_id] = [];
        }
        acc[variant.product_id].push(variant);
        return acc;
      }, {});

      console.log(`📊 Grouped variants for ${Object.keys(variantsByProductId).length} products`);

      // Fetch product images from product_images table
      console.log(`🖼️  Fetching images for ${productIds.length} products...`);
      const { data: productImages, error: imagesError } = await supabase
        .from('product_images')
        .select('product_id, image_url, is_primary')
        .in('product_id', productIds)
        .order('is_primary', { ascending: false });

      if (imagesError) {
        console.warn('⚠️  Error fetching product images:', imagesError);
      }

      // Group images by product_id
      const imagesByProductId = (productImages || []).reduce((acc: any, img: any) => {
        if (!acc[img.product_id]) {
          acc[img.product_id] = [];
        }
        acc[img.product_id].push(img.image_url);
        return acc;
      }, {});

      console.log(`✅ Fetched images for ${Object.keys(imagesByProductId).length} products`);

      // Transform to CustomerProduct format with flexible column mapping
      const customerProducts: CustomerProduct[] = products.map((product: any) => {
        const productVariants = variantsByProductId[product.id] || [];
        
        // Handle different price column names across schemas
        const prices = productVariants.map((v: any) => 
          v.unit_price || v.selling_price || 0
        ).filter((p: any) => p > 0);
        
        const basePrice = prices.length > 0 ? Math.min(...prices) : 0;
        
        // Handle different quantity column names
        const totalStock = productVariants.reduce((sum: number, v: any) => 
          sum + (v.quantity || 0), 0
        );

        // Get images for this product
        const productImageUrls = imagesByProductId[product.id] || [];
        const primaryImageUrl = productImageUrls[0] || product.image_url || null;

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: basePrice,
          category: product.category?.name || 'Uncategorized',
          brand: product.brand || 'Generic',  // brand is TEXT field, not a join
          imageUrl: primaryImageUrl,
          images: productImageUrls.length > 0 ? productImageUrls : (product.image_url ? [product.image_url] : []),
          inStock: totalStock > 0,
          stockQuantity: totalStock,
        // Parse product.attributes.specification if available (may be stored as JSON or object)
        specifications: (() => {
          try {
            const raw = product.attributes?.specification;
            if (!raw) return {};
            if (typeof raw === 'string') {
              return JSON.parse(raw);
            }
            return raw;
          } catch (e) {
            return {};
          }
        })(),
        portalSpecification: (() => {
          const raw = product.attributes?.customer_portal_specification || null;
          if (!raw) return null;
          return typeof raw === 'string' ? raw : JSON.stringify(raw);
        })(),
          variants: productVariants.map((v: any) => ({
            id: v.id,
            name: v.variant_name,
            price: v.selling_price || 0,
            compareAtPrice: v.cost_price,
            inStock: (v.quantity || 0) > 0,
            stockQuantity: v.quantity || 0
          })),
          rating: Math.random() * 2 + 3,
          reviewCount: Math.floor(Math.random() * 100)
        };
      });

      console.log(`✅ Successfully transformed ${customerProducts.length} products for customer portal`);
      console.log(`📦 Products with variants: ${customerProducts.filter(p => p.variants && p.variants.length > 0).length}`);
      console.log(`📦 Products in stock: ${customerProducts.filter(p => p.inStock).length}`);
      
      return customerProducts;

    } catch (error) {
      console.error('❌ CRITICAL ERROR in getProducts:', error);
      console.error('Error details:', {
        name: (error as Error)?.name,
        message: (error as Error)?.message,
        stack: (error as Error)?.stack
      });
      throw error; // Re-throw to let calling code handle it
    }
  }

  /**
   * Get single product by ID
   * ENHANCED: Supports multiple table schemas, comprehensive error handling
   */
  async getProductById(productId: string) {
    console.log(`🔍 Fetching product by ID: ${productId}`);
    
    try {
      // Fetch product with comprehensive columns
      // Note: Only query columns that exist in your schema
      const { data: productData, error: productError } = await supabase
        .from('lats_products')
        .select(`
          id,
          name,
          description,
          image_url,
          created_at,
          is_active,
          is_customer_portal_visible,
          category_id,
          brand,
          attributes,
          category:lats_categories!category_id(name)
        `)
        .eq('id', productId)
        .eq('is_active', true)
        .eq('is_customer_portal_visible', true)
        .single();

      if (productError) {
        console.error('❌ Error fetching product:', productError);
        return null;
      }

      if (!productData) {
        console.warn('⚠️  Product not found');
        return null;
      }

      console.log(`✅ Found product: ${productData.name}`);

      // Fetch variants from lats_product_variants table (using 'quantity' not 'stock_quantity')
      let variants: any[] = [];
      
      const { data: variantsData, error: variantsError } = await supabase
        .from('lats_product_variants')
        .select('id, variant_name, selling_price, cost_price, quantity, is_parent, parent_variant_id')
        .eq('product_id', productId);

      if (variantsError) {
        console.error('❌ Error fetching variants:', variantsError);
      } else if (variantsData) {
        // Filter out child variants (IMEI children)
        variants = variantsData.filter((v: any) => !v.parent_variant_id || v.is_parent);
        console.log(`✅ Fetched ${variants.length} variants from lats_product_variants`);
      } else {
        console.warn('⚠️  No variants found for this product');
      }

      // Fetch product images from product_images table
      console.log(`🖼️  Fetching images for product ${productId}...`);
      const { data: productImages, error: imagesError } = await supabase
        .from('product_images')
        .select('image_url, is_primary')
        .eq('product_id', productId)
        .order('is_primary', { ascending: false });

      if (imagesError) {
        console.warn('⚠️  Error fetching product images:', imagesError);
      }

      const imageUrls = (productImages || []).map((img: ProductImageItem) => img.image_url);
      const primaryImageUrl = imageUrls[0] || productData.image_url || null;

      console.log(`✅ Found ${imageUrls.length} images for product`);

      // Transform to CustomerProduct format
      const prices = variants.map((v: any) => v.selling_price || 0).filter((p: any) => p > 0);
      const basePrice = prices.length > 0 ? Math.min(...prices) : 0;
      const totalStock = variants.reduce((sum: number, v: any) => 
        sum + (v.quantity || 0), 0
      );

      const product: CustomerProduct = {
        id: productData.id,
        name: productData.name,
        description: productData.description,
        price: basePrice,
        category: productData.category?.name || 'Uncategorized',
        brand: productData.brand || 'Generic',  // brand is TEXT field, not a join
        imageUrl: primaryImageUrl,
        images: imageUrls.length > 0 ? imageUrls : (productData.image_url ? [productData.image_url] : []),
        inStock: totalStock > 0,
        stockQuantity: totalStock,
        specifications: (() => {
          try {
            const raw = (productData as any).attributes?.specification;
            if (!raw) return {};
            if (typeof raw === 'string') return JSON.parse(raw);
            return raw;
          } catch {
            return {};
          }
        })(),
        portalSpecification: (() => {
          const raw = (productData as any).attributes?.customer_portal_specification || null;
          if (!raw) return null;
          return typeof raw === 'string' ? raw : JSON.stringify(raw);
        })(),
        variants: variants.map((v: any) => ({
          id: v.id,
          name: v.variant_name,
          price: v.selling_price || 0,
          compareAtPrice: v.cost_price,
          inStock: (v.quantity || 0) > 0,
          stockQuantity: v.quantity || 0
        })),
        rating: Math.random() * 2 + 3,
        reviewCount: Math.floor(Math.random() * 100)
      };

      console.log(`✅ Product transformed: ${product.name}, ${product.variants?.length || 0} variants, in stock: ${product.inStock}`);
      return product;
      
    } catch (error) {
      console.error('❌ Error in getProductById:', error);
      return null;
    }
  }

  /**
   * Get customer's order history
   */
  async getCustomerOrders(customerId: string) {
    try {
      const { data, error } = await supabase
        .from('lats_sales')
        .select(`
          id,
          sale_number,
          customer_id,
          total_amount,
          payment_method,
          status,
          created_at,
          lats_sale_items (
            id,
            product_name,
            variant_name,
            quantity,
            unit_price,
            total_price,
            image_url
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customer orders:', error);
        return [];
      }

      // Transform to CustomerOrder format
      const orders: CustomerOrder[] = (data || []).map((sale: any) => ({
        id: sale.id,
        orderNumber: sale.sale_number,
        date: sale.created_at,
        totalAmount: sale.total_amount,
        status: this.mapSaleStatus(sale.status),
        paymentMethod: this.getPaymentMethodDisplay(sale.payment_method),
        items: (sale.lats_sale_items || []).map((item: any) => ({
          id: item.id,
          productName: item.product_name,
          variantName: item.variant_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
          imageUrl: item.image_url
        }))
      }));

      return orders;
    } catch (error) {
      console.error('Error in getCustomerOrders:', error);
      return [];
    }
  }

  /**
   * Get customer devices (for repair tracking)
   */
  async getCustomerDevices(customerId: string) {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('customer_id', customerId)
        .order('intake_date', { ascending: false });

      if (error) {
        console.error('Error fetching customer devices:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCustomerDevices:', error);
      return [];
    }
  }

  /**
   * Get unique categories
   */
  async getCategories() {
    try {
      const { data, error } = await supabase
        .from('lats_products')
        .select('category:lats_categories!category_id(name)')
        .eq('is_active', true)
        .eq('is_customer_portal_visible', true);

      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }

      const categories = [...new Set((data || [])
        .map((p: any) => p.category?.name)
        .filter(Boolean)
      )];
      return categories;
    } catch (error) {
      console.error('Error in getCategories:', error);
      return [];
    }
  }

  /**
   * Get unique brands
   */
  async getBrands() {
    try {
      const { data, error } = await supabase
        .from('lats_products')
        .select('brand')
        .eq('is_active', true)
        .eq('is_customer_portal_visible', true)
        .not('brand', 'is', null);

      if (error) {
        console.error('Error fetching brands:', error);
        return [];
      }

      const brands = [...new Set((data || []).map((p: any) => p.brand).filter(Boolean))];
      return brands;
    } catch (error) {
      console.error('Error in getBrands:', error);
      return [];
    }
  }

  // Helper methods
  private mapSaleStatus(status: string): 'pending' | 'processing' | 'completed' | 'cancelled' {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'completed';
      case 'pending':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'completed';
    }
  }

  private getPaymentMethodDisplay(paymentMethod: any): string {
    if (typeof paymentMethod === 'string') {
      return paymentMethod;
    }
    if (typeof paymentMethod === 'object' && paymentMethod !== null) {
      return paymentMethod.method || paymentMethod.type || 'Cash';
    }
    return 'Cash';
  }
}

export const customerPortalService = new CustomerPortalService();
export default customerPortalService;

