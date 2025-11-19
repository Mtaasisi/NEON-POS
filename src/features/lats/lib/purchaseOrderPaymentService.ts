import { supabase } from '../../../lib/supabaseClient';
import { getAccountBalanceBeforeStorage, validateBalanceBeforeTransaction, FinanceAccount } from '../../../lib/financeAccountService';
import { addBranchFilter } from '../../../lib/branchAwareApi';

export interface PurchaseOrderPayment {
  id: string;
  purchaseOrderId: string;
  paymentAccountId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentMethodId: string;
  reference?: string;
  notes?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentDate: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseOrderPaymentData {
  purchaseOrderId: string;
  paymentAccountId: string;
  amount: number;
  currency?: string;
  paymentMethod: string;
  paymentMethodId: string;
  reference?: string;
  notes?: string;
  createdBy: string | null;
}

const DEFAULT_SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

class PurchaseOrderPaymentService {
  // Optimized payment processing with reduced validation overhead
  async processPayment(data: CreatePurchaseOrderPaymentData): Promise<{ success: boolean; message: string; payment?: PurchaseOrderPayment }> {
    try {
      // Minimal validation - trust the calling code has validated inputs
      const missingFields: string[] = [];
      if (!data.purchaseOrderId) missingFields.push('Purchase Order ID');
      if (!data.paymentAccountId) missingFields.push('Payment Account ID');
      if (!data.amount || data.amount <= 0) missingFields.push('Payment Amount');
      if (!data.paymentMethodId) missingFields.push('Payment Method ID');

      if (missingFields.length > 0) {
        const errorMsg = `Missing required payment data: ${missingFields.join(', ')}`;
        return { success: false, message: errorMsg };
      }

      // Use the database function for atomic payment processing
      const { data: result, error } = await supabase
        .rpc('process_purchase_order_payment', {
          purchase_order_id_param: data.purchaseOrderId,
          payment_account_id_param: data.paymentAccountId,
          amount_param: data.amount,
          currency_param: data.currency || 'TZS',
          payment_method_param: data.paymentMethod,
          payment_method_id_param: data.paymentMethodId,
          user_id_param: data.createdBy || '00000000-0000-0000-0000-000000000001',
          reference_param: data.reference || null,
          notes_param: data.notes || null
        });

      if (error) {
        console.error('❌ RPC function failed:', error);
        // Simplified fallback - just return error instead of complex retry logic
        return {
          success: false,
          message: `Payment processing failed: ${error.message}`
        };
      }

      // Handle array result from RPC function
      let resultData = Array.isArray(result) ? result[0] : result;

      // Unwrap if result is nested in process_purchase_order_payment property
      if (resultData?.process_purchase_order_payment) {
        resultData = resultData.process_purchase_order_payment;
      }

      // Check if the function returned success
      if (!resultData?.success) {
        return {
          success: false,
          message: resultData?.message || 'Payment processing failed'
        };
      }

      // Get the created payment record using the payment_id from the function result
      const paymentId = resultData.data?.payment_id;

      if (!paymentId) {
        return {
          success: false,
          message: 'Payment processed but no payment ID returned'
        };
      }

      // Return success with minimal data - let caller fetch full details if needed
      return {
        success: true,
        message: 'Payment processed successfully',
        payment: {
          id: paymentId,
          purchaseOrderId: data.purchaseOrderId,
          paymentAccountId: data.paymentAccountId,
          amount: resultData.data.amount_paid,
          currency: data.currency || 'TZS',
          paymentMethod: data.paymentMethod,
          paymentMethodId: data.paymentMethodId,
          reference: data.reference,
          notes: data.notes,
          status: 'completed',
          paymentDate: new Date().toISOString(),
          createdBy: data.createdBy || '00000000-0000-0000-0000-000000000001',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as PurchaseOrderPayment
      };
    } catch (error) {
      return {
        success: false,
        message: `Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Batch process multiple payments for better performance
  async processBatchPayments(payments: CreatePurchaseOrderPaymentData[]): Promise<{ success: boolean; message: string; results?: any[] }> {
    try {
      if (!payments || payments.length === 0) {
        return { success: false, message: 'No payments to process' };
      }

      // Convert payments to JSON format for the batch function
      const paymentData = payments.map(payment => ({
        purchase_order_id: payment.purchaseOrderId,
        payment_account_id: payment.paymentAccountId,
        amount: payment.amount,
        currency: payment.currency || 'TZS',
        payment_method: payment.paymentMethod,
        payment_method_id: payment.paymentMethodId,
        user_id: payment.createdBy || '00000000-0000-0000-0000-000000000001',
        reference: payment.reference || null,
        notes: payment.notes || null
      }));

      // Use batch processing stored procedure - pass as JSON string
      const { data: result, error } = await supabase
        .rpc('process_purchase_order_payments_batch_simple', {
          payment_data_json: JSON.stringify(paymentData)
        });

      if (error) {
        console.error('❌ Batch RPC function failed:', error);
        // Fallback to individual processing
        return this.fallbackBatchProcessing(payments);
      }

      // Handle array result from RPC function
      let resultData = Array.isArray(result) ? result[0] : result;

      // Unwrap if result is nested
      if (resultData?.process_purchase_order_payments_batch) {
        resultData = resultData.process_purchase_order_payments_batch;
      }

      // Check if batch processing was successful
      if (!resultData?.success) {
        return {
          success: false,
          message: resultData?.message || 'Batch payment processing failed'
        };
      }

      return {
        success: true,
        message: 'Batch payments processed successfully',
        results: resultData.results || []
      };
    } catch (error) {
      console.error('❌ Error in batch payment processing:', error);
      // Fallback to individual processing
      return this.fallbackBatchProcessing(payments);
    }
  }

  // Fallback batch processing using individual calls
  private async fallbackBatchProcessing(payments: CreatePurchaseOrderPaymentData[]): Promise<{ success: boolean; message: string; results?: any[] }> {
    try {
      const results = await Promise.all(
        payments.map(async (payment) => {
          try {
            const result = await this.processPayment(payment);
            return { ...result, payment };
          } catch (error) {
            return {
              success: false,
              message: `Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
              payment
            };
          }
        })
      );

      const failedPayments = results.filter(result => !result.success);

      if (failedPayments.length > 0) {
        return {
          success: false,
          message: `Some payments failed: ${failedPayments.length} out of ${payments.length}`,
          results
        };
      }

      return {
        success: true,
        message: 'All payments processed successfully (fallback method)',
        results
      };
    } catch (error) {
      return {
        success: false,
        message: `Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Get payment summary for a purchase order
  async getPaymentSummary(purchaseOrderId: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('get_purchase_order_payment_summary', {
          purchase_order_id_param: purchaseOrderId
        });

      if (error) {
        console.error('❌ Error getting payment summary:', error);
        return { success: false, message: 'Failed to get payment summary' };
      }

      return { success: true, data: data?.[0] || null };
    } catch (error) {
      console.error('❌ Error in getPaymentSummary:', error);
      return { 
        success: false, 
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Get payment history for a purchase order
  async getPaymentHistory(purchaseOrderId: string): Promise<{ success: boolean; data?: any[]; message?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('get_purchase_order_payment_history', {
          purchase_order_id_param: purchaseOrderId
        });

      if (error) {
        console.error('❌ Error getting payment history:', error);
        return { success: false, message: 'Failed to get payment history' };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Error in getPaymentHistory:', error);
      return { 
        success: false, 
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Legacy method for backward compatibility
  async createPurchaseOrderPayment(data: CreatePurchaseOrderPaymentData): Promise<PurchaseOrderPayment> {
    try {
      console.log('💰 PurchaseOrderPaymentService: Creating purchase order payment...', data);
      
      // Validate payment account
      const { data: paymentAccount, error: accountError } = await supabase
        .from('finance_accounts')
        .select('*')
        .eq('id', data.paymentAccountId)
        .single();

      if (accountError || !paymentAccount) {
        throw new Error('Payment account not found');
      }

      // Check if account has sufficient balance (handle currency conversion)
      let requiredAmount = data.amount;
      let accountBalance = paymentAccount.balance || 0;
      
      // Validate that balance is a valid number
      if (isNaN(accountBalance) || accountBalance === null || accountBalance === undefined) {
        console.warn('⚠️ Invalid account balance detected, defaulting to 0');
        accountBalance = 0;
      }
      
      // If currencies don't match, we need to handle currency conversion
      if (paymentAccount.currency !== data.currency) {
        console.log(`🔄 Currency mismatch: Account is ${paymentAccount.currency}, Payment is ${data.currency}`);
        
        // Get exchange rate from environment or use default rates
        // Use safe environment variable access that works in both browser and Node.js
        const getEnvVar = (key: string, defaultValue: string): string => {
          // Try different environment variable sources
          try {
            // For Vite/React apps, try import.meta.env first
            if (typeof (globalThis as any).import !== 'undefined' && (globalThis as any).import.meta?.env) {
              return (globalThis as any).import.meta.env[key] || defaultValue;
            }
            // For Node.js environments
            if (typeof process !== 'undefined' && process.env) {
              return process.env[key] || defaultValue;
            }
            // For browser environments with window.env
            if (typeof window !== 'undefined' && (window as any).env) {
              return (window as any).env[key] || defaultValue;
            }
          } catch (error) {
            console.warn('Environment variable access failed, using default:', error);
          }
          return defaultValue;
        };

        const exchangeRates = {
          'USD_TZS': parseFloat(getEnvVar('REACT_APP_USD_TZS_RATE', '2500')),
          'TZS_USD': parseFloat(getEnvVar('REACT_APP_TZS_USD_RATE', '0.0004')),
          'EUR_TZS': parseFloat(getEnvVar('REACT_APP_EUR_TZS_RATE', '2700')),
          'TZS_EUR': parseFloat(getEnvVar('REACT_APP_TZS_EUR_RATE', '0.00037')),
          'GBP_TZS': parseFloat(getEnvVar('REACT_APP_GBP_TZS_RATE', '3200')),
          'TZS_GBP': parseFloat(getEnvVar('REACT_APP_TZS_GBP_RATE', '0.00031'))
        };
        
        const conversionKey = `${data.currency}_${paymentAccount.currency}`;
        const rate = exchangeRates[conversionKey as keyof typeof exchangeRates];
        
        if (rate) {
          requiredAmount = data.amount * rate;
          console.log(`💱 Converting ${data.amount} ${data.currency} to ${requiredAmount} ${paymentAccount.currency} (rate: ${rate})`);
        } else {
          // For unsupported currency combinations, throw an error
          throw new Error(`Currency conversion not supported: ${data.currency} to ${paymentAccount.currency}. Please use matching currencies or contact support.`);
        }
      }
      
      // CRITICAL: Check if account has sufficient balance
      console.log(`💰 Balance check: Available=${accountBalance}, Required=${requiredAmount}`);
      
      if (accountBalance < requiredAmount) {
        const shortfall = requiredAmount - accountBalance;
        throw new Error(
          `❌ Insufficient balance in ${paymentAccount.name}!\n` +
          `Available: ${paymentAccount.currency} ${accountBalance.toLocaleString()}\n` +
          `Required: ${paymentAccount.currency} ${requiredAmount.toLocaleString()}\n` +
          `Shortfall: ${paymentAccount.currency} ${shortfall.toLocaleString()}\n` +
          `Please add funds to the account or use a different payment method.`
        );
      }
      
      console.log(`✅ Sufficient balance confirmed: ${accountBalance} >= ${requiredAmount}`);

      // Create payment record - use a valid user ID from auth_users table
      // Get a valid user ID from auth_users table to satisfy the foreign key constraint
      const { data: validUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        .single();

      if (userError || !validUser) {
        // Fallback to default admin user ID
        const fallbackUserId = '00000000-0000-0000-0000-000000000001';
        console.warn('⚠️ No valid user found, using fallback user ID:', fallbackUserId);
      }

      // Prepare notes with currency conversion info if applicable
      let paymentNotes = data.notes || '';
      if (paymentAccount.currency !== data.currency) {
        const conversionNote = `Original: ${data.amount} ${data.currency} (converted to ${requiredAmount} ${paymentAccount.currency})`;
        paymentNotes = paymentNotes ? `${paymentNotes}\n${conversionNote}` : conversionNote;
      }

      const { data: paymentRecord, error: paymentError } = await supabase
        .from('purchase_order_payments')
        .insert({
          purchase_order_id: data.purchaseOrderId,
          payment_account_id: data.paymentAccountId,
          amount: requiredAmount, // Use the converted amount for the account currency
          currency: paymentAccount.currency, // Use the account currency
          payment_method: data.paymentMethod,
          payment_method_id: data.paymentMethodId,
          reference: data.reference,
          notes: paymentNotes,
          status: 'completed',
          payment_date: new Date().toISOString(),
          created_by: validUser?.id || '00000000-0000-0000-0000-000000000001' // Use a valid user ID from auth_users table
        })
        .select()
        .single();

      if (paymentError) {
        console.error('❌ Error creating purchase order payment:', paymentError);
        throw new Error('Failed to create purchase order payment record');
      }

      // Update finance account balance (deduct converted amount)
      const newBalance = accountBalance - requiredAmount;
      console.log(`💳 Deducting payment: ${accountBalance} - ${requiredAmount} = ${newBalance}`);
      
      const { error: balanceError } = await supabase
        .from('finance_accounts')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.paymentAccountId);

      if (balanceError) {
        console.error('⚠️ Error updating account balance:', balanceError);
        // Log the error but don't throw as payment was already recorded
        // In a production system, you might want to implement a rollback mechanism
        console.warn('⚠️ Payment recorded but account balance not updated. Manual reconciliation may be required.');
      } else {
        console.log(`✅ Account balance updated successfully: ${newBalance}`);
      }

      // ✨ CREATE ACCOUNT TRANSACTION FOR SPENDING TRACKING
      try {
        console.log(`📊 Creating account transaction for PO payment...`);
        
        // Get PO details including currency and exchange rate
        const { data: poData } = await supabase
          .from('lats_purchase_orders')
          .select('po_number, supplier_id, currency, exchange_rate, base_currency, total_amount, total_amount_base_currency')
          .eq('id', data.purchaseOrderId)
          .single();
        
        // Get supplier name
        let supplierName = 'Unknown Supplier';
        if (poData?.supplier_id) {
          const { data: supplierData } = await supabase
            .from('lats_suppliers')
            .select('name')
            .eq('id', poData.supplier_id)
            .single();
          if (supplierData) {
            supplierName = supplierData.name;
          }
        }
        
        const poReference = poData?.po_number || `PO-${data.purchaseOrderId.substring(0, 8)}`;
        
        // Calculate expense amount in base currency (TZS)
        // Note: data.amount is already in TZS after conversion in PaymentsPopupModal
        const expenseAmountBaseCurrency = data.amount;
        const poCurrency = poData?.currency || 'TZS';
        const poExchangeRate = poData?.exchange_rate || 1.0;
        const poBaseCurrency = poData?.base_currency || 'TZS';
        
        // Log currency information for tracking
        if (poCurrency !== poBaseCurrency && poExchangeRate !== 1.0) {
          const totalAmountTZS = poData?.total_amount_base_currency || 0;
          const paymentPercentage = totalAmountTZS > 0 ? (data.amount / totalAmountTZS) * 100 : 0;
          
          console.log(`💱 Multi-currency PO payment:
            - PO Currency: ${poCurrency}
            - PO Total (Base): ${totalAmountTZS} ${poBaseCurrency}
            - Exchange Rate: ${poExchangeRate}
            - Payment Amount (TZS): ${data.amount}
            - Expense Tracked: ${expenseAmountBaseCurrency} ${poBaseCurrency}
            - Payment Percentage: ${paymentPercentage.toFixed(2)}%`);
        } else {
          console.log(`💰 Same currency transaction - Payment: ${expenseAmountBaseCurrency} ${poBaseCurrency}`);
        }
        
        // Create account transaction record with proper currency information
        const { error: transactionError } = await supabase
          .from('account_transactions')
          .insert({
            account_id: data.paymentAccountId,
            transaction_type: 'expense', // This is spending/expense
            amount: requiredAmount, // Amount deducted from account
            balance_before: accountBalance,
            balance_after: newBalance,
            description: `PO Payment: ${poReference} - ${supplierName}`,
            reference_number: data.reference || `PO-PAY-${paymentRecord.id.substring(0, 8)}`,
            related_entity_type: 'purchase_order_payment',
            related_entity_id: paymentRecord.id,
            metadata: {
              purchase_order_id: data.purchaseOrderId,
              po_reference: poReference,
              supplier: supplierName,
              payment_method: data.paymentMethod,
              account_name: paymentAccount.name,
              // Currency tracking for proper expense reporting
              po_currency: poCurrency,
              po_total_amount: poData?.total_amount,
              po_total_amount_base_currency: poData?.total_amount_base_currency,
              po_exchange_rate: poExchangeRate,
              payment_amount_tzs: data.amount,
              base_currency: poBaseCurrency,
              expense_amount_base_currency: expenseAmountBaseCurrency,
              account_currency: paymentAccount.currency,
              account_amount: requiredAmount
            },
            created_by: validUser?.id || '00000000-0000-0000-0000-000000000001',
            created_at: new Date().toISOString()
          });
        
        if (transactionError) {
          console.warn('⚠️ Failed to create account transaction:', transactionError);
        } else {
          console.log(`✅ Account transaction created - Spending tracked in base currency: ${expenseAmountBaseCurrency} ${poBaseCurrency}`);
        }
      } catch (transErr) {
        console.warn('⚠️ Error creating account transaction:', transErr);
        // Don't fail the payment if transaction tracking fails
      }

      console.log('✅ Purchase order payment created successfully:', paymentRecord);
      return paymentRecord;
    } catch (error) {
      console.error('❌ PurchaseOrderPaymentService: Error creating payment:', error);
      throw error;
    }
  }

  // Create multiple purchase order payments
  async createMultiplePurchaseOrderPayments(payments: CreatePurchaseOrderPaymentData[]): Promise<PurchaseOrderPayment[]> {
    try {
      console.log('💰 PurchaseOrderPaymentService: Creating multiple purchase order payments...', payments);
      
      const results: PurchaseOrderPayment[] = [];
      
      // Process payments sequentially to maintain data integrity
      for (const paymentData of payments) {
        const result = await this.createPurchaseOrderPayment(paymentData);
        results.push(result);
      }
      
      console.log('✅ Multiple purchase order payments created successfully:', results);
      return results;
    } catch (error) {
      console.error('❌ PurchaseOrderPaymentService: Error creating multiple payments:', error);
      throw error;
    }
  }

  // Get payments for a purchase order
  async getPurchaseOrderPayments(purchaseOrderId: string): Promise<PurchaseOrderPayment[]> {
    try {
      let query = supabase
        .from('purchase_order_payments')
        .select('*')
        .eq('purchase_order_id', purchaseOrderId)
        .order('created_at', { ascending: false });

      // Apply branch filtering for proper isolation
      const filteredQuery = await addBranchFilter(query, 'payments');
      const { data, error } = await filteredQuery;

      if (error) {
        console.error('❌ Error fetching purchase order payments:', error);
        throw new Error('Failed to fetch purchase order payments');
      }

      return data || [];
    } catch (error) {
      console.error('❌ PurchaseOrderPaymentService: Error fetching payments:', error);
      throw error;
    }
  }

  // Get payment summary for a purchase order
  async getPurchaseOrderPaymentSummary(purchaseOrderId: string): Promise<{
    totalPaid: number;
    remainingAmount: number;
    paymentCount: number;
    lastPaymentDate?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('purchase_order_payments')
        .select('amount, payment_date')
        .eq('purchase_order_id', purchaseOrderId)
        .eq('status', 'completed');

      if (error) {
        console.error('❌ Error fetching payment summary:', error);
        throw new Error('Failed to fetch payment summary');
      }

      const totalPaid = data?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const paymentCount = data?.length || 0;
      const lastPaymentDate = data?.[0]?.payment_date;

      // Get purchase order total amount
      const { data: purchaseOrder, error: poError } = await supabase
        .from('lats_purchase_orders')
        .select('total_amount')
        .eq('id', purchaseOrderId)
        .single();

      if (poError) {
        console.error('❌ Error fetching purchase order total:', poError);
        throw new Error('Failed to fetch purchase order total');
      }

      const remainingAmount = (purchaseOrder?.total_amount || 0) - totalPaid;

      return {
        totalPaid,
        remainingAmount,
        paymentCount,
        lastPaymentDate
      };
    } catch (error) {
      console.error('❌ PurchaseOrderPaymentService: Error fetching payment summary:', error);
      throw error;
    }
  }

  // Update payment status
  async updatePaymentStatus(
    paymentId: string, 
    status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'stopped',
    userId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('purchase_order_payments')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) {
        console.error('❌ Error updating payment status:', error);
        throw new Error('Failed to update payment status');
      }

      return true;
    } catch (error) {
      console.error('❌ PurchaseOrderPaymentService: Error updating payment status:', error);
      throw error;
    }
  }

  // Reverse a payment by ID using the database function
  async reversePayment(
    paymentId: string,
    userId?: string | null
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const isValidUUID = (uuid: string | null | undefined): boolean => {
        if (!uuid) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
      };

      if (!isValidUUID(paymentId)) {
        throw new Error('Invalid payment ID provided');
      }

      const effectiveUserId = userId && isValidUUID(userId) ? userId : DEFAULT_SYSTEM_USER_ID;

      const { data, error } = await supabase.rpc('reverse_purchase_order_payment', {
        payment_id_param: paymentId,
        user_id_param: effectiveUserId
      });

      if (error) {
        console.error('❌ Error reversing payment (RPC):', error);
        return { success: false, message: error.message || 'Failed to reverse payment' };
      }

      let result = Array.isArray(data) ? data[0] : data;
      if (result?.reverse_purchase_order_payment) {
        result = result.reverse_purchase_order_payment;
      }

      if (!result?.success) {
        return {
          success: false,
          message: result?.message || 'Failed to reverse payment'
        };
      }

      return {
        success: true,
        message: result.message || 'Payment reversed successfully',
        data: result.data
      };
    } catch (error) {
      console.error('❌ PurchaseOrderPaymentService: Error reversing payment:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reverse payment'
      };
    }
  }

  // Reverse the most recent payment for a purchase order
  async reverseLatestPayment(
    purchaseOrderId: string,
    userId?: string | null
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const isValidUUID = (uuid: string | null | undefined): boolean => {
        if (!uuid) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
      };

      if (!isValidUUID(purchaseOrderId)) {
        throw new Error('Invalid purchase order ID provided');
      }

      const { data: payment, error } = await supabase
        .from('purchase_order_payments')
        .select('id, amount, reference, payment_date')
        .eq('purchase_order_id', purchaseOrderId)
        .order('payment_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching latest payment for reversal:', error);
        return { success: false, message: 'Failed to fetch latest payment' };
      }

      if (!payment) {
        return { success: false, message: 'No payments found to reverse for this purchase order' };
      }

      const reverseResult = await this.reversePayment(payment.id, userId);
      if (reverseResult.success) {
        reverseResult.data = {
          ...reverseResult.data,
          reversed_payment_id: payment.id,
          reversed_amount: payment.amount,
          reversed_reference: payment.reference,
          reversed_at: payment.payment_date
        };
      }
      return reverseResult;
    } catch (error) {
      console.error('❌ PurchaseOrderPaymentService: Error reversing latest payment:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reverse latest payment'
      };
    }
  }

  // Delete a payment (with balance reversal)
  async deletePurchaseOrderPayment(paymentId: string, userId: string): Promise<boolean> {
    try {
      // Get payment details first
      const { data: payment, error: fetchError } = await supabase
        .from('purchase_order_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (fetchError || !payment) {
        throw new Error('Payment not found');
      }

      // Reverse the account balance
      const { error: balanceError } = await supabase
        .from('finance_accounts')
        .update({ 
          balance: supabase.raw(`balance + ${payment.amount}`),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.payment_account_id);

      if (balanceError) {
        console.error('⚠️ Error reversing account balance:', balanceError);
        // Continue with deletion even if balance reversal fails
      }

      // Delete the payment record
      const { error: deleteError } = await supabase
        .from('purchase_order_payments')
        .delete()
        .eq('id', paymentId);

      if (deleteError) {
        console.error('❌ Error deleting payment:', deleteError);
        throw new Error('Failed to delete payment');
      }

      return true;
    } catch (error) {
      console.error('❌ PurchaseOrderPaymentService: Error deleting payment:', error);
      throw error;
    }
  }
}

export const purchaseOrderPaymentService = new PurchaseOrderPaymentService();
