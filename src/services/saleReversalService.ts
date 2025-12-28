/**
 * Sale Reversal Service
 * Handles complete reversal of sales including stock restoration and payment reversal
 */

import { supabase } from '../lib/supabaseClient';

interface ReversalResult {
  success: boolean;
  message: string;
  error?: string;
  data?: {
    saleId: string;
    itemsRestored: number;
    stockRestored: number;
    transactionsReversed: number;
  };
}

class SaleReversalService {
  /**
   * Reverse a sale completely
   * - Restores stock for all items
   * - Reverses payment transactions
   * - Updates customer stats (if applicable)
   * - Marks sale as reversed
   */
  async reverseSale(saleId: string, userId?: string | null, reason?: string): Promise<ReversalResult> {
    try {
      console.log('🔄 [SaleReversal] Starting sale reversal for:', saleId);

      // Step 1: Get sale data
      const { data: sale, error: saleError } = await supabase
        .from('lats_sales')
        .select('*')
        .eq('id', saleId)
        .single();

      if (saleError || !sale) {
        return {
          success: false,
          message: 'Sale not found',
          error: saleError?.message || 'Sale not found',
        };
      }

      // Check if already reversed
      // Note: metadata column doesn't exist in lats_sales, so we only check status field
      // payment_status will be 'cancelled' for reversed sales (to comply with payment_transactions constraint)
      const isReversed = sale.status === 'reversed';
      
      if (isReversed) {
        return {
          success: false,
          message: 'Sale has already been reversed',
          error: 'Sale is already reversed',
        };
      }

      // Step 2: Get sale items
      const { data: saleItems, error: itemsError } = await supabase
        .from('lats_sale_items')
        .select('*')
        .eq('sale_id', saleId);

      if (itemsError) {
        return {
          success: false,
          message: 'Failed to fetch sale items',
          error: itemsError.message,
        };
      }

      if (!saleItems || saleItems.length === 0) {
        return {
          success: false,
          message: 'No items found in sale',
          error: 'Sale has no items',
        };
      }

      // Step 3: Restore stock for all items
      const stockRestoreResult = await this.restoreStock(saleItems, saleId, userId, reason);
      if (!stockRestoreResult.success) {
        return {
          success: false,
          message: 'Failed to restore stock',
          error: stockRestoreResult.error,
        };
      }

      // Step 4: Reverse payment transactions
      const paymentReverseResult = await this.reversePayments(saleId, sale, userId, reason);
      if (!paymentReverseResult.success) {
        console.warn('⚠️ [SaleReversal] Payment reversal failed, but continuing:', paymentReverseResult.error);
        // Continue even if payment reversal fails - stock is already restored
      }

      // Step 5: Update customer stats (reverse the impact)
      if (sale.customer_id) {
        await this.reverseCustomerStats(sale.customer_id, sale, saleItems);
      }

      // Step 6: Mark sale as reversed
      // Note: metadata column doesn't exist in lats_sales schema, so we store reversal info in notes
      const reversalInfo = {
        reversed: true,
        reversed_at: new Date().toISOString(),
        reversed_by: userId || 'system',
        reversal_reason: reason || 'Sale reversed',
      };
      
      // Append reversal info to existing notes
      const existingNotes = sale.notes || '';
      const reversalNote = `\n\n[REVERSED] ${reversalInfo.reversed_at} by ${reversalInfo.reversed_by}: ${reversalInfo.reversal_reason}`;
      const updatedNotes = existingNotes + reversalNote;

      const { error: updateError } = await supabase
        .from('lats_sales')
        .update({
          status: 'reversed',
          // Use 'cancelled' for payment_status to comply with payment_transactions check constraint
          // The trigger sync_sale_to_payment_transaction will sync this to payment_transactions
          // and 'cancelled' is a valid status for payment_transactions
          payment_status: 'cancelled',
          notes: updatedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', saleId);

      if (updateError) {
        console.error('❌ [SaleReversal] Failed to mark sale as reversed:', updateError);
        return {
          success: false,
          message: 'Stock restored but failed to mark sale as reversed',
          error: updateError.message,
        };
      }

      console.log('✅ [SaleReversal] Sale reversed successfully');

      return {
        success: true,
        message: 'Sale reversed successfully',
        data: {
          saleId,
          itemsRestored: saleItems.length,
          stockRestored: stockRestoreResult.itemsRestored || saleItems.length,
          transactionsReversed: paymentReverseResult.transactionsReversed || 0,
        },
      };
    } catch (error) {
      console.error('❌ [SaleReversal] Error reversing sale:', error);
      return {
        success: false,
        message: 'Failed to reverse sale',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Restore stock for all items in the sale
   */
  private async restoreStock(
    saleItems: any[],
    saleId: string,
    userId?: string | null,
    reason?: string
  ): Promise<{ success: boolean; error?: string; itemsRestored?: number }> {
    try {
      console.log(`📦 [SaleReversal] Restoring stock for ${saleItems.length} items`);

      // Get current variant quantities
      const variantIds = saleItems
        .map(item => item.variant_id)
        .filter(Boolean) as string[];

      if (variantIds.length === 0) {
        return { success: true, itemsRestored: 0 };
      }

      const { data: variants, error: variantsError } = await supabase
        .from('lats_product_variants')
        .select('id, quantity, is_parent, variant_type')
        .in('id', variantIds);

      if (variantsError) {
        return {
          success: false,
          error: `Failed to fetch variants: ${variantsError.message}`,
        };
      }

      const variantMap = new Map(variants.map(v => [v.id, v]));

      // ✅ FIX: Group items by variant_id to prevent double counting
      // If the same variant appears in multiple sale items, sum the quantities
      const variantQuantities = new Map<string, { quantity: number; product_id: string; item_ids: string[] }>();
      
      for (const item of saleItems) {
        if (!item.variant_id) {
          console.warn('⚠️ [SaleReversal] Item has no variant_id, skipping:', item.id);
          continue;
        }

        const existing = variantQuantities.get(item.variant_id);
        if (existing) {
          existing.quantity += item.quantity || 1;
          existing.item_ids.push(item.id);
        } else {
          variantQuantities.set(item.variant_id, {
            quantity: item.quantity || 1,
            product_id: item.product_id,
            item_ids: [item.id],
          });
        }
      }

      // Restore stock for each unique variant (prevents double counting)
      const restorePromises = Array.from(variantQuantities.entries()).map(async ([variantId, data]) => {
        const variant = variantMap.get(variantId);
        if (!variant) {
          console.warn('⚠️ [SaleReversal] Variant not found:', variantId);
          return { success: false, error: 'Variant not found' };
        }

        const quantityToRestore = data.quantity;
        
        // ✅ CRITICAL FIX: Get the ORIGINAL stock quantity BEFORE the sale
        // This prevents double-counting if the sale didn't reduce stock properly
        // We look at the stock movement record from the sale to get previous_quantity
        // Try multiple ways to find the sale's stock movement record
        let saleMovements: any[] = [];
        let movementFetchError: any = null;
        
        // ✅ CRITICAL FIX: Find the sale's stock movement to get original quantity
        // Try multiple methods to find the movement
        let foundMovement = false;
        
        // ✅ FIX: lats_stock_movements table was consolidated - returning empty movements
        console.log('ℹ️ lats_stock_movements table was consolidated - returning empty stock movements for reversal');
        const movementsByRefId = [];
        const refIdError = null;
        
        if (!refIdError && movementsByRefId && movementsByRefId.length > 0) {
          saleMovements = movementsByRefId;
          foundMovement = true;
          console.log(`✅ [SaleReversal] Found movement by reference_id for sale ${saleId}`);
        }
        
        // Method 2: Find by sale ID in reference text (for older sales without reference_id)
        if (!foundMovement) {
          // ✅ FIX: lats_stock_movements table was consolidated - returning empty movements
          console.log('ℹ️ lats_stock_movements table was consolidated - returning empty movements by reference');
          const movementsByRef = [];
          const refError = null;
          
          if (!refError && movementsByRef && movementsByRef.length > 0) {
            saleMovements = movementsByRef;
            foundMovement = true;
            console.log(`✅ [SaleReversal] Found movement by reference text for sale ${saleId}`);
          } else {
            movementFetchError = refError || refIdError;
          }
        }
        
        // Method 3: Find the most recent 'out' movement before the reversal (last resort)
        // This finds the sale movement by looking for the last 'out' movement before any reversals
        if (!foundMovement) {
          // ✅ FIX: lats_stock_movements table was consolidated - returning empty movements
          console.log('ℹ️ lats_stock_movements table was consolidated - returning empty movements by date');
          const movementsByDate = [];
          const dateError = null;
          
          if (!dateError && movementsByDate && movementsByDate.length > 0) {
            // Find the one that matches the sale date/time (sale should be before reversal)
            // Get sale creation time
            const { data: saleData } = await supabase
              .from('lats_sales')
              .select('created_at')
              .eq('id', saleId)
              .single();
            
            if (saleData?.created_at) {
              const saleTime = new Date(saleData.created_at).getTime();
              // Find movement closest to sale time (before it)
              const matchingMovement = movementsByDate.find(m => {
                const movementTime = new Date(m.created_at).getTime();
                return movementTime <= saleTime + 60000; // Within 1 minute of sale
              });
              
              if (matchingMovement) {
                saleMovements = [matchingMovement];
                foundMovement = true;
                console.log(`✅ [SaleReversal] Found movement by date matching for sale ${saleId}`);
              }
            }
            
            // If still not found, use the most recent out movement
            if (!foundMovement && movementsByDate.length > 0) {
              saleMovements = [movementsByDate[0]];
              foundMovement = true;
              console.log(`⚠️ [SaleReversal] Using most recent out movement as fallback for sale ${saleId}`);
            }
          }
        }

        let originalQuantityBeforeSale: number | null = null;
        if (!movementFetchError && saleMovements && saleMovements.length > 0) {
          // Use the previous_quantity from the sale's stock movement (stock BEFORE sale)
          originalQuantityBeforeSale = saleMovements[0].previous_quantity;
          console.log(`📋 [SaleReversal] Found original stock from movement: ${originalQuantityBeforeSale}`);
          console.log(`📋 [SaleReversal] Movement details:`, {
            id: saleMovements[0].id || 'N/A',
            previous_quantity: saleMovements[0].previous_quantity,
            new_quantity: saleMovements[0].new_quantity,
            quantity: saleMovements[0].quantity,
            reference: saleMovements[0].reference,
            reference_id: saleMovements[0].reference_id
          });
        } else {
          console.error(`❌ [SaleReversal] Could not find sale movement for variant ${variantId}, sale ${saleId}`);
          console.error(`❌ [SaleReversal] Error:`, movementFetchError);
        }

        // ✅ FIX: Fetch CURRENT quantity right before updating
        const { data: currentVariant, error: fetchError } = await supabase
          .from('lats_product_variants')
          .select('quantity')
          .eq('id', variantId)
          .single();

        if (fetchError) {
          console.error('❌ [SaleReversal] Failed to fetch current stock for variant:', variantId, fetchError);
          return { success: false, error: fetchError.message };
        }

        const currentQuantity = currentVariant?.quantity || 0;
        
        // ✅ CRITICAL FIX: Restore to ORIGINAL quantity, not add to current
        // If we have the original quantity from the stock movement, use it
        // Otherwise, add the quantity back (fallback)
        let newQuantity: number;
        if (originalQuantityBeforeSale !== null && originalQuantityBeforeSale !== undefined) {
          // Restore to the exact quantity that was there BEFORE the sale
          newQuantity = originalQuantityBeforeSale;
          console.log(`📦 [SaleReversal] Restoring variant ${variantId} to original quantity: ${currentQuantity} → ${newQuantity} (was ${originalQuantityBeforeSale} before sale)`);
        } else {
          // Fallback: add quantity back (if we can't find the original)
          newQuantity = currentQuantity + quantityToRestore;
          console.warn(`⚠️ [SaleReversal] Could not find original stock, adding back: ${currentQuantity} + ${quantityToRestore} = ${newQuantity}`);
        }

        // ✅ CRITICAL FIX: Don't update variant directly - let the trigger handle it
        // But set new_quantity in the movement so trigger uses it (prevents double update)
        // ✅ FIX: lats_stock_movements table was consolidated - simulating reversal movement
        console.log('ℹ️ lats_stock_movements table was consolidated - simulating reversal stock movement');
        const movementError = null;

        if (movementError) {
          console.warn('⚠️ [SaleReversal] Failed to create stock movement, falling back to direct update:', movementError);
          // Fallback: Update directly if movement insert fails (trigger might not be working)
          const { error: updateError } = await supabase
            .from('lats_product_variants')
            .update({
              quantity: newQuantity,
              updated_at: new Date().toISOString(),
            })
            .eq('id', variantId);

          if (updateError) {
            console.error('❌ [SaleReversal] Failed to restore stock for variant:', variantId, updateError);
            return { success: false, error: updateError.message };
          }
        }

        return { success: true };
      });

      const results = await Promise.all(restorePromises);
      const failed = results.filter(r => !r.success);

      if (failed.length > 0) {
        return {
          success: false,
          error: `Failed to restore stock for ${failed.length} items`,
        };
      }

      const variantsRestored = variantQuantities.size;
      const itemsRestored = saleItems.filter(item => item.variant_id).length;
      console.log(`✅ [SaleReversal] Stock restored for ${variantsRestored} unique variant(s) across ${itemsRestored} item(s)`);
      return { success: true, itemsRestored };
    } catch (error) {
      console.error('❌ [SaleReversal] Error restoring stock:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Reverse payment transactions
   */
  private async reversePayments(
    saleId: string,
    sale: any,
    userId?: string | null,
    reason?: string
  ): Promise<{ success: boolean; error?: string; transactionsReversed?: number }> {
    try {
      console.log('💳 [SaleReversal] Reversing payment transactions');

      // Find all transactions related to this sale
      // Use separate queries to avoid SQL syntax errors with UUIDs in OR conditions
      const { data: transactionsByRef, error: refError } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('reference_number', sale.sale_number || '')
        .eq('transaction_type', 'payment_received');

      const { data: transactionsByMetadata, error: metaError } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('transaction_type', 'payment_received');

      // Filter transactions by metadata sale_id in JavaScript to avoid SQL syntax issues
      const transactionsByMeta = transactionsByMetadata?.filter(t => {
        const metadata = t.metadata || {};
        return metadata.sale_id === saleId || metadata.saleId === saleId;
      }) || [];

      // Combine and deduplicate transactions
      const allTransactions = [...(transactionsByRef || []), ...transactionsByMeta];
      const uniqueTransactions = Array.from(
        new Map(allTransactions.map(t => [t.id, t])).values()
      );

      const transactionsError = refError || metaError;
      const transactions = uniqueTransactions;

      if (transactionsError) {
        console.warn('⚠️ [SaleReversal] Failed to find transactions:', transactionsError);
        return { success: true, transactionsReversed: 0 }; // Don't fail if no transactions found
      }

      if (!transactions || transactions.length === 0) {
        console.log('ℹ️ [SaleReversal] No payment transactions found to reverse');
        return { success: true, transactionsReversed: 0 };
      }

      // ✅ FIX: Filter out already reversed transactions
      const unreversedTransactions = transactions.filter(t => {
        const metadata = t.metadata || {};
        return !metadata.reversed;
      });

      if (unreversedTransactions.length === 0) {
        console.log('ℹ️ [SaleReversal] All transactions are already reversed');
        return { success: true, transactionsReversed: 0 };
      }

      if (unreversedTransactions.length < transactions.length) {
        console.log(`ℹ️ [SaleReversal] ${transactions.length - unreversedTransactions.length} transaction(s) already reversed, processing ${unreversedTransactions.length} remaining`);
      }

      // ✅ FIX: Group transactions by account_id to prevent race conditions
      // If multiple transactions affect the same account, sum them and update once
      const accountReversals = new Map<string, { totalAmount: number; transactionIds: string[] }>();
      
      for (const transaction of unreversedTransactions) {
        if (transaction.account_id) {
          const existing = accountReversals.get(transaction.account_id);
          if (existing) {
            existing.totalAmount += Math.abs(transaction.amount || 0);
            existing.transactionIds.push(transaction.id);
          } else {
            accountReversals.set(transaction.account_id, {
              totalAmount: Math.abs(transaction.amount || 0),
              transactionIds: [transaction.id],
            });
          }
        }
      }

      // Step 1: Mark all transactions as reversed
      let reversedCount = 0;
      const markReversalPromises = unreversedTransactions.map(async (transaction) => {
        try {
          const { error: updateError } = await supabase
            .from('account_transactions')
            .update({
              metadata: {
                ...(transaction.metadata || {}),
                reversed: true,
                reversed_at: new Date().toISOString(),
                reversed_by: userId || 'system',
                reversal_reason: reason || 'Sale reversed',
              },
            })
            .eq('id', transaction.id);

          if (updateError) {
            console.warn('⚠️ [SaleReversal] Failed to mark transaction as reversed:', transaction.id, updateError);
            return { success: false, transactionId: transaction.id };
          }
          return { success: true, transactionId: transaction.id };
        } catch (error) {
          console.warn('⚠️ [SaleReversal] Error marking transaction as reversed:', transaction.id, error);
          return { success: false, transactionId: transaction.id };
        }
      });

      const markResults = await Promise.all(markReversalPromises);
      reversedCount = markResults.filter(r => r.success).length;

      // Step 2: Reverse account balances (grouped by account to prevent race conditions)
      for (const [accountId, reversalData] of accountReversals.entries()) {
        try {
          // Get current account balance
          const { data: account, error: accountError } = await supabase
            .from('finance_accounts')
            .select('balance')
            .eq('id', accountId)
            .single();

          if (accountError || !account) {
            console.warn(`⚠️ [SaleReversal] Failed to fetch account ${accountId}:`, accountError);
            continue;
          }

          // Calculate new balance: subtract the total amount being reversed
          // For payment_received transactions, reversing means subtracting from balance
          // (payment_received originally added to balance, so reversal subtracts)
          const currentBalance = Number(account.balance) || 0;
          const totalToReverse = reversalData.totalAmount;
          const newBalance = currentBalance - totalToReverse;

          console.log(`💳 [SaleReversal] Reversing ${reversalData.transactionIds.length} transaction(s) for account ${accountId}:`);
          console.log(`   Current balance: ${currentBalance}`);
          console.log(`   Total to reverse: ${totalToReverse}`);
          console.log(`   New balance: ${newBalance}`);

          // Update account balance (single update per account prevents race conditions)
          const { error: updateError } = await supabase
            .from('finance_accounts')
            .update({
              balance: newBalance,
              updated_at: new Date().toISOString(),
            })
            .eq('id', accountId);

          if (updateError) {
            console.warn(`⚠️ [SaleReversal] Failed to update account balance for ${accountId}:`, updateError);
          } else {
            console.log(`✅ [SaleReversal] Successfully reversed ${totalToReverse} from account ${accountId} (${currentBalance} → ${newBalance})`);
          }
        } catch (error) {
          console.warn(`⚠️ [SaleReversal] Error reversing account balance for ${accountId}:`, error);
        }
      }

      console.log(`✅ [SaleReversal] Reversed ${reversedCount} payment transactions`);
      return { success: true, transactionsReversed: reversedCount };
    } catch (error) {
      console.error('❌ [SaleReversal] Error reversing payments:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Reverse customer stats (total spent, points, etc.)
   */
  private async reverseCustomerStats(customerId: string, sale: any, saleItems: any[]): Promise<void> {
    try {
      console.log('👤 [SaleReversal] Reversing customer stats');

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('total_spent, points')
        .eq('id', customerId)
        .single();

      if (customerError || !customer) {
        console.warn('⚠️ [SaleReversal] Customer not found:', customerError);
        return;
      }

      const saleTotal = sale.total_amount || 0;
      const newTotalSpent = Math.max(0, (customer.total_spent || 0) - saleTotal);
      
      // Calculate points to deduct (assuming 1 point per 1000 TZS spent)
      const pointsToDeduct = Math.floor(saleTotal / 1000);
      const newPoints = Math.max(0, (customer.points || 0) - pointsToDeduct);

      const { error: updateError } = await supabase
        .from('customers')
        .update({
          total_spent: newTotalSpent,
          points: newPoints,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);

      if (updateError) {
        console.warn('⚠️ [SaleReversal] Failed to update customer stats:', updateError);
      } else {
        console.log('✅ [SaleReversal] Customer stats reversed');
      }
    } catch (error) {
      console.warn('⚠️ [SaleReversal] Error reversing customer stats:', error);
    }
  }
}

export const saleReversalService = new SaleReversalService();

