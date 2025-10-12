// Supabase/Neon provider implementation
import supabase from '@/lib/supabaseClient';
import { getProducts as getProductsApi, getProduct as getProductApi } from '@/lib/latsProductApi';
import { getCategories as getCategoriesApi } from '@/lib/categoryApi';
import { getActiveSuppliers, getAllSuppliers } from '@/lib/supplierApi';

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
      console.log('🔍 [Provider] Fetching categories...');
      const categories = await getCategoriesApi();
      console.log('✅ [Provider] Categories fetched:', categories?.length || 0);
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
      console.log('🔍 [Provider] Fetching suppliers...');
      const suppliers = await getAllSuppliers();
      console.log('✅ [Provider] Suppliers fetched:', suppliers?.length || 0);
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
      console.log('🔍 [Provider] Fetching products with filters:', filters);
      const products = await getProductsApi();
      console.log('✅ [Provider] Products fetched:', products?.length || 0);
      
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
      console.error('❌ [Provider] Error fetching products:', error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to fetch products',
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
      console.log('🔍 [Provider] Fetching product:', id);
      const product = await getProductApi(id);
      console.log('✅ [Provider] Product fetched:', product?.name);
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
          costPrice: v.cost_price,
          sellingPrice: v.unit_price,
          quantity: v.quantity,
          minQuantity: v.min_quantity,
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
    // This would use the latsProductApi createProduct function
    return {
      ok: false,
      message: 'Not implemented yet'
    };
  },

  updateProduct: async (id: string, data: any) => {
    // This would use the latsProductApi updateProduct function
    return {
      ok: false,
      message: 'Not implemented yet'
    };
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
      const { data: products, error } = await supabase
        .from('lats_products')
        .select(`
          *,
          lats_categories(name),
          lats_suppliers(name),
          lats_product_variants(*)
        `)
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;

      return {
        ok: true,
        data: (products || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          categoryId: p.category_id,
          categoryName: p.lats_categories?.name,
          supplierId: p.supplier_id,
          supplierName: p.lats_suppliers?.name,
          price: p.lats_product_variants?.[0]?.unit_price || 0,
          costPrice: p.lats_product_variants?.[0]?.cost_price || 0,
          totalQuantity: p.total_quantity,
          variants: (p.lats_product_variants || []).map((v: any) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            sellingPrice: v.unit_price,
            costPrice: v.cost_price,
            stockQuantity: v.quantity
          }))
        }))
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
      console.log('📋 Fetching all purchase orders...');
      
      const { data: purchaseOrders, error } = await supabase
        .from('lats_purchase_orders')
        .select(`
          *,
          supplier:lats_suppliers(
            id,
            name,
            contact_person,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching purchase orders:', error);
        return { ok: false, message: error.message, data: [] };
      }

      console.log(`✅ Fetched ${purchaseOrders?.length || 0} purchase orders`);
      
      // Debug supplier data
      console.log('🔍 [getPurchaseOrders] Raw data sample:', purchaseOrders?.[0]);
      console.log('🔍 [getPurchaseOrders] Supplier data:', purchaseOrders?.map(po => ({
        id: po.id,
        po_number: po.po_number,
        supplier_id: po.supplier_id,
        supplier: po.supplier,
        supplierType: typeof po.supplier
      })));

      // Fetch item counts for all purchase orders
      const poIds = purchaseOrders?.map((po: any) => po.id) || [];
      let itemCounts = new Map();
      
      if (poIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('lats_purchase_order_items')
          .select('purchase_order_id, id')
          .in('purchase_order_id', poIds);
        
        if (!itemsError && items) {
          // Count items per purchase order
          items.forEach((item: any) => {
            const count = itemCounts.get(item.purchase_order_id) || 0;
            itemCounts.set(item.purchase_order_id, count + 1);
          });
        }
      }
      
      // If suppliers are not populated in the join, fetch them separately
      const suppliersMap = new Map();
      const missingSuppliers = purchaseOrders?.filter((po: any) => !po.supplier && po.supplier_id) || [];
      
      if (missingSuppliers.length > 0) {
        console.log('⚠️ [getPurchaseOrders] Suppliers missing from join, fetching separately...');
        const supplierIds = [...new Set(missingSuppliers.map((po: any) => po.supplier_id))];
        
        const { data: suppliers, error: suppliersError } = await supabase
          .from('lats_suppliers')
          .select('id, name, contact_person, email, phone')
          .in('id', supplierIds);
        
        if (!suppliersError && suppliers) {
          suppliers.forEach((supplier: any) => {
            suppliersMap.set(supplier.id, supplier);
          });
          console.log(`✅ [getPurchaseOrders] Fetched ${suppliers.length} suppliers separately`);
        } else {
          console.error('❌ [getPurchaseOrders] Error fetching suppliers:', suppliersError);
        }
      }

      // Map snake_case to camelCase for each purchase order
      const mappedOrders = (purchaseOrders || []).map((po: any) => {
        const itemCount = itemCounts.get(po.id) || 0;
        
        // Parse numeric values properly
        const totalAmount = typeof po.total_amount === 'string' ? parseFloat(po.total_amount) || 0 : (po.total_amount || 0);
        const totalPaid = typeof po.total_paid === 'string' ? parseFloat(po.total_paid) || 0 : (po.total_paid || 0);
        const exchangeRate = typeof po.exchange_rate === 'string' ? parseFloat(po.exchange_rate) || undefined : po.exchange_rate;
        const totalAmountBaseCurrency = typeof po.total_amount_base_currency === 'string' ? parseFloat(po.total_amount_base_currency) || undefined : po.total_amount_base_currency;
        
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
          supplier: po.supplier || undefined, // Explicitly handle null supplier
          // Create a minimal items array for count display
          items: Array(itemCount).fill({ id: 'placeholder' })
        };
        
        // Debug each mapped order
        console.log('🔍 [getPurchaseOrders] Mapped order:', {
          id: mappedOrder.id,
          orderNumber: mappedOrder.orderNumber,
          supplierId: mappedOrder.supplierId,
          supplier: mappedOrder.supplier,
          totalAmount: mappedOrder.totalAmount
        });
        
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
      console.log('🔍 Fetching purchase order:', id);
      
      // Get purchase order
      const { data: purchaseOrder, error: poError } = await supabase
        .from('lats_purchase_orders')
        .select(`
          *,
          supplier:lats_suppliers(*)
        `)
        .eq('id', id)
        .single();

      if (poError) {
        console.error('❌ Error fetching purchase order:', poError);
        return { ok: false, message: poError.message };
      }

      // Get purchase order items
      const { data: items, error: itemsError } = await supabase
        .from('lats_purchase_order_items')
        .select(`
          *,
          product:lats_products(*),
          variant:lats_product_variants(*)
        `)
        .eq('purchase_order_id', id);

      if (itemsError) {
        console.error('❌ Error fetching purchase order items:', itemsError);
        return { ok: false, message: itemsError.message };
      }

      console.log('✅ Purchase order fetched:', purchaseOrder.po_number);
      
      // Debug supplier data in getPurchaseOrder
      console.log('🔍 [getPurchaseOrder] Raw supplier data:', {
        id: purchaseOrder.id,
        po_number: purchaseOrder.po_number,
        supplier_id: purchaseOrder.supplier_id,
        supplier: purchaseOrder.supplier
      });

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
        supplier: purchaseOrder.supplier,
        items: items?.map((item: any) => ({
          id: item.id,
          purchaseOrderId: item.purchase_order_id,
          productId: item.product_id,
          variantId: item.variant_id,
          quantity: item.quantity_ordered || 0,
          quantityOrdered: item.quantity_ordered || 0,
          receivedQuantity: item.quantity_received || 0,
          costPrice: item.unit_cost || 0,
          unitCost: item.unit_cost || 0,
          totalPrice: item.subtotal || 0,
          subtotal: item.subtotal || 0,
          status: item.status || 'pending',
          notes: item.notes,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          product: item.product,
          variant: item.variant
        })) || []
      };
      
      // Debug mapped order in getPurchaseOrder
      console.log('🔍 [getPurchaseOrder] Mapped order:', {
        id: mappedOrder.id,
        orderNumber: mappedOrder.orderNumber,
        supplierId: mappedOrder.supplierId,
        supplier: mappedOrder.supplier,
        totalAmount: mappedOrder.totalAmount
      });

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
      console.log('🔄 Creating purchase order:', data);
      
      // Generate PO number if not provided
      const poNumber = data.po_number || `PO-${Date.now()}`;
      
      // Calculate totals from items
      const totalAmount = data.items.reduce((sum: number, item: any) => 
        sum + (item.quantity * item.costPrice), 0
      );
      
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
          created_by: data.createdBy || null
        })
        .select()
        .single();

      if (poError) {
        console.error('❌ Error creating purchase order:', poError);
        return { ok: false, message: poError.message };
      }

      console.log('✅ Purchase order created:', purchaseOrder);

      // Create purchase order items - using only core columns
      const items = data.items.map((item: any) => ({
        purchase_order_id: purchaseOrder.id,
        product_id: item.productId,
        variant_id: item.variantId,
        quantity_ordered: item.quantity,
        quantity_received: 0,
        unit_cost: item.costPrice,
        subtotal: item.quantity * item.costPrice // Calculate subtotal (required by database)
      }));

      console.log('📦 Attempting to insert items:', items);

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

      console.log('✅ Purchase order items created:', insertedItems?.length || items.length);

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
      console.log('🔄 Updating purchase order:', id, data);
      
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

      console.log('✅ Purchase order updated:', updatedPO.po_number);

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

      console.log(`📦 Receiving purchase order: ${id}`);

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

      console.log('✅ Purchase order received successfully:', data);
      
      // Get updated purchase order
      const { data: updatedPO, error: fetchError } = await supabase
        .from('lats_purchase_orders')
        .select('*, supplier:lats_suppliers(*)')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.warn('⚠️ Could not fetch updated PO, but receive was successful');
        return { ok: true, message: 'Purchase order received successfully' };
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

  // Spare Parts - placeholder implementations
  getSpareParts: async () => {
    return { ok: true, data: [] };
  },

  getSparePart: async (id: string) => {
    return { ok: false, message: 'Not implemented' };
  },

  createSparePart: async (data: any) => {
    return { ok: false, message: 'Not implemented' };
  },

  updateSparePart: async (id: string, data: any) => {
    return { ok: false, message: 'Not implemented' };
  },

  deleteSparePart: async (id: string) => {
    return { ok: false, message: 'Not implemented' };
  },

  useSparePart: async (data: any) => {
    return { ok: false, message: 'Not implemented' };
  },

  getSparePartUsage: async () => {
    return { ok: true, data: [] };
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
    return { ok: true, data: [] };
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
  }
};

export default supabaseProvider;

