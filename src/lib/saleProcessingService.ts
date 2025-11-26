import { supabase } from './supabaseClient';
import { getAccountBalanceBeforeStorage, validateBalanceBeforeTransaction } from './financeAccountService';
import { toast } from 'react-hot-toast';
import { emitSaleCompleted, emitStockUpdate } from '../features/lats/lib/data/eventBus';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_REGEX.test(value);

export interface SaleItem {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  costPrice: number;
  profit: number;
  selectedSerialNumbers?: Array<{ id: string; serial_number: string; imei?: string; mac_address?: string }>;
}

export interface SaleData {
  id: string;
  saleNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  total: number;
  paymentMethod: {
    type: string;
    details: any;
    amount: number;
  };
  paymentStatus: 'pending' | 'completed' | 'failed';
  soldBy: string;
  soldAt: string;
  createdAt: string;
  notes?: string;
}

export interface ProcessSaleResult {
  success: boolean;
  saleId?: string;
  error?: string;
  sale?: SaleData;
}

class SaleProcessingService {
  // Helper method to check and ensure authentication
  private async ensureAuthentication(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // Try to get current user (Supabase Auth)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (user && !authError) {
        // Supabase Auth is working
        console.log('✅ User authenticated via Supabase Auth:', user.email);
        return { success: true, user };
      }

      // If Supabase Auth fails, check localStorage for user (Neon direct connection)
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          console.log('✅ User authenticated via localStorage:', parsedUser.email);
          return { 
            success: true, 
            user: {
              email: parsedUser.email,
              id: parsedUser.id || 'system',
              user_metadata: {
                name: parsedUser.name || parsedUser.email
              }
            }
          };
        } catch (parseError) {
          console.warn('⚠️ Could not parse stored user');
        }
      }

      // Fallback: Allow without authentication (Neon direct mode)
      console.warn('⚠️ No authentication found, using system user');
      return { 
        success: true, 
        user: {
          email: 'system@neon.direct',
          id: 'system',
          user_metadata: { name: 'System User' }
        }
      };
    } catch (error) {
      console.warn('⚠️ Authentication check error, using fallback:', error);
      // Fallback to system user
      return { 
        success: true, 
        user: {
          email: 'system@neon.direct',
          id: 'system',
          user_metadata: { name: 'System User' }
        }
      };
    }
  }

  // Public method to check stock availability before adding to cart
  // This handles parent variants correctly by calculating stock from children
  async checkStockAvailability(variantId: string, requestedQuantity: number): Promise<{
    available: boolean;
    availableStock: number;
    error?: string;
  }> {
    try {
      // Validate variantId format
      if (!isValidUuid(variantId)) {
        return {
          available: false,
          availableStock: 0,
          error: 'Invalid variant ID format'
        };
      }

      // Check if variant exists in lats_product_variants
      const { data: variant, error: variantError } = await supabase
        .from('lats_product_variants')
        .select('id, quantity, is_parent, variant_type, parent_variant_id, is_active')
        .eq('id', variantId)
        .maybeSingle();

      // Check if variant exists in inventory_items (legacy serial number devices)
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('id, status, product_id, variant_id')
        .eq('id', variantId)
        .maybeSingle();

      // If neither found, return error
      if (!variant && !inventoryItem) {
        return {
          available: false,
          availableStock: 0,
          error: 'Variant not found'
        };
      }

      // Handle inventory items (serial number devices)
      if (inventoryItem && !variant) {
        if (inventoryItem.status !== 'available') {
          return {
            available: false,
            availableStock: 0,
            error: `Item is not available for sale (status: ${inventoryItem.status})`
          };
        }
        // Inventory items are single units
        if (requestedQuantity > 1) {
          return {
            available: false,
            availableStock: 1,
            error: 'Serial number devices can only be sold one at a time'
          };
        }
        return {
          available: true,
          availableStock: 1
        };
      }

      // Handle regular variants
      if (!variant) {
        return {
          available: false,
          availableStock: 0,
          error: 'Variant not found'
        };
      }

      // Check if variant is active
      if (variant.is_active === false) {
        return {
          available: false,
          availableStock: 0,
          error: 'Variant is not active'
        };
      }

      // For parent variants, calculate stock from children
      let availableStock = variant.quantity || 0;
      if (variant.is_parent || variant.variant_type === 'parent') {
        const { data: children } = await supabase
          .from('lats_product_variants')
          .select('quantity')
          .eq('parent_variant_id', variantId)
          .eq('is_active', true);
        
        availableStock = children?.reduce((sum, child) => sum + (child.quantity || 0), 0) || 0;
      }

      // Check if requested quantity is available
      if (availableStock < requestedQuantity) {
        return {
          available: false,
          availableStock,
          error: `Insufficient stock. Available: ${availableStock}, Requested: ${requestedQuantity}`
        };
      }

      return {
        available: true,
        availableStock
      };
    } catch (error) {
      console.error('❌ Error checking stock availability:', error);
      return {
        available: false,
        availableStock: 0,
        error: error instanceof Error ? error.message : 'Failed to check stock availability'
      };
    }
  }

  // Process a complete sale with all necessary operations
  async processSale(saleData: Omit<SaleData, 'id' | 'saleNumber' | 'createdAt'>): Promise<ProcessSaleResult> {
    try {
      console.log('🔄 Processing sale...', { itemCount: saleData.items.length, total: saleData.total });
      console.log('🔍 Sale data received:', JSON.stringify(saleData, null, 2));

      // Check authentication using the helper method
      console.log('🔐 Checking authentication before processing sale...');
      const authResult = await this.ensureAuthentication();
      
      if (!authResult.success) {
        console.error('❌ Authentication failed:', authResult.error);
        return { 
          success: false, 
          error: authResult.error || 'Authentication required. Please log in to process sales.' 
        };
      }
      
      console.log('✅ User authenticated:', authResult.user?.email);

      // Validate customer information - customer selection is optional (walk-in customers allowed)
      // In production, we allow null customerId for walk-in customers
      const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD;
      if (!saleData.customerId) {
        console.warn('⚠️ No customer selected - processing as walk-in customer');
        // Allow walk-in customers - customerId can be null
        // The database schema should allow null customer_id for walk-in sales
      }

      // 1. Combined stock validation and cost calculation (ultra-optimized)
      const { stockValidation, itemsWithCosts } = await this.validateStockAndCalculateCosts(saleData.items);

      if (!stockValidation.success) {
        return { success: false, error: stockValidation.error };
      }
      
      // 3. Save sale to database
      const saleResult = await this.saveSaleToDatabase({
        ...saleData,
        items: itemsWithCosts
      });

      if (!saleResult.success) {
        return { success: false, error: saleResult.error };
      }

      // 4. Run post-sale operations in parallel (non-critical for transaction completion)
      const [inventoryResult, receiptResult, customerResult, serialNumbersResult] = await Promise.allSettled([
        this.updateInventory(saleData.items, saleResult.saleId),
        this.generateReceipt(saleResult.sale!),
        this.updateCustomerStats(saleData),
        this.linkSerialNumbers(saleResult.saleId!, saleData.items, saleData.customerId)
      ]);

      // Handle inventory update result
      if (inventoryResult.status === 'rejected') {
        console.warn('⚠️ Sale saved but inventory update failed:', inventoryResult.reason);
      } else if (!inventoryResult.value.success) {
        console.warn('⚠️ Sale saved but inventory update failed:', inventoryResult.value.error);
      }

      // Handle receipt generation result
      if (receiptResult.status === 'rejected') {
        console.warn('⚠️ Receipt generation failed:', receiptResult.reason);
      } else if (!receiptResult.value.success) {
        console.warn('⚠️ Receipt generation failed:', receiptResult.value.error);
      }

      // Handle customer update result
      if (customerResult.status === 'rejected') {
        console.warn('⚠️ Customer stats update failed:', customerResult.reason);
      } else if (!customerResult.value.success) {
        console.warn('⚠️ Customer stats update failed:', customerResult.value.error);
      }

      // Handle serial numbers linking result
      if (serialNumbersResult.status === 'rejected') {
        console.warn('⚠️ Serial numbers linking failed:', serialNumbersResult.reason);
      } else if (!serialNumbersResult.value.success) {
        console.warn('⚠️ Serial numbers linking failed:', serialNumbersResult.value.error);
      }

      // 5. Send notifications asynchronously (don't wait for completion)
      this.sendNotifications(saleResult.sale!).catch(error => {
        console.warn('⚠️ Notification sending failed:', error);
      });

      console.log('✅ Sale processed successfully:', saleResult.saleId);
      toast.success('Sale completed successfully!');

      // Emit sale completion event for real-time updates
      emitSaleCompleted(saleResult.sale);

      return {
        success: true,
        saleId: saleResult.saleId,
        sale: saleResult.sale
      };

    } catch (error) {
      console.error('❌ Error processing sale:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Combined stock validation and cost calculation (ultra-optimized single query)
  private async validateStockAndCalculateCosts(items: SaleItem[]): Promise<{
    stockValidation: { success: boolean; error?: string };
    itemsWithCosts: SaleItem[];
  }> {
    try {
      const variantIds = items.map(item => item.variantId);
      
      // ✅ Handle empty items array
      if (variantIds.length === 0) {
        return {
          stockValidation: { success: true },
          itemsWithCosts: []
        };
      }
      
      // ✅ FIX: Query both lats_product_variants AND inventory_items (for serial number devices)
      // Single query to get both quantity and cost_price for all variants
      // Also fetch parent-child relationship fields
      // Note: For sale processing, we need to access variants regardless of branch/is_active
      // since they're already in the cart and may have been added from a different context
      let query = supabase
        .from('lats_product_variants')
        .select('id, quantity, cost_price, is_parent, variant_type, parent_variant_id, is_active, branch_id, is_shared')
        .in('id', variantIds);

      // Try to get current branch for context (but don't filter by it - we need all variants in cart)
      const currentBranchId = typeof localStorage !== 'undefined' ? localStorage.getItem('current_branch_id') : null;
      
      // If branch isolation is enabled, we still need to query variants that might be from other branches
      // but are already in the cart. However, RLS might block them, so we'll try without branch filter first
      const { data: variants, error } = await query;

      // ✅ FIX: Also query inventory_items for serial number devices (legacy items)
      // Query without status filter to check status in validation (better error messages)
      const { data: inventoryItems, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('id, cost_price, status, product_id, variant_id')
        .in('id', variantIds);

      if (error) {
        console.error('❌ Error fetching variant data:', error);
        console.error('❌ Full error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        console.error('❌ Variant IDs requested:', variantIds);
        // Don't return error if inventory_items query succeeds - check both
        if (inventoryError) {
          return {
            stockValidation: { success: false, error: `Failed to check stock and costs: ${error.message}` },
            itemsWithCosts: items.map(item => ({ ...item, costPrice: 0, profit: item.totalPrice }))
          };
        }
      }

      // ✅ FIX: Create maps for both variants and inventory items
      const variantDataMap = new Map(variants?.map(v => [v.id, v]) || []);
      const inventoryItemMap = new Map(inventoryItems?.map(i => [i.id, i]) || []);

      // Validate stock and calculate costs in single pass
      const itemsWithCosts: SaleItem[] = [];
      
      for (const item of items) {
        // Validate variantId format before lookup
        if (!isValidUuid(item.variantId)) {
          console.error('❌ Invalid variant ID format:', {
            variantId: item.variantId,
            productName: item.productName,
            productId: item.productId
          });
          return {
            stockValidation: { 
              success: false, 
              error: `Invalid variant ID format for "${item.productName}": ${item.variantId}. Please remove this item from cart and add it again.` 
            },
            itemsWithCosts: []
          };
        }
        
        const variantData = variantDataMap.get(item.variantId);
        const inventoryItem = inventoryItemMap.get(item.variantId);
        
        // ✅ FIX: Check both variant and inventory item
        if (!variantData && !inventoryItem) {
          // Try to check if variant exists but might be filtered by RLS/branch
          // This helps diagnose the issue
          const { data: variantCheck, error: checkError } = await supabase
            .from('lats_product_variants')
            .select('id, is_active, branch_id, is_shared, variant_type')
            .eq('id', item.variantId)
            .maybeSingle();

          // Also check inventory_items
          const { data: inventoryCheck, error: inventoryCheckError } = await supabase
            .from('inventory_items')
            .select('id, status, product_id, variant_id')
            .eq('id', item.variantId)
            .maybeSingle();

          // Log detailed error for debugging
          console.error('❌ Variant not found during sale processing:', {
            variantId: item.variantId,
            productName: item.productName,
            productId: item.productId,
            requestedVariantIds: variantIds,
            foundVariants: variants?.map(v => v.id) || [],
            foundInventoryItems: inventoryItems?.map(i => i.id) || [],
            variantCheckResult: variantCheck ? 'Found but filtered' : 'Not found',
            inventoryCheckResult: inventoryCheck ? `Found (status: ${inventoryCheck.status})` : 'Not found',
            variantCheckError: checkError?.message,
            inventoryCheckError: inventoryCheckError?.message,
            currentBranchId: currentBranchId
          });

          let errorMessage = `Product variant not found for "${item.productName}" (Variant ID: ${item.variantId}). `;
          
          if (variantCheck) {
            errorMessage += `The variant exists but may be in a different branch (branch_id: ${variantCheck.branch_id}), inactive (is_active: ${variantCheck.is_active}), or filtered by access permissions. `;
            if (currentBranchId && variantCheck.branch_id && variantCheck.branch_id !== currentBranchId && !variantCheck.is_shared) {
              errorMessage += `This variant belongs to a different branch and is not shared. `;
            }
          } else if (inventoryCheck) {
            if (inventoryCheck.status !== 'available') {
              errorMessage += `The inventory item exists but is not available (status: ${inventoryCheck.status}). `;
            } else {
              errorMessage += `The inventory item exists but may be filtered by access permissions. `;
            }
          } else if (checkError || inventoryCheckError) {
            errorMessage += `Database error: ${checkError?.message || inventoryCheckError?.message}. `;
          } else {
            errorMessage += `The variant may have been deleted or does not exist. `;
          }
          
          errorMessage += `Please remove this item from cart and add it again. If the variant was deleted, you may need to select a different variant or product.`;

          // Return error immediately - this will prevent the sale from being processed
          return {
            stockValidation: { 
              success: false, 
              error: errorMessage
            },
            itemsWithCosts: []
          };
        }

        // ✅ FIX: Handle inventory items (serial number devices)
        if (inventoryItem && !variantData) {
          // For inventory items, each item is a single unit (quantity = 1)
          // Check that the item is available
          if (inventoryItem.status !== 'available') {
            return {
              stockValidation: { 
                success: false, 
                error: `Serial number device for ${item.productName} is not available for sale (status: ${inventoryItem.status}). Please select a different device.` 
              },
              itemsWithCosts: []
            };
          }

          // Check quantity - inventory items are individual units, so quantity should be 1
          if (item.quantity > 1) {
            return {
              stockValidation: { 
                success: false, 
                error: `Cannot sell ${item.quantity} units of serial number device ${item.productName}. Each serial number device is a single unit. Please adjust quantity to 1.` 
              },
              itemsWithCosts: []
            };
          }

          // Calculate costs and profits for inventory item
          const costPrice = inventoryItem.cost_price || 0;
          const totalCost = costPrice * item.quantity;
          const profit = item.totalPrice - totalCost;

          itemsWithCosts.push({
            ...item,
            costPrice,
            profit,
            is_legacy: true, // Mark as legacy item for inventory update
            is_imei_child: false
          });
          continue; // Skip to next item
        }
        
        // For parent variants, calculate stock from children
        let availableStock = variantData.quantity;
        if (variantData.is_parent || variantData.variant_type === 'parent') {
          console.warn('⚠️ Attempting to sell parent variant - stock calculated from children');
          const { data: children } = await supabase
            .from('lats_product_variants')
            .select('quantity')
            .eq('parent_variant_id', item.variantId)
            .eq('is_active', true);
          
          availableStock = children?.reduce((sum, child) => sum + (child.quantity || 0), 0) || 0;
        }
        
        if (availableStock < item.quantity) {
          return {
            stockValidation: { 
              success: false, 
              error: `Insufficient stock for ${item.productName} (${item.variantName}). Available: ${availableStock}, Requested: ${item.quantity}` 
            },
            itemsWithCosts: []
          };
        }

        // Calculate costs and profits
        const costPrice = variantData.cost_price || 0;
        const totalCost = costPrice * item.quantity;
        const profit = item.totalPrice - totalCost;

        itemsWithCosts.push({
          ...item,
          costPrice,
          profit,
          is_legacy: false,
          is_imei_child: variantData.variant_type === 'imei_child'
        });
      }

      return {
        stockValidation: { success: true },
        itemsWithCosts
      };
    } catch (error) {
      console.error('❌ Error in combined validation and calculation:', error);
      console.error('❌ Exception details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      return {
        stockValidation: { success: false, error: `Failed to validate stock and calculate costs: ${error instanceof Error ? error.message : 'Unknown error'}` },
        itemsWithCosts: items.map(item => ({ ...item, costPrice: 0, profit: item.totalPrice }))
      };
    }
  }

  // Validate stock availability for all items (optimized with single query)
  private async validateStock(items: SaleItem[]): Promise<{ success: boolean; error?: string }> {
    try {
      const variantIds = items.map(item => item.variantId);
      
      // ✅ Handle empty items array
      if (variantIds.length === 0) {
        return { success: true };
      }
      
      // Single query to get all variant quantities
      const { data: variants, error } = await supabase
        .from('lats_product_variants')
        .select('id, quantity')
        .in('id', variantIds);

      if (error) {
        console.error('❌ Error checking stock for variants:', error);
        return { success: false, error: 'Failed to check stock availability' };
      }

      // Create a map for quick lookup
      const variantStockMap = new Map(variants?.map(v => [v.id, v.quantity]) || []);

      // Check stock for each item
      for (const item of items) {
        // Validate variantId format before lookup
        if (!isValidUuid(item.variantId)) {
          console.error('❌ Invalid variant ID format in stock validation:', {
            variantId: item.variantId,
            productName: item.productName
          });
          return { 
            success: false, 
            error: `Invalid variant ID format for "${item.productName}": ${item.variantId}. Please remove this item from cart and add it again.` 
          };
        }
        
        const availableStock = variantStockMap.get(item.variantId);
        
        if (availableStock === undefined) {
          console.error('❌ Variant not found in stock validation:', {
            variantId: item.variantId,
            productName: item.productName,
            requestedVariantIds: variantIds,
            foundVariants: variants?.map(v => v.id) || []
          });
          return { 
            success: false, 
            error: `Product variant not found for "${item.productName}" (Variant ID: ${item.variantId}). The variant may have been deleted or is invalid. Please remove this item from cart and add it again.` 
          };
        }
        
        if (availableStock < item.quantity) {
          return {
            success: false,
            error: `Insufficient stock for ${item.productName} (${item.variantName}). Available: ${availableStock}, Requested: ${item.quantity}`
          };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error validating stock:', error);
      return { success: false, error: 'Failed to validate stock availability' };
    }
  }

  // Calculate costs and profits for all items (optimized with single query)
  private async calculateCostsAndProfits(items: SaleItem[]): Promise<SaleItem[]> {
    try {
      const variantIds = items.map(item => item.variantId);
      
      // ✅ Handle empty items array
      if (variantIds.length === 0) {
        return [];
      }
      
      // Single query to get all cost prices
      const { data: variants, error } = await supabase
        .from('lats_product_variants')
        .select('id, cost_price')
        .in('id', variantIds);

      if (error) {
        console.warn('⚠️ Could not get cost prices for variants:', error);
        // Return items with default costs if query fails
        return items.map(item => ({
          ...item,
          unitPrice: item.quantity > 0 ? item.totalPrice / item.quantity : 0,
          costPrice: 0,
          profit: item.totalPrice
        }));
      }

      // Create a map for quick lookup
      const costPriceMap = new Map(variants?.map(v => [v.id, v.cost_price || 0]) || []);

      // Calculate costs and profits for each item
      const itemsWithCosts = items.map(item => {
        const costPrice = costPriceMap.get(item.variantId) || 0;
        const totalCost = costPrice * item.quantity;
        const profit = item.totalPrice - totalCost;
        const unitPrice = item.quantity > 0 ? item.totalPrice / item.quantity : 0;

        return {
          ...item,
          unitPrice,
          costPrice,
          profit
        };
      });

      return itemsWithCosts;
    } catch (error) {
      console.error('❌ Error calculating costs:', error);
      // Return items with default costs if calculation fails
      return items.map(item => ({
        ...item,
        unitPrice: item.quantity > 0 ? item.totalPrice / item.quantity : 0,
        costPrice: 0,
        profit: item.totalPrice
      }));
    }
  }

  // Save sale to database
  private async saveSaleToDatabase(saleData: SaleData): Promise<{ success: boolean; saleId?: string; sale?: SaleData; error?: string }> {
    try {
      // Validate environment in production
      const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD;
      if (isProduction) {
        const dbUrl = import.meta.env.VITE_DATABASE_URL;
        if (!dbUrl) {
          console.error('❌ PRODUCTION ERROR: VITE_DATABASE_URL is not configured!');
          return {
            success: false,
            error: 'Database configuration error. Please contact your administrator.'
          };
        }
        console.log('✅ Production environment detected. Database URL configured.');
      }
      
      // Generate sale number
      const saleNumber = this.generateSaleNumber();

      // Check authentication using the helper method
      console.log('🔐 Checking authentication before sale insert...');
      const authResult = await this.ensureAuthentication();
      
      if (!authResult.success) {
        console.error('❌ Authentication failed:', authResult.error);
        
        // Enhanced error for production
        if (isProduction) {
          console.error('🚨 PRODUCTION AUTH ERROR:');
          console.error('   User authentication failed in production environment.');
          console.error('   This may indicate session expiration or authentication service issue.');
        }
        
        return { 
          success: false, 
          error: authResult.error || 'Authentication required. Please log in to process sales.' 
        };
      }

      console.log('✅ User authenticated:', authResult.user?.email);
      const soldBy = authResult.user?.email || 'system';
      
      // Get user name from user metadata or email
      const cashierName = authResult.user?.user_metadata?.name || 
                         authResult.user?.user_metadata?.full_name || 
                         authResult.user?.email?.split('@')[0] || 
                         'System User';

      // Create sale record - matching exact database structure
      // Ensure paymentMethod.amount matches total to avoid constraint violations
      const paymentMethodData = {
        ...saleData.paymentMethod,
        amount: saleData.total // Fix: Use total amount instead of potentially 0 value
      };

      // Ensure all numeric fields are numbers, not strings
      const subtotal = typeof saleData.subtotal === 'string' ? parseFloat(saleData.subtotal) : saleData.subtotal;
      const discount = typeof saleData.discount === 'string' ? parseFloat(saleData.discount) : saleData.discount;
      const tax = typeof saleData.tax === 'string' ? parseFloat(saleData.tax) : saleData.tax;

      // ⚠️ CRITICAL: Validate sale amounts to prevent overflow
      const MAX_SALE_AMOUNT = 1000000000; // 1 billion - max reasonable sale amount
      const MIN_SALE_AMOUNT = 0;

      // Validate total amount
      if (saleData.total < MIN_SALE_AMOUNT || saleData.total > MAX_SALE_AMOUNT) {
        console.error('❌ Invalid sale amount:', saleData.total);
        return { 
          success: false, 
          error: `Invalid sale amount: ${saleData.total}. Must be between ${MIN_SALE_AMOUNT} and ${MAX_SALE_AMOUNT}` 
        };
      }

      // Validate total is a safe number for JavaScript
      if (!Number.isSafeInteger(Math.round(saleData.total * 100))) {
        console.error('❌ Sale amount exceeds JavaScript safe integer:', saleData.total);
        return { 
          success: false, 
          error: `Sale amount is too large: ${saleData.total}` 
        };
      }

      // Additional validation for subtotal
      if (subtotal !== undefined && (subtotal < MIN_SALE_AMOUNT || subtotal > MAX_SALE_AMOUNT)) {
        console.error('❌ Invalid subtotal:', subtotal);
        return { 
          success: false, 
          error: `Invalid subtotal: ${subtotal}` 
        };
      }

      // 🔒 Get current branch for sale assignment
      const currentBranchId = typeof localStorage !== 'undefined' ? localStorage.getItem('current_branch_id') : null;
      console.log('🏪 [saveSale] Assigning sale to branch:', currentBranchId);
      
      // Warn if branch_id is missing in production (but don't fail - some setups may not use branches)
      if (isProduction && !currentBranchId) {
        console.warn('⚠️ PRODUCTION WARNING: No branch_id found in localStorage. Sale will be created without branch assignment.');
        console.warn('   If your database requires branch_id, this may cause a foreign key constraint error.');
      }

      // Properly format payment_method for JSONB column
      // Ensure it's a valid object and will be properly handled by Supabase
      const paymentMethodFormatted = JSON.parse(JSON.stringify(paymentMethodData));

      const saleInsertData = {
        sale_number: saleNumber,
        customer_id: saleData.customerId || null, // Customer ID is optional (null for walk-in customers)
        total_amount: saleData.total,
        payment_method: paymentMethodFormatted, // JSONB column - Supabase handles the conversion
        payment_status: saleData.paymentStatus || 'completed',
        sold_by: soldBy,
        branch_id: currentBranchId,  // 🔒 Assign to current branch
        // Add optional columns if they exist (ensure numeric types)
        ...(subtotal !== undefined && !isNaN(subtotal) && { subtotal }),
        ...(discount !== undefined && !isNaN(discount) && { discount }),
        ...(saleData.customerName && { customer_name: saleData.customerName }),
        ...(saleData.customerPhone && { customer_phone: saleData.customerPhone }),
        ...(saleData.customerEmail && { customer_email: saleData.customerEmail }),
        ...(tax !== undefined && !isNaN(tax) && { tax }),
        ...(saleData.notes && { notes: saleData.notes })
      };

      console.log('🔍 Sale insert data:', JSON.stringify(saleInsertData, null, 2));

      let sale: any;
      let saleError: any;

      const { data: saleData1, error: saleError1 } = await supabase
        .from('lats_sales')
        .insert([saleInsertData])
        .select()
        .single();

      if (saleError1) {
        // Enhanced error logging for production debugging
        const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD;
        const errorCode = saleError1.code || '';
        const errorMessage = saleError1.message || '';
        const errorDetails = saleError1.details || '';
        const errorHint = saleError1.hint || '';
        
        console.error('❌ Error creating sale with full data:', saleError1);
        console.error('❌ Sale insert data that failed:', JSON.stringify(saleInsertData, null, 2));
        console.error('❌ Full error details:', {
          message: errorMessage,
          details: errorDetails,
          hint: errorHint,
          code: errorCode
        });
        
        // Production-specific diagnostics
        if (isProduction) {
          console.error('🔍 PRODUCTION DIAGNOSTICS:');
          console.error('   Environment:', import.meta.env.MODE);
          console.error('   Database URL configured:', !!import.meta.env.VITE_DATABASE_URL);
          console.error('   User authenticated:', !!authResult.user);
          console.error('   User email:', authResult.user?.email);
          console.error('   Branch ID:', currentBranchId);
          console.error('   Customer ID:', saleData.customerId);
          
          // Check for common production issues
          if (errorCode === '42501' || errorMessage.includes('permission denied') || errorMessage.includes('row-level security')) {
            console.error('🚨 RLS POLICY ISSUE DETECTED:');
            console.error('   The database Row Level Security (RLS) policy is blocking the insert.');
            console.error('   Solution: Check RLS policies on lats_sales table in production database.');
            console.error('   Run: SELECT * FROM pg_policies WHERE tablename = \'lats_sales\';');
          }
          
          if (errorCode === '23503' || errorMessage.includes('foreign key')) {
            console.error('🚨 FOREIGN KEY CONSTRAINT ISSUE:');
            console.error('   A referenced record (customer_id, branch_id, etc.) does not exist.');
            console.error('   Check if customer_id exists:', saleData.customerId || '(null - walk-in customer)');
            console.error('   Check if branch_id exists:', currentBranchId || '(null - no branch assigned)');
            if (!currentBranchId) {
              console.error('   💡 TIP: If branch_id is required, ensure a branch is selected before creating sales.');
            }
            if (!saleData.customerId) {
              console.error('   💡 TIP: This is a walk-in customer (customer_id is null). Ensure your database allows null customer_id.');
            }
          }
          
          if (errorCode === '23505' || errorMessage.includes('unique constraint')) {
            console.error('🚨 UNIQUE CONSTRAINT ISSUE:');
            console.error('   Sale number already exists:', saleNumber);
            console.error('   This should not happen - sale number generation may have collision.');
          }
          
          if (errorMessage.includes('connection') || errorMessage.includes('timeout') || errorMessage.includes('network')) {
            console.error('🚨 DATABASE CONNECTION ISSUE:');
            console.error('   Cannot connect to database in production.');
            console.error('   Check VITE_DATABASE_URL environment variable.');
            console.error('   Verify database is accessible from production server.');
          }
        }

        // Try with reduced data - essential fields only
        console.log('🔄 Trying with reduced field set...');
        const reducedData = {
          sale_number: saleNumber,
          customer_id: saleData.customerId || null, // Allow null for walk-in customers
          total_amount: saleData.total,
          payment_method: paymentMethodFormatted, // JSONB column - Supabase handles the conversion
          payment_status: saleData.paymentStatus || 'completed',
          sold_by: soldBy,
          branch_id: currentBranchId,  // 🔒 Assign to current branch
          ...(subtotal !== undefined && !isNaN(subtotal) && { subtotal }),
          ...(discount !== undefined && !isNaN(discount) && { discount }),
          ...(tax !== undefined && !isNaN(tax) && { tax }),
          ...(saleData.customerName && { customer_name: saleData.customerName }),
          ...(saleData.customerPhone && { customer_phone: saleData.customerPhone }),
          ...(saleData.customerEmail && { customer_email: saleData.customerEmail })
        };

        console.log('🔍 Reduced sale insert data:', JSON.stringify(reducedData, null, 2));

        const { data: fallbackSale, error: fallbackError } = await supabase
          .from('lats_sales')
          .insert([reducedData])
          .select()
          .single();

        if (fallbackError) {
          console.error('❌ Fallback insert also failed:', fallbackError);
          
          // Enhanced error message for production
          let userFriendlyError = `Failed to create sale: ${errorMessage}`;
          if (isProduction) {
            if (errorCode === '42501' || errorMessage.includes('permission denied') || errorMessage.includes('row-level security')) {
              userFriendlyError = 'Sale creation failed due to database permissions. Please contact your administrator to check Row Level Security policies.';
            } else if (errorCode === '23503' || errorMessage.includes('foreign key')) {
              userFriendlyError = 'Sale creation failed: Invalid customer or branch reference. Please refresh the page and try again.';
            } else if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
              userFriendlyError = 'Sale creation failed: Database connection error. Please check your internet connection and try again.';
            } else {
              userFriendlyError = `Sale creation failed: ${errorMessage}. Error code: ${errorCode || 'unknown'}`;
            }
          }
          
          return { 
            success: false, 
            error: userFriendlyError,
            // Include technical details for debugging (only in development)
            ...(isProduction ? {} : { 
              technicalError: `Full error: ${saleError1.message}. Fallback also failed: ${fallbackError.message}`,
              errorCode,
              errorDetails,
              errorHint
            })
          };
        }

        console.log('✅ Fallback insert succeeded');
        sale = fallbackSale;
        saleError = null;
      } else {
        sale = saleData1;
        saleError = null;
      }

      // Create sale items - matching exact database structure
      const saleItems = saleData.items.map(item => {
        // Validate UUIDs
        if (!isValidUuid(item.productId)) {
          console.error('❌ Invalid product_id UUID:', item.productId);
        }
        if (!isValidUuid(item.variantId)) {
          console.error('❌ Invalid variant_id UUID:', item.variantId);
        }
        
        // Debug pricing values
        console.log('🔍 Item pricing debug:', {
          productId: item.productId,
          variantId: item.variantId,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          costPrice: item.costPrice,
          profit: item.profit
        });
        
        // Ensure all prices are numbers, not strings
        const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : (item.unitPrice || 0);
        const totalPrice = typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) : (item.totalPrice || 0);
        const costPrice = typeof item.costPrice === 'string' ? parseFloat(item.costPrice) : (item.costPrice || 0);
        const profit = typeof item.profit === 'string' ? parseFloat(item.profit) : (item.profit || 0);

        return {
          sale_id: sale.id,
          product_id: item.productId,
          variant_id: item.variantId,
          product_name: item.productName,
          variant_name: item.variantName,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: unitPrice, // Ensure numeric
          total_price: totalPrice, // Ensure numeric
          cost_price: costPrice, // Ensure numeric
          profit: profit // Ensure numeric
        };
      });

      console.log('🔍 Inserting sale items:', saleItems);

      const { error: itemsError } = await supabase
        .from('lats_sale_items')
        .insert(saleItems);

      if (itemsError) {
        const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD;
        const errorCode = itemsError.code || '';
        const errorMessage = itemsError.message || '';
        
        console.error('❌ Error creating sale items:', itemsError);
        console.error('❌ Full error details:', {
          message: errorMessage,
          details: itemsError.details,
          hint: itemsError.hint,
          code: errorCode
        });
        console.error('❌ Sale items data:', saleItems);
        console.error('❌ Sale ID:', sale.id);
        
        // Production-specific diagnostics for sale items
        if (isProduction) {
          console.error('🚨 PRODUCTION SALE ITEMS ERROR:');
          if (errorCode === '42501' || errorMessage.includes('permission denied') || errorMessage.includes('row-level security')) {
            console.error('   RLS policy blocking sale items insert.');
            console.error('   Check RLS policies on lats_sale_items table.');
          }
          if (errorCode === '23503' || errorMessage.includes('foreign key')) {
            console.error('   Foreign key constraint violation.');
            console.error('   Verify sale_id, product_id, and variant_id exist.');
          }
        }
        
        let userFriendlyError = `Sale created but items failed: ${errorMessage}`;
        if (isProduction && errorCode === '42501') {
          userFriendlyError = 'Sale was created but items could not be saved due to database permissions. Please contact your administrator.';
        }
        
        return { 
          success: false, 
          error: userFriendlyError,
          saleId: sale.id // Return sale ID even though items failed
        };
      }

      // Mirror POS payments into payment_transactions table (NEW - leverages triggers)
      // The AUTO-SYNC-PAYMENT-TRANSACTIONS.sql triggers automatically create payment_transactions
      // This code block is kept for backward compatibility but is now optional
      try {
        const multiPayments = (saleData as any)?.paymentMethod?.details?.payments;
        const payments: Array<{
          method?: string;
          amount: number;
          accountId?: string;
          reference?: string;
          notes?: string;
          timestamp?: string;
        }> = Array.isArray(multiPayments)
          ? multiPayments
          : [{
              method: (saleData as any)?.paymentMethod?.type,
              amount: (saleData as any)?.paymentMethod?.amount ?? saleData.total,
              accountId: (saleData as any)?.paymentMethod?.details?.accountId,
              reference: (saleData as any)?.paymentMethod?.details?.reference,
              notes: (saleData as any)?.notes,
              timestamp: (saleData as any)?.soldAt
            }];

        console.log('💳 Processing payment mirroring for', payments.length, 'payment(s)');

        for (const p of payments) {
          if (!p?.amount || p.amount <= 0) {
            console.log('⏭️ Skipping payment with invalid amount:', p?.amount);
            continue;
          }

          // Skip customer_payments mirroring - rely on triggers instead
          console.log(`ℹ️  Payment ${p.method} - ${p.amount} will be auto-synced by database triggers`);

          // Update finance accounts and account transactions if accountId is provided
          if (p.accountId) {
            try {
              console.log('💰 Updating finance account:', p.accountId);

              // Use balance before storage/update with utility function
              const { balance: originalBalance, accountData: acct, isValid } = await getAccountBalanceBeforeStorage(p.accountId);

              if (!isValid || !acct) {
                console.warn('⚠️ Failed to fetch finance account balance before storage');
                continue; // Skip this payment's account updates
              }

              if (typeof originalBalance === 'number') {
                // Example: Log or use the original balance before modification
                console.log(`Account ${p.accountId} original balance before transaction: ${originalBalance}`);

                // Validate balance before transaction
                const validation = validateBalanceBeforeTransaction(originalBalance, p.amount, p.amount > 0 ? 'payment' : 'expense');

                // You can use originalBalance here for any calculations or logic before the update
                // For example: validation, logging, notifications, etc.
                if (!validation.isValid && validation.warning) {
                  console.warn(`⚠️ ${validation.warning}`);
                }

                // Note: For sales/payments received, we add to balance (income)
                // For expenses/payments made, we subtract from balance (outcome)
                // But we ensure balance never goes negative
                const newBalance = validation.newBalance;
                const { error: updErr } = await supabase
                  .from('finance_accounts')
                  .update({ balance: newBalance, updated_at: new Date().toISOString() })
                  .eq('id', p.accountId);
                
                if (updErr) {
                  console.warn('⚠️ Failed updating finance account balance:', updErr.message);
                } else {
                  console.log(`✅ Finance account ${p.accountId} balance updated: ${acct.balance} + ${p.amount} = ${newBalance}`);
                }
              }
            } catch (faError) {
              console.warn('⚠️ finance_accounts error:', faError instanceof Error ? faError.message : 'Unknown error');
            }

            try {
              console.log('📝 Recording account transaction for account:', p.accountId);

              // Get account branch_id for transaction isolation
              const { data: accountData } = await supabase
                .from('finance_accounts')
                .select('branch_id')
                .eq('id', p.accountId)
                .single();

              const { error: atErr } = await supabase
                .from('account_transactions')
                .insert({
                  account_id: p.accountId,
                  transaction_type: 'payment_received',
                  amount: p.amount,
                  reference_number: saleNumber,
                  description: `POS sale payment (${p.method || 'payment'})`,
                  branch_id: accountData?.branch_id, // Assign branch_id from account for isolation
                  metadata: { sale_id: sale.id, customer_id: saleData.customerId },
                  created_at: new Date().toISOString()
                });

              if (atErr) {
                console.warn('⚠️ account_transactions insert failed:', atErr.message);
              } else {
                console.log(`✅ Transaction recorded for account ${p.accountId}: +${p.amount}`);
              }
            } catch (atError) {
              console.warn('⚠️ account_transactions error:', atError instanceof Error ? atError.message : 'Unknown error');
            }
          }
        }
        
        console.log('✅ Payment mirroring completed (triggers will handle payment_transactions sync)');
      } catch (mirrorErr: any) {
        // Enhanced error logging
        const errorMessage = mirrorErr instanceof Error ? mirrorErr.message : String(mirrorErr);
        const errorStack = mirrorErr instanceof Error ? mirrorErr.stack : undefined;
        
        console.error('❌ Payment mirroring failed:', {
          errorType: typeof mirrorErr,
          errorName: mirrorErr?.name,
          message: errorMessage,
          details: mirrorErr?.details,
          hint: mirrorErr?.hint,
          code: mirrorErr?.code,
          stack: errorStack
        });
        
        // Don't throw - payment mirroring is optional (triggers handle it)
        console.log('ℹ️  Sale completed successfully despite payment mirroring error (database triggers will sync payments)');
      }

      // Create complete sale object
      const completeSale: SaleData = {
        ...saleData,
        id: sale.id,
        saleNumber,
        soldBy,
        createdAt: sale.created_at
      };

      console.log('✅ Sale saved to database:', sale.id);
      return { success: true, saleId: sale.id, sale: completeSale };

    } catch (error) {
      console.error('❌ Error saving sale to database:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        fullError: error
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save sale to database' 
      };
    }
  }

  // Update customer statistics after sale
  private async updateCustomerStats(saleData: SaleData): Promise<{ success: boolean; error?: string }> {
    try {
      // Authentication check is optional for this operation
      console.log('📊 Updating customer stats (auth optional)...');

      // Only update if customer ID is provided
      if (!saleData.customerId) {
        console.log('ℹ️ No customer ID provided, skipping customer stats update');
        return { success: true };
      }

      console.log('🔄 Updating customer stats for customer:', saleData.customerId);

      // Calculate points earned (1 point per 1000 TZS)
      const pointsEarned = Math.floor(saleData.total / 1000);

      // Try to update customer stats with flexible schema
      try {
        // Build update object with only fields that might exist
        const updateData: any = {
          last_visit: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Try to get current stats to calculate increments
        const { data: customer } = await supabase
          .from('lats_customers')
          .select('*')
          .eq('id', saleData.customerId)
          .single();

        if (customer) {
          // Import parseAmount from format utility for consistent type handling
          const { parseAmount } = await import('../features/lats/lib/format');
          
          // Add fields that exist in the customer record with safe numeric parsing
          if ('total_spent' in customer) {
            const currentTotal = parseAmount(customer.total_spent);
            const saleTotal = parseAmount(saleData.total);
            const newTotal = currentTotal + saleTotal;
            
            // Validate the new total is within reasonable bounds
            const MAX_REALISTIC_TOTAL = 1_000_000_000_000; // 1 trillion
            if (newTotal > MAX_REALISTIC_TOTAL) {
              console.error(`❌ New total ${newTotal} exceeds maximum realistic amount`);
              return { success: false, error: 'Customer total would exceed realistic limit' };
            }
            
            updateData.total_spent = Math.max(0, newTotal); // Ensure non-negative
            console.log(`💰 Updating total_spent: ${currentTotal} + ${saleTotal} = ${newTotal}`);
          }
          if ('total_orders' in customer) {
            const currentOrders = parseAmount(customer.total_orders);
            updateData.total_orders = currentOrders + 1;
          }
          if ('points' in customer) {
            const currentPoints = parseAmount(customer.points);
            updateData.points = currentPoints + pointsEarned;
          }
        }

        // Update customer record (use lats_customers directly to avoid VIEW issues)
        const { error: updateError } = await supabase
          .from('lats_customers')
          .update(updateData)
          .eq('id', saleData.customerId);

        if (updateError) {
          console.warn('⚠️ Could not update customer stats:', updateError.message);
          // Don't fail - customer stats are optional
          return { success: true };
        }
      } catch (err) {
        console.warn('⚠️ Customer stats update skipped:', err);
        // Don't fail - customer stats are optional
        return { success: true };
      }

      console.log('✅ Customer stats updated successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Error updating customer stats:', error);
      return { success: false, error: 'Failed to update customer stats' };
    }
  }

  // Update inventory after sale (optimized with batched operations)
  private async updateInventory(items: SaleItem[], saleId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user ID for tracking (optional)
      let userId = 'system';
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || 'system';
      } catch {
        // Use system if auth fails
        userId = 'system';
      }

      const normalizedUserId = isValidUuid(userId) ? userId : null;
      if (!normalizedUserId && userId !== 'system') {
        console.warn('⚠️ Invalid user ID for stock movement logging, defaulting to null:', userId);
      }
      
      // First, get current quantities for all variants
      const variantIds = items.map(item => item.variantId);
      
      // ✅ Handle empty items array
      if (variantIds.length === 0) {
        console.log('ℹ️ No variants to restore stock for');
        return { success: true };
      }
      
      const { data: currentVariants, error: fetchError } = await supabase
        .from('lats_product_variants')
        .select('id, quantity, is_parent, variant_type')
        .in('id', variantIds);
      
      if (fetchError) {
        throw new Error(`Failed to fetch current stock: ${fetchError.message}`);
      }

      // Create a map for quick lookup
      const currentStockMap = new Map(currentVariants.map(v => [v.id, v]));

      // Batch inventory updates and stock movements in parallel
      const updatePromises = items.map(async item => {
        const variantData = currentStockMap.get(item.variantId);
        
        // ✅ FIX: Check if this is a legacy item (inventory_items)
        // Legacy items are identified by not being in lats_product_variants
        if (!variantData) {
          // Try to find in inventory_items
          const { data: inventoryItem, error: inventoryError } = await supabase
            .from('inventory_items')
            .select('id, status, variant_id, product_id, metadata')
            .eq('id', item.variantId)
            .single();

          if (inventoryItem) {
            // ✅ FIX: Mark legacy item as sold
            // Note: inventory_items table doesn't have sold_at column, so we store it in metadata
            const updatedMetadata = {
              ...(inventoryItem.metadata || {}),
              sold_at: new Date().toISOString(),
              ...(saleId ? { sale_id: saleId } : {}),
            };

            const { error: updateError } = await supabase
              .from('inventory_items')
              .update({
                status: 'sold',
                metadata: updatedMetadata,
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.variantId);

            if (updateError) {
              console.error('Error updating legacy inventory item:', updateError);
              throw updateError;
            }

            // Create stock movement for legacy item
            // ✅ FIX: Verify variant_id exists in lats_product_variants before using it
            // For legacy items, variant_id might not exist in lats_product_variants
            let validVariantId = null;
            if (inventoryItem.variant_id) {
              // Check if variant exists in lats_product_variants
              const { data: variantCheck } = await supabase
                .from('lats_product_variants')
                .select('id')
                .eq('id', inventoryItem.variant_id)
                .maybeSingle();
              
              validVariantId = variantCheck ? inventoryItem.variant_id : null;
            }

            const { error: movementError } = await supabase
              .from('lats_stock_movements')
              .insert({
                product_id: inventoryItem.product_id || null,
                variant_id: validVariantId, // NULL if variant doesn't exist in lats_product_variants
                movement_type: 'sale',
                quantity: -item.quantity,
                reference_type: 'pos_sale',
                reference_id: saleId || null,
                notes: `Sold ${item.quantity} units of legacy item ${item.productName}`,
                created_at: new Date().toISOString(),
              });

            if (movementError) {
              console.warn('Failed to create stock movement for legacy item:', movementError);
            }

            return { success: true };
          }

          throw new Error(`Item ${item.variantId} not found in variants or inventory_items`);
        }

        const currentQuantity = variantData?.quantity || 0;
        const newQuantity = Math.max(0, currentQuantity - item.quantity);
        
        // Warn if updating parent variant (should update children instead)
        if (variantData?.is_parent || variantData?.variant_type === 'parent') {
          console.warn(`⚠️ Updating stock for parent variant ${item.variantId}. Consider selling specific child variants (IMEI children) instead.`);
        }
        
        // ✅ FIX: Handle IMEI children and legacy items the same way
        // If it's an IMEI child or legacy item, mark as sold using markIMEIAsSold
        if (variantData?.variant_type === 'imei_child' || item.is_legacy || item.is_imei_child) {
          const { markIMEIAsSold } = await import('../features/lats/lib/imeiVariantService');
          return markIMEIAsSold(item.variantId, saleId);
        }
        
        // Update with calculated quantity for regular variants
        // Note: Database triggers will auto-update parent stock when children are updated
        return supabase
          .from('lats_product_variants')
          .update({ 
            quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.variantId);
      });

      // Prepare all stock movement records for batch insert
      // ✅ FIX: Only include variants that exist in lats_product_variants
      // Legacy items (inventory_items) should have variant_id set to NULL
      const stockMovements = items
        .filter(item => {
          // Skip legacy items - they're handled separately above
          // Only include items that have a valid variant in lats_product_variants
          const variantData = currentStockMap.get(item.variantId);
          return variantData !== undefined;
        })
        .map(item => {
          const variantData = currentStockMap.get(item.variantId);
          const currentQuantity = variantData?.quantity || 0;
          const newQuantity = Math.max(0, currentQuantity - item.quantity);
          
          return {
            product_id: item.productId,
            variant_id: item.variantId, // This is guaranteed to exist in lats_product_variants
            movement_type: 'out',
            quantity: item.quantity,
            previous_quantity: currentQuantity,
            new_quantity: newQuantity,
            reason: 'Sale',
            reference: `Sale ${item.sku}`,
            notes: `Sold ${item.quantity} units of ${item.productName} (${item.variantName})`,
            created_by: normalizedUserId
          };
        });

      // Execute inventory updates in parallel (now handles async legacy items)
      const updateResults = await Promise.allSettled(updatePromises.map(p => Promise.resolve(p)));
      
      // Check if any inventory updates failed
      for (let i = 0; i < updateResults.length; i++) {
        const result = updateResults[i];
        if (result.status === 'rejected') {
          console.error('❌ Inventory update failed for item:', items[i], result.reason);
          return { success: false, error: `Failed to update inventory for ${items[i].productName}` };
        }
        if (result.status === 'fulfilled' && result.value.error) {
          console.error('❌ Inventory update error for item:', items[i], result.value.error);
          return { success: false, error: `Failed to update inventory for ${items[i].productName}` };
        }
      }

      // Batch insert all stock movements (if table exists)
      try {
        const { error: movementError } = await supabase
          .from('lats_stock_movements')
          .insert(stockMovements);

        if (movementError) {
          console.warn('⚠️ Stock movements logging skipped (table may not exist):', movementError.message);
          // Don't fail the sale if stock movements fail - this is just for tracking history
        } else {
          console.log('✅ Stock movements logged successfully');
        }
      } catch (err) {
        console.log('ℹ️  Stock movements tracking not enabled (table not found)');
        // Don't fail - this is an optional feature for advanced inventory tracking
      }

      console.log('✅ Inventory updated successfully');
      
      // ✅ FIX: Clear child variants cache after sale to ensure sold items are hidden
      try {
        const { childVariantsCacheService } = await import('../services/childVariantsCacheService');
        childVariantsCacheService.clearCache();
        console.log('✅ Child variants cache cleared after sale');
      } catch (error) {
        console.warn('⚠️ Failed to clear child variants cache:', error);
        // Don't fail the sale if cache clearing fails
      }
      
      // Emit stock updated events for real-time updates
      items.forEach(item => {
        emitStockUpdate(item.productId, item.variantId, item.quantity);
      });
      
      return { success: true };

    } catch (error) {
      console.error('❌ Error updating inventory:', error);
      console.error('❌ Inventory update error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update inventory' 
      };
    }
  }

  // Link serial numbers to sale
  private async linkSerialNumbers(
    saleId: string,
    items: SaleItem[],
    customerId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔗 Linking serial numbers to sale...');

      // Collect all inventory item IDs from items that have serial numbers
      const inventoryItemIds: string[] = [];
      
      for (const item of items) {
        if ((item as any).selectedSerialNumbers && Array.isArray((item as any).selectedSerialNumbers)) {
          const serialNumbers = (item as any).selectedSerialNumbers;
          for (const serial of serialNumbers) {
            if (serial.id) {
              inventoryItemIds.push(serial.id);
            }
          }
        }
      }

      if (inventoryItemIds.length === 0) {
        console.log('ℹ️ No serial numbers to link');
        return { success: true };
      }

      console.log(`📦 Linking ${inventoryItemIds.length} serial numbers to sale ${saleId}`);

      // Create sale_inventory_items entries
      const saleInventoryItems = inventoryItemIds.map(itemId => ({
        sale_id: saleId,
        inventory_item_id: itemId,
        customer_id: customerId || null
      }));

      const { error: linkError } = await supabase
        .from('sale_inventory_items')
        .insert(saleInventoryItems);

      if (linkError) {
        console.error('❌ Error linking serial numbers:', linkError);
        return { success: false, error: linkError.message };
      }

      // Update inventory item status to 'sold'
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ status: 'sold' })
        .in('id', inventoryItemIds);

      if (updateError) {
        console.error('❌ Error updating serial number status:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log('✅ Serial numbers linked successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error in linkSerialNumbers:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Generate receipt
  private async generateReceipt(sale: SaleData): Promise<{ success: boolean; error?: string }> {
    try {
      // Receipt generation doesn't require authentication
      console.log('🧾 Generating receipt (auth optional)...');

      // Get business info from settings
      const { businessInfoService } = await import('./businessInfoService');
      const businessInfo = await businessInfoService.getBusinessInfo();

      // Create receipt record (if table exists)
      try {
        const { error: receiptError } = await supabase
          .from('lats_receipts')
          .insert([{
            sale_id: sale.id,
            receipt_number: `RCP-${sale.saleNumber}`,
            customer_name: sale.customerName || 'Walk-in Customer',
            customer_phone: sale.customerPhone || null,
            total_amount: sale.total,
            payment_method: sale.paymentMethod.type,
            items_count: sale.items.length,
            generated_by: sale.soldBy,
            receipt_content: {
              sale: sale,
              generated_at: new Date().toISOString(),
              business_info: {
                name: businessInfo.name,
                address: businessInfo.address,
                phone: businessInfo.phone,
                email: businessInfo.email,
                website: businessInfo.website,
                logo: businessInfo.logo
              }
            }
          }]);

        if (receiptError) {
          // Log but don't fail - receipts table might not exist
          console.warn('⚠️ Could not save receipt (table may not exist):', receiptError.message);
          return { success: true }; // Return success since this is optional
        }
      } catch (err) {
        console.warn('⚠️ Receipt table not available:', err);
        return { success: true }; // Return success since this is optional
      }

      console.log('✅ Receipt generated successfully');
      return { success: true };

    } catch (error) {
      console.warn('⚠️ Error generating receipt:', error);
      console.warn('⚠️ Receipt generation error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error
      });
      // Return success since receipts are optional
      return { success: true };
    }
  }

  // Send notifications (SMS, email, etc.)
  private async sendNotifications(sale: SaleData): Promise<void> {
    try {
      // Send SMS notification if customer phone is provided
      if (sale.customerPhone) {
        await this.sendSMSNotification(sale);
      }

      // Email service disabled - only SMS notifications are sent
      // if (sale.customerEmail) {
      //   await this.sendEmailReceipt(sale);
      // }

    } catch (error) {
      console.error('❌ Error sending notifications:', error);
      // Don't fail the sale if notifications fail
    }
  }

  // Send SMS notification
  private async sendSMSNotification(sale: SaleData): Promise<void> {
    try {
      const message = await this.generateSMSMessage(sale);
      
      // Try to use the SMS service if available
      try {
        const { smsService } = await import('../services/smsService');
        
        // Use sendSMS method to send to single recipient
        const result = await smsService.sendSMS(sale.customerPhone!, message);
        
        if (result.success) {
          console.log('📱 SMS notification sent successfully for sale:', sale.saleNumber);
        } else {
          // ✅ FIX: Don't log connection errors - SMS proxy server may not be running (expected)
          const isConnectionError = result.error && (
            result.error.includes('proxy server not running') ||
            result.error.includes('connection refused') ||
            result.error.includes('ERR_CONNECTION_REFUSED') ||
            result.error.includes('ECONNREFUSED') ||
            result.error.includes('Failed to fetch')
          );
          
          // Only log actual SMS provider errors, not connection errors
          if (!isConnectionError && result.error) {
            console.warn('⚠️ SMS notification failed:', result.error);
          }
          // Connection errors are silently ignored - SMS is optional
        }
      } catch (importError) {
        // Silently skip SMS if service is unavailable (expected in dev environment)
        console.log('ℹ️  SMS service not configured - sale completed without notification');
      }
    } catch (error) {
      // Silently skip SMS errors - SMS is optional and shouldn't affect sale completion
      console.log('ℹ️  SMS notification skipped - sale completed successfully');
    }
  }

  // Generate SMS message
  private async generateSMSMessage(sale: SaleData): Promise<string> {
    const items = sale.items.map(item => `${item.productName} x${item.quantity}`).join(', ');
    const discountText = sale.discount > 0 ? `\nDiscount: ${this.formatMoney(sale.discount)}` : '';
    
    // Load SMS message settings from POS settings
    let headerMessage = 'Thank you for your purchase!';
    let footerMessage = 'Thank you for choosing us!';
    
    try {
      const { POSSettingsService } = await import('./posSettingsApi');
      const receiptSettings = await POSSettingsService.loadReceiptSettings();
      
      if (receiptSettings?.sms_header_message) {
        headerMessage = receiptSettings.sms_header_message;
      }
      if (receiptSettings?.sms_footer_message) {
        footerMessage = receiptSettings.sms_footer_message;
      }
    } catch (error) {
      console.warn('⚠️ Could not load SMS message settings, using defaults');
    }
    
    return `${headerMessage}
Sale #${sale.saleNumber}
Items: ${items}
Total: ${this.formatMoney(sale.total)}${discountText}
Payment: ${sale.paymentMethod.type.toUpperCase()}
${footerMessage}`;
  }

  // Email service disabled - function commented out
  // private async sendEmailReceipt(sale: SaleData): Promise<void> {
  //   try {
  //     const receiptContent = this.generateEmailReceipt(sale);
  //     
  //     // Use the email service  
  //     const { emailService } = await import('../services/emailService');
  //     
  //     const result = await emailService.sendEmail({
  //       to: sale.customerEmail!,
  //       subject: `Receipt for Sale #${sale.saleNumber}`,
  //       html: receiptContent
  //     });
  //     
  //     if (result.success) {
  //       console.log('📧 Email receipt sent successfully for sale:', sale.saleNumber);
  //     } else {
  //       console.error('❌ Failed to send email receipt:', result.error);
  //     }
  //   } catch (error) {
  //     console.error('Error sending email receipt:', error);
  //   }
  // }

  // Email service disabled - function commented out
  // private generateEmailReceipt(sale: SaleData): string {
  //   const itemsHtml = sale.items.map(item => `
  //     <tr>
  //       <td>${item.productName} - ${item.variantName}</td>
  //       <td>${item.quantity}</td>
  //       <td>${this.formatMoney(item.unitPrice)}</td>
  //       <td>${this.formatMoney(item.totalPrice)}</td>
  //     </tr>
  //   `).join('');

  //   const discountRow = sale.discount > 0 ? `
  //     <tr>
  //       <td colspan="3" style="text-align: right; font-weight: bold;">Discount:</td>
  //       <td>-${this.formatMoney(sale.discount)}</td>
  //     </tr>
  //   ` : '';

  //   return `
  //     <!DOCTYPE html>
  //     <html>
  //     <head>
  //       <meta charset="utf-8">
  //       <title>Receipt - Sale #${sale.saleNumber}</title>
  //       <style>
  //         body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
  //         .receipt { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
  //         .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
  //         table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  //         th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
  //         th { background-color: #f5f5f5; font-weight: bold; }
  //         .total { font-weight: bold; font-size: 1.2em; }
  //         .footer { margin-top: 30px; text-align: center; color: #666; }
  //       </style>
  //     </head>
  //     <body>
  //       <div class="receipt">
  //         <div class="header">
  //           <h1>Sales Receipt</h1>
  //           <p>Sale #${sale.saleNumber}</p>
  //           <p>Date: ${new Date(sale.soldAt).toLocaleDateString()}</p>
  //           <p>Time: ${new Date(sale.soldAt).toLocaleTimeString()}</p>
  //         </div>
  //         
  //         <div>
  //           <h3>Customer Information</h3>
  //           <p><strong>Name:</strong> ${sale.customerName}</p>
  //           ${sale.customerPhone ? `<p><strong>Phone:</strong> ${sale.customerPhone}</p>` : ''}
  //           ${sale.customerEmail ? `<p><strong>Email:</strong> ${sale.customerEmail}</p>` : ''}
  //         </div>
  //         
  //         <table>
  //           <thead>
  //             <tr>
  //               <th>Item</th>
  //               <th>Qty</th>
  //               <th>Price</th>
  //               <th>Total</th>
  //             </tr>
  //           </thead>
  //           <tbody>
  //             ${itemsHtml}
  //             ${discountRow}
  //             <tr>
  //               <td colspan="3" style="text-align: right; font-weight: bold;">Subtotal:</td>
  //               <td>${this.formatMoney(sale.subtotal)}</td>
  //             </tr>
  //             <tr>
  //               <td colspan="3" style="text-align: right; font-weight: bold;">Tax:</td>
  //               <td>${this.formatMoney(sale.tax)}</td>
  //             </tr>
  //             <tr class="total">
  //               <td colspan="3" style="text-align: right;">Total:</td>
  //               <td>${this.formatMoney(sale.total)}</td>
  //             </tr>
  //           </tbody>
  //         </table>
  //         
  //         <div>
  //           <p><strong>Payment Method:</strong> ${sale.paymentMethod.type.toUpperCase()}</p>
  //           <p><strong>Sold By:</strong> ${sale.soldBy}</p>
  //           ${sale.notes ? `<p><strong>Notes:</strong> ${sale.notes}</p>` : ''}
  //         </div>
  //         
  //         <div class="footer">
  //           <p>Thank you for your purchase!</p>
  //           <p>For any questions, please contact our support team.</p>
  //         </div>
  //       </div>
  //     </body>
  //     </html>
  //   `;
  // }

  // Format money helper
  private formatMoney(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  // Generate unique sale number
  private generateSaleNumber(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `SALE-${timestamp}-${random}`;
  }

  // Get sale by ID
  async getSaleById(saleId: string): Promise<SaleData | null> {
    try {
      const { data: sale, error } = await supabase
        .from('lats_sales')
        .select('*')
        .eq('id', saleId)
        .single();

      if (error) {
        console.error('❌ Error fetching sale:', error);
        return null;
      }

      // Fetch sale items separately to avoid nested relationship issues
      const { data: saleItems } = await supabase
        .from('lats_sale_items')
        .select('*')
        .eq('sale_id', saleId);

      if (saleItems && saleItems.length > 0) {
        // Fetch product and variant details
        const productIds = [...new Set(saleItems.map(item => item.product_id).filter(Boolean))];
        const variantIds = [...new Set(saleItems.map(item => item.variant_id).filter(Boolean))];

        const [productsResult, variantsResult] = await Promise.all([
          productIds.length > 0 ? supabase.from('lats_products').select('id, name').in('id', productIds) : { data: [] },
          variantIds.length > 0 ? supabase.from('lats_product_variants').select('id, name, variant_name, sku').in('id', variantIds) : { data: [] }  // 🔧 FIX: Select both name columns
        ]);

        const productsMap = new Map((productsResult.data || []).map((p: any) => [p.id, p]));
        const variantsMap = new Map((variantsResult.data || []).map((v: any) => [v.id, { ...v, name: v.variant_name || v.name }]));  // 🔧 FIX: Map variant_name to name

        // Attach product and variant data to sale items
        const enhancedItems = saleItems.map(item => ({
          ...item,
          lats_products: productsMap.get(item.product_id),
          lats_product_variants: variantsMap.get(item.variant_id)
        }));

        return { ...sale, lats_sale_items: enhancedItems };
      }

      return { ...sale, lats_sale_items: [] };
    } catch (error) {
      console.error('❌ Error fetching sale:', error);
      return null;
    }
  }

  // Get recent sales
  async getRecentSales(limit: number = 10): Promise<SaleData[]> {
    try {
      const { data: sales, error } = await supabase
        .from('lats_sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching recent sales:', error);
        return [];
      }

      if (!sales || sales.length === 0) {
        return [];
      }

      // Fetch sale items separately for all sales
      const saleIds = sales.map(s => s.id);
      const { data: saleItems } = await supabase
        .from('lats_sale_items')
        .select('*')
        .in('sale_id', saleIds);

      if (saleItems && saleItems.length > 0) {
        // Fetch product and variant details
        const productIds = [...new Set(saleItems.map(item => item.product_id).filter(Boolean))];
        const variantIds = [...new Set(saleItems.map(item => item.variant_id).filter(Boolean))];

        const [productsResult, variantsResult] = await Promise.all([
          productIds.length > 0 ? supabase.from('lats_products').select('id, name').in('id', productIds) : { data: [] },
          variantIds.length > 0 ? supabase.from('lats_product_variants').select('id, name, variant_name, sku').in('id', variantIds) : { data: [] }  // 🔧 FIX: Select both name columns
        ]);

        const productsMap = new Map((productsResult.data || []).map((p: any) => [p.id, p]));
        const variantsMap = new Map((variantsResult.data || []).map((v: any) => [v.id, { ...v, name: v.variant_name || v.name }]));  // 🔧 FIX: Map variant_name to name

        // Group sale items by sale_id
        const itemsBySaleId = new Map<string, any[]>();
        saleItems.forEach(item => {
          if (!itemsBySaleId.has(item.sale_id)) {
            itemsBySaleId.set(item.sale_id, []);
          }
          itemsBySaleId.get(item.sale_id)!.push({
            ...item,
            lats_products: productsMap.get(item.product_id),
            lats_product_variants: variantsMap.get(item.variant_id)
          });
        });

        // Attach items to their respective sales
        return sales.map(sale => ({
          ...sale,
          lats_sale_items: itemsBySaleId.get(sale.id) || []
        }));
      }

      return sales.map(sale => ({ ...sale, lats_sale_items: [] }));
    } catch (error) {
      console.error('❌ Error fetching recent sales:', error);
      return [];
    }
  }
}

export const saleProcessingService = new SaleProcessingService();
