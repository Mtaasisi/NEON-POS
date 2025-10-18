import { supabase } from '../../../lib/supabaseClient';
import { FinanceAccount } from '../../../lib/financeAccountService';

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

class PurchaseOrderPaymentService {
  // Enhanced payment processing with database function
  async processPayment(data: CreatePurchaseOrderPaymentData): Promise<{ success: boolean; message: string; payment?: PurchaseOrderPayment }> {
    try {
      console.log('💰 Processing purchase order payment...', data);
      
      // Validate required fields
      if (!data.purchaseOrderId || !data.paymentAccountId || !data.amount || !data.paymentMethodId) {
        throw new Error('Missing required payment data');
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
        throw new Error(`Payment processing failed: ${error.message}`);
      }

      console.log('✅ RPC function result:', result);

      // Handle array result from RPC function
      let resultData = Array.isArray(result) ? result[0] : result;
      
      // Unwrap if result is nested in process_purchase_order_payment property
      if (resultData?.process_purchase_order_payment) {
        resultData = resultData.process_purchase_order_payment;
      }
      
      console.log('📦 Parsed result data:', resultData);

      // Check if the function returned success
      if (!resultData?.success) {
        throw new Error(resultData?.message || 'Payment processing failed');
      }

      // Get the created payment record using the payment_id from the function result
      const paymentId = resultData.data?.payment_id;
      
      if (!paymentId) {
        console.error('❌ No payment ID returned from function');
        throw new Error('Payment processed but no payment ID returned');
      }

      const { data: paymentRecord, error: fetchError } = await supabase
        .from('purchase_order_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (fetchError) {
        console.warn('⚠️ Error fetching payment record:', fetchError);
        // Return success anyway since payment was processed
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
      }

      console.log('✅ Payment processed successfully:', paymentRecord);
      console.log('💰 Payment status updated:', resultData.data.payment_status);
      
      return { 
        success: true, 
        message: 'Payment processed successfully',
        payment: paymentRecord
      };
    } catch (error) {
      console.error('❌ Error in processPayment:', error);
      return { 
        success: false, 
        message: `Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
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
        
        // Get PO details for description
        const { data: poData } = await supabase
          .from('lats_purchase_orders')
          .select('po_number, supplier_id')
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
        
        // Create account transaction record
        const { error: transactionError } = await supabase
          .from('account_transactions')
          .insert({
            account_id: data.paymentAccountId,
            transaction_type: 'expense', // This is spending/expense
            amount: requiredAmount,
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
              account_name: paymentAccount.name
            },
            created_by: validUser?.id || '00000000-0000-0000-0000-000000000001',
            created_at: new Date().toISOString()
          });
        
        if (transactionError) {
          console.warn('⚠️ Failed to create account transaction:', transactionError);
        } else {
          console.log(`✅ Account transaction created - Spending tracked!`);
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
      const { data, error } = await supabase
        .from('purchase_order_payments')
        .select('*')
        .eq('purchase_order_id', purchaseOrderId)
        .order('created_at', { ascending: false });

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
