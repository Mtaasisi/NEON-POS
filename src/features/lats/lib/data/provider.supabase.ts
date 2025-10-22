// Supabase/Neon provider implementation
import supabase from '@/lib/supabaseClient';
import { getProducts as getProductsApi, getProduct as getProductApi } from '@/lib/latsProductApi';
import { getCategories as getCategoriesApi } from '@/lib/categoryApi';
import { getActiveSuppliers, getAllSuppliers } from '@/lib/supplierApi';
import { PurchaseOrderService } from '@/features/lats/services/purchaseOrderService';
import { latsEventBus } from './eventBus';

// 🔒 BRANCH ISOLATION SETTINGS
// Toggle these to enable/disable branch isolation for different modules
const ISOLATION_CONFIG = {
  ENABLE_PURCHASE_ORDER_ISOLATION: true,  // Purchase orders isolation
  ENABLE_PRODUCT_ISOLATION: true,         // Products & inventory isolation
  ENABLE_SALES_ISOLATION: true,           // Sales & transactions isolation
  ENABLE_DEVICE_ISOLATION: true,          // Devices & repairs isolation
  ENABLE_PAYMENT_ISOLATION: true,         // Payment records isolation
  ENABLE_TECHNICIAN_ISOLATION: true       // Technicians/Users isolation (NEW)
};

// Helper to get current branch ID
const getCurrentBranchId = () => localStorage.getItem('current_branch_id');

const supabaseProvider = {
  // Query data from a table
  getList: async (resource: string, params?: any) => {
    try {
      let query = supabase.from(resource).select('*');
      
      if (params?.filter) {
        Object.entries(params.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      if (params?.sort) {
        const { field, order } = params.sort;
        query = query.order(field, { ascending: order === 'ASC' });
      }
      
      if (params?.pagination) {
        const { page = 1, perPage = 10 } = params.pagination;
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;
        query = query.range(from, to);
      }
      
      const result = await query;
      return result;
    } catch (error) {
      console.error('Provider error:', error);
      return { data: null, error };
    }
  },

  // Get a single record
  getOne: async (resource: string, id: string | number) => {
    try {
      const result = await supabase
        .from(resource)
        .select('*')
        .eq('id', id)
        .single();
      return result;
    } catch (error) {
      console.error('Provider error:', error);
      return { data: null, error };
    }
  },

  // Create a new record
  create: async (resource: string, data: any) => {
    try {
      const result = await supabase
        .from(resource)
        .insert(data);
      return result;
    } catch (error) {
      console.error('Provider error:', error);
      return { data: null, error };
    }
  },

  // Update a record
  update: async (resource: string, id: string | number, data: any) => {
    try {
      const result = await supabase
        .from(resource)
        .update(data)
        .eq('id', id);
      return result;
    } catch (error) {
      console.error('Provider error:', error);
      return { data: null, error };
    }
  },

  // Delete a record
  delete: async (resource: string, id: string | number) => {
    try {
      const result = await supabase
        .from(resource)
        .delete()
        .eq('id', id);
      return result;
    } catch (error) {
      console.error('Provider error:', error);
      return { data: null, error };
    }
  },

  // Call an RPC function
  rpc: async (functionName: string, params?: any) => {
    try {
      const result = await supabase.rpc(functionName, params);
      return result;
    } catch (error) {
      console.error('RPC error:', error);
      return { data: null, error };
    }
  },

  // Categories
  getCategories: async () => {
    try {
      const categories = await getCategoriesApi();
      return {
        ok: true,
        data: categories || []
      };
    } catch (error) {
      console.error('❌ [Provider] Error fetching categories:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to fetch categories',
        data: []
      };
    }
  },

  createCategory: async (data: any) => {
    try {
      const { data: category, error } = await supabase
        .from('lats_categories')
        .insert({
          name: data.name,
          description: data.description,
          color: data.color,
          icon: data.icon,
          parent_id: data.parentId,
          is_active: data.isActive ?? true
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ok: true,
        data: {
          id: category.id,
          name: category.name,
          description: category.description,
          color: category.color,
          icon: category.icon,
          parentId: category.parent_id,
          isActive: category.is_active,
          createdAt: category.created_at,
          updatedAt: category.updated_at
        }
      };
    } catch (error) {
      console.error('Error creating category:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to create category'
      };
    }
  },

  updateCategory: async (id: string, data: any) => {
    try {
      const { data: category, error } = await supabase
        .from('lats_categories')
        .update({
          name: data.name,
          description: data.description,
          color: data.color,
          icon: data.icon,
          parent_id: data.parentId,
          is_active: data.isActive
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        ok: true,
        data: {
          id: category.id,
          name: category.name,
          description: category.description,
          color: category.color,
          icon: category.icon,
          parentId: category.parent_id,
          isActive: category.is_active,
          createdAt: category.created_at,
          updatedAt: category.updated_at
        }
      };
    } catch (error) {
      console.error('Error updating category:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to update category'
      };
    }
  },

  deleteCategory: async (id: string) => {
    try {
      const { error } = await supabase
        .from('lats_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        ok: true,
        data: null
      };
    } catch (error) {
      console.error('Error deleting category:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to delete category'
      };
    }
  },

  // Suppliers
  getSuppliers: async () => {
    try {
      const suppliers = await getAllSuppliers();
      return {
        ok: true,
        data: suppliers || []
      };
    } catch (error) {
      console.error('❌ [Provider] Error fetching suppliers:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to fetch suppliers',
        data: []
      };
    }
  },

  createSupplier: async (data: any) => {
    try {
      const { data: supplier, error } = await supabase
        .from('lats_suppliers')
        .insert({
          name: data.name,
          contact_person: data.contactPerson,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          country: data.country,
          payment_terms: data.paymentTerms,
          is_active: data.isActive ?? true,
          notes: data.notes
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ok: true,
        data: {
          id: supplier.id,
          name: supplier.name,
          contactPerson: supplier.contact_person,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          city: supplier.city,
          country: supplier.country,
          paymentTerms: supplier.payment_terms,
          isActive: supplier.is_active,
          notes: supplier.notes,
          createdAt: supplier.created_at,
          updatedAt: supplier.updated_at
        }
      };
    } catch (error) {
      console.error('Error creating supplier:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to create supplier'
      };
    }
  },

  updateSupplier: async (id: string, data: any) => {
    try {
      const { data: supplier, error } = await supabase
        .from('lats_suppliers')
        .update({
          name: data.name,
          contact_person: data.contactPerson,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          country: data.country,
          payment_terms: data.paymentTerms,
          is_active: data.isActive,
          notes: data.notes
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        ok: true,
        data: {
          id: supplier.id,
          name: supplier.name,
          contactPerson: supplier.contact_person,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          city: supplier.city,
          country: supplier.country,
          paymentTerms: supplier.payment_terms,
          isActive: supplier.is_active,
          notes: supplier.notes,
          createdAt: supplier.created_at,
          updatedAt: supplier.updated_at
        }
      };
    } catch (error) {
      console.error('Error updating supplier:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to update supplier'
      };
    }
  },

  deleteSupplier: async (id: string) => {
    try {
      const { error } = await supabase
        .from('lats_suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        ok: true,
        data: null
      };
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to delete supplier'
      };
    }
  },

  // Products
  getProducts: async (filters?: any) => {
    try {
      const products = await getProductsApi();
      
      // 🐛 DEBUG: Detailed logging);
      
      // Return in paginated format
      return {
        ok: true,
        data: {
          data: products || [],
          page: filters?.page || 1,
          limit: filters?.limit || 100,
          total: products?.length || 0,
          totalPages: 1
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch products';
      console.error('❌ [Provider] Error fetching products:', error);
      console.error('❌ [Provider] Error message:', errorMessage);
      console.error('❌ [Provider] Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      return {
        ok: false,
        message: errorMessage,
        data: {
          data: [],
          page: 1,
          limit: 100,
          total: 0,
          totalPages: 0
        }
      };
    }
  },

  getProduct: async (id: string) => {
    try {
      const product = await getProductApi(id);
      return {
        ok: true,
        data: product
      };
    } catch (error) {
      console.error('❌ [Provider] Error fetching product:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to fetch product'
      };
    }
  },

  getProductVariants: async (productId: string) => {
    try {
      const { data: variants, error } = await supabase
        .from('lats_product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('name');

      if (error) throw error;

      return {
        ok: true,
        data: (variants || []).map((v: any) => ({
          id: v.id,
          productId: v.product_id,
          name: v.name,
          sku: v.sku,
          attributes: v.attributes || {},
          price: v.selling_price || 0,
          costPrice: v.cost_price || 0,
          sellingPrice: v.selling_price || 0,
          stockQuantity: v.quantity || 0,
          minStockLevel: v.min_quantity || 0,
          quantity: v.quantity || 0,
          minQuantity: v.min_quantity || 0,
          createdAt: v.created_at,
          updatedAt: v.updated_at
        }))
      };
    } catch (error) {
      console.error('Error fetching product variants:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to fetch product variants',
        data: []
      };
    }
  },

  createProduct: async (data: any) => {
    try {
      
      // Get current user for userId
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ [Provider] No authenticated user');
        return {
          ok: false,
          message: 'User not authenticated'
        };
      }
      
      // Map the product data to the format expected by latsProductApi
      const productData = {
        name: data.name,
        description: data.description,
        shortDescription: data.shortDescription,
        sku: data.sku,
        categoryId: data.categoryId || null,
        supplierId: data.supplierId || null,
        // Price and stock fields (will be used if no variants provided)
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice ?? data.price,
        price: data.price ?? data.sellingPrice,
        quantity: data.quantity ?? data.stockQuantity,
        stockQuantity: data.stockQuantity ?? data.quantity,
        minQuantity: data.minQuantity ?? data.minStockLevel,
        minStockLevel: data.minStockLevel ?? data.minQuantity,
        // Optional fields
        barcode: data.barcode,
        storageRoomId: data.storageRoomId,
        shelfId: data.shelfId,
        attributes: data.attributes,
        isActive: data.isActive !== undefined ? data.isActive : true,
        metadata: data.metadata,
        // Handle variants if provided
        variants: data.variants && data.variants.length > 0 ? data.variants.map((v: any) => ({
          sku: v.sku,
          name: v.name || 'Default',
          sellingPrice: v.sellingPrice ?? v.price ?? 0,
          costPrice: v.costPrice ?? 0,
          quantity: v.quantity ?? v.stockQuantity ?? 0,
          minQuantity: v.minQuantity ?? v.minStockLevel ?? 0,
          attributes: v.attributes || {}
        })) : undefined,
        // Handle images if provided
        images: data.images || []
      };

      // Call the latsProductApi createProduct function
      const { createProduct: apiCreateProduct } = await import('../../../../lib/latsProductApi');
      const createdProduct = await apiCreateProduct(productData, user.id);
      
      // Check if product was created successfully
      if (!createdProduct || !createdProduct.id) {
        console.error('❌ [Provider] Product creation returned null or no ID - likely RLS policy issue');
        return {
          ok: false,
          message: 'Product creation failed - database returned no data. This may be an RLS policy issue.'
        };
      }
      
      // Load variants for the created product
      const variantsResponse = await supabaseProvider.getProductVariants(createdProduct.id);
      
      return {
        ok: true,
        data: {
          ...createdProduct,
          variants: variantsResponse.ok ? variantsResponse.data : []
        },
        message: 'Product created successfully'
      };
    } catch (error: any) {
      console.error('❌ [Provider] Error creating product:', error);
      console.error('❌ [Provider] Error stack:', error?.stack);
      console.error('❌ [Provider] Error details:', JSON.stringify(error, null, 2));
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create product';
      if (error?.message) {
        errorMessage = error.message;
      }
      
      // Check for common database errors
      if (error?.code === '23505') {
        errorMessage = 'Duplicate SKU detected. Please use a unique SKU.';
      } else if (error?.code === '23503') {
        errorMessage = 'Invalid reference: Category or Supplier does not exist.';
      } else if (error?.code === '42703') {
        errorMessage = 'Database column mismatch. Please contact support.';
      }
      
      return {
        ok: false,
        message: errorMessage,
        error: error
      };
    }
  },

  updateProduct: async (id: string, data: any) => {
    try {
      
      // Map the product data to the format expected by latsProductApi
      const updateData = {
        name: data.name,
        description: data.description,
        sku: data.sku,
        barcode: data.barcode,
        categoryId: data.categoryId,
        supplierId: data.supplierId || undefined,
        tags: data.tags || [],
        isActive: data.isActive !== undefined ? data.isActive : true,
        // Handle variants if provided
        variants: data.variants ? data.variants.map((v: any, index: number) => {
          return {
            id: v?.id, // ✅ Include ID for existing variants
            sku: v?.sku,
            name: v?.name || v?.variant_name || 'Default',
            attributes: v?.attributes || {},
            costPrice: typeof v?.costPrice === 'number' ? v.costPrice : (v?.cost_price ?? 0),
            sellingPrice: typeof v?.sellingPrice === 'number' ? v.sellingPrice : (v?.selling_price ?? v?.price ?? 0),
            quantity: typeof v?.quantity === 'number' ? v.quantity : (v?.stockQuantity ?? 0),
            minQuantity: typeof v?.minQuantity === 'number' ? v.minQuantity : (v?.minStockLevel ?? 0)
          };
        }) : undefined
      };

      // Call the latsProductApi updateProduct function
      const { updateProduct: apiUpdateProduct } = await import('../../../../lib/latsProductApi');
      const updatedProduct = await apiUpdateProduct(id, updateData, '');
      
      return {
        ok: true,
        data: updatedProduct,
        message: 'Product updated successfully'
      };
    } catch (error: any) {
      console.error('❌ [Provider] Error updating product:', error);
      console.error('❌ [Provider] Error stack:', error?.stack);
      console.error('❌ [Provider] Error details:', JSON.stringify(error, null, 2));
      
      // Provide more specific error messages
      let errorMessage = 'Failed to update product';
      if (error?.message) {
        errorMessage = error.message;
      }
      
      // Check for common database errors
      if (error?.code === '23505') {
        errorMessage = 'Duplicate SKU detected. Each variant must have a unique SKU.';
      } else if (error?.code === '23503') {
        errorMessage = 'Invalid reference: Category or Supplier does not exist.';
      } else if (error?.code === '42703') {
        errorMessage = 'Database column mismatch. Please contact support.';
      }
      
      return {
        ok: false,
        message: errorMessage
      };
    }
  },

  updateProductVariantCostPrice: async (variantId: string, costPrice: number) => {
    try {
      const { data: variant, error } = await supabase
        .from('lats_product_variants')
        .update({ cost_price: costPrice })
        .eq('id', variantId)
        .select()
        .single();

      if (error) throw error;

      return {
        ok: true,
        data: variant
      };
    } catch (error) {
      console.error('Error updating variant cost price:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to update variant cost price'
      };
    }
  },

  deleteProduct: async (id: string) => {
    try {
      const { error } = await supabase
        .from('lats_products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        ok: true,
        data: null
      };
    } catch (error) {
      console.error('Error deleting product:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to delete product'
      };
    }
  },

  searchProducts: async (query: string) => {
    try {
      // Fetch products first (Neon doesn't support nested select syntax)
      const { data: products, error } = await supabase
        .from('lats_products')
        .select('*')
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      if (!products || products.length === 0) {
        return { ok: true, data: [] };
      }

      // Fetch related data separately
      const productIds = products.map((p: any) => p.id);
      const categoryIds = [...new Set(products.map((p: any) => p.category_id).filter(Boolean))];
      const supplierIds = [...new Set(products.map((p: any) => p.supplier_id).filter(Boolean))];

      // Fetch variants - only if there are products
      const { data: variants } = productIds.length > 0
        ? await supabase
            .from('lats_product_variants')
            .select('*')
            .in('product_id', productIds)
        : { data: [] };

      // Fetch categories - only if there are category IDs
      const { data: categories } = categoryIds.length > 0 
        ? await supabase
            .from('lats_categories')
            .select('id, name')
            .in('id', categoryIds)
        : { data: [] };

      // Fetch suppliers - only if there are supplier IDs
      const { data: suppliers } = supplierIds.length > 0
        ? await supabase
            .from('lats_suppliers')
            .select('id, name')
            .in('id', supplierIds)
        : { data: [] };

      // Create lookup maps
      const variantsByProduct = (variants || []).reduce((acc: any, v: any) => {
        if (!acc[v.product_id]) acc[v.product_id] = [];
        acc[v.product_id].push(v);
        return acc;
      }, {});

      const categoriesMap = (categories || []).reduce((acc: any, c: any) => {
        acc[c.id] = c;
        return acc;
      }, {});

      const suppliersMap = (suppliers || []).reduce((acc: any, s: any) => {
        acc[s.id] = s;
        return acc;
      }, {});

      return {
        ok: true,
        data: products.map((p: any) => {
          const productVariants = variantsByProduct[p.id] || [];
          return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            categoryId: p.category_id,
            categoryName: categoriesMap[p.category_id]?.name,
            supplierId: p.supplier_id,
            supplierName: suppliersMap[p.supplier_id]?.name,
            price: productVariants[0]?.selling_price || 0,
            costPrice: productVariants[0]?.cost_price || 0,
            totalQuantity: p.total_quantity,
            variants: productVariants.map((v: any) => ({
              id: v.id,
              name: v.name,
              sku: v.sku,
              sellingPrice: v.selling_price || 0,
              costPrice: v.cost_price,
              stockQuantity: v.quantity
            }))
          };
        })
      };
    } catch (error) {
      console.error('Error searching products:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to search products',
        data: []
      };
    }
  },

  // Stock Management
  adjustStock: async (productId: string, variantId: string, quantity: number, reason: string, reference?: string) => {
    try {
      const { data: movement, error } = await supabase
        .from('lats_stock_movements')
        .insert({
          product_id: productId,
          variant_id: variantId,
          quantity: quantity,
          movement_type: quantity > 0 ? 'in' : 'out',
          reason: reason,
          reference: reference
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ok: true,
        data: movement
      };
    } catch (error) {
      console.error('Error adjusting stock:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to adjust stock'
      };
    }
  },

  getStockMovements: async (productId?: string) => {
    try {
      let query = supabase
        .from('lats_stock_movements')
        .select('*')
        .order('created_at', { ascending: false });

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      return {
        ok: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to fetch stock movements',
        data: []
      };
    }
  },

  // Purchase Orders - fully implemented
  getPurchaseOrders: async () => {
    try {
      
      // 🔒 Get current branch for isolation
      const currentBranchId = getCurrentBranchId();
      
      // Fetch purchase orders without nested select (Neon doesn't support this)
      let query = supabase
        .from('lats_purchase_orders')
        .select('*')
        .order('created_at', { ascending: false});
      
      // 🔒 COMPLETE ISOLATION: Only show purchase orders from current branch
      if (ISOLATION_CONFIG.ENABLE_PURCHASE_ORDER_ISOLATION && currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data: purchaseOrders, error } = await query;

      if (error) {
        console.error('❌ Error fetching purchase orders:', error);
        return { ok: false, message: error.message, data: [] };
      }

      // Fetch items with quantities for all purchase orders
      const poIds = purchaseOrders?.map((po: any) => po.id) || [];
      let itemsDataMap = new Map();
      
      if (poIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('lats_purchase_order_items')
          .select('purchase_order_id, id, quantity_ordered')
          .in('purchase_order_id', poIds);
        
        if (!itemsError && items) {
          // Group items by purchase order and calculate data
          items.forEach((item: any) => {
            const poId = item.purchase_order_id;
            const existing = itemsDataMap.get(poId) || { count: 0, totalQuantity: 0, items: [] };
            existing.count += 1;
            existing.totalQuantity += (item.quantity_ordered || 0);
            existing.items.push({
              id: item.id,
              quantity: item.quantity_ordered || 0
            });
            itemsDataMap.set(poId, existing);
          });
        }
      }
      
      // Fetch suppliers separately (Neon doesn't support nested joins)
      const suppliersMap = new Map();
      const supplierIds = [...new Set((purchaseOrders || []).map((po: any) => po.supplier_id).filter(Boolean))];
      
      if (supplierIds.length > 0) {
        const { data: suppliers, error: suppliersError } = await supabase
          .from('lats_suppliers')
          .select('id, name, contact_person, email, phone')
          .in('id', supplierIds);
        
        if (!suppliersError && suppliers) {
          suppliers.forEach((supplier: any) => {
            suppliersMap.set(supplier.id, supplier);
          });
        } else {
          console.error('❌ [getPurchaseOrders] Error fetching suppliers:', suppliersError);
        }
      }

      // Map snake_case to camelCase for each purchase order
      const mappedOrders = (purchaseOrders || []).map((po: any) => {
        const itemsData = itemsDataMap.get(po.id) || { count: 0, totalQuantity: 0, items: [] };
        
        // Parse numeric values properly
        const totalAmount = typeof po.total_amount === 'string' ? parseFloat(po.total_amount) || 0 : (po.total_amount || 0);
        const totalPaid = typeof po.total_paid === 'string' ? parseFloat(po.total_paid) || 0 : (po.total_paid || 0);
        const exchangeRate = typeof po.exchange_rate === 'string' ? parseFloat(po.exchange_rate) || undefined : po.exchange_rate;
        const totalAmountBaseCurrency = typeof po.total_amount_base_currency === 'string' ? parseFloat(po.total_amount_base_currency) || undefined : po.total_amount_base_currency;
        
        // Get supplier from separate fetch
        const supplier = po.supplier_id ? suppliersMap.get(po.supplier_id) : undefined;
        
        const mappedOrder = {
          id: po.id,
          orderNumber: po.po_number,
          supplierId: po.supplier_id,
          status: po.status,
          totalAmount: totalAmount,
          currency: po.currency || 'TZS',
          notes: po.notes,
          orderDate: po.order_date,
          expectedDeliveryDate: po.expected_delivery_date,
          receivedDate: po.received_date,
          createdAt: po.created_at,
          updatedAt: po.updated_at,
          createdBy: po.created_by,
          paymentStatus: po.payment_status,
          paymentTerms: po.payment_terms,
          totalPaid: totalPaid,
          exchangeRate: exchangeRate,
          exchangeRateSource: po.exchange_rate_source,
          totalAmountBaseCurrency: totalAmountBaseCurrency,
          supplier: supplier,
          // Create items array with real quantities from database
          items: itemsData.items.map((item: any) => ({
            id: item.id,
            quantity: item.quantity
          }))
        };
        
        // Debug each mapped order
        
        return mappedOrder;
      });

      return { ok: true, data: mappedOrders };
    } catch (error: any) {
      console.error('❌ Unexpected error fetching purchase orders:', error);
      return { ok: false, message: error.message || 'Failed to fetch purchase orders', data: [] };
    }
  },

  getPurchaseOrder: async (id: string) => {
    try {
      
      // Get purchase order
      const { data: purchaseOrder, error: poError } = await supabase
        .from('lats_purchase_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (poError) {
        console.error('❌ Error fetching purchase order:', poError);
        return { ok: false, message: poError.message };
      }

      // Get supplier data separately
      let supplier = null;
      if (purchaseOrder.supplier_id) {
        const { data: supplierData, error: supplierError } = await supabase
          .from('lats_suppliers')
          .select('*')
          .eq('id', purchaseOrder.supplier_id)
          .single();

        if (!supplierError && supplierData) {
          supplier = supplierData;
        } else {
          console.error('❌ [Provider] Error fetching supplier:', supplierError);
        }
      }

      // Get purchase order items (without nested select - Neon doesn't support this)
      const { data: items, error: itemsError } = await supabase
        .from('lats_purchase_order_items')
        .select('*')
        .eq('purchase_order_id', id);

      if (itemsError) {
        console.error('❌ Error fetching purchase order items:', itemsError);
        return { ok: false, message: itemsError.message };
      }

      // Fetch products and variants separately
      const productIds = [...new Set((items || []).map((item: any) => item.product_id).filter(Boolean))];
      const variantIds = [...new Set((items || []).map((item: any) => item.variant_id).filter(Boolean))];

      let productsMap = new Map();
      let variantsMap = new Map();

      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('lats_products')
          .select('*')
          .in('id', productIds);
        
        products?.forEach((p: any) => productsMap.set(p.id, p));
      }

      if (variantIds.length > 0) {
        const { data: variants } = await supabase
          .from('lats_product_variants')
          .select('*')
          .in('id', variantIds);
        
        variants?.forEach((v: any) => variantsMap.set(v.id, v));
      }
      
      // Debug supplier data in getPurchaseOrder

      // Map snake_case to camelCase for frontend
      const mappedOrder = {
        id: purchaseOrder.id,
        orderNumber: purchaseOrder.po_number,
        supplierId: purchaseOrder.supplier_id,
        status: purchaseOrder.status,
        totalAmount: purchaseOrder.total_amount || 0,
        currency: purchaseOrder.currency || 'TZS',
        notes: purchaseOrder.notes,
        orderDate: purchaseOrder.order_date,
        expectedDeliveryDate: purchaseOrder.expected_delivery_date,
        receivedDate: purchaseOrder.received_date,
        createdAt: purchaseOrder.created_at,
        updatedAt: purchaseOrder.updated_at,
        createdBy: purchaseOrder.created_by,
        paymentStatus: purchaseOrder.payment_status,
        paymentTerms: purchaseOrder.payment_terms,
        totalPaid: purchaseOrder.total_paid || 0,
        exchangeRate: purchaseOrder.exchange_rate,
        exchangeRateSource: purchaseOrder.exchange_rate_source,
        totalAmountBaseCurrency: purchaseOrder.total_amount_base_currency,
        supplier: supplier ? {
          id: supplier.id,
          name: supplier.name,
          contactPerson: supplier.contact_person,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          city: supplier.city,
          country: supplier.country,
          currency: supplier.currency,
          paymentTerms: supplier.payment_terms,
          isActive: supplier.is_active,
          notes: supplier.notes,
          createdAt: supplier.created_at,
          updatedAt: supplier.updated_at
        } : null,
        items: items?.map((item: any) => {
          const quantityOrdered = item.quantity_ordered || 0;
          const unitCost = item.unit_cost || 0;
          const totalCost = quantityOrdered * unitCost; // Calculate total since it's not in DB
          
          return {
            id: item.id,
            purchaseOrderId: item.purchase_order_id,
            productId: item.product_id,
            variantId: item.variant_id,
            quantity: quantityOrdered,
            quantityOrdered: quantityOrdered,
            receivedQuantity: item.quantity_received || 0,
            costPrice: unitCost,
            unitCost: unitCost,
            totalPrice: totalCost,
            subtotal: totalCost,
            status: item.status || 'pending',
            notes: item.notes,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            product: productsMap.get(item.product_id),
            variant: variantsMap.get(item.variant_id)
          };
        }) || []
      };
      
      // Debug mapped order in getPurchaseOrder

      return { 
        ok: true, 
        data: mappedOrder
      };
    } catch (error: any) {
      console.error('❌ Unexpected error fetching purchase order:', error);
      return { ok: false, message: error.message || 'Failed to fetch purchase order' };
    }
  },

  createPurchaseOrder: async (data: any) => {
    try {
      
      // Generate PO number if not provided
      const poNumber = data.po_number || `PO-${Date.now()}`;
      
      // Calculate totals from items
      const totalAmount = data.items.reduce((sum: number, item: any) => 
        sum + (item.quantity * item.costPrice), 0
      );
      
      // 🔒 Get current branch for isolation
      const currentBranchId = getCurrentBranchId();
      
      // Create the purchase order - using only core columns that exist
      const { data: purchaseOrder, error: poError } = await supabase
        .from('lats_purchase_orders')
        .insert({
          po_number: poNumber,
          supplier_id: data.supplierId,
          status: data.status || 'draft',
          total_amount: totalAmount,
          notes: data.notes || '',
          order_date: data.orderDate || new Date().toISOString(),
          expected_delivery_date: data.expectedDelivery || null,
          created_by: data.createdBy || null,
          branch_id: ISOLATION_CONFIG.ENABLE_PURCHASE_ORDER_ISOLATION ? currentBranchId : null // 🔒 Add branch isolation
        })
        .select()
        .single();

      if (poError) {
        console.error('❌ Error creating purchase order:', poError);
        return { ok: false, message: poError.message };
      }

      // Create purchase order items - using only core columns
      const items = data.items.map((item: any) => ({
        purchase_order_id: purchaseOrder.id,
        product_id: item.productId,
        variant_id: item.variantId,
        quantity_ordered: item.quantity,
        quantity_received: 0,
        unit_cost: item.costPrice,
        subtotal: item.quantity * item.costPrice
      }));

      const { data: insertedItems, error: itemsError } = await supabase
        .from('lats_purchase_order_items')
        .insert(items)
        .select();

      if (itemsError) {
        console.error('❌ Error creating purchase order items:', itemsError);
        console.error('❌ Error details:', {
          message: itemsError.message,
          code: itemsError.code,
          details: itemsError.details,
          hint: itemsError.hint
        });
        console.error('❌ Items that failed:', JSON.stringify(items, null, 2));
        // Try to clean up the purchase order
        await supabase.from('lats_purchase_orders').delete().eq('id', purchaseOrder.id);
        return { ok: false, message: `Failed to create items: ${itemsError.message}` };
      }

      // Log audit entry for purchase order creation
      try {
        await PurchaseOrderService.addAuditEntry({
          purchaseOrderId: purchaseOrder.id,
          action: 'Purchase Order Created',
          user: data.createdBy || '',
          details: `Purchase order ${poNumber} created with ${items.length} items. Total: ${totalAmount}. Status: ${data.status || 'draft'}`
        });
      } catch (auditError) {
        console.warn('⚠️ Failed to log audit entry:', auditError);
        // Don't fail the creation if audit logging fails
      }

      return { 
        ok: true, 
        data: { ...purchaseOrder, items: insertedItems || items },
        message: 'Purchase order created successfully' 
      };
    } catch (error: any) {
      console.error('❌ Unexpected error creating purchase order:', error);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      console.error('❌ Error type:', typeof error, error.constructor?.name);
      return { ok: false, message: error.message || error.toString() || 'Failed to create purchase order' };
    }
  },

  updatePurchaseOrder: async (id: string, data: any) => {
    try {
      
      const { data: updatedPO, error: updateError } = await supabase
        .from('lats_purchase_orders')
        .update({
          status: data.status,
          notes: data.notes,
          expected_delivery_date: data.expectedDelivery,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating purchase order:', updateError);
        return { ok: false, message: updateError.message };
      }

      // Log audit entry for purchase order update
      try {
        const changes = [];
        if (data.status) changes.push(`Status: ${data.status}`);
        if (data.notes) changes.push('Notes updated');
        if (data.expectedDelivery) changes.push(`Expected delivery: ${data.expectedDelivery}`);
        
        await PurchaseOrderService.addAuditEntry({
          purchaseOrderId: id,
          action: 'Purchase Order Updated',
          user: data.updatedBy || '',
          details: `Purchase order updated. Changes: ${changes.join(', ')}`
        });
      } catch (auditError) {
        console.warn('⚠️ Failed to log audit entry:', auditError);
        // Don't fail the update if audit logging fails
      }

      return { 
        ok: true, 
        data: updatedPO,
        message: 'Purchase order updated successfully' 
      };
    } catch (error: any) {
      console.error('❌ Unexpected error updating purchase order:', error);
      return { ok: false, message: error.message || 'Failed to update purchase order' };
    }
  },

  receivePurchaseOrder: async (id: string) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { ok: false, message: 'User not authenticated' };
      }

      // Call the RPC function to complete the receive
      const { data, error } = await supabase
        .rpc('complete_purchase_order_receive', {
          purchase_order_id_param: id,
          user_id_param: user.id,
          receive_notes: 'Received via PO system'
        });

      if (error) {
        console.error('❌ Error receiving purchase order:', error);
        return { ok: false, message: error.message || 'Failed to receive purchase order' };
      }
      
      // 🔥 EMIT EVENT: Notify inventory page to refresh
      latsEventBus.emit('lats:purchase-order.received', {
        purchaseOrderId: id,
        userId: user.id,
        notes: 'Received via PO system'
      });
      
      // Get updated purchase order (without nested select - Neon doesn't support this)
      const { data: updatedPO, error: fetchError } = await supabase
        .from('lats_purchase_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.warn('⚠️ Could not fetch updated PO, but receive was successful');
        return { ok: true, message: 'Purchase order received successfully' };
      }

      // Fetch supplier separately if needed
      if (updatedPO && updatedPO.supplier_id) {
        const { data: supplier } = await supabase
          .from('lats_suppliers')
          .select('*')
          .eq('id', updatedPO.supplier_id)
          .single();
        
        if (supplier) {
          updatedPO.supplier = supplier;
        }
      }

      return { ok: true, data: updatedPO };
    } catch (error) {
      console.error('❌ Unexpected error receiving purchase order:', error);
      return { 
        ok: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  },

  deletePurchaseOrder: async (id: string) => {
    return { ok: false, message: 'Not implemented' };
  },

  // Spare Parts - real implementations
  getSpareParts: async () => {
    try {
      
      // Fetch spare parts without nested select (Neon doesn't support this)
      const { data: spareParts, error } = await supabase
        .from('lats_spare_parts')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ [DEBUG] getSpareParts: Database error:', error);
        return { ok: false, message: error.message || 'Failed to fetch spare parts' };
      }

      if (!spareParts || spareParts.length === 0) {
        return { ok: true, data: [] };
      }

      // Fetch related data separately
      const categoryIds = [...new Set(spareParts.map((sp: any) => sp.category_id).filter(Boolean))];
      const supplierIds = [...new Set(spareParts.map((sp: any) => sp.supplier_id).filter(Boolean))];
      const sparePartIds = spareParts.map((sp: any) => sp.id);

      // Fetch categories, suppliers, and variants in parallel
      const [categoriesRes, suppliersRes, variantsRes] = await Promise.all([
        categoryIds.length > 0 ? supabase.from('lats_categories').select('id, name').in('id', categoryIds) : Promise.resolve({ data: [] }),
        supplierIds.length > 0 ? supabase.from('lats_suppliers').select('id, name, email, phone').in('id', supplierIds) : Promise.resolve({ data: [] }),
        sparePartIds.length > 0 ? supabase.from('lats_spare_part_variants').select('*').in('spare_part_id', sparePartIds) : Promise.resolve({ data: [] })
      ]);

      // Create lookup maps
      const categoriesMap = (categoriesRes.data || []).reduce((acc: any, c: any) => {
        acc[c.id] = c;
        return acc;
      }, {});

      const suppliersMap = (suppliersRes.data || []).reduce((acc: any, s: any) => {
        acc[s.id] = s;
        return acc;
      }, {});

      const variantsBySparePartId = (variantsRes.data || []).reduce((acc: any, v: any) => {
        if (!acc[v.spare_part_id]) acc[v.spare_part_id] = [];
        acc[v.spare_part_id].push(v);
        return acc;
      }, {});

      // Map the data
      const enrichedSpareParts = spareParts.map((sp: any) => ({
        ...sp,
        category: categoriesMap[sp.category_id],
        supplier: suppliersMap[sp.supplier_id],
        variants: variantsBySparePartId[sp.id] || []
      }));
      return { ok: true, data: enrichedSpareParts };
    } catch (error) {
      console.error('❌ [DEBUG] getSpareParts: Unexpected error:', error);
      return { ok: false, message: 'Failed to fetch spare parts' };
    }
  },

  getSparePart: async (id: string) => {
    try {
      // Fetch spare part without nested select (Neon doesn't support this)
      const { data: sparePart, error } = await supabase
        .from('lats_spare_parts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { ok: false, message: error.message || 'Failed to fetch spare part' };
      }

      // Fetch related data separately
      const [categoryRes, supplierRes, variantsRes] = await Promise.all([
        sparePart.category_id ? supabase.from('lats_categories').select('id, name').eq('id', sparePart.category_id).single() : Promise.resolve({ data: null }),
        sparePart.supplier_id ? supabase.from('lats_suppliers').select('id, name, email, phone').eq('id', sparePart.supplier_id).single() : Promise.resolve({ data: null }),
        supabase.from('lats_spare_part_variants').select('*').eq('spare_part_id', id)
      ]);

      // Enrich the spare part with related data
      const enrichedSparePart = {
        ...sparePart,
        category: categoryRes.data,
        supplier: supplierRes.data,
        variants: variantsRes.data || []
      };

      return { ok: true, data: enrichedSparePart };
    } catch (error) {
      console.error('Error getting spare part:', error);
      return { ok: false, message: 'Failed to fetch spare part' };
    }
  },

  createSparePart: async (data: any) => {
    try {
      const { data: result, error } = await supabase
        .from('lats_spare_parts')
        .insert(data)
        .select()
        .single();

      if (error) {
        return { ok: false, message: error.message || 'Failed to create spare part' };
      }

      return { ok: true, data: result };
    } catch (error) {
      console.error('Error creating spare part:', error);
      return { ok: false, message: 'Failed to create spare part' };
    }
  },

  updateSparePart: async (id: string, data: any) => {
    try {
      const { data: result, error } = await supabase
        .from('lats_spare_parts')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { ok: false, message: error.message || 'Failed to update spare part' };
      }

      return { ok: true, data: result };
    } catch (error) {
      console.error('Error updating spare part:', error);
      return { ok: false, message: 'Failed to update spare part' };
    }
  },

  deleteSparePart: async (id: string) => {
    try {
      const { error } = await supabase
        .from('lats_spare_parts')
        .delete()
        .eq('id', id);

      if (error) {
        return { ok: false, message: error.message || 'Failed to delete spare part' };
      }

      return { ok: true };
    } catch (error) {
      console.error('Error deleting spare part:', error);
      return { ok: false, message: 'Failed to delete spare part' };
    }
  },

  useSparePart: async (data: any) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { ok: false, message: 'User not authenticated' };
      }

      const { data: result, error } = await supabase
        .from('lats_spare_part_usage')
        .insert({
          ...data,
          used_by: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return { ok: false, message: error.message || 'Failed to record spare part usage' };
      }

      // Update spare part quantity
      const { error: updateError } = await supabase
        .from('lats_spare_parts')
        .update({ 
          quantity: supabase.raw('quantity - ?', [data.quantity]),
          updated_at: new Date().toISOString()
        })
        .eq('id', data.spare_part_id);

      if (updateError) {
        console.error('Error updating spare part quantity:', updateError);
        return { ok: false, message: 'Failed to update spare part quantity' };
      }

      return { ok: true, data: result };
    } catch (error) {
      console.error('Error using spare part:', error);
      return { ok: false, message: 'Failed to use spare part' };
    }
  },

  getSparePartUsage: async () => {
    try {
      // Fetch spare part usage without nested select (Neon doesn't support this)
      const { data: usageRecords, error } = await supabase
        .from('lats_spare_part_usage')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { ok: false, message: error.message || 'Failed to fetch spare part usage' };
      }

      if (!usageRecords || usageRecords.length === 0) {
        return { ok: true, data: [] };
      }

      // Fetch related data separately
      const sparePartIds = [...new Set(usageRecords.map((u: any) => u.spare_part_id).filter(Boolean))];
      const deviceIds = [...new Set(usageRecords.map((u: any) => u.device_id).filter(Boolean))];

      const [sparePartsRes, devicesRes] = await Promise.all([
        sparePartIds.length > 0 ? supabase.from('lats_spare_parts').select('id, name, part_number').in('id', sparePartIds) : Promise.resolve({ data: [] }),
        deviceIds.length > 0 ? supabase.from('devices').select('id, device_name, customer_name').in('id', deviceIds) : Promise.resolve({ data: [] })
      ]);

      // Create lookup maps
      const sparePartsMap = (sparePartsRes.data || []).reduce((acc: any, sp: any) => {
        acc[sp.id] = sp;
        return acc;
      }, {});

      const devicesMap = (devicesRes.data || []).reduce((acc: any, d: any) => {
        acc[d.id] = d;
        return acc;
      }, {});

      // Enrich usage records with related data
      const enrichedUsage = usageRecords.map((usage: any) => ({
        ...usage,
        spare_part: sparePartsMap[usage.spare_part_id],
        device: devicesMap[usage.device_id]
      }));

      return { ok: true, data: enrichedUsage };
    } catch (error) {
      console.error('Error getting spare part usage:', error);
      return { ok: false, message: 'Failed to fetch spare part usage' };
    }
  },

  // POS - placeholder implementations
  getCart: async () => {
    return { ok: true, data: null };
  },

  addToCart: async (data: any) => {
    return { ok: false, message: 'Not implemented' };
  },

  updateCartItem: async (itemId: string, quantity: number) => {
    return { ok: false, message: 'Not implemented' };
  },

  removeFromCart: async (itemId: string) => {
    return { ok: false, message: 'Not implemented' };
  },

  clearCart: async () => {
    return { ok: true, data: null };
  },

  processSale: async (data: any) => {
    return { ok: false, message: 'Not implemented' };
  },

  getSales: async () => {
    try {
      
      // Get current branch for filtering
      const currentBranchId = getCurrentBranchId();
      
      // Build query
      let query = supabase
        .from('lats_sales')
        .select(`
          id,
          sale_number,
          customer_id,
          customer_name,
          subtotal,
          total_amount,
          discount_amount,
          tax_amount,
          payment_method,
          payment_status,
          status,
          sold_by,
          user_id,
          notes,
          created_at,
          updated_at,
          branch_id
        `)
        .order('created_at', { ascending: false })
        .limit(500); // Limit to recent 500 sales for performance
      
      // Apply branch filter if branch ID exists
      if (ISOLATION_CONFIG.ENABLE_SALES_ISOLATION && currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      } else {
      }
      
      const { data: sales, error } = await query;
      
      if (error) {
        console.error('❌ [Provider] Error fetching sales:', error);
        return {
          ok: false,
          message: error.message,
          data: []
        };
      }
      
      return {
        ok: true,
        data: sales || []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch sales';
      console.error('❌ [Provider] Exception fetching sales:', error);
      return {
        ok: false,
        message: errorMessage,
        data: []
      };
    }
  },

  getSale: async (id: string) => {
    return { ok: false, message: 'Not implemented' };
  },

  getPOSSettings: async () => {
    return { ok: true, data: {} };
  },

  updatePOSSettings: async (settings: any) => {
    return { ok: true, data: settings };
  },

  // Analytics - placeholder implementations
  getInventoryStats: async () => {
    return { ok: true, data: {} };
  },

  getSalesStats: async () => {
    return { ok: true, data: {} };
  },

  getLowStockItems: async () => {
    return { ok: true, data: [] };
  },

  getAllSaleItems: async () => {
    return { ok: true, data: [] };
  },

  // Shipping Agents - placeholder implementations
  getShippingAgents: async () => {
    return { ok: true, data: [] };
  },

  getShippingAgent: async (id: string) => {
    return { ok: false, message: 'Not implemented' };
  },

  createShippingAgent: async (data: any) => {
    return { ok: false, message: 'Not implemented' };
  },

  updateShippingAgent: async (id: string, data: any) => {
    return { ok: false, message: 'Not implemented' };
  },

  deleteShippingAgent: async (id: string) => {
    return { ok: false, message: 'Not implemented' };
  },

  toggleShippingAgentStatus: async (id: string) => {
    return { ok: false, message: 'Not implemented' };
  },

  getShippingManagers: async () => {
    return { ok: true, data: [] };
  },

  // ================================================
  // DEVICES & REPAIRS - with branch isolation
  // ================================================

  // Get all devices
  getDevices: async () => {
    try {
      // 🔒 Get current branch for isolation
      const currentBranchId = getCurrentBranchId();
      
      let query = supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });
      
      // 🔒 COMPLETE ISOLATION: Only show devices from current branch
      if (ISOLATION_CONFIG.ENABLE_DEVICE_ISOLATION && currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching devices:', error);
        return { ok: false, message: error.message, data: [] };
      }
      
      return { ok: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Unexpected error fetching devices:', error);
      return { ok: false, message: error.message || 'Failed to fetch devices', data: [] };
    }
  },

  // Get device by ID
  getDevice: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('❌ Error fetching device:', error);
        return { ok: false, message: error.message };
      }
      
      return { ok: true, data };
    } catch (error: any) {
      console.error('❌ Unexpected error fetching device:', error);
      return { ok: false, message: error.message || 'Failed to fetch device' };
    }
  },

  // Create device
  createDevice: async (data: any) => {
    try {
      // 🔒 Get current branch for isolation
      const currentBranchId = getCurrentBranchId();
      
      const deviceData = {
        ...data,
        branch_id: ISOLATION_CONFIG.ENABLE_DEVICE_ISOLATION ? (currentBranchId || '00000000-0000-0000-0000-000000000001') : null
      };
      
      const { data: device, error } = await supabase
        .from('devices')
        .insert(deviceData)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error creating device:', error);
        return { ok: false, message: error.message };
      }
      
      return { ok: true, data: device };
    } catch (error: any) {
      console.error('❌ Unexpected error creating device:', error);
      return { ok: false, message: error.message || 'Failed to create device' };
    }
  },

  // Update device
  updateDevice: async (id: string, data: any) => {
    try {
      const { data: device, error } = await supabase
        .from('devices')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error updating device:', error);
        return { ok: false, message: error.message };
      }
      
      return { ok: true, data: device };
    } catch (error: any) {
      console.error('❌ Unexpected error updating device:', error);
      return { ok: false, message: error.message || 'Failed to update device' };
    }
  },

  // Delete device
  deleteDevice: async (id: string) => {
    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('❌ Error deleting device:', error);
        return { ok: false, message: error.message };
      }
      
      return { ok: true };
    } catch (error: any) {
      console.error('❌ Unexpected error deleting device:', error);
      return { ok: false, message: error.message || 'Failed to delete device' };
    }
  },

  // Get repair parts for a device
  getRepairParts: async (deviceId: string) => {
    try {
      // 🔒 Get current branch for isolation
      const currentBranchId = getCurrentBranchId();
      
      let query = supabase
        .from('repair_parts')
        .select('*')
        .eq('device_id', deviceId);
      
      // 🔒 Optional: Also filter repair parts by branch
      if (ISOLATION_CONFIG.ENABLE_DEVICE_ISOLATION && currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching repair parts:', error);
        return { ok: false, message: error.message, data: [] };
      }
      
      return { ok: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Unexpected error fetching repair parts:', error);
      return { ok: false, message: error.message || 'Failed to fetch repair parts', data: [] };
    }
  },

  // Get customer payments
  getCustomerPayments: async (filters?: any) => {
    try {
      // 🔒 Get current branch for isolation
      const currentBranchId = getCurrentBranchId();
      
      let query = supabase
        .from('customer_payments')
        .select('*')
        .order('payment_date', { ascending: false });
      
      // Apply filters if provided
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      if (filters?.device_id) {
        query = query.eq('device_id', filters.device_id);
      }
      
      // 🔒 COMPLETE ISOLATION: Only show payments from current branch
      if (ISOLATION_CONFIG.ENABLE_PAYMENT_ISOLATION && currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching customer payments:', error);
        return { ok: false, message: error.message, data: [] };
      }
      
      return { ok: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Unexpected error fetching customer payments:', error);
      return { ok: false, message: error.message || 'Failed to fetch customer payments', data: [] };
    }
  },

  // Create customer payment
  createCustomerPayment: async (data: any) => {
    try {
      // 🔒 Get current branch for isolation
      const currentBranchId = getCurrentBranchId();
      
      const paymentData = {
        ...data,
        branch_id: ISOLATION_CONFIG.ENABLE_PAYMENT_ISOLATION ? (currentBranchId || '00000000-0000-0000-0000-000000000001') : null
      };
      
      const { data: payment, error } = await supabase
        .from('customer_payments')
        .insert(paymentData)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error creating payment:', error);
        return { ok: false, message: error.message };
      }
      
      return { ok: true, data: payment };
    } catch (error: any) {
      console.error('❌ Unexpected error creating payment:', error);
      return { ok: false, message: error.message || 'Failed to create payment' };
    }
  },

  // Get device statistics (branch-aware)
  getDeviceStatistics: async () => {
    try {
      // 🔒 Get current branch for isolation
      const currentBranchId = getCurrentBranchId();
      
      let baseQuery = supabase.from('devices');
      
      // Build queries with optional branch filtering
      const buildQuery = (statusFilter?: string) => {
        let q = baseQuery.select('id', { count: 'exact' });
        if (ISOLATION_CONFIG.ENABLE_DEVICE_ISOLATION && currentBranchId) {
          q = q.eq('branch_id', currentBranchId);
        }
        if (statusFilter) {
          q = q.eq('status', statusFilter);
        }
        return q;
      };
      
      const [totalResult, pendingResult, inProgressResult, completedResult] = await Promise.all([
        buildQuery(),
        buildQuery('pending'),
        buildQuery('in-progress'),
        buildQuery('completed')
      ]);
      
      return {
        ok: true,
        data: {
          total: totalResult.data?.length || 0,
          pending: pendingResult.data?.length || 0,
          inProgress: inProgressResult.data?.length || 0,
          completed: completedResult.data?.length || 0
        }
      };
    } catch (error: any) {
      console.error('❌ Error fetching device statistics:', error);
      return {
        ok: false,
        message: error.message || 'Failed to fetch device statistics',
        data: { total: 0, pending: 0, inProgress: 0, completed: 0 }
      };
    }
  },

  // ================================================
  // TECHNICIANS & USERS - with branch isolation
  // ================================================

  // Get all technicians
  getTechnicians: async () => {
    try {
      // 🔒 Get current branch for isolation
      const currentBranchId = getCurrentBranchId();
      
      let query = supabase
        .from('users')
        .select('*')
        .in('role', ['technician', 'tech', 'admin', 'manager'])
        .eq('is_active', true)
        .order('full_name');
      
      // 🔒 COMPLETE ISOLATION: Only show technicians from current branch
      if (ISOLATION_CONFIG.ENABLE_TECHNICIAN_ISOLATION && currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching technicians:', error);
        return { ok: false, message: error.message, data: [] };
      }
      
      return { ok: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Unexpected error fetching technicians:', error);
      return { ok: false, message: error.message || 'Failed to fetch technicians', data: [] };
    }
  },

  // Get all users (including non-technicians)
  getUsers: async (filters?: any) => {
    try {
      // 🔒 Get current branch for isolation
      const currentBranchId = getCurrentBranchId();
      
      let query = supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('full_name');
      
      // Apply role filter if provided
      if (filters?.role) {
        query = query.eq('role', filters.role);
      }
      
      // 🔒 COMPLETE ISOLATION: Only show users from current branch
      if (ISOLATION_CONFIG.ENABLE_TECHNICIAN_ISOLATION && currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching users:', error);
        return { ok: false, message: error.message, data: [] };
      }
      
      return { ok: true, data: data || [] };
    } catch (error: any) {
      console.error('❌ Unexpected error fetching users:', error);
      return { ok: false, message: error.message || 'Failed to fetch users', data: [] };
    }
  },

  // Create user
  createUser: async (data: any) => {
    try {
      // 🔒 Get current branch for isolation
      const currentBranchId = getCurrentBranchId();
      
      const userData = {
        ...data,
        branch_id: ISOLATION_CONFIG.ENABLE_TECHNICIAN_ISOLATION ? (currentBranchId || '00000000-0000-0000-0000-000000000001') : null
      };
      
      const { data: user, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error creating user:', error);
        return { ok: false, message: error.message };
      }
      
      return { ok: true, data: user };
    } catch (error: any) {
      console.error('❌ Unexpected error creating user:', error);
      return { ok: false, message: error.message || 'Failed to create user' };
    }
  },

  // Update user
  updateUser: async (id: string, data: any) => {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error updating user:', error);
        return { ok: false, message: error.message };
      }
      
      return { ok: true, data: user };
    } catch (error: any) {
      console.error('❌ Unexpected error updating user:', error);
      return { ok: false, message: error.message || 'Failed to update user' };
    }
  },

  // Delete/deactivate user
  deleteUser: async (id: string) => {
    try {
      // Soft delete - just deactivate
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) {
        console.error('❌ Error deactivating user:', error);
        return { ok: false, message: error.message };
      }
      
      return { ok: true };
    } catch (error: any) {
      console.error('❌ Unexpected error deactivating user:', error);
      return { ok: false, message: error.message || 'Failed to deactivate user' };
    }
  },

  // Get user statistics (branch-aware)
  getUserStatistics: async () => {
    try {
      // 🔒 Get current branch for isolation
      const currentBranchId = getCurrentBranchId();
      
      let baseQuery = supabase.from('users').select('id, role', { count: 'exact' }).eq('is_active', true);
      
      // Apply branch filter if isolation is enabled
      if (ISOLATION_CONFIG.ENABLE_TECHNICIAN_ISOLATION && currentBranchId) {
        baseQuery = baseQuery.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await baseQuery;
      
      if (error) {
        console.error('❌ Error fetching user statistics:', error);
        return {
          ok: false,
          message: error.message,
          data: { total: 0, technicians: 0, admins: 0, managers: 0, customerCare: 0 }
        };
      }
      
      // Count by role
      const stats = {
        total: data?.length || 0,
        technicians: data?.filter((u: any) => u.role === 'technician' || u.role === 'tech').length || 0,
        admins: data?.filter((u: any) => u.role === 'admin').length || 0,
        managers: data?.filter((u: any) => u.role === 'manager').length || 0,
        customerCare: data?.filter((u: any) => u.role === 'customer-care').length || 0
      };
      
      return { ok: true, data: stats };
    } catch (error: any) {
      console.error('❌ Error fetching user statistics:', error);
      return {
        ok: false,
        message: error.message || 'Failed to fetch user statistics',
        data: { total: 0, technicians: 0, admins: 0, managers: 0, customerCare: 0 }
      };
    }
  }
};

export default supabaseProvider;

