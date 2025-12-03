import { supabase } from '../../../lib/supabaseClient';
import { addBranchFilter } from '../../../lib/branchAwareApi';
import { ErrorLogger, logPurchaseOrderError, validateProductId, withErrorHandling } from '../lib/errorLogger';
import { latsEventBus } from '../lib/data/eventBus';

export interface PurchaseOrderMessage {
  id?: string;
  purchaseOrderId: string;
  sender: string;
  content: string;
  type: 'system' | 'user' | 'supplier';
  timestamp: string;
}

export interface PurchaseOrderPayment {
  id?: string;
  purchaseOrderId: string;
  method: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  reference?: string;
  timestamp: string;
}

export interface PurchaseOrderAudit {
  id?: string;
  purchaseOrderId: string;
  action: string;
  user: string;
  details: string;
  timestamp: string;
}

export class PurchaseOrderService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second

  // Enhanced retry mechanism with detailed error logging and fallback operations
  private static async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    retries: number = this.MAX_RETRIES,
    fallbackOperation?: () => Promise<T>
  ): Promise<T> {
    try {
      console.log(`🔄 Starting ${operationName} (attempt ${this.MAX_RETRIES - retries + 1}/${this.MAX_RETRIES})`);
      const result = await operation();
      console.log(`✅ ${operationName} completed successfully`);
      return result;
    } catch (error: any) {
      // Enhanced error logging with detailed context
      const errorContext = {
        operation: operationName,
        attempt: this.MAX_RETRIES - retries + 1,
        maxRetries: this.MAX_RETRIES,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorDetails: error?.details,
        errorHint: error?.hint,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      console.error(`❌ ${operationName} failed (attempt ${this.MAX_RETRIES - retries + 1}/${this.MAX_RETRIES}):`, {
        ...errorContext,
        fullError: error
      });

      const isConnectionError = error?.message?.includes('ERR_CONNECTION_CLOSED') || 
                               error?.message?.includes('Failed to fetch') ||
                               error?.message?.includes('net::ERR_CONNECTION_CLOSED') ||
                               error?.code === 'PGRST301' ||
                               error?.code === 'PGRST116' ||
                               error?.code === 'PGRST301';

      const isDatabaseError = error?.code?.startsWith('PGRST') || 
                             error?.code?.startsWith('42') ||
                             error?.code?.startsWith('23');

      // Log specific error types
      if (isConnectionError) {
        console.warn(`🌐 Connection error detected: ${error.message}`);
      } else if (isDatabaseError) {
        console.warn(`🗄️ Database error detected: Code ${error.code} - ${error.message}`);
      } else {
        console.warn(`⚠️ Unknown error type: ${error.message}`);
      }
      
      if (retries > 1) {
        const delay = this.RETRY_DELAY * (this.MAX_RETRIES - retries + 1); // Exponential backoff
        console.log(`🔄 Retrying ${operationName} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryOperation(operation, operationName, retries - 1, fallbackOperation);
      }
      
      // Try fallback operation if available
      if (fallbackOperation) {
        console.log(`🔄 Attempting fallback operation for ${operationName}...`);
        try {
          const fallbackResult = await fallbackOperation();
          console.log(`✅ Fallback operation for ${operationName} succeeded`);
          return fallbackResult;
        } catch (fallbackError) {
          console.error(`❌ Fallback operation for ${operationName} also failed:`, fallbackError);
        }
      }
      
      // If it's a connection error and we've exhausted retries, return empty data instead of throwing
      if (isConnectionError) {
        console.warn(`⚠️ ${operationName} failed after ${this.MAX_RETRIES} attempts due to connection issues. Returning empty data.`);
        return [] as T;
      }
      
      // Enhanced error throwing with context
      const enhancedError = new Error(`Purchase Order Service Error: ${operationName} failed after ${this.MAX_RETRIES} attempts. Original error: ${error.message}`);
      (enhancedError as any).originalError = error;
      (enhancedError as any).context = errorContext;
      throw enhancedError;
    }
  }

  // Communication functions
  static async getMessages(purchaseOrderId: string): Promise<PurchaseOrderMessage[]> {
    return this.retryOperation(async () => {
      const { data, error } = await supabase
        .from('purchase_order_messages')
        .select('*')
        .eq('purchase_order_id', purchaseOrderId)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
      
      // Map database fields to TypeScript interface
      return (data || []).map((msg: any) => ({
        id: msg.id,
        purchaseOrderId: msg.purchase_order_id,
        sender: msg.sender,
        content: msg.content,
        type: msg.type,
        timestamp: msg.timestamp
      }));
    }, 'get_messages');
  }

  static async sendMessage(message: Omit<PurchaseOrderMessage, 'id' | 'timestamp'>): Promise<boolean> {
    return this.retryOperation(async () => {
      const { error } = await supabase
        .from('purchase_order_messages')
        .insert({
          purchase_order_id: message.purchaseOrderId,
          sender: message.sender,
          content: message.content,
          type: message.type,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
      return true;
    }, 'send_message');
  }

  // Payment functions - Updated to use new payment system
  static async getPayments(purchaseOrderId: string): Promise<PurchaseOrderPayment[]> {
    return this.retryOperation(async () => {
      console.log(`🔄 [PurchaseOrderService] getPayments called for PO: ${purchaseOrderId}`);

      // Apply branch filtering to ensure proper isolation
      let query = supabase
        .from('purchase_order_payments')
        .select('id, purchase_order_id, payment_method, amount, currency, status, reference, payment_date, created_at')
        .eq('purchase_order_id', purchaseOrderId)
        .order('created_at', { ascending: false })
        .limit(100); // Reasonable limit for performance

      console.log(`🔍 [PurchaseOrderService] Built query for purchase_order_id: ${purchaseOrderId}`);

      // Apply branch filtering for proper isolation
      const filteredQuery = await addBranchFilter(query, 'payments');
      console.log(`🔍 [PurchaseOrderService] Applied branch filter for payments`);

      const { data, error } = await filteredQuery;

      if (error) {
        console.error('❌ Error fetching payments:', error);
        throw error;
      }

      console.log(`✅ [PurchaseOrderService] Fetched ${data?.length || 0} payments for PO: ${purchaseOrderId}`);

      // Map database fields to TypeScript interface
      const mappedPayments = (data || []).map((payment: any) => ({
        id: payment.id,
        purchaseOrderId: payment.purchase_order_id,
        method: payment.payment_method,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        reference: payment.reference,
        timestamp: payment.payment_date || payment.created_at
      }));

      console.log(`✅ [PurchaseOrderService] Mapped ${mappedPayments.length} payments`);
      return mappedPayments;
    }, 'get_payments');
  }

  // Get expenses for a purchase order from account_transactions table
  static async getExpenses(purchaseOrderId: string): Promise<any[]> {
    return this.retryOperation(async () => {
      // Get expense transactions linked to this purchase order
      // Use contains method for JSON query which is more reliable in PostgREST
      const { data: transactions, error } = await supabase
        .from('account_transactions')
        .select('id, transaction_type, amount, description, reference_number, created_at, metadata, account_id')
        .eq('transaction_type', 'expense')
        .contains('metadata', { purchase_order_id: purchaseOrderId })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching expenses:', error);
        throw error;
      }

      if (!transactions || transactions.length === 0) {
        return [];
      }

      // Fetch related account data separately
      const accountIds = transactions.map(t => t.account_id).filter(Boolean);

      const { data: accounts, error: accountsError } = await supabase
        .from('finance_accounts')
        .select('id, name, type, currency')
        .in('id', accountIds);

      if (accountsError) {
        console.warn('Error fetching account data:', accountsError);
      }

      // Map account data for easy lookup
      const accountsMap = new Map(accounts?.map(a => [a.id, a]) || []);

      // Map to a consistent format
      return transactions.map((expense: any) => {
        const account = accountsMap.get(expense.account_id);
        return {
          id: expense.id,
          purchaseOrderId: purchaseOrderId,
          type: 'expense',
          category: expense.metadata?.category || 'Other',
          description: expense.description,
          amount: expense.amount,
          currency: account?.currency || 'TZS',
          accountName: account?.name || 'Unknown Account',
          reference: expense.reference_number,
          timestamp: expense.created_at,
          metadata: expense.metadata
        };
      });
    }, 'get_expenses');
  }

  static async addPayment(payment: Omit<PurchaseOrderPayment, 'id' | 'timestamp'>): Promise<boolean> {
    return this.retryOperation(async () => {
      const { error } = await supabase
        .from('purchase_order_payments')
        .insert({
          purchase_order_id: payment.purchaseOrderId,
          payment_method: payment.method,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          reference: payment.reference,
          payment_date: new Date().toISOString()
        });

      if (error) {
        console.error('Error adding payment:', error);
        throw error;
      }
      return true;
    }, 'add_payment');
  }

  // Audit functions
  static async getAuditHistory(purchaseOrderId: string): Promise<PurchaseOrderAudit[]> {
    return this.retryOperation(async () => {
      const { data, error } = await supabase
        .from('purchase_order_audit')
        .select('*')
        .eq('purchase_order_id', purchaseOrderId)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching audit history:', error);
        throw error;
      }
      
      // Map database fields to TypeScript interface
      return (data || []).map((audit: any) => ({
        id: audit.id,
        purchaseOrderId: audit.purchase_order_id,
        action: audit.action,
        user: audit.user_id || audit.created_by,
        details: audit.details,
        timestamp: audit.timestamp
      }));
    }, 'get_audit_history');
  }

  static async addAuditEntry(audit: Omit<PurchaseOrderAudit, 'id' | 'timestamp'>): Promise<boolean> {
    try {
      // Get current user if not provided or is empty string
      let userId = audit.user;
      if (!userId || userId.trim() === '') {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.warn('Error getting authenticated user for audit entry:', userError);
          // Don't fail the operation, just log it without user info
          userId = 'system';
        } else if (!user) {
          console.warn('No authenticated user found for audit entry');
          // Use 'system' as fallback user
          userId = 'system';
        } else {
          userId = user.id;
        }
      }

      // Convert details to JSON string for PostgreSQL TEXT column
      const detailsString = typeof audit.details === 'string' ? audit.details : JSON.stringify(audit.details);

      // Try using the helper function first (more secure)
      const { data: auditId, error: functionError } = await supabase.rpc('log_purchase_order_audit', {
        p_purchase_order_id: audit.purchaseOrderId,
        p_action: audit.action,
        p_details: detailsString,
        p_user_id: userId
      });

      if (functionError) {
        console.warn('Helper function failed, trying direct insert:', functionError);
        
        // Fallback to direct insert
        const { error: insertError } = await supabase
          .from('purchase_order_audit')
          .insert({
            purchase_order_id: audit.purchaseOrderId,
            action: audit.action,
            user_id: userId,
            created_by: userId,
            details: detailsString,
            timestamp: new Date().toISOString()
          });

        if (insertError) {
          console.error('Direct insert also failed:', insertError);
          return false;
        }
      } else {
        console.log('✅ Audit entry added successfully with ID:', auditId);
      }

      return true;
    } catch (error) {
      console.error('Error adding audit entry:', error);
      return false;
    }
  }

  // Order status functions
  static async updateOrderStatus(
    purchaseOrderId: string, 
    status: string, 
    userId: string,
    additionalData?: any
  ): Promise<{ success: boolean; message: string }> {
    return this.retryOperation(async () => {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData
      };
      
      console.log('🔍 Updating order status with data:', updateData);
      
      const { error } = await supabase
        .from('lats_purchase_orders')
        .update(updateData)
        .eq('id', purchaseOrderId);

      if (error) {
        console.error('❌ Error updating order status:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        console.error('❌ Update data that caused the error:', updateData);
        throw error;
      }

      // Add audit entry
      await this.addAuditEntry({
        purchaseOrderId,
        action: `Status changed to ${status}`,
        user: userId,
        details: JSON.stringify({
          message: `Order status updated to ${status}`,
          previous_status: additionalData?.previous_status || 'unknown',
          new_status: status
        })
      });

      return { success: true, message: 'Order status updated successfully' };
    }, 'update_order_status');
  }

  // Shipped Items Management Functions with enhanced error handling and fallback queries
  static async loadShippedItems(purchaseOrderId: string): Promise<any[]> {
    return withErrorHandling(async () => {
      console.log(`🔄 Starting loadShippedItems for purchase order: ${purchaseOrderId}`);
      
      // Enhanced product ID validation
      const purchaseOrderValidation = validateProductId(purchaseOrderId, 'Purchase Order ID');
      if (!purchaseOrderValidation.isValid) {
        throw new Error(purchaseOrderValidation.error);
      }

      const trimmedId = purchaseOrderId.trim();
      console.log(`🔍 Processing purchase order ID: "${trimmedId}" (length: ${trimmedId.length})`);

      return this.retryOperation(
        // FIXED: Main operation without PostgREST syntax
        async () => {
          console.log('🔄 Attempting main query without PostgREST joins...');
          const { data: items, error } = await supabase
            .from('lats_purchase_order_items')
            .select('*')
            .eq('purchase_order_id', trimmedId);

          if (error) {
            // Log detailed database error
            logPurchaseOrderError('load_shipped_items_main_query', error, {
              purchaseOrderId: trimmedId,
              operation: 'load_shipped_items'
            }, {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint,
              table: 'lats_purchase_order_items'
            });
            throw error;
          }

          console.log(`✅ Main query succeeded, found ${items?.length || 0} items`);

          if (!items || items.length === 0) {
            return [];
          }

          // Fetch related data separately
          const productIds = items.map(item => item.product_id).filter(Boolean);
          const variantIds = items.map(item => item.variant_id).filter(Boolean);

          const [productsResult, variantsResult] = await Promise.all([
            productIds.length > 0
              ? supabase.from('lats_products').select('id, name, sku, description').in('id', productIds)
              : Promise.resolve({ data: [], error: null }),
            variantIds.length > 0
              ? supabase.from('lats_product_variants').select('id, name, variant_name, sku').in('id', variantIds)  // 🔧 FIX: Select both name columns
              : Promise.resolve({ data: [], error: null })
          ]);

          // Map data for easy lookup
          const productsMap = new Map(productsResult.data?.map(p => [p.id, p]) || []);
          const variantsMap = new Map(variantsResult.data?.map(v => [v.id, { ...v, name: v.name || v.variant_name || 'Unnamed' }]) || []);  // 🔧 FIX: Prioritize 'name' first
          
          // Fetch product images
          if (productIds.length > 0) {
            const { data: productImages } = await supabase
              .from('product_images')
              .select('id, product_id, image_url, thumbnail_url, is_primary')
              .in('product_id', productIds)
              .order('is_primary', { ascending: false });
            
            // Attach images to products
            if (productImages) {
              productImages.forEach((image: any) => {
                const product = productsMap.get(image.product_id);
                if (product) {
                  if (!product.images) {
                    product.images = [];
                  }
                  const imageObj = {
                    id: image.id,
                    url: image.thumbnail_url || image.image_url,
                    thumbnailUrl: image.thumbnail_url,
                    isPrimary: image.is_primary || false
                  };
                  if (image.is_primary) {
                    product.images.unshift(imageObj);
                  } else {
                    product.images.push(imageObj);
                  }
                }
              });
            }
          }
          
          // Map the data to ensure proper structure and validate product IDs
          const mappedData = items.map((item, index) => {
            const product = item.product_id ? productsMap.get(item.product_id) : null;
            const variant = item.variant_id ? variantsMap.get(item.variant_id) : null;

            console.log(`🔍 Processing item ${index + 1}:`, {
              itemId: item.id,
              productId: item.product_id,
              variantId: item.variant_id,
              hasProduct: !!product,
              hasVariant: !!variant
            });

            // Validate product ID exists
            if (!item.product_id) {
              console.warn(`⚠️ Item ${item.id} has no product_id`);
              logPurchaseOrderError('missing_product_id', new Error('Missing product_id'), {
                purchaseOrderId: trimmedId,
                productId: item.product_id,
                variantId: item.variant_id,
                itemId: item.id
              });
            }

            // Validate variant ID exists
            if (!item.variant_id) {
              console.warn(`⚠️ Item ${item.id} has no variant_id`);
              logPurchaseOrderError('missing_variant_id', new Error('Missing variant_id'), {
                purchaseOrderId: trimmedId,
                productId: item.product_id,
                variantId: item.variant_id,
                itemId: item.id
              });
            }

            return {
              ...item,
              product,
              variant,
              name: product?.name || variant?.name || 'Unknown Product',
              sku: product?.sku || variant?.sku || 'N/A',
              description: product?.description || '',
              productName: product?.name || 'Unknown Product',
              variantName: variant?.name || 'Default Variant'
            };
          });

          console.log(`✅ Successfully mapped ${mappedData.length} items with product information`);
          return mappedData;
        },
        'load_shipped_items',
        this.MAX_RETRIES,
        // Fallback operation without joins
        async () => {
          console.log('🔄 Attempting fallback query without joins...');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('lats_purchase_order_items')
            .select('*')
            .eq('purchase_order_id', trimmedId);

          if (fallbackError) {
            // Log detailed fallback error
            logPurchaseOrderError('load_shipped_items_fallback_query', fallbackError, {
              purchaseOrderId: trimmedId,
              operation: 'load_shipped_items_fallback'
            }, {
              code: fallbackError.code,
              message: fallbackError.message,
              details: fallbackError.details,
              table: 'lats_purchase_order_items'
            });
            throw fallbackError;
          }

          console.log(`⚠️ Fallback query succeeded, found ${fallbackData?.length || 0} items (without product details)`);
          
          // Map fallback data with basic information
          const mappedFallbackData = (fallbackData || []).map((item, index) => {
            console.log(`🔍 Processing fallback item ${index + 1}:`, {
              itemId: item.id,
              productId: item.product_id,
              variantId: item.variant_id
            });

            return {
              ...item,
              name: `Product ID: ${item.product_id || 'Unknown'}`,
              sku: `SKU-${item.product_id || 'Unknown'}`,
              description: 'Product details not available',
              productName: `Product ID: ${item.product_id || 'Unknown'}`,
              variantName: `Variant ID: ${item.variant_id || 'Unknown'}`,
              product: null,
              variant: null
            };
          });

          console.log(`✅ Fallback mapping completed for ${mappedFallbackData.length} items`);
          return mappedFallbackData;
        }
      );
    }, 'load_shipped_items', { purchaseOrderId }).then(result => {
      if (result.success) {
        return result.data || [];
      } else {
        throw new Error(result.error);
      }
    });
  }

  static async updateShippedItem(
    itemId: string, 
    data: Partial<any>
  ): Promise<boolean> {
    return this.retryOperation(async () => {
      const { error } = await supabase
        .from('lats_purchase_order_items')
        .update(data)
        .eq('id', itemId);

      if (error) {
        console.error('Error updating shipped item:', error);
        throw error;
      }
      return true;
    }, 'update_shipped_item');
  }

  static async markItemAsReceived(
    shippedItemId: string, 
    receivedQuantity: number, 
    notes?: string
  ): Promise<boolean> {
    return this.retryOperation(async () => {
      const { error } = await supabase
        .from('lats_purchase_order_items')
        .update({
          quantity_received: receivedQuantity,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', shippedItemId);

      if (error) {
        console.error('Error marking item as received:', error);
        throw error;
      }
      return true;
    }, 'mark_item_received');
  }

  static async reportDamage(
    shippedItemId: string, 
    damageReport: string
  ): Promise<boolean> {
    return this.retryOperation(async () => {
      const { error } = await supabase
        .from('lats_purchase_order_items')
        .update({
          damage_report: damageReport,
          status: 'damaged',
          updated_at: new Date().toISOString()
        })
        .eq('id', shippedItemId);

      if (error) {
        console.error('Error reporting damage:', error);
        throw error;
      }
      return true;
    }, 'report_damage');
  }

  // Enhanced partial receive functions with serial number support
  static async updateReceivedQuantities(
    purchaseOrderId: string,
    receivedItems: Array<{ 
      id: string; 
      receivedQuantity: number;
      serialNumbers?: Array<{
        serial_number: string;
        imei?: string;
        mac_address?: string;
        barcode?: string;
        location?: string;
        notes?: string;
      }>;
    }>,
    userId: string
  ): Promise<{ success: boolean; message: string; updatedItems: number }> {
    try {
      // Validate input
      if (!receivedItems || receivedItems.length === 0) {
        return { success: false, message: 'No items provided for update', updatedItems: 0 };
      }

      // First, get existing items with validation data
      const { data: existingItems, error: fetchError } = await supabase
        .from('lats_purchase_order_items')
        .select('id, purchase_order_id, quantity_ordered, quantity_received')
        .eq('purchase_order_id', purchaseOrderId);

      if (fetchError) {
        console.error('Error fetching existing items:', fetchError);
        return { success: false, message: 'Failed to fetch existing items', updatedItems: 0 };
      }

      if (!existingItems || existingItems.length === 0) {
        return { success: false, message: 'No items found for this purchase order', updatedItems: 0 };
      }

      const existingItemMap = new Map(existingItems.map(item => [item.id, item]));
      const validItems: Array<{ id: string; receivedQuantity: number; alreadyReceived: number }> = [];
      const invalidItems: string[] = [];

      // Validate each received item
      for (const item of receivedItems) {
        const existingItem = existingItemMap.get(item.id);
        
        if (!existingItem) {
          invalidItems.push(`Item ${item.id} not found in purchase order`);
          continue;
        }

        if (item.receivedQuantity < 0) {
          invalidItems.push(`Item ${item.id}: Received quantity cannot be negative`);
          continue;
        }

        // Calculate remaining quantity that can be received
        const alreadyReceived = existingItem.quantity_received || 0;
        const remainingQuantity = existingItem.quantity_ordered - alreadyReceived;

        if (item.receivedQuantity > remainingQuantity) {
          invalidItems.push(`Item ${item.id}: Received quantity (${item.receivedQuantity}) cannot exceed remaining quantity (${remainingQuantity})`);
          continue;
        }

        validItems.push({
          id: item.id,
          receivedQuantity: item.receivedQuantity,
          alreadyReceived: alreadyReceived
        });
      }

      if (invalidItems.length > 0) {
        return { 
          success: false, 
          message: `Validation errors: ${invalidItems.join('; ')}`, 
          updatedItems: 0 
        };
      }

      if (validItems.length === 0) {
        return { success: false, message: 'No valid items found for update', updatedItems: 0 };
      }

      // Update each item individually (more reliable than RPC function)
      let updateCount = 0;
      const updateErrors: string[] = [];

      for (const item of validItems) {
        const { error: updateError } = await supabase
          .from('lats_purchase_order_items')
          .update({ 
            quantity_received: item.alreadyReceived + item.receivedQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
          .eq('purchase_order_id', purchaseOrderId);

        if (updateError) {
          console.error(`Error updating item ${item.id}:`, updateError);
          updateErrors.push(`Item ${item.id}: ${updateError.message}`);
        } else {
          updateCount++;
        }
      }

      if (updateErrors.length > 0) {
        console.error('Some updates failed:', updateErrors);
        if (updateCount === 0) {
          return { success: false, message: `All updates failed: ${updateErrors.join('; ')}`, updatedItems: 0 };
        }
        // Partial success
        console.warn(`${updateCount}/${validItems.length} items updated successfully`);
      }

      // Check if all items were updated successfully
      const { data: updatedItems, error: verifyError } = await supabase
        .from('lats_purchase_order_items')
        .select('id, quantity_received')
        .eq('purchase_order_id', purchaseOrderId)
        .in('id', validItems.map(item => item.id));

      if (verifyError) {
        console.error('Error verifying updates:', verifyError);
        return { success: false, message: 'Update completed but verification failed', updatedItems: validItems.length };
      }

      const successfullyUpdated = updatedItems?.filter(item => 
        validItems.find(validItem => 
          validItem.id === item.id && 
          validItem.receivedQuantity === item.quantity_received
        )
      ).length || 0;

      // Process serial numbers for items that have them
      await this.processSerialNumbers(purchaseOrderId, receivedItems, userId);

      // Create inventory adjustments for items without serial numbers
      await this.createInventoryAdjustments(purchaseOrderId, receivedItems, userId);

      return { 
        success: true, 
        message: `Successfully updated ${successfullyUpdated} items`, 
        updatedItems: successfullyUpdated 
      };

    } catch (error) {
      console.error('Error updating received quantities:', error);
      return { 
        success: false, 
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        updatedItems: 0 
      };
    }
  }

  // Get purchase order items with product details using new database function
  static async getPurchaseOrderItemsWithProducts(purchaseOrderId: string): Promise<{
    success: boolean;
    data?: any[];
    message?: string;
  }> {
    try {
      console.log('🔍 [PurchaseOrderService] Fetching purchase order items for PO:', purchaseOrderId);
      
      // Use the new database function for better performance
      const { data: orderItems, error } = await supabase
        .rpc('get_purchase_order_items_with_products', { purchase_order_id_param: purchaseOrderId });

      if (error) {
        console.error('❌ Error fetching purchase order items:', error);
        return { success: false, message: 'Failed to fetch purchase order items' };
      }

      // Format the results to match expected structure
      const formattedItems = (orderItems || []).map(item => ({
        id: item.id,
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
        costPrice: parseFloat(item.unit_cost.toString()),
        totalPrice: parseFloat(item.total_cost.toString()),
        receivedQuantity: item.received_quantity || 0,
        notes: item.notes,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        product: {
          id: item.product_id,
          name: item.product_name,
          sku: item.product_sku
        },
        variant: {
          id: item.variant_id,
          name: item.variant_name,
          sku: item.variant_sku
        }
      }));

      console.log('✅ [PurchaseOrderService] Purchase order items fetched:', {
        total: formattedItems.length
      });

      return {
        success: true,
        data: formattedItems,
        message: `Found ${formattedItems.length} purchase order items`
      };

    } catch (error) {
      console.error('❌ [PurchaseOrderService] Error fetching purchase order items:', error);
      return {
        success: false,
        message: `Failed to fetch purchase order items: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Complete a purchase order after receiving
  static async completePurchaseOrder(
    purchaseOrderId: string,
    userId: string,
    completionNotes?: string
  ): Promise<{
    success: boolean;
    data?: any;
    message?: string;
    error_code?: string;
  }> {
    try {
      console.log('🔍 [PurchaseOrderService] Completing purchase order:', purchaseOrderId);

      const { data, error } = await supabase
        .rpc('complete_purchase_order', {
          purchase_order_id_param: purchaseOrderId,
          user_id_param: userId,
          completion_notes: completionNotes || 'Purchase order completed'
        });

      if (error) throw error;

      console.log('📦 [PurchaseOrderService] Raw RPC response:', data);

      // Handle different response formats from Supabase RPC
      let resultData = data;
      
      // If result is an array, get the first element
      if (Array.isArray(resultData)) {
        resultData = resultData[0];
      }
      
      // If result is wrapped with function name, unwrap it
      if (resultData?.complete_purchase_order) {
        resultData = resultData.complete_purchase_order;
      }

      console.log('📦 [PurchaseOrderService] Parsed result:', resultData);

      // Check if the RPC function returned an error response
      if (resultData && !resultData.success) {
        console.error('❌ [PurchaseOrderService] Completion failed:', resultData);
        return {
          success: false,
          message: resultData.message || 'Failed to complete purchase order',
          error_code: resultData.error_code,
          data: resultData
        };
      }

      console.log('✅ [PurchaseOrderService] Purchase order completed successfully:', resultData);

      return {
        success: true,
        data: resultData?.data || resultData,
        message: resultData?.message || 'Purchase order completed successfully'
      };
    } catch (error) {
      console.error('❌ [PurchaseOrderService] Error completing purchase order:', error);
      return {
        success: false,
        message: `Failed to complete purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error_code: 'NETWORK_ERROR'
      };
    }
  }

  // Check purchase order completion status
  static async checkCompletionStatus(purchaseOrderId: string): Promise<{
    success: boolean;
    data?: {
      total_items: number;
      completed_items: number;
      can_complete: boolean;
      completion_percentage: number;
    };
    message?: string;
  }> {
    try {
      console.log('🔍 [PurchaseOrderService] Checking completion status for PO:', purchaseOrderId);

      const { data, error } = await supabase
        .rpc('check_purchase_order_completion_status', {
          purchase_order_id_param: purchaseOrderId
        });

      if (error) throw error;

      console.log('📦 [PurchaseOrderService] Raw status response:', data);

      // Handle different response formats from Supabase RPC
      let resultData = data;
      
      // If result is an array, get the first element
      if (Array.isArray(resultData)) {
        resultData = resultData[0];
      }
      
      // If result is wrapped with function name, unwrap it
      if (resultData?.check_purchase_order_completion_status) {
        resultData = resultData.check_purchase_order_completion_status;
      }

      console.log('📦 [PurchaseOrderService] Parsed status:', resultData);

      return {
        success: true,
        data: resultData?.data || resultData,
        message: resultData?.message || 'Completion status retrieved successfully'
      };
    } catch (error) {
      console.error('❌ [PurchaseOrderService] Error checking completion status:', error);
      return {
        success: false,
        message: `Failed to check completion status: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Fix received quantities for a purchase order
  static async fixReceivedQuantities(purchaseOrderId: string, userId: string): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> {
    try {
      console.log('🔍 [PurchaseOrderService] Fixing received quantities for PO:', purchaseOrderId);

      const { data, error } = await supabase
        .rpc('fix_purchase_order_received_quantities', {
          purchase_order_id_param: purchaseOrderId,
          user_id_param: userId
        });

      if (error) throw error;

      if (data && !data.success) {
        return {
          success: false,
          message: data.message || 'Failed to fix received quantities'
        };
      }

      return {
        success: true,
        data: data?.data || data,
        message: data?.message || 'Received quantities fixed successfully'
      };
    } catch (error) {
      console.error('❌ [PurchaseOrderService] Error fixing received quantities:', error);
      return {
        success: false,
        message: `Failed to fix received quantities: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Get received items (inventory items and adjustments) for a purchase order
  static async getReceivedItems(purchaseOrderId: string): Promise<{
    success: boolean;
    data?: any[];
    message?: string;
  }> {
    try {
      console.log('🔍 [PurchaseOrderService] Fetching received items for PO:', purchaseOrderId);
      
      // Try the RPC function first with retry (skip if function doesn't exist)
      try {
        const receivedItems = await this.retryOperation(
          async () => {
            const { data, error } = await supabase
              .rpc('get_received_items_for_po', { po_id: purchaseOrderId });
            
            if (error) {
              // If function doesn't exist, throw a specific error to trigger fallback
              if (error.message?.includes('function') || error.message?.includes('does not exist')) {
                throw new Error('RPC_FUNCTION_NOT_FOUND');
              }
              throw error;
            }
            return data;
          },
          'get_received_items_for_po'
        );

        if (receivedItems && receivedItems.length >= 0) {
          // Format the results to match expected structure
          const formattedItems = receivedItems.map(item => ({
            id: item.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            serial_number: item.serial_number,
            item_number: item.item_number,
            imei: item.imei,
            mac_address: item.mac_address,
            barcode: item.barcode,
            status: item.status,
            location: item.location,
            shelf: item.shelf,
            bin: item.bin,
            purchase_date: item.purchase_date,
            warranty_start: item.warranty_start,
            warranty_end: item.warranty_end,
            cost_price: Number(item.cost_price) || 0,
            selling_price: Number(item.selling_price) || 0,
            notes: item.notes,
            metadata: item.metadata,
            created_at: item.created_at,
            product: {
              id: item.product_id,
              name: item.product_name,
              sku: item.product_sku
            },
            variant: {
              id: item.variant_id,
              name: item.variant_name,
              sku: item.variant_sku
            },
            item_type: 'inventory_item',
            received_quantity: 1,
            has_serial: !!item.serial_number,
            batch_number: item.metadata?.batch_number || null
          }));

          console.log('✅ [PurchaseOrderService] Received items fetched via RPC:', {
            total: formattedItems.length
          });

          return {
            success: true,
            data: formattedItems,
            message: `Found ${formattedItems.length} received items`
          };
        }
      } catch (rpcError) {
        if (rpcError.message === 'RPC_FUNCTION_NOT_FOUND') {
          console.log('ℹ️ RPC function not found, using fallback method');
        } else {
          console.warn('⚠️ RPC function error, falling back to direct queries:', rpcError);
        }
      }

      // Fallback: Use direct queries if RPC fails
      console.log('🔄 [PurchaseOrderService] Using fallback method - direct queries');
      
      const allItems: any[] = [];

      // FIXED: Get inventory items without PostgREST syntax
      const inventoryItems = await this.retryOperation(
        async () => {
          const { data: items, error } = await supabase
            .from('inventory_items')
            .select('id, product_id, variant_id, serial_number, item_number, mac_address, barcode, status, location, shelf, bin, purchase_date, warranty_start, warranty_end, cost_price, selling_price, notes, metadata, created_at')
            .contains('metadata', { purchase_order_id: purchaseOrderId })
            .order('created_at', { ascending: false });
          
          if (error) throw error;

          if (!items || items.length === 0) {
            return [];
          }

          // Fetch related data separately
          const productIds = items.map(item => item.product_id).filter(Boolean);
          const variantIds = items.map(item => item.variant_id).filter(Boolean);

          const [productsResult, variantsResult] = await Promise.all([
            productIds.length > 0
              ? supabase.from('lats_products').select('id, name, sku, category_id').in('id', productIds)
              : Promise.resolve({ data: [], error: null }),
            variantIds.length > 0
              ? supabase.from('lats_product_variants').select('id, name, variant_name, sku').in('id', variantIds)  // 🔧 FIX: Select both name columns
              : Promise.resolve({ data: [], error: null })
          ]);

          // Map data for easy lookup
          const productsMap = new Map(productsResult.data?.map(p => [p.id, p]) || []);
          const variantsMap = new Map(variantsResult.data?.map(v => [v.id, { ...v, name: v.name || v.variant_name || 'Unnamed' }]) || []);  // 🔧 FIX: Prioritize 'name' first
          
          // Fetch product images
          if (productIds.length > 0) {
            const { data: productImages } = await supabase
              .from('product_images')
              .select('id, product_id, image_url, thumbnail_url, is_primary')
              .in('product_id', productIds)
              .order('is_primary', { ascending: false });
            
            // Attach images to products
            if (productImages) {
              productImages.forEach((image: any) => {
                const product = productsMap.get(image.product_id);
                if (product) {
                  if (!product.images) {
                    product.images = [];
                  }
                  const imageObj = {
                    id: image.id,
                    url: image.thumbnail_url || image.image_url,
                    thumbnailUrl: image.thumbnail_url,
                    isPrimary: image.is_primary || false
                  };
                  if (image.is_primary) {
                    product.images.unshift(imageObj);
                  } else {
                    product.images.push(imageObj);
                  }
                }
              });
            }
          }

          // Combine data
          return items.map(item => ({
            ...item,
            product: item.product_id ? productsMap.get(item.product_id) : null,
            variant: item.variant_id ? variantsMap.get(item.variant_id) : null
          }));
        },
        'get_inventory_items'
      );

      if (inventoryItems) {
        const formattedInventoryItems = inventoryItems.map(item => ({
          id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          serial_number: item.serial_number,
          item_number: item.item_number,
          imei: item.imei,
          mac_address: item.mac_address,
          barcode: item.barcode,
          status: item.status,
          location: item.location,
          shelf: item.shelf,
          bin: item.bin,
          purchase_date: item.purchase_date,
          warranty_start: item.warranty_start,
          warranty_end: item.warranty_end,
          cost_price: Number(item.cost_price) || 0,
          selling_price: Number(item.selling_price) || 0,
          notes: item.notes,
          created_at: item.created_at,
          product: {
            id: item.product_id,
            name: item.product?.name || 'Unknown Product',
            sku: item.product?.sku || ''
          },
          variant: {
            id: item.variant_id,
            name: item.variant?.name || '',
            sku: item.variant?.sku || ''
          },
          item_type: 'inventory_item',
          received_quantity: 1,
          has_serial: true
        }));
        allItems.push(...formattedInventoryItems);
      }

      // FIXED: Get inventory adjustments without PostgREST syntax
      const adjustments = await this.retryOperation(
        async () => {
          const { data: adjustmentItems, error } = await supabase
            .from('lats_inventory_adjustments')
            .select('id, product_id, variant_id, quantity, cost_price, reason, adjustment_type, reference_id, created_at')
            .eq('adjustment_type', 'receive')
            .like('reason', `%purchase order ${purchaseOrderId}%`)
            .order('created_at', { ascending: false });
          
          if (error) throw error;

          if (!adjustmentItems || adjustmentItems.length === 0) {
            return [];
          }

          // Fetch related data separately
          const productIds = adjustmentItems.map(item => item.product_id).filter(Boolean);
          const variantIds = adjustmentItems.map(item => item.variant_id).filter(Boolean);

          const [productsResult, variantsResult] = await Promise.all([
            productIds.length > 0
              ? supabase.from('lats_products').select('id, name, sku').in('id', productIds)
              : Promise.resolve({ data: [], error: null }),
            variantIds.length > 0
              ? supabase.from('lats_product_variants').select('id, name, variant_name, sku').in('id', variantIds)  // 🔧 FIX: Select both name columns
              : Promise.resolve({ data: [], error: null })
          ]);

          // Map data for easy lookup
          const productsMap = new Map(productsResult.data?.map(p => [p.id, p]) || []);
          const variantsMap = new Map(variantsResult.data?.map(v => [v.id, { ...v, name: v.name || v.variant_name || 'Unnamed' }]) || []);  // 🔧 FIX: Prioritize 'name' first
          
          // Fetch product images
          if (productIds.length > 0) {
            const { data: productImages } = await supabase
              .from('product_images')
              .select('id, product_id, image_url, thumbnail_url, is_primary')
              .in('product_id', productIds)
              .order('is_primary', { ascending: false });
            
            // Attach images to products
            if (productImages) {
              productImages.forEach((image: any) => {
                const product = productsMap.get(image.product_id);
                if (product) {
                  if (!product.images) {
                    product.images = [];
                  }
                  const imageObj = {
                    id: image.id,
                    url: image.thumbnail_url || image.image_url,
                    thumbnailUrl: image.thumbnail_url,
                    isPrimary: image.is_primary || false
                  };
                  if (image.is_primary) {
                    product.images.unshift(imageObj);
                  } else {
                    product.images.push(imageObj);
                  }
                }
              });
            }
          }

          // Combine data
          return adjustmentItems.map(item => ({
            ...item,
            product: item.product_id ? productsMap.get(item.product_id) : null,
            variant: item.variant_id ? variantsMap.get(item.variant_id) : null
          }));
        },
        'get_inventory_adjustments'
      );

      if (adjustments) {
        const formattedAdjustments = adjustments.map(adjustment => ({
          id: adjustment.id,
          product_id: adjustment.product_id,
          variant_id: adjustment.variant_id,
          serial_number: null,
          imei: null,
          mac_address: null,
          barcode: null,
          status: 'received',
          location: null,
          shelf: null,
          bin: null,
          purchase_date: adjustment.created_at,
          warranty_start: null,
          warranty_end: null,
          cost_price: adjustment.cost_price,
          selling_price: null,
          notes: adjustment.reason,
          created_at: adjustment.created_at,
          product: {
            id: adjustment.product_id,
            name: adjustment.product?.name || 'Unknown Product',
            sku: adjustment.product?.sku || ''
          },
          variant: {
            id: adjustment.variant_id,
            name: adjustment.variant?.name || '',
            sku: adjustment.variant?.sku || ''
          },
          item_type: 'inventory_adjustment',
          received_quantity: adjustment.quantity,
          has_serial: false
        }));
        allItems.push(...formattedAdjustments);
      }

      // Sort all items by creation date (newest first)
      allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('✅ [PurchaseOrderService] Received items fetched via fallback:', {
        total: allItems.length,
        inventoryItems: allItems.filter(item => item.item_type === 'inventory_item').length,
        adjustments: allItems.filter(item => item.item_type === 'inventory_adjustment').length
      });

      return {
        success: true,
        data: allItems,
        message: `Found ${allItems.length} received items (${allItems.filter(item => item.item_type === 'inventory_item').length} inventory items, ${allItems.filter(item => item.item_type === 'inventory_adjustment').length} adjustments)`
      };

    } catch (error) {
      console.error('❌ [PurchaseOrderService] Error fetching received items:', error);
      return {
        success: false,
        message: `Failed to fetch received items: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Enhanced receive functions
  static async completeReceive(
    purchaseOrderId: string,
    userId: string,
    receiveNotes?: string
  ): Promise<{ success: boolean; message: string; summary?: any }> {
    try {
      console.log('📦 [PurchaseOrderService] Starting completeReceive:', {
        purchaseOrderId,
        userId,
        receiveNotes
      });

      // Use the database function for complete receive
      const { data, error } = await supabase
        .rpc('complete_purchase_order_receive', {
          purchase_order_id_param: purchaseOrderId,
          user_id_param: userId,
          receive_notes: receiveNotes || null
        });

      console.log('📦 [PurchaseOrderService] RPC response:', { data, error });

      if (error) {
        console.error('❌ [PurchaseOrderService] Error completing receive:', error);
        return { success: false, message: `Receive failed: ${error.message}` };
      }

      // The database function returns a JSON object
      // Check if the function returned success: false
      if (data && typeof data === 'object' && 'success' in data) {
        if (!data.success) {
          console.error('❌ [PurchaseOrderService] Function returned failure:', data);
          return { 
            success: false, 
            message: data.message || 'Receive operation failed'
          };
        }
      }

      // Get receive summary
      const summaryResult = await this.getReceiveSummary(purchaseOrderId);
      
      // 🔥 EMIT EVENT: Notify inventory page to refresh
      latsEventBus.emit('lats:purchase-order.received', {
        purchaseOrderId,
        userId,
        notes: receiveNotes
      });
      
      console.log('✅ [PurchaseOrderService] Complete receive event emitted');
      
      return { 
        success: true, 
        message: 'Purchase order received successfully',
        summary: summaryResult.success ? summaryResult.data : null
      };
    } catch (error) {
      console.error('❌ [PurchaseOrderService] Error in completeReceive:', error);
      return { 
        success: false, 
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Enhanced partial receive functions with serial number support
  static async partialReceive(
    purchaseOrderId: string,
    receivedItems: Array<{
      item_id: string;
      quantity: number;
    }>,
    userId: string,
    receiveNotes?: string
  ): Promise<{ success: boolean; message: string; summary?: any }> {
    try {
      console.log('📦 [PurchaseOrderService] Starting partialReceive:', {
        purchaseOrderId,
        receivedItems,
        userId,
        receiveNotes
      });

      // Convert received items to the format expected by the RPC
      const receivedItemsJsonb = receivedItems.map(item => ({
        item_id: item.item_id,
        quantity: item.quantity
      }));

      console.log('📦 [PurchaseOrderService] Calling partial_purchase_order_receive RPC with:', {
        purchase_order_id_param: purchaseOrderId,
        received_items: receivedItemsJsonb,
        user_id_param: userId,
        receive_notes: receiveNotes || null
      });

      // Use the database RPC function for partial receive
      const { data, error } = await supabase
        .rpc('partial_purchase_order_receive', {
          purchase_order_id_param: purchaseOrderId,
          received_items: receivedItemsJsonb,
          user_id_param: userId,
          receive_notes: receiveNotes || null
        });

      console.log('📦 [PurchaseOrderService] RPC response:', { data, error });

      if (error) {
        console.error('❌ [PurchaseOrderService] Error in partialReceive:', error);
        return { success: false, message: `Partial receive failed: ${error.message}` };
      }

      // The database function returns a JSON object
      // Check if the function returned success: false
      if (data && typeof data === 'object' && 'success' in data) {
        if (!data.success) {
          console.error('❌ [PurchaseOrderService] Function returned failure:', data);
          return {
            success: false,
            message: data.message || 'Partial receive operation failed'
          };
        }
      }

      // Get receive summary
      const summaryResult = await this.getReceiveSummary(purchaseOrderId);

      // 🔥 EMIT EVENT: Notify inventory page to refresh
      latsEventBus.emit('lats:purchase-order.received', {
        purchaseOrderId,
        userId,
        notes: receiveNotes
      });

      console.log('✅ [PurchaseOrderService] Partial receive event emitted');

      return {
        success: true,
        message: 'Partial receive completed successfully',
        summary: summaryResult.success ? summaryResult.data : null
      };
    } catch (error) {
      console.error('❌ [PurchaseOrderService] Error in partialReceive:', error);
      return {
        success: false,
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Finalize receive - only update status and stock movements (inventory items already created)
  static async finalizeReceive(
    purchaseOrderId: string,
    receivingQuantities: Map<string, number>,
    userId: string,
    isPartialReceive: boolean,
    receiveNotes?: string
  ): Promise<{ success: boolean; message: string; summary?: any }> {
    try {
      console.log('📦 [PurchaseOrderService] Starting finalizeReceive:', {
        purchaseOrderId,
        userId,
        isPartialReceive,
        receiveNotes
      });

      // Get current PO status and items
      const { data: poData, error: poError } = await supabase
        .from('lats_purchase_orders')
        .select('id, status, po_number')
        .eq('id', purchaseOrderId)
        .single();

      if (poError || !poData) {
        console.error('❌ Error fetching PO:', poError);
        return { success: false, message: 'Purchase order not found' };
      }

      // Get PO items to calculate totals
      const { data: poItems, error: itemsError } = await supabase
        .from('lats_purchase_order_items')
        .select('id, quantity_ordered, quantity_received, product_id, variant_id, unit_cost, product:lats_products(name), variant:lats_product_variants(name, quantity)')
        .eq('purchase_order_id', purchaseOrderId);

      if (itemsError) {
        console.error('❌ Error fetching PO items:', itemsError);
        return { success: false, message: 'Failed to fetch purchase order items' };
      }

      // Calculate totals
      let totalOrdered = 0;
      let totalReceived = 0;
      const allReceived = poItems.every(item => item.quantity_received >= item.quantity_ordered);

      poItems.forEach(item => {
        totalOrdered += item.quantity_ordered;
        totalReceived += item.quantity_received || 0;
      });

      const newStatus = allReceived ? 'received' : 'partial_received';

      console.log('📊 Finalize receive calculations:', {
        totalOrdered,
        totalReceived,
        allReceived,
        newStatus: isPartialReceive && !allReceived ? 'partial_received' : newStatus
      });

      // Begin transaction
      const { error: txError } = await supabase.rpc('begin_transaction_if_not_exists');

      try {
        // Update PO status
        const finalStatus = isPartialReceive && !allReceived ? 'partial_received' : newStatus;
        const { error: statusError } = await supabase
          .from('lats_purchase_orders')
          .update({
            status: finalStatus,
            received_date: allReceived ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', purchaseOrderId);

        if (statusError) {
          throw statusError;
        }

        // Create stock movements and update variant quantities for newly available items
        for (const item of poItems) {
          const receivedQuantity = item.quantity_received || 0;
          const previouslyReceived = receivedQuantity - (receivingQuantities.get(item.id) || 0);

          if (receivedQuantity > previouslyReceived && item.variant_id) {
            const quantityToAdd = receivedQuantity - previouslyReceived;

            // Get current variant quantity
            const { data: variant, error: variantError } = await supabase
              .from('lats_product_variants')
              .select('quantity')
              .eq('id', item.variant_id)
              .single();

            if (variantError) {
              console.warn(`Warning: Could not get variant quantity for ${item.variant_id}:`, variantError);
              continue;
            }

            const currentQuantity = variant.quantity || 0;

            // Update variant quantity
            const { error: updateError } = await supabase
              .from('lats_product_variants')
              .update({
                quantity: currentQuantity + quantityToAdd,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.variant_id);

            if (updateError) {
              console.warn(`Warning: Could not update variant quantity for ${item.variant_id}:`, updateError);
              continue;
            }

            // Create stock movement record
            const { error: movementError } = await supabase
              .from('lats_stock_movements')
              .insert({
                product_id: item.product_id,
                variant_id: item.variant_id,
                movement_type: 'in',
                quantity: quantityToAdd,
                previous_quantity: currentQuantity,
                new_quantity: currentQuantity + quantityToAdd,
                reason: isPartialReceive ? 'Purchase Order Partial Receipt' : 'Purchase Order Receipt',
                reference: `PO-${(poData as any).order_number || poData.po_number || purchaseOrderId}`,
                notes: `Finalized receive: ${quantityToAdd} units${receiveNotes ? ` - ${receiveNotes}` : ''}`,
                created_by: userId,
                created_at: new Date().toISOString()
              });

            if (movementError) {
              console.warn(`Warning: Could not create stock movement for ${item.variant_id}:`, movementError);
            }
          }
        }

        // Create audit log
        const { error: auditError } = await supabase
          .from('lats_purchase_order_audit_log')
          .insert({
            purchase_order_id: purchaseOrderId,
            action: isPartialReceive ? 'Partial Receive Finalized' : 'Receive Finalized',
            old_status: poData.status,
            new_status: finalStatus,
            user_id: userId,
            notes: receiveNotes || `Finalized ${isPartialReceive ? 'partial' : 'complete'} receive`,
            created_at: new Date().toISOString()
          });

        if (auditError) {
          console.warn('Warning: Could not create audit log:', auditError);
        }

        // Commit transaction
        const { error: commitError } = await supabase.rpc('commit_transaction_if_exists');
        if (commitError) {
          console.warn('Warning: Could not commit transaction:', commitError);
        }

        // Get receive summary
        const summaryResult = await this.getReceiveSummary(purchaseOrderId);

        // 🔥 EMIT EVENT: Notify inventory page to refresh
        latsEventBus.emit('lats:purchase-order.received', {
          purchaseOrderId,
          userId,
          notes: receiveNotes
        });

        console.log('✅ [PurchaseOrderService] Finalize receive completed successfully');

        return {
          success: true,
          message: isPartialReceive && !allReceived
            ? `Partial receive finalized! ${totalReceived}/${totalOrdered} items received.`
            : 'Receive finalized successfully!',
          summary: summaryResult.success ? summaryResult.data : null
        };

      } catch (error) {
        // Rollback transaction
        const { error: rollbackError } = await supabase.rpc('rollback_transaction_if_exists');
        if (rollbackError) {
          console.warn('Warning: Could not rollback transaction:', rollbackError);
        }
        throw error;
      }

    } catch (error) {
      console.error('❌ [PurchaseOrderService] Error in finalizeReceive:', error);
      return { 
        success: false, 
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  static async processReturn(
    purchaseOrderId: string,
    itemId: string,
    returnType: 'damage' | 'defect' | 'wrong_item' | 'excess' | 'other',
    returnQuantity: number,
    returnReason: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase
        .rpc('process_purchase_order_return', {
          purchase_order_id_param: purchaseOrderId,
          item_id_param: itemId,
          return_type_param: returnType,
          return_quantity_param: returnQuantity,
          return_reason_param: returnReason,
          user_id_param: userId
        });

      if (error) {
        console.error('Error processing return:', error);
        return { success: false, message: `Return failed: ${error.message}` };
      }

      return { success: true, message: 'Return processed successfully' };
    } catch (error) {
      console.error('Error in processReturn:', error);
      return { 
        success: false, 
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  static async getReceiveSummary(purchaseOrderId: string): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('get_purchase_order_receive_summary', {
          purchase_order_id_param: purchaseOrderId
        });

      if (error) {
        console.error('Error getting receive summary:', error);
        return { success: false, message: 'Failed to get receive summary' };
      }

      return { success: true, data: data?.[0] || null };
    } catch (error) {
      console.error('Error in getReceiveSummary:', error);
      return { 
        success: false, 
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  static async getReturns(purchaseOrderId: string): Promise<{
    success: boolean;
    data?: any[];
    message?: string;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('get_purchase_order_returns', {
          purchase_order_id_param: purchaseOrderId
        });

      if (error) {
        console.error('Error getting returns:', error);
        return { success: false, message: 'Failed to get returns' };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error in getReturns:', error);
      return { 
        success: false, 
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Quality control functions
  static async addQualityCheck(
    purchaseOrderId: string,
    itemId: string,
    checkData: {
      passed: boolean;
      notes?: string;
      checkedBy: string;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('purchase_order_quality_checks')
        .insert({
          purchase_order_id: purchaseOrderId,
          item_id: itemId,
          passed: checkData.passed,
          notes: checkData.notes,
          checked_by: checkData.checkedBy,
          timestamp: new Date().toISOString()
        });

      if (error) throw error;

      // Add audit entry
      await this.addAuditEntry({
        purchaseOrderId,
        action: 'Quality check',
        user: checkData.checkedBy,
        details: `Quality check ${checkData.passed ? 'passed' : 'failed'} for item ${itemId}`
      });

      return true;
    } catch (error) {
      console.error('Error adding quality check:', error);
      return false;
    }
  }

  // Create inventory adjustments for items without serial numbers
  private static async createInventoryAdjustments(
    purchaseOrderId: string,
    receivedItems: Array<{ 
      id: string; 
      receivedQuantity: number;
      serialNumbers?: Array<{
        serial_number: string;
        imei?: string;
        mac_address?: string;
        barcode?: string;
        location?: string;
        notes?: string;
      }>;
    }>,
    userId: string
  ): Promise<void> {
    try {
      // Get purchase order items to get product_id and variant_id
      const { data: orderItems, error: itemsError } = await supabase
        .from('lats_purchase_order_items')
        .select('id, product_id, variant_id, unit_cost')
        .eq('purchase_order_id', purchaseOrderId)
        .in('id', receivedItems.map(item => item.id));

      if (itemsError) {
        console.error('Error fetching order items for inventory adjustments:', itemsError);
        return;
      }

      // Process each item that doesn't have serial numbers
      for (const receivedItem of receivedItems) {
        // Skip items that have serial numbers (they're handled by processSerialNumbers)
        if (receivedItem.serialNumbers && receivedItem.serialNumbers.length > 0) {
          continue;
        }

        // Skip items with 0 received quantity
        if (receivedItem.receivedQuantity <= 0) {
          continue;
        }

        const orderItem = orderItems?.find(item => item.id === receivedItem.id);
        if (!orderItem) {
          console.warn(`Order item not found for received item ${receivedItem.id}`);
          continue;
        }

        // CHANGED: Create inventory items (without serial numbers) with pending_pricing status
        // This ensures all received items go through the pricing workflow
        const inventoryItemsToCreate = [];
        for (let i = 0; i < receivedItem.receivedQuantity; i++) {
          inventoryItemsToCreate.push({
            product_id: orderItem.product_id,
            variant_id: orderItem.variant_id,
            status: 'pending_pricing' as const,
            purchase_order_id: purchaseOrderId,
            cost_price: orderItem.unit_cost || 0,
            selling_price: null,
            notes: `Received from purchase order ${purchaseOrderId} - bulk item ${i + 1}`,
            metadata: {
              purchase_order_id: purchaseOrderId,
              purchase_order_item_id: receivedItem.id,
              received_by: userId,
              received_at: new Date().toISOString(),
              bulk_item: true,
              bulk_index: i + 1
            }
          });
        }

        // Insert all inventory items for this product
        const { error: insertError } = await supabase
          .from('inventory_items')
          .insert(inventoryItemsToCreate);

        if (insertError) {
          console.error(`Error creating inventory items for order item ${receivedItem.id}:`, insertError);
          continue;
        }

        // NOTE: Stock quantity update is now handled when items transition from pending_pricing to available
        // This ensures items are only counted in stock after pricing is set
        // The sync_variant_quantity trigger will handle the update automatically
        
        console.log(`✅ Created ${receivedItem.receivedQuantity} inventory items (pending pricing) for order item ${receivedItem.id}`);
      }
    } catch (error) {
      console.error('Error creating inventory adjustments:', error);
    }
  }

  // Process serial numbers for received items (UPDATED: Now creates IMEI variants)
  private static async processSerialNumbers(
    purchaseOrderId: string,
    receivedItems: Array<{ 
      id: string; 
      receivedQuantity: number;
      serialNumbers?: Array<{
        serial_number: string;
        imei?: string;
        mac_address?: string;
        barcode?: string;
        location?: string;
        notes?: string;
        cost_price?: number;
        selling_price?: number;
        warranty_start?: string;
        warranty_end?: string;
        warranty_months?: number;
        condition?: string;
      }>;
    }>,
    userId: string
  ): Promise<void> {
    try {
      // Get purchase order items with full details
      const { data: orderItems, error: itemsError } = await supabase
        .from('lats_purchase_order_items')
        .select(`
          id, 
          product_id, 
          variant_id, 
          unit_cost,
          product:lats_products(id, name, branch_id)
        `)
        .eq('purchase_order_id', purchaseOrderId)
        .in('id', receivedItems.map(item => item.id));

      if (itemsError) {
        console.error('Error fetching order items for serial numbers:', itemsError);
        return;
      }

      console.log('📦 Processing IMEI variants for received items...');

      // Process each item with serial numbers
      for (const receivedItem of receivedItems) {
        if (!receivedItem.serialNumbers || receivedItem.serialNumbers.length === 0) {
          continue; // Skip items without serial numbers
        }

        const orderItem = orderItems?.find(item => item.id === receivedItem.id);
        if (!orderItem) {
          console.warn(`Order item not found for received item ${receivedItem.id}`);
          continue;
        }

        const product = orderItem.product as any;
        if (!product) {
          console.warn(`Product not found for order item ${receivedItem.id}`);
          continue;
        }

        // Check if any item has IMEI - if so, use new IMEI variant system
        // ✅ FIX: Check if any item has IMEI (allows items with only serial number or only IMEI)
        const hasIMEI = receivedItem.serialNumbers.some(s => s.imei && s.imei.trim() !== '');

        if (hasIMEI) {
          // ✅ NEW SYSTEM: Parent-Child IMEI Variant System
          console.log(`✅ Using Parent-Child IMEI variant system for ${receivedItem.serialNumbers.length} devices`);

          // ✅ FIX: Process items with IMEI (serial_number is unified with IMEI)
          // ✅ UNIFIED: Serial number and IMEI are the same - always use IMEI value for both
          // Serial number is TEXT type and accepts any text value (no numeric validation)
          const variants = receivedItem.serialNumbers
            .filter(serial => serial.imei && serial.imei.trim() !== '')
            .map(serial => ({
              imei: String(serial.imei!),  // Explicitly convert to string/text
              serial_number: String(serial.imei!), // ✅ UNIFIED: Always use IMEI value for serial_number (as TEXT)
              mac_address: serial.mac_address,
              condition: serial.condition || 'new',
              cost_price: serial.cost_price || orderItem.unit_cost || 0,
              // ✅ FIX: Pass null instead of 0 to let database inherit from parent
              selling_price: serial.selling_price ?? null,
              location: serial.location,
              warranty_start: serial.warranty_start,
              warranty_end: serial.warranty_end,
              notes: serial.notes || `Received from PO ${purchaseOrderId}`,
              source: 'purchase' as const,
            }));

          if (variants.length > 0 && orderItem.variant_id) {
            // ✅ Use Parent-Child System: Add IMEIs to parent variant
            const { addIMEIsToParentVariant, convertToParentVariant } = await import('../lib/imeiVariantService');
            
            // First, ensure the variant is marked as a parent
            await convertToParentVariant(orderItem.variant_id);
            console.log(`✅ Variant ${orderItem.variant_id} marked as parent`);
            
            // Add all IMEIs as children of the parent variant
            const result = await addIMEIsToParentVariant(
              orderItem.variant_id, // Parent variant ID from PO
              variants
            );

            if (result.success) {
              console.log(`✅ Added ${result.created} IMEI children to parent variant ${orderItem.variant_id}`);
              if (result.failed > 0) {
                console.warn(`⚠️ Failed to add ${result.failed} IMEIs:`, result.errors);
              }
            } else {
              console.error(`❌ Error adding IMEIs to parent variant:`, result.errors);
            }
          } else if (variants.length > 0 && !orderItem.variant_id) {
            // Fallback: Create parent variant if none exists
            console.warn(`⚠️ No variant_id found in PO item. Creating parent variant...`);
            const { createParentVariant, addIMEIsToParentVariant } = await import('../lib/imeiVariantService');
            
            const parentResult = await createParentVariant({
              product_id: orderItem.product_id,
              variant_name: 'Default Variant',
              branch_id: product.branch_id,
              cost_price: variants[0].cost_price,
              selling_price: variants[0].selling_price,
            });

            if (parentResult.success && parentResult.data) {
              const result = await addIMEIsToParentVariant(parentResult.data.id, variants);
              if (result.success) {
                console.log(`✅ Created parent variant and added ${result.created} IMEI children`);
              }
            }
          }

          // ✅ FIX: Handle items without IMEI (only serial numbers) - use legacy system
          // Items with only serial_number (no IMEI) go to legacy inventory_items
          const itemsWithoutIMEI = receivedItem.serialNumbers.filter(
            serial => (!serial.imei || serial.imei.trim() === '') && 
                      (serial.serial_number && serial.serial_number.trim() !== '')
          );

          if (itemsWithoutIMEI.length > 0) {
            console.log(`⚠️ ${itemsWithoutIMEI.length} items without IMEI, using legacy inventory_items`);
            try {
              await this.createLegacyInventoryItems(
                purchaseOrderId,
                orderItem,
                itemsWithoutIMEI,
                userId
              );
            } catch (error) {
              console.error(`❌ Failed to create legacy inventory items for items without IMEI:`, error);
              throw error; // Re-throw to fail the entire operation
            }
          }
        } else {
          // ⚠️ LEGACY SYSTEM: No IMEI, use old inventory_items approach
          console.log(`⚠️ Using legacy inventory_items for ${receivedItem.serialNumbers.length} items (no IMEI)`);
          try {
            await this.createLegacyInventoryItems(
              purchaseOrderId,
              orderItem,
              receivedItem.serialNumbers,
              userId
            );
          } catch (error) {
            console.error(`❌ Failed to create legacy inventory items:`, error);
            throw error; // Re-throw to fail the entire operation
          }
          
          // ✅ FIX: If fewer serial numbers provided than received quantity, create items for the difference
          const serialNumbersCount = receivedItem.serialNumbers.length;
          const receivedQuantity = receivedItem.receivedQuantity;
          
          if (serialNumbersCount < receivedQuantity) {
            const itemsWithoutSerial = receivedQuantity - serialNumbersCount;
            console.log(`⚠️ Received ${receivedQuantity} items but only ${serialNumbersCount} serial numbers provided. Creating ${itemsWithoutSerial} items without serial numbers.`);
            
            try {
              const inventoryItemsToCreate = [];
              for (let i = 0; i < itemsWithoutSerial; i++) {
                inventoryItemsToCreate.push({
                  product_id: orderItem.product_id,
                  variant_id: orderItem.variant_id,
                  status: 'available' as const,
                  purchase_order_id: purchaseOrderId,
                  purchase_order_item_id: orderItem.id,
                  cost_price: orderItem.unit_cost || 0,
                  selling_price: null,
                  notes: `Received from purchase order ${purchaseOrderId} - item without serial number ${i + 1}`,
                  metadata: {
                    purchase_order_id: purchaseOrderId,
                    purchase_order_item_id: orderItem.id,
                    received_by: userId,
                    received_at: new Date().toISOString(),
                    no_serial_number: true,
                    item_index: serialNumbersCount + i + 1
                  }
                });
              }

              const { error: insertError } = await supabase
                .from('inventory_items')
                .insert(inventoryItemsToCreate);

              if (insertError) {
                console.error(`Error creating inventory items without serial numbers:`, insertError);
              } else {
                console.log(`✅ Created ${itemsWithoutSerial} inventory items without serial numbers`);
                
                // Update variant quantity for items without serial numbers
                if (orderItem.variant_id && itemsWithoutSerial > 0) {
                  try {
                    const { data: variant, error: variantError } = await supabase
                      .from('lats_product_variants')
                      .select('quantity')
                      .eq('id', orderItem.variant_id)
                      .single();

                    if (!variantError && variant) {
                      const currentQuantity = variant.quantity || 0;
                      const { error: updateError } = await supabase
                        .from('lats_product_variants')
                        .update({
                          quantity: currentQuantity + itemsWithoutSerial,
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', orderItem.variant_id);

                      if (!updateError) {
                        console.log(`✅ Updated variant quantity: ${currentQuantity} -> ${currentQuantity + itemsWithoutSerial} (+${itemsWithoutSerial})`);
                      }
                    }
                  } catch (updateErr) {
                    console.warn(`Warning: Error updating variant quantity for items without serial numbers:`, updateErr);
                  }
                }
              }
            } catch (error) {
              console.error(`❌ Failed to create inventory items without serial numbers:`, error);
              // Don't throw - we already created items with serial numbers
            }
          }
        }

        console.log(`✅ Processed ${receivedItem.serialNumbers.length} items for order item ${receivedItem.id}`);
      }
    } catch (error) {
      console.error('Error processing serial numbers:', error);
    }
  }

  // Legacy method for items without IMEI
  private static async createLegacyInventoryItems(
    purchaseOrderId: string,
    orderItem: any,
    serialNumbers: Array<{
      serial_number: string;
      imei?: string;
      mac_address?: string;
      barcode?: string;
      location?: string;
      notes?: string;
      cost_price?: number;
      selling_price?: number;
      warranty_start?: string;
      warranty_end?: string;
      warranty_months?: number;
    }>,
    userId: string
  ): Promise<void> {
    try {
      // Validate input serial numbers
      if (!serialNumbers || serialNumbers.length === 0) {
        console.log('No serial numbers to process');
        return;
      }

      // ✅ FIX: Filter to keep items with EITHER serial_number OR IMEI (at least one required)
      const validSerialNumbers = serialNumbers.filter(serial => {
        const hasSerialNumber = serial.serial_number && serial.serial_number.trim() !== '';
        const hasIMEI = serial.imei && serial.imei.trim() !== '';
        return hasSerialNumber || hasIMEI; // At least one is required
      });

      if (validSerialNumbers.length === 0) {
        console.log('No serial numbers provided');
        return;
      }

      console.log(`✅ Creating ${validSerialNumbers.length} inventory items with serial numbers (accepting all as-is)`);

      // ✅ FIX: Create inventory items - allow either serial_number OR IMEI (or both)
      const inventoryItems = validSerialNumbers.map(serial => ({
        product_id: orderItem.product_id,
        variant_id: orderItem.variant_id,
        serial_number: serial.serial_number || null, // ✅ Allow null if only IMEI provided
        imei: serial.imei || null, // ✅ Allow null if only serial_number provided
        mac_address: serial.mac_address || null,
        barcode: serial.barcode || null,
        status: 'available' as const,
        purchase_order_id: purchaseOrderId,
        purchase_order_item_id: orderItem.id, // ✅ FIX: Set purchase_order_item_id
        location: serial.location || null,
        warranty_start: serial.warranty_start || null,
        warranty_end: serial.warranty_end || null,
        cost_price: serial.cost_price || orderItem.unit_cost || 0,
        selling_price: serial.selling_price || null,
        notes: serial.notes || `Received from purchase order ${purchaseOrderId}`,
        metadata: {
          purchase_order_id: purchaseOrderId,
          purchase_order_item_id: orderItem.id,
          received_by: userId,
          received_at: new Date().toISOString(),
          warranty_months: serial.warranty_months || 12,
          system: 'legacy'
        }
      }));

      const { error: insertError } = await supabase
        .from('inventory_items')
        .insert(inventoryItems);

      if (insertError) {
        console.error(`Error inserting legacy inventory items:`, insertError);
        // If duplicate key error, try to insert items one by one to handle duplicates gracefully
        if (insertError.code === '23505' && insertError.message?.includes('serial_number')) {
          console.warn(`⚠️ Some serial numbers may be duplicates. Attempting to insert individually...`);
          
          // Try inserting items one by one to handle duplicates
          let successCount = 0;
          for (const item of inventoryItems) {
            try {
              const { error: singleError } = await supabase
                .from('inventory_items')
                .insert(item);
              
              if (!singleError) {
                successCount++;
              } else {
                console.warn(`⚠️ Skipped duplicate/invalid serial number: ${item.serial_number}`, singleError);
              }
            } catch (err) {
              console.warn(`⚠️ Error inserting item with serial ${item.serial_number}:`, err);
            }
          }
          
          if (successCount === 0) {
            throw new Error(`Failed to insert any inventory items. All serial numbers may be duplicates or invalid.`);
          }
          
          console.log(`✅ Successfully inserted ${successCount} out of ${inventoryItems.length} inventory items`);
          
          // Update variant quantity based on successfully inserted items
          if (orderItem.variant_id && successCount > 0) {
            try {
              const { data: variant, error: variantError } = await supabase
                .from('lats_product_variants')
                .select('quantity')
                .eq('id', orderItem.variant_id)
                .single();

              if (!variantError && variant) {
                const currentQuantity = variant.quantity || 0;
                const { error: updateError } = await supabase
                  .from('lats_product_variants')
                  .update({
                    quantity: currentQuantity + successCount,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', orderItem.variant_id);

                if (!updateError) {
                  console.log(`✅ Updated variant ${orderItem.variant_id} quantity: ${currentQuantity} -> ${currentQuantity + successCount} (+${successCount})`);
                }
              }
            } catch (updateErr) {
              console.warn(`Warning: Error updating variant quantity:`, updateErr);
        }
          }
          
          return; // Exit early since we handled the error
        } else {
        throw insertError;
      }
      }

      // ✅ FIX: Update variant quantity after creating inventory items
      if (orderItem.variant_id && validSerialNumbers.length > 0) {
        try {
          // Get current variant quantity
          const { data: variant, error: variantError } = await supabase
            .from('lats_product_variants')
            .select('quantity')
            .eq('id', orderItem.variant_id)
            .single();

          if (variantError) {
            console.warn(`Warning: Could not get variant quantity for ${orderItem.variant_id}:`, variantError);
          } else {
            const currentQuantity = variant.quantity || 0;
            const quantityToAdd = validSerialNumbers.length;

            // Update variant quantity
            const { error: updateError } = await supabase
              .from('lats_product_variants')
              .update({
                quantity: currentQuantity + quantityToAdd,
                updated_at: new Date().toISOString()
              })
              .eq('id', orderItem.variant_id);

            if (updateError) {
              console.warn(`Warning: Could not update variant quantity for ${orderItem.variant_id}:`, updateError);
            } else {
              console.log(`✅ Updated variant ${orderItem.variant_id} quantity: ${currentQuantity} -> ${currentQuantity + quantityToAdd} (+${quantityToAdd})`);
            }

            // Create stock movement record for tracking
            try {
              const { error: movementError } = await supabase
                .from('lats_stock_movements')
                .insert({
                  product_id: orderItem.product_id,
                  variant_id: orderItem.variant_id,
                  movement_type: 'in',
                  quantity: quantityToAdd,
                  previous_quantity: currentQuantity,
                  new_quantity: currentQuantity + quantityToAdd,
                  reason: 'Purchase Order Receipt',
                  reference: `PO-${purchaseOrderId}`,
                  notes: `Received ${quantityToAdd} units with serial numbers from PO ${purchaseOrderId}`,
                  created_by: userId,
                  created_at: new Date().toISOString()
                });

              if (movementError) {
                console.warn(`Warning: Could not create stock movement:`, movementError);
              }
            } catch (movementErr) {
              console.warn(`Warning: Error creating stock movement:`, movementErr);
            }
          }
        } catch (updateErr) {
          console.warn(`Warning: Error updating variant quantity:`, updateErr);
        }
      }

      console.log(`✅ Successfully created ${validSerialNumbers.length} legacy inventory items`);
    } catch (error) {
      console.error('Error creating legacy inventory items:', error);
      throw error; // Re-throw to let caller handle it
    }
  }

  // Fix order status if needed
  static async fixOrderStatusIfNeeded(purchaseOrderId: string, userId: string): Promise<{ success: boolean; message: string; statusChanged?: boolean }> {
    console.log('🔧 [fixOrderStatusIfNeeded] Starting...', { purchaseOrderId, userId });
    try {
      console.log('🔧 [fixOrderStatusIfNeeded] Querying order...');
      // Check if order status needs fixing (e.g., draft orders with received items)
      const { data: order, error: orderError } = await supabase
        .from('lats_purchase_orders')
        .select(`
          id,
          status
        `)
        .eq('id', purchaseOrderId)
        .single();
      
      console.log('🔧 [fixOrderStatusIfNeeded] Order query result:', { order, orderError });

      if (orderError) {
        console.error('❌ Error fetching order in fixOrderStatusIfNeeded:', {
          purchaseOrderId,
          error: orderError,
          code: orderError.code,
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint
        });
        return { success: false, message: `Order query failed: ${orderError.message}` };
      }

      if (!order) {
        console.log('⚠️ Order not found:', purchaseOrderId);
        return { success: false, message: 'Order not found' };
      }

      // Fetch order items separately to avoid nested select issues
      const { data: items, error: itemsError } = await supabase
        .from('lats_purchase_order_items')
        .select('id, quantity_ordered, quantity_received')
        .eq('purchase_order_id', purchaseOrderId);

      if (itemsError) {
        console.error('❌ Error fetching order items in fixOrderStatusIfNeeded:', {
          purchaseOrderId,
          error: itemsError,
          code: itemsError.code,
          message: itemsError.message,
          details: itemsError.details,
          hint: itemsError.hint
        });
        return { success: false, message: `Items query failed: ${itemsError.message}` };
      }

      // Check if order has items
      if (!items || !Array.isArray(items) || items.length === 0) {
        return { success: true, message: 'Order has no items to check' };
      }

      // Attach items to order object for compatibility
      const orderWithItems = { ...order, items };

      // Check if order has received items but status is still sent
      const hasReceivedItems = items.some((item: any) => item.quantity_received > 0);
      const hasFullyReceivedItems = items.some((item: any) => item.quantity_received >= item.quantity_ordered);
      
      let newStatus = order.status;
      let statusChanged = false;

      // Simplified workflow: sent -> received
      if (order.status === 'sent' && hasReceivedItems) {
        newStatus = 'received';
        statusChanged = true;
      }

      if (statusChanged) {
        // Update the order status
        const { error: updateError } = await supabase
          .from('lats_purchase_orders')
          .update({ status: newStatus })
          .eq('id', purchaseOrderId);

        if (updateError) {
          console.error('❌ Error updating order status in fixOrderStatusIfNeeded:', {
            purchaseOrderId,
            oldStatus: order.status,
            newStatus,
            error: updateError,
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint
          });
          return { success: false, message: `Status update failed: ${updateError.message}` };
        }

        console.log(`✅ Order status updated from ${order.status} to ${newStatus} for PO: ${purchaseOrderId}`);
        return { 
          success: true, 
          message: `Order status updated to ${newStatus}`, 
          statusChanged: true 
        };
      }

      // No status change needed
      return { success: true, message: 'Order status is correct' };
    } catch (error) {
      // Enhanced error logging with better error object inspection
      const errorDetails = {
        purchaseOrderId,
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        errorConstructorName: error?.constructor?.name,
        errorKeys: error ? Object.keys(error) : [],
      };
      
      // Try to extract more info from the error
      try {
        if (error && typeof error === 'object') {
          Object.assign(errorDetails, {
            errorStringified: JSON.stringify(error, null, 2)
          });
        }
      } catch (stringifyError) {
        errorDetails.stringifyError = 'Could not stringify error';
      }
      
      console.error('❌ Exception in fixOrderStatusIfNeeded:', errorDetails);
      
      // Return a more informative error message
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return { 
        success: false, 
        message: `Failed to fix order status: ${errorMessage}` 
      };
    }
  }

  // Get purchase order inventory stats
  static async getPurchaseOrderInventoryStats(purchaseOrderId: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      // This is a placeholder implementation
      console.log('Getting inventory stats for PO:', purchaseOrderId);
      return { 
        success: true, 
        data: { totalItems: 0, receivedItems: 0, pendingItems: 0 },
        message: 'Inventory stats retrieved' 
      };
    } catch (error) {
      console.error('Error getting inventory stats:', error);
      return { success: false, message: 'Failed to get inventory stats' };
    }
  }

  // Update inventory item status
  static async updateInventoryItemStatus(itemId: string, status: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // This is a placeholder implementation
      console.log('Updating inventory item status:', itemId, status);
      return { success: true, message: 'Item status updated' };
    } catch (error) {
      console.error('Error updating inventory item status:', error);
      return { success: false, message: 'Failed to update item status' };
    }
  }

  // Export inventory to CSV
  static async exportInventoryToCSV(purchaseOrderId: string, filters: any): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      // This is a placeholder implementation
      console.log('Exporting inventory to CSV for PO:', purchaseOrderId);
      return { 
        success: true, 
        data: 'csv-data-here',
        message: 'Inventory exported to CSV' 
      };
    } catch (error) {
      console.error('Error exporting inventory:', error);
      return { success: false, message: 'Failed to export inventory' };
    }
  }

  // Check if all items are fully received
  static async areAllItemsFullyReceived(purchaseOrderId: string): Promise<boolean> {
    try {
      // This is a placeholder implementation
      console.log('Checking if all items are fully received for PO:', purchaseOrderId);
      return false;
    } catch (error) {
      console.error('Error checking if all items are fully received:', error);
      return false;
    }
  }

  // Simplified workflow functions
  static async submitForApproval(
    purchaseOrderId: string,
    userId: string,
    notes: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase
        .rpc('submit_po_for_approval', {
          purchase_order_id_param: purchaseOrderId,
          user_id_param: userId,
          approval_notes: notes
        });

      if (error) throw error;
      return { success: true, message: 'Purchase order sent to supplier' };
    } catch (error) {
      console.error('Error sending to supplier:', error);
      return { 
        success: false, 
        message: `Failed to send to supplier: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  static async markAsReceived(
    purchaseOrderId: string,
    userId: string,
    notes: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase
        .rpc('mark_po_as_received', {
          purchase_order_id_param: purchaseOrderId,
          user_id_param: userId,
          received_notes: notes
        });

      if (error) throw error;
      
      // 🔥 EMIT EVENT: Notify inventory page to refresh
      latsEventBus.emit('lats:purchase-order.received', {
        purchaseOrderId,
        userId,
        notes
      });
      
      console.log('✅ [PurchaseOrderService] Purchase order received event emitted');
      
      return { success: true, message: 'Purchase order marked as received' };
    } catch (error) {
      console.error('Error marking as received:', error);
      return { 
        success: false, 
        message: `Failed to mark as received: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  static async approvePurchaseOrder(
    purchaseOrderId: string,
    approverId: string,
    notes: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase
        .rpc('approve_po', {
          purchase_order_id_param: purchaseOrderId,
          approver_id_param: approverId,
          approval_notes_param: notes
        });

      if (error) throw error;
      return { success: true, message: 'Purchase order approved' };
    } catch (error) {
      console.error('Error approving purchase order:', error);
      return { 
        success: false, 
        message: `Failed to approve purchase order: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Get received items that need pricing (status = 'pending_pricing')
  // FIXED: Get received items for pricing without PostgREST syntax
  static async getReceivedItemsForPricing(
    purchaseOrderId: string
  ): Promise<Array<{
    inventory_item_id: string;
    product_name: string;
    variant_name?: string;
    serial_number: string;
    cost_price: number;
    selling_price?: number;
    location?: string;
  }>> {
    try {
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('id, product_id, variant_id, serial_number, cost_price, selling_price, location')
        .eq('purchase_order_id', purchaseOrderId)
        .eq('status', 'pending_pricing');

      if (error) {
        console.error('Error fetching items for pricing:', error);
        return [];
      }

      if (!items || items.length === 0) {
        return [];
      }

      // Fetch related data separately
      const productIds = items.map(item => item.product_id).filter(Boolean);
      const variantIds = items.map(item => item.variant_id).filter(Boolean);

      const [productsResult, variantsResult] = await Promise.all([
        productIds.length > 0
          ? supabase.from('lats_products').select('id, name').in('id', productIds)
          : Promise.resolve({ data: [], error: null }),
        variantIds.length > 0
          ? supabase.from('lats_product_variants').select('id, name, variant_name').in('id', variantIds)  // 🔧 FIX: Select both name columns
          : Promise.resolve({ data: [], error: null })
      ]);

      // Map data for easy lookup
      const productsMap = new Map(productsResult.data?.map(p => [p.id, p]) || []);
      const variantsMap = new Map(variantsResult.data?.map(v => [v.id, { ...v, name: v.name || v.variant_name || 'Unnamed' }]) || []);  // 🔧 FIX: Prioritize 'name' first

      return items.map((item: any) => ({
        inventory_item_id: item.id,
        product_name: item.product_id && productsMap.get(item.product_id)?.name || 'Unknown Product',
        variant_name: item.variant_id && variantsMap.get(item.variant_id)?.name || undefined,
        serial_number: item.serial_number || '',
        imei: item.imei,
        cost_price: item.cost_price || 0,
        selling_price: item.selling_price,
        location: item.location
      }));
    } catch (error) {
      console.error('Error in getReceivedItemsForPricing:', error);
      return [];
    }
  }

  // Update prices for received items and mark them as available
  static async updateItemsPrices(
    pricedItems: Array<{
      inventory_item_id: string;
      selling_price: number;
    }>,
    userId: string
  ): Promise<{ success: boolean; message: string; updatedItems: number }> {
    try {
      let updatedCount = 0;

      for (const item of pricedItems) {
        const { error } = await supabase
          .from('inventory_items')
          .update({
            selling_price: item.selling_price,
            status: 'available', // Change status from 'pending_pricing' to 'available'
            updated_at: new Date().toISOString()
          })
          .eq('id', item.inventory_item_id);

        if (error) {
          console.error(`Error updating item ${item.inventory_item_id}:`, error);
          continue;
        }

        updatedCount++;
      }

      if (updatedCount === 0) {
        return {
          success: false,
          message: 'Failed to update any items',
          updatedItems: 0
        };
      }

      // Emit event to refresh inventory
      window.dispatchEvent(new CustomEvent('inventory-updated'));

      return {
        success: true,
        message: `Successfully updated ${updatedCount} item(s) with prices`,
        updatedItems: updatedCount
      };
    } catch (error) {
      console.error('Error in updateItemsPrices:', error);
      return {
        success: false,
        message: `Failed to update prices: ${error instanceof Error ? error.message : 'Unknown error'}`,
        updatedItems: 0
      };
    }
  }

  // Check if purchase order has items pending pricing
  static async hasPendingPricingItems(purchaseOrderId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('purchase_order_id', purchaseOrderId)
        .eq('status', 'pending_pricing')
        .limit(1);

      if (error) {
        console.error('Error checking pending pricing items:', error);
        return false;
      }

      return (data && data.length > 0) || false;
    } catch (error) {
      console.error('Error in hasPendingPricingItems:', error);
      return false;
    }
  }

  static async rejectPurchaseOrder(
    purchaseOrderId: string,
    approverId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase
        .rpc('reject_po', {
          purchase_order_id_param: purchaseOrderId,
          approver_id_param: approverId,
          rejection_reason: reason
        });

      if (error) throw error;
      return { success: true, message: 'Purchase order rejected' };
    } catch (error) {
      console.error('Error rejecting purchase order:', error);
      return {
        success: false,
        message: `Failed to reject purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Update purchase order payment status and total paid amount
  static async updatePaymentStatus(purchaseOrderId: string): Promise<{ success: boolean; message: string }> {
    return this.retryOperation(async () => {
      try {
        // Get total amount from purchase order
        const { data: order, error: orderError } = await supabase
          .from('lats_purchase_orders')
          .select('total_amount')
          .eq('id', purchaseOrderId)
          .single();

        if (orderError || !order) {
          throw new Error('Purchase order not found');
        }

        const totalAmount = order.total_amount || 0;

        // Get sum of all completed payments
        const { data: payments, error: paymentsError } = await supabase
          .from('purchase_order_payments')
          .select('amount')
          .eq('purchase_order_id', purchaseOrderId)
          .eq('status', 'completed');

        if (paymentsError) {
          throw paymentsError;
        }

        const totalPaid = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

        // Determine payment status
        let paymentStatus: 'unpaid' | 'partial' | 'paid';
        if (totalPaid === 0) {
          paymentStatus = 'unpaid';
        } else if (totalPaid >= totalAmount) {
          paymentStatus = 'paid';
        } else {
          paymentStatus = 'partial';
        }

        // Update purchase order
        const { error: updateError } = await supabase
          .from('lats_purchase_orders')
          .update({
            total_paid: totalPaid,
            payment_status: paymentStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', purchaseOrderId);

        if (updateError) {
          throw updateError;
        }

        console.log(`✅ Updated PO ${purchaseOrderId} payment status: ${paymentStatus}, total paid: ${totalPaid}`);
        return { success: true, message: 'Payment status updated successfully' };

      } catch (error) {
        console.error('Error updating payment status:', error);
        return {
          success: false,
          message: `Failed to update payment status: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }, 'update_payment_status');
  }
}

// Database table creation SQL (run these in your Supabase SQL editor)
export const CREATE_TABLES_SQL = `
-- Purchase Order Messages Table
CREATE TABLE IF NOT EXISTS purchase_order_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('system', 'user', 'supplier')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Order Payments Table
CREATE TABLE IF NOT EXISTS purchase_order_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TZS',
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  reference TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Order Audit Table
CREATE TABLE IF NOT EXISTS purchase_order_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  "user" TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Order Quality Checks Table
CREATE TABLE IF NOT EXISTS purchase_order_quality_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES lats_purchase_order_items(id) ON DELETE CASCADE,
  passed BOOLEAN NOT NULL,
  notes TEXT,
  checked_by TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_order_messages_order_id ON purchase_order_messages(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_payments_order_id ON purchase_order_payments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_audit_order_id ON purchase_order_audit(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_quality_checks_order_id ON purchase_order_quality_checks(purchase_order_id);
`;
