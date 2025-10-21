import { supabase } from '../../../lib/supabaseClient';
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
      // Optimized query: select only needed fields for faster response
      const { data, error } = await supabase
        .from('purchase_order_payments')
        .select('id, purchase_order_id, payment_method, method, amount, currency, status, reference, payment_date, created_at')
        .eq('purchase_order_id', purchaseOrderId)
        .order('created_at', { ascending: false })
        .limit(100); // Reasonable limit for performance

      if (error) {
        console.error('Error fetching payments:', error);
        throw error;
      }
      
      // Map database fields to TypeScript interface
      return (data || []).map((payment: any) => ({
        id: payment.id,
        purchaseOrderId: payment.purchase_order_id,
        method: payment.payment_method || payment.method,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        reference: payment.reference,
        timestamp: payment.payment_date || payment.created_at
      }));
    }, 'get_payments');
  }

  static async addPayment(payment: Omit<PurchaseOrderPayment, 'id' | 'timestamp'>): Promise<boolean> {
    return this.retryOperation(async () => {
      const { error } = await supabase
        .from('purchase_order_payments')
        .insert({
          purchase_order_id: payment.purchaseOrderId,
          method: payment.method,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          reference: payment.reference,
          timestamp: new Date().toISOString()
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

      // Try using the helper function first (more secure)
      const { data: auditId, error: functionError } = await supabase.rpc('log_purchase_order_audit', {
        p_purchase_order_id: audit.purchaseOrderId,
        p_action: audit.action,
        p_details: audit.details,
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
            details: audit.details,
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
        // Main operation with joins
        async () => {
          console.log('🔄 Attempting main query with product/variant joins...');
          const { data, error } = await supabase
            .from('lats_purchase_order_items')
            .select(`
              *,
              product:lats_products!product_id(id, name, sku, description),
              variant:lats_product_variants!variant_id(id, name, sku)
            `)
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

          console.log(`✅ Main query succeeded, found ${data?.length || 0} items`);
          
          // Map the data to ensure proper structure and validate product IDs
          const mappedData = (data || []).map((item, index) => {
            console.log(`🔍 Processing item ${index + 1}:`, {
              itemId: item.id,
              productId: item.product_id,
              variantId: item.variant_id,
              hasProduct: !!item.product,
              hasVariant: !!item.variant
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
              name: item.product?.name || item.variant?.name || 'Unknown Product',
              sku: item.product?.sku || item.variant?.sku || 'N/A',
              description: item.product?.description || '',
              productName: item.product?.name || 'Unknown Product',
              variantName: item.variant?.name || 'Default Variant'
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
      const validItems: Array<{ id: string; receivedQuantity: number; maxQuantity: number }> = [];
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

        if (item.receivedQuantity > existingItem.quantity) {
          invalidItems.push(`Item ${item.id}: Received quantity (${item.receivedQuantity}) cannot exceed ordered quantity (${existingItem.quantity})`);
          continue;
        }

        validItems.push({
          id: item.id,
          receivedQuantity: item.receivedQuantity,
          maxQuantity: existingItem.quantity
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
            quantity_received: item.receivedQuantity,
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

      // Get inventory items (items with serial numbers) with retry
      const inventoryItems = await this.retryOperation(
        async () => {
          const { data, error } = await supabase
            .from('inventory_items')
            .select(`
              id,
              product_id,
              variant_id,
              serial_number,
              item_number,
              imei,
              mac_address,
              barcode,
              status,
              location,
              shelf,
              bin,
              purchase_date,
              warranty_start,
              warranty_end,
              cost_price,
              selling_price,
              notes,
              metadata,
              created_at,
              product:lats_products!product_id(
                id,
                name,
                sku,
                category_id
              ),
              variant:lats_product_variants!variant_id(
                id,
                name,
                sku
              )
            `)
            .contains('metadata', { purchase_order_id: purchaseOrderId })
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          return data;
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

      // Get inventory adjustments (items without serial numbers) with retry
      const adjustments = await this.retryOperation(
        async () => {
          const { data, error } = await supabase
            .from('lats_inventory_adjustments')
            .select(`
              id,
              product_id,
              variant_id,
              quantity,
              cost_price,
              reason,
              adjustment_type,
              reference_id,
              created_at,
              product:lats_products!product_id(
                id,
                name,
                sku
              ),
              variant:lats_product_variants!variant_id(
                id,
                name,
                sku
              )
            `)
            .eq('adjustment_type', 'receive')
            .like('reason', `%purchase order ${purchaseOrderId}%`)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          return data;
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

        // Create inventory adjustment
        const { error: adjustmentError } = await supabase
          .from('lats_inventory_adjustments')
          .insert({
            product_id: orderItem.product_id,
            variant_id: orderItem.variant_id,
            adjustment_type: 'receive',
            quantity: receivedItem.receivedQuantity,
            cost_price: orderItem.unit_cost,
            reason: `Partial receive from purchase order ${purchaseOrderId}`,
            reference_id: receivedItem.id,
            processed_by: userId
          });

        if (adjustmentError) {
          console.error(`Error creating inventory adjustment for order item ${receivedItem.id}:`, adjustmentError);
          continue;
        }

        // Update product variant stock quantity
        if (orderItem.variant_id) {
          // First get current quantity
          const { data: currentVariant, error: fetchError } = await supabase
            .from('lats_product_variants')
            .select('quantity')
            .eq('id', orderItem.variant_id)
            .single();

          if (fetchError) {
            console.error(`Error fetching current stock for variant ${orderItem.variant_id}:`, fetchError);
          } else {
            const newQuantity = (currentVariant?.quantity || 0) + receivedItem.receivedQuantity;
            
            const { error: stockError } = await supabase
              .from('lats_product_variants')
              .update({
                quantity: newQuantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', orderItem.variant_id);

            if (stockError) {
              console.error(`Error updating stock for variant ${orderItem.variant_id}:`, stockError);
            }
          }
        }

        console.log(`✅ Created inventory adjustment for ${receivedItem.receivedQuantity} units of order item ${receivedItem.id}`);
      }
    } catch (error) {
      console.error('Error creating inventory adjustments:', error);
    }
  }

  // Process serial numbers for received items
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
      }>;
    }>,
    userId: string
  ): Promise<void> {
    try {
      // Get purchase order items to get product_id and variant_id
      const { data: orderItems, error: itemsError } = await supabase
        .from('lats_purchase_order_items')
        .select('id, product_id, variant_id')
        .eq('purchase_order_id', purchaseOrderId)
        .in('id', receivedItems.map(item => item.id));

      if (itemsError) {
        console.error('Error fetching order items for serial numbers:', itemsError);
        return;
      }

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

        // Create inventory items for each serial number
        const inventoryItems = receivedItem.serialNumbers.map(serial => ({
          product_id: orderItem.product_id,
          variant_id: orderItem.variant_id,
          serial_number: serial.serial_number,
          imei: serial.imei || null,
          mac_address: serial.mac_address || null,
          barcode: serial.barcode || null,
          status: 'available' as const,
          location: serial.location || null,
          warranty_start: serial.warranty_start || null,
          warranty_end: serial.warranty_end || null,
          cost_price: serial.cost_price || orderItem.unit_cost || 0,
          selling_price: serial.selling_price || null,
          notes: serial.notes || `Received from purchase order ${purchaseOrderId}`,
          metadata: {
            purchase_order_id: purchaseOrderId,
            purchase_order_item_id: receivedItem.id,
            received_by: userId,
            received_at: new Date().toISOString(),
            warranty_months: serial.warranty_months || 12
          }
        }));

        // Insert inventory items
        const { error: insertError } = await supabase
          .from('inventory_items')
          .insert(inventoryItems);

        if (insertError) {
          console.error(`Error inserting inventory items for order item ${receivedItem.id}:`, insertError);
          continue;
        }

        // Get the inserted inventory items to create movement records
        const { data: insertedItems, error: fetchError } = await supabase
          .from('inventory_items')
          .select('id')
          .eq('product_id', orderItem.product_id)
          .in('serial_number', receivedItem.serialNumbers.map(s => s.serial_number))
          .order('created_at', { ascending: false })
          .limit(receivedItem.serialNumbers.length);

        if (fetchError || !insertedItems) {
          console.error('Error fetching inserted inventory items:', fetchError);
          continue;
        }

        // Create movement records for each serial number
        const movements = receivedItem.serialNumbers.map((serial, index) => ({
          inventory_item_id: insertedItems[index]?.id,
          movement_type: 'received' as const,
          from_status: null,
          to_status: 'available',
          reference_id: purchaseOrderId,
          reference_type: 'purchase_order',
          notes: `Received from purchase order ${purchaseOrderId}`,
          created_by: userId
        })).filter(movement => movement.inventory_item_id);

        if (movements.length > 0) {
          const { error: movementError } = await supabase
            .from('serial_number_movements')
            .insert(movements);

          if (movementError) {
            console.error('Error creating movement records:', movementError);
          }
        }

        console.log(`✅ Processed ${receivedItem.serialNumbers.length} serial numbers for order item ${receivedItem.id}`);
      }
    } catch (error) {
      console.error('Error processing serial numbers:', error);
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
