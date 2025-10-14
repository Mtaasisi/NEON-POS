import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';
import { emitSaleCompleted, emitStockUpdate } from '../features/lats/lib/data/eventBus';
import { isSessionValid, clearAuthState } from './authUtils';

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

      // Validate customer information - customer selection is required
      if (!saleData.customerId) {
        return { success: false, error: 'Please select a customer before creating a sale' };
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
      const [inventoryResult, receiptResult, customerResult] = await Promise.allSettled([
        this.updateInventory(saleData.items),
        this.generateReceipt(saleResult.sale!),
        this.updateCustomerStats(saleData)
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
      
      // Single query to get both quantity and cost_price for all variants
      const { data: variants, error } = await supabase
        .from('lats_product_variants')
        .select('id, quantity, cost_price')
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
        return {
          stockValidation: { success: false, error: `Failed to check stock and costs: ${error.message}` },
          itemsWithCosts: items.map(item => ({ ...item, costPrice: 0, profit: item.totalPrice }))
        };
      }

      // Create maps for quick lookup
      const variantDataMap = new Map(variants?.map(v => [v.id, v]) || []);

      // Validate stock and calculate costs in single pass
      const itemsWithCosts: SaleItem[] = [];
      
      for (const item of items) {
        const variantData = variantDataMap.get(item.variantId);
        
        if (!variantData) {
          return {
            stockValidation: { success: false, error: `Product variant not found: ${item.productName}` },
            itemsWithCosts: []
          };
        }
        
        if (variantData.quantity < item.quantity) {
          return {
            stockValidation: { 
              success: false, 
              error: `Insufficient stock for ${item.productName} (${item.variantName}). Available: ${variantData.quantity}, Requested: ${item.quantity}` 
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
          profit
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
        const availableStock = variantStockMap.get(item.variantId);
        
        if (availableStock === undefined) {
          return { success: false, error: `Product variant not found: ${item.productName}` };
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
      // Generate sale number
      const saleNumber = this.generateSaleNumber();

      // Check authentication using the helper method
      console.log('🔐 Checking authentication before sale insert...');
      const authResult = await this.ensureAuthentication();
      
      if (!authResult.success) {
        console.error('❌ Authentication failed:', authResult.error);
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

      // Properly format payment_method for JSONB column
      // Ensure it's a valid object and will be properly handled by Supabase
      const paymentMethodFormatted = JSON.parse(JSON.stringify(paymentMethodData));

      const saleInsertData = {
        sale_number: saleNumber,
        customer_id: saleData.customerId, // Customer ID is required - validated above
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
        console.error('❌ Error creating sale with full data:', saleError1);
        console.error('❌ Sale insert data that failed:', JSON.stringify(saleInsertData, null, 2));
        console.error('❌ Full error details:', {
          message: saleError1.message,
          details: saleError1.details,
          hint: saleError1.hint,
          code: saleError1.code
        });

        // Try with reduced data - essential fields only
        console.log('🔄 Trying with reduced field set...');
        const reducedData = {
          sale_number: saleNumber,
          customer_id: saleData.customerId,
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
          return { success: false, error: `Failed to create sale: ${saleError1.message}. Fallback also failed: ${fallbackError.message}` };
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
        const isValidUUID = (uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
        
        if (!isValidUUID(item.productId)) {
          console.error('❌ Invalid product_id UUID:', item.productId);
        }
        if (!isValidUUID(item.variantId)) {
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
        console.error('❌ Error creating sale items:', itemsError);
        console.error('❌ Full error details:', {
          message: itemsError.message,
          details: itemsError.details,
          hint: itemsError.hint,
          code: itemsError.code
        });
        console.error('❌ Sale items data:', saleItems);
        console.error('❌ Sale ID:', sale.id);
        return { success: false, error: `Sale created but items failed: ${itemsError.message}` };
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
              const { data: acct, error: faErr } = await supabase
                .from('finance_accounts')
                .select('balance')
                .eq('id', p.accountId)
                .single();
              
              if (faErr) {
                console.warn('⚠️ Failed to fetch finance account:', faErr.message);
                continue; // Skip this payment's account updates
              }
              
              if (acct && typeof acct.balance === 'number') {
                const newBalance = acct.balance + p.amount;
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
              const { error: atErr } = await supabase
                .from('account_transactions')
                .insert({
                  account_id: p.accountId,
                  transaction_type: 'payment_received',
                  amount: p.amount,
                  reference_number: saleNumber,
                  description: `POS sale payment (${p.method || 'payment'})`,
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
          .from('customers')
          .select('*')
          .eq('id', saleData.customerId)
          .single();

        if (customer) {
          // Helper function to safely parse numeric values
          const safeParseNumber = (value: any, defaultValue: number = 0): number => {
            if (value === null || value === undefined) return defaultValue;
            const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
            // Detect corrupted data (unrealistic values > 1 trillion TZS)
            if (isNaN(parsed) || parsed > 1000000000000 || parsed < 0) {
              console.warn('⚠️ Detected corrupted value:', value, '- resetting to', defaultValue);
              return defaultValue;
            }
            return parsed;
          };

          // Add fields that exist in the customer record with safe numeric parsing
          if ('total_spent' in customer) {
            const currentTotal = safeParseNumber(customer.total_spent, 0);
            const saleTotal = safeParseNumber(saleData.total, 0); // ✅ FIX: Parse sale total to prevent string concatenation
            const newTotal = currentTotal + saleTotal;
            updateData.total_spent = Math.max(0, newTotal); // Ensure non-negative
            console.log(`💰 Updating total_spent: ${currentTotal} + ${saleTotal} = ${newTotal}`);
          }
          if ('total_orders' in customer) {
            const currentOrders = safeParseNumber(customer.total_orders, 0);
            updateData.total_orders = currentOrders + 1;
          }
          if ('points' in customer) {
            const currentPoints = safeParseNumber(customer.points, 0);
            updateData.points = currentPoints + pointsEarned;
          }
        }

        // Update customer record
        const { error: updateError } = await supabase
          .from('customers')
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
  private async updateInventory(items: SaleItem[]): Promise<{ success: boolean; error?: string }> {
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
      
      // First, get current quantities for all variants
      const variantIds = items.map(item => item.variantId);
      const { data: currentVariants, error: fetchError } = await supabase
        .from('lats_product_variants')
        .select('id, quantity')
        .in('id', variantIds);
      
      if (fetchError) {
        throw new Error(`Failed to fetch current stock: ${fetchError.message}`);
      }

      // Create a map for quick lookup
      const currentStockMap = new Map(currentVariants.map(v => [v.id, v.quantity]));

      // Batch inventory updates and stock movements in parallel
      const updatePromises = items.map(item => {
        const currentQuantity = currentStockMap.get(item.variantId) || 0;
        const newQuantity = Math.max(0, currentQuantity - item.quantity);
        
        // Update with calculated quantity
        return supabase
          .from('lats_product_variants')
          .update({ 
            quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.variantId);
      });

      // Prepare all stock movement records for batch insert
      const stockMovements = items.map(item => {
        const currentQuantity = currentStockMap.get(item.variantId) || 0;
        const newQuantity = Math.max(0, currentQuantity - item.quantity);
        
        return {
          product_id: item.productId,
          variant_id: item.variantId,
          movement_type: 'out',
          quantity: item.quantity,
          previous_quantity: currentQuantity,
          new_quantity: newQuantity,
          reason: 'Sale',
          reference: `Sale ${item.sku}`,
          notes: `Sold ${item.quantity} units of ${item.productName} (${item.variantName})`,
          created_by: userId
        };
      });

      // Execute inventory updates in parallel
      const updateResults = await Promise.allSettled(updatePromises);
      
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
          // Only log SMS errors if they're not connection errors (which are expected in dev)
          if (result.error && !result.error.includes('Network error') && !result.error.includes('Failed to fetch')) {
            console.warn('⚠️ SMS notification failed:', result.error);
          }
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
        .select(`
          *,
          lats_sale_items (
            *,
            lats_products (name),
            lats_product_variants (name, sku)
          )
        `)
        .eq('id', saleId)
        .single();

      if (error) {
        console.error('❌ Error fetching sale:', error);
        return null;
      }

      return sale;
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
        .select(`
          *,
          lats_sale_items (
            *,
            lats_products (name),
            lats_product_variants (name, sku)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching recent sales:', error);
        return [];
      }

      return sales || [];
    } catch (error) {
      console.error('❌ Error fetching recent sales:', error);
      return [];
    }
  }
}

export const saleProcessingService = new SaleProcessingService();
